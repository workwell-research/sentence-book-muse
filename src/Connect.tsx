import { useEffect, useRef, useState } from 'react';
import type { OAuthAuthorizationDetails, Session, SupabaseClient } from '@supabase/supabase-js';
import type { InboxItem, LearningSummary } from '../shared/muse-connection';
import { InviteAccess, useInviteAccess } from './InviteAccess';
import { LessonPreview } from './LessonPreview';
import type { FilingStatus } from './LessonPreview';
import { fileDraft, readLibrary } from './lib/library';
import type { FilingDecision } from './lib/library';
import { buildLearningSummary } from './lib/learning-summary';
import { accountRequest, connectionError, museClient } from './lib/muse-client';
import type { Account } from './lib/muse-client';
import './styles.css';
import './connect.css';

export function Connect() {
  const [client,setClient] = useState<SupabaseClient | null>(null);
  const [session,setSession] = useState<Session | null>(null);
  const [ready,setReady] = useState(false), [error,setError] = useState('');
  const [attempt,setAttempt] = useState(0);
  useEffect(() => {
    let live = true, unsubscribe = () => {};
    setReady(false); setError('');
    void museClient().then(async auth => {
      if (!live) return;
      setClient(auth);
      const listener = auth.auth.onAuthStateChange((_event,value) => { if (live) { setSession(value); setReady(true); } });
      unsubscribe = () => listener.data.subscription.unsubscribe();
      const result = await auth.auth.getSession();
      if (result.error) throw result.error;
      if (live) { setSession(result.data.session); setReady(true); }
    }).catch(failure => { if (live) { setError(connectionError(failure)); setReady(true); } });
    return () => { live = false; unsubscribe(); };
  },[attempt]);
  return <>
    <a className="skip-link" href="#connect-main">本文へ</a>
    <header className="masthead"><a className="wordmark" href="/">The Sentence Book</a><a className="header-link" href="/setup#shelf">本棚へ戻る</a></header>
    <main className="connect-main" id="connect-main">
      <div className="intro"><h1>{location.pathname === '/oauth/consent' ? 'Museとの接続を確認' : 'あなたのMuseから、受信箱へ。'}</h1>
        <p>届いたページを読んで、<br/>気に入ったものを本に仕舞う。</p></div>
      {error ? <section className="connect-section"><p role="alert">{error}</p><button className="text-button" onClick={()=>setAttempt(attempt+1)}>もう一度読み込む</button></section>
        : !ready || !client ? <p role="status">受信箱を開いています…</p>
        : session ? <AccountView key={session.user.id} client={client} session={session} /> : <Login client={client} />}
    </main>
    <footer><span>The Sentence Book <i>with Muse</i></span><span>あなたのペースで、一文ずつ。</span></footer>
  </>;
}

function Login({client}:{client:SupabaseClient}) {
  const [email,setEmail] = useState(''), [sentTo,setSentTo] = useState(''), [code,setCode] = useState('');
  const [busy,setBusy] = useState(false), [message,setMessage] = useState('');
  const pending = useRef(false);
  async function submit(verify: boolean) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setMessage('');
    try {
      const {error} = verify ? await client.auth.verifyOtp({ email:sentTo,token:code.trim(),type:'email' })
        : await client.auth.signInWithOtp({ email:email.trim() });
      if (error) throw error;
      if (!verify) { setSentTo(email.trim()); setCode(''); setMessage('確認コードを送りました。メールを開いて入力してください。'); }
    } catch { setMessage(verify ? 'コードを確認できませんでした。最新のメールのコードを入力するか、送り直してください。' : '確認コードを送れませんでした。メールアドレスを確認して、少し待ってからお試しください。'); }
    finally { pending.current = false; setBusy(false); }
  }
  return <section className="connect-section connect-login"><h2>メールでログイン</h2>
    <p>同じメールでログインすると、別の端末からも同じ受信箱を開けます。初めての方もこちらから。</p>
    <form onSubmit={event=>{event.preventDefault();void submit(Boolean(sentTo));}}>
      {!sentTo ? <label>メールアドレス<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)} disabled={busy}/></label>
        : <><p className="connect-address">{sentTo}</p><label>メールの確認コード<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6,8}" required maxLength={8} value={code} onChange={event=>setCode(event.target.value)} disabled={busy}/></label></>}
      <div className="filing-actions"><button className="save-button" disabled={busy}>{busy ? '確認しています…' : sentTo ? 'ログインする' : '確認コードを送る'}</button>
        {sentTo && <button className="text-button" type="button" disabled={busy} onClick={()=>{setSentTo('');setMessage('');}}>送り直す・アドレスを変更</button>}</div>
      <p role="status" className="connect-message">{message}</p>
    </form>
    <p className="connect-note">受信箱を有効にするときに招待コードを確認します。本棚と練習の記録は、このブラウザに保存されています。</p>
  </section>;
}

function AccountView({client,session}:{client:SupabaseClient;session:Session}) {
  const access = useInviteAccess();
  const [account,setAccount] = useState<Account | null>(null), [busy,setBusy] = useState(false);
  const [error,setError] = useState(''), [message,setMessage] = useState('');
  const [feedbackScope,setFeedbackScope] = useState('account');
  const [preview,setPreview] = useState<LearningSummary | null>(null);
  const [review,setReview] = useState<InboxItem | null>(null), [filing,setFiling] = useState<FilingStatus>({state:'open'});
  const [library,setLibrary] = useState(()=>readLibrary(localStorage));
  const [receiptRetry,setReceiptRetry] = useState<string | null>(null);
  const pending = useRef(false), live = useRef(true);
  const consentId = location.pathname === '/oauth/consent' ? new URLSearchParams(location.search).get('authorization_id') : null;
  async function refresh() { const next = await accountRequest(client); if(live.current) setAccount(next); }
  useEffect(()=>{live.current=true;void refresh().catch(failure=>{if(live.current)setError(connectionError(failure));});return()=>{live.current=false;};},[]);
  async function act(work:()=>Promise<void>, scope = 'account') {
    if(pending.current)return;
    pending.current=true;setBusy(true);setError('');setMessage('');setFeedbackScope(scope);
    try {await work();} catch(failure) {if(live.current)setError(connectionError(failure));}
    finally {pending.current=false;if(live.current)setBusy(false);}
  }
  async function resolve(draftId:string,status:'filed'|'discarded') {
    await accountRequest(client,{action:'resolve',draft_id:draftId,status});
    setReceiptRetry(null); await refresh();
  }
  async function file(decision:FilingDecision) {
    if(!review)return;
    const draft = review.draft;
    // A failed cloud receipt must never undo a successful local filing.
    try {
      const existing = readLibrary(localStorage);
      if(existing.kind==='unreadable')throw new Error('unreadable-storage');
      const saved = existing.library.pages.find(page=>page.sourceDraftId===draft.draft_id);
      if(saved) {
        const binder = existing.library.binders.find(item=>item.id===saved.binderId)!;
        setFiling({state:'filed',binderTitle:binder.title,createdBinder:false,pageId:saved.id});
      } else {
        const result = fileDraft(localStorage,draft,'muse-app',decision);
        setLibrary({kind:'ready',library:result.library});
        setFiling({state:'filed',binderTitle:result.binder.title,createdBinder:result.createdBinder,pageId:result.page.id});
      }
    } catch(failure) {
      setFiling({state:'failed',message:failure instanceof Error && failure.message==='unreadable-storage'
        ? connectionError(failure) : 'このブラウザに保存できませんでした。この画面を残して、空き容量を確認し、もう一度お試しください。'});
      return;
    }
    setReceiptRetry(draft.draft_id);
    await resolve(draft.draft_id,'filed');
  }
  return <>
    <div className="connect-account"><span>{session.user.email}</span><button className="text-button" disabled={busy} onClick={()=>void act(async()=>{const r=await client.auth.signOut({scope:'local'});if(r.error)throw r.error;})}>ログアウト</button></div>
    {feedbackScope==='account' && <Feedback error={error} message={message}/>}
    {!account ? <button className="text-button" disabled={busy} onClick={()=>void act(refresh)}>受信箱を読み込む</button>
      : !account.member ? <section className="connect-section"><h2>招待を確認して、受信箱を開く</h2><InviteAccess/>
        <button className="save-button" disabled={busy || access.state!=='ready'} onClick={()=>void act(async()=>{await accountRequest(client,{action:'enroll'});await refresh();})}>受信箱を有効にする</button></section>
      : <>
        {location.pathname==='/oauth/consent' ? consentId ? <Consent key={consentId} client={client} authorizationId={consentId} userId={session.user.id}/>
          : <p role="alert">接続の依頼がありません。Museから接続を開始してください。</p> : null}
        <section className="connect-section" id="inbox"><div className="connect-heading"><h2>Museから届いたページ</h2><button className="text-button" disabled={busy} onClick={()=>void act(refresh,'inbox')}>最新の状態を読み込む</button></div>
          <p className="connect-note">受信箱は端末間で共通です。仕舞った教材と練習記録は、このブラウザに残ります。</p>
          {!account.inbox?.length ? <p className="connect-empty">まだ届いていません。下の手順でMuseをつなぐと、ここに届きます。</p>
            : <ul className="connect-inbox">{account.inbox.map(item=><li key={item.draft_id}><div><h3>{item.draft.title}</h3><span>{new Date(item.received_at).toLocaleDateString('ja-JP')} · {item.draft.level} · {item.draft.sentences.length}文</span></div>
              <button className="text-button" disabled={busy} onClick={()=>{setReview(item);setFiling({state:'open'});setLibrary(readLibrary(localStorage));}}>読んで仕分ける</button></li>)}</ul>}
          {feedbackScope==='inbox' && <Feedback error={error} message={message}/>}
        </section>
        {review && <fieldset className="connect-review" disabled={busy}><legend className="visually-hidden">届いたページの確認</legend>
          <button className="text-button" onClick={()=>setReview(null)}>確認を閉じる</button>
          <LessonPreview draft={review.draft} model="muse-app" binders={library.kind==='ready'?library.library.binders:[]} kept inbox status={filing}
            onFile={decision=>void act(()=>file(decision),'inbox')} onDiscard={()=>void act(async()=>{try{await resolve(review.draft_id,'discarded');setReview(null);}catch(failure){setFiling({state:'failed',message:connectionError(failure)});}},'inbox')} onClose={()=>setReview(null)}/>
        </fieldset>}
        {receiptRetry && <p className="connect-error" role="status">教材はこのブラウザに保存済みです。受信箱への完了連絡を再試行してください。 <button className="text-button" disabled={busy} onClick={()=>void act(()=>resolve(receiptRetry,'filed'),'inbox')}>完了を連絡する</button></p>}
        <section className="connect-section"><h2>Museに伝える学習の要約</h2>
          <p>このブラウザの関心・本の一覧・練習量・引いた語句を、確認してから共有します。教材の全文や入力途中のメモは含めません。</p>
          <p className="connect-note">{account.state?.summary ? `共有中：${new Date(account.state.updated_at).toLocaleString('ja-JP')} 時点。自動更新はしません。` : 'まだ共有していません。教材を受け取るには、まず要約を共有してください。'}</p>
          {account.state?.summary && <details><summary>現在共有している内容</summary><Summary summary={account.state.summary}/></details>}
          <div className="filing-actions"><button className="text-button" disabled={busy} onClick={()=>{setFeedbackScope('summary');try{setPreview(buildLearningSummary(localStorage));setError('');}catch(failure){setError(connectionError(failure));}}}>このブラウザの共有内容を確認</button>
            {account.state?.summary && <button className="text-button" disabled={busy} onClick={()=>void act(async()=>{await accountRequest(client,{action:'unshare',expected_version:account.state!.version});setPreview(null);await refresh();setMessage('要約の共有と新しい教材の受信を止めました。');},'summary')}>要約の共有を止める</button>}</div>
          {preview && <div className="connect-summary"><h3>この内容を共有します</h3><Summary summary={preview}/><p className="connect-note">接続を許可したMuseが読めるようになります。使わない関心や本の名前が含まれていないか確認してください。</p>
            <div className="filing-actions"><button className="save-button" disabled={busy} onClick={()=>void act(async()=>{await accountRequest(client,{action:'publish',expected_version:account.state?.version??0,summary:preview});setPreview(null);await refresh();setMessage('確認した要約を共有しました。');},'summary')}>この内容を共有する</button><button className="text-button" disabled={busy} onClick={()=>setPreview(null)}>閉じる</button></div></div>}
          {feedbackScope==='summary' && <Feedback error={error} message={message}/>}
        </section>
        <section className="connect-section"><h2>Museをつなぐ</h2><ol className="connect-steps"><li>上で、Museに伝える学習の要約を確認して共有します。</li><li>Museの外部サービス接続で、次の接続先を追加します。<label>接続先（MCP）<input readOnly value={`${location.origin}/mcp`} onFocus={event=>event.target.select()}/></label></li><li>開いた確認画面で、この受信箱への接続を許可します。</li><li>Museに「教材ガイドと学習の要約を読み、今日の教材を1ページ作って受信箱へ届けて」と頼みます。</li></ol>
          <p className="connect-note">Muse側に外部サービスの追加が表示されない場合は、<a href="/setup#compose">コピーと貼り付けで教材を受け取る</a>方法も使えます。定期実行は、接続を試してからMuseで設定してください。</p>
          <h3>許可した接続</h3>{!account.connections?.length ? <p>まだ接続を許可していません。</p> : <ul className="connect-inbox">{account.connections.map(connection=><li key={connection.client_id}><div><h4>{connection.client_name}</h4><p>{[connection.read_summary?'学習の要約を読む':'',connection.deliver_drafts?'教材を受信箱へ届ける':''].filter(Boolean).join(' ／ ')||'許可なし'}</p></div><button className="text-button" disabled={busy} onClick={()=>void act(async()=>{
            await accountRequest(client,{action:'revoke',client_id:connection.client_id});
            const result = await client.auth.oauth.revokeGrant({clientId:connection.client_id});
            await refresh();setMessage(result.error?'受信箱への接続を解除しました。Muse側にも接続が残っていれば削除してください。':'Museとの接続を解除しました。');
          },'connection')}>接続を解除</button></li>)}</ul>}
          {feedbackScope==='connection' && <Feedback error={error} message={message}/>}
        </section>
      </>}
  </>;
}

function Feedback({error,message}:{error:string;message:string}) {
  return <>{error && <p className="connect-error" role="alert">{error}</p>}{message && <p className="connect-message" role="status">{message}</p>}</>;
}

function Summary({summary}:{summary:LearningSummary}) {
  return <dl className="connect-facts"><div><dt>レベル・訳の言語</dt><dd>{summary.level} · {summary.native_language}</dd></div>
    <div><dt>関心</dt><dd>{summary.interests.join('、') || '未設定'}</dd></div>
    <div><dt>本の一覧</dt><dd>{summary.binders.length ? <ul>{summary.binders.map(book=><li key={book.id}>{book.title} — {book.description}</li>)}</ul> : 'まだありません'}</dd></div>
    <div><dt>このブラウザの練習量</dt><dd>未仕分け {summary.local_pending_count}ページ ／ 未着手 {summary.unpractised_count}ページ ／ 直近7日のCopy完了 {summary.completed_last_7_days}ページ</dd></div>
    <div><dt>復習する語句</dt><dd>{summary.review_candidates.map(word=>`${word.expression}（${word.native}）`).join('、')||'まだありません'}</dd></div>
    <div><dt>確認した日時</dt><dd>{new Date(summary.observed_at).toLocaleString('ja-JP')}</dd></div></dl>;
}

function Consent({client,authorizationId,userId}:{client:SupabaseClient;authorizationId:string;userId:string}) {
  const [details,setDetails] = useState<OAuthAuthorizationDetails | null>(null), [redirect,setRedirect] = useState('');
  const [read,setRead] = useState(false), [deliver,setDeliver] = useState(false);
  const [error,setError] = useState(''), [busy,setBusy] = useState(false);
  const pending=useRef(false);
  useEffect(()=>{let live=true;void client.auth.oauth.getAuthorizationDetails(authorizationId).then(({data,error})=>{
    if(!live)return;
    if(error||!data){setError(connectionError(new Error('invalid_authorization')));return;}
    if('redirect_url' in data)setRedirect(data.redirect_url);
    else if(data.user.id===userId)setDetails(data);
    else setError(connectionError(new Error('invalid_authorization')));
  }).catch(()=>{if(live)setError(connectionError(new Error('network')));});return()=>{live=false;};},[client,authorizationId,userId]);
  async function decide(approve:boolean) {
    if(pending.current)return;pending.current=true;setBusy(true);setError('');
    try {
      if(approve) await accountRequest(client,{action:'grant',authorization_id:authorizationId,permissions:{read_summary:read,deliver_drafts:deliver}});
      const result = approve ? await client.auth.oauth.approveAuthorization(authorizationId,{skipBrowserRedirect:true}) : await client.auth.oauth.denyAuthorization(authorizationId,{skipBrowserRedirect:true});
      if(result.error || !result.data)throw new Error('invalid_authorization');
      location.assign(result.data.redirect_url);
    }catch(failure){setError(connectionError(failure));}finally{pending.current=false;setBusy(false);}
  }
  return <section className="connect-section connect-consent"><h2>この接続に許可すること</h2>
    {error && <p role="alert" className="connect-error">{error}</p>}
    {redirect ? <><p>この依頼はすでに認証されています。接続先に戻って続けてください。</p><a className="save-button" href={redirect}>接続先へ戻る</a></>
      : details ? <><p><strong>{details.client.name || '名称未設定の接続'}</strong> からの依頼です。</p><p className="connect-note">戻り先：{details.redirect_uri}<br/>接続先に渡るアカウント情報：{details.scope.trim().split(/\s+/).filter(Boolean).map(scope=>({openid:'アカウントの識別子',email:'メールアドレス',profile:'名前・プロフィール画像',phone:'電話番号'} as Record<string,string>)[scope]??scope).join('、') || '要求なし'}</p>
        <fieldset disabled={busy}><legend>これとは別に、学習アプリで許可することを選んでください</legend><label><input type="checkbox" checked={read} onChange={event=>setRead(event.target.checked)}/> 確認して共有した学習の要約を読む</label>
          <label><input type="checkbox" checked={deliver} onChange={event=>setDeliver(event.target.checked)}/> 教材の下書きを受信箱へ届ける</label></fieldset>
        <p className="connect-note">本への仕分けはあなたが決めます。接続はこの画面からいつでも解除できます。</p><div className="filing-actions"><button className="save-button" disabled={busy||(!read&&!deliver)} onClick={()=>void decide(true)}>選んだ内容で接続を許可</button><button className="text-button" disabled={busy} onClick={()=>void decide(false)}>許可しない</button></div></>
      : !error ? <p role="status">接続の依頼を確認しています…</p> : null}
  </section>;
}
