import { useEffect, useRef, useState } from 'react';
import type { OAuthAuthorizationDetails, Session, SupabaseClient } from '@supabase/supabase-js';
import type { InboxItem, LearningSummary } from '../shared/muse-connection';
import { LessonPreview } from './LessonPreview';
import { ConnectionKeys, Done, shortDate } from './ConnectionKeys';
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
  const consent = location.pathname === '/oauth/consent';
  return <div className="connect-page">
    <a className="skip-link" href="#connect-main">本文へ</a>
    <header className="connect-header"><a className="connect-wordmark" href="/">The Sentence Book</a><span className="connect-tagline" lang="en">with Muse</span>
      <nav aria-label="ページ"><a href="/">机へ</a><a href="/setup#shelf">本棚へ</a></nav></header>
    <main className="connect-main" id="connect-main">
      <h1 className={consent ? 'connect-title' : 'visually-hidden'}>{consent ? 'Museとの接続を確認' : 'Museの受信箱'}</h1>
      {error ? <section className="connect-block"><p className="connect-error" role="alert">{error}</p><button className="text-button" onClick={()=>setAttempt(attempt+1)}>もう一度読み込む</button></section>
        : !ready || !client ? <p className="connect-loading" role="status">開いています…</p>
        : session ? <AccountView key={session.user.id} client={client} session={session} /> : <Login client={client} />}
    </main>
    <footer className="connect-footer"><span>The Sentence Book <i lang="en">with Muse</i></span><span>一文ずつ、あなたのペースで。</span></footer>
  </div>;
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
      if (!verify) { setSentTo(email.trim()); setCode(''); setMessage('数字を送りました。メールを開いてください。'); }
    } catch { setMessage(verify ? '数字が合いませんでした。最新のメールの数字を入れるか、送り直してください。' : '送れませんでした。メールアドレスを確かめて、少し待ってからもう一度。'); }
    finally { pending.current = false; setBusy(false); }
  }
  return <section className="connect-block connect-login" aria-labelledby="login-title">
    <div className="block-head"><p className="kicker" lang="en">Sign in</p><h2 id="login-title">メールでログイン</h2></div>
    <form className="connect-paper" onSubmit={event=>{event.preventDefault();void submit(Boolean(sentTo));}}>
      <p>{sentTo ? 'メールに届いた数字を入れます。' : 'メールに届く数字で入ります。'}</p>
      {!sentTo ? <label>メールアドレス<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)} disabled={busy}/></label>
        : <><p className="connect-address">{sentTo}</p><label>確認の数字<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6,8}" required maxLength={8} value={code} onChange={event=>setCode(event.target.value)} disabled={busy}/></label></>}
      <div className="step-actions"><button className="save-button" disabled={busy}>{busy ? '確認しています…' : sentTo ? 'ログイン' : '数字を送る'}</button>
        {sentTo && <button className="text-button" type="button" disabled={busy} onClick={()=>{setSentTo('');setMessage('');}}>送り直す</button>}</div>
      <p role="status" className="connect-message">{message}</p>
    </form>
    <p className="step-note">同じメールなら、別の端末でも同じ受信箱を開けます。</p>
  </section>;
}

function AccountView({client,session}:{client:SupabaseClient;session:Session}) {
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
  const consent = location.pathname==='/oauth/consent';
  const shared = Boolean(account?.state?.summary);
  const now = Date.now();
  const connected = shared && (Boolean(account?.connections?.some(c=>c.read_summary&&c.deliver_drafts))
    || Boolean(account?.keys?.some(k=>k.read_summary&&k.deliver_drafts&&Date.parse(k.expires_at)>now)));
  // Decide the section order once, so finishing a step never remounts the steps and loses a just-issued key.
  const inboxFirst = useRef<boolean | null>(null);
  if (account?.member && inboxFirst.current === null) inboxFirst.current = connected;
  const summaryPanel = useRef<HTMLHeadingElement>(null);
  useEffect(()=>{if(preview){summaryPanel.current?.focus({preventScroll:true});summaryPanel.current?.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}},[preview]);
  const openSummary = ()=>{setFeedbackScope('summary');setMessage('');try{setPreview(buildLearningSummary(localStorage));setError('');}catch(failure){setError(connectionError(failure));}};
  const share = <>
    {shared && <Done>共有中・{shortDate(account!.state!.updated_at)}</Done>}
    <div className="step-actions"><button className={shared?'text-button':'save-button'} type="button" disabled={busy} aria-expanded={Boolean(preview)} aria-controls="summary-panel" onClick={openSummary}>内容を確かめる</button>
      {shared && <button className="text-button" type="button" disabled={busy} onClick={()=>void act(async()=>{await accountRequest(client,{action:'unshare',expected_version:account!.state!.version});setPreview(null);await refresh();setMessage('共有をやめました。新しい教材も届きません。');},'summary')}>共有をやめる</button>}</div>
  </>;
  const sharePanel = <>
    {preview && <div className="connect-paper connect-summary" id="summary-panel"><h3 ref={summaryPanel} tabIndex={-1}>Museと共有する内容</h3><Summary summary={preview}/>
      <p className="step-note">教材の全文や書きかけのメモは含みません。共有したくない名前がないか確かめてください。</p>
      <div className="step-actions"><button className="save-button" type="button" disabled={busy} onClick={()=>void act(async()=>{await accountRequest(client,{action:'publish',expected_version:account?.state?.version??0,summary:preview});setPreview(null);await refresh();setMessage('Museと共有しました。');},'summary')}>この内容で共有する</button><button className="text-button" type="button" disabled={busy} onClick={()=>setPreview(null)}>閉じる</button></div></div>}
    {!preview && account?.state?.summary && <details className="connect-shown"><summary>いま共有している内容</summary><Summary summary={account.state.summary}/></details>}
    {feedbackScope==='summary' && <Feedback error={error} message={message}/>}
  </>;
  const inbox = account?.member && <section key="inbox" className="connect-block" id="inbox" aria-labelledby="inbox-title">
    <div className="block-head"><p className="kicker" lang="en">Inbox</p><h2 id="inbox-title">受信箱</h2>
      <button className="text-button block-action" disabled={busy} onClick={()=>void act(refresh,'inbox')}>更新</button></div>
    <div className="connect-paper">
      {!account.inbox?.length ? <p className="connect-empty">まだ届いていません。</p>
        : <ul className="connect-rows connect-inbox">{account.inbox.map(item=><li key={item.draft_id} className={review?.draft_id===item.draft_id?'is-open':undefined}><div><h3>{item.draft.title}</h3><p>{shortDate(item.received_at)} · {item.draft.level} · {item.draft.sentences.length}文</p></div>
          <button className="save-button" disabled={busy} onClick={()=>{setReview(item);setFiling({state:'open'});setLibrary(readLibrary(localStorage));}}>開く</button></li>)}</ul>}
    </div>
    {feedbackScope==='inbox' && <Feedback error={error} message={message}/>}
    {review && <fieldset className="connect-review" disabled={busy}><legend className="visually-hidden">届いたページの確認</legend>
      <button className="text-button review-close" type="button" onClick={()=>setReview(null)}>閉じる</button>
      <LessonPreview draft={review.draft} model="muse-app" binders={library.kind==='ready'?library.library.binders:[]} kept inbox status={filing}
        onFile={decision=>void act(()=>file(decision),'inbox')} onDiscard={()=>void act(async()=>{try{await resolve(review.draft_id,'discarded');setReview(null);}catch(failure){setFiling({state:'failed',message:connectionError(failure)});}},'inbox')} onClose={()=>setReview(null)}/>
    </fieldset>}
    {receiptRetry && <p className="connect-error" role="status">このブラウザには仕舞いました。受信箱への連絡だけ、もう一度送ってください。 <button className="text-button" disabled={busy} onClick={()=>void act(()=>resolve(receiptRetry,'filed'),'inbox')}>もう一度送る</button></p>}
  </section>;
  const connect = account?.member && (consent
    ? <section key="connect" className="connect-block" aria-labelledby="share-title"><div className="block-head"><p className="kicker" lang="en">Share</p><h2 id="share-title">Museと共有する学習内容</h2></div>{share}{sharePanel}</section>
    : <ConnectionKeys key="connect" client={client} keys={account.keys??[]} disabled={busy} connected={connected} shared={shared} share={share} sharePanel={sharePanel}
        onChange={keys=>setAccount(current=>current?{...current,keys}:current)}/>);
  return <>
    <div className="connect-account"><span>{session.user.email}</span><button className="text-button" disabled={busy} onClick={()=>void act(async()=>{const r=await client.auth.signOut({scope:'local'});if(r.error)throw r.error;})}>ログアウト</button></div>
    {feedbackScope==='account' && <Feedback error={error} message={message}/>}
    {!account ? <button className="text-button" disabled={busy} onClick={()=>void act(refresh)}>受信箱を読み込む</button>
      : !account.member ? <section className="connect-block" aria-labelledby="enroll-title"><div className="block-head"><p className="kicker" lang="en">Inbox</p><h2 id="enroll-title">受信箱をつくる</h2></div>
        <div className="connect-paper"><p>Museから届く教材を受け取る、あなた専用の受信箱です。</p>
          <div className="step-actions"><button className="save-button" disabled={busy} onClick={()=>void act(async()=>{await accountRequest(client,{action:'enroll'});await refresh();})}>受信箱をつくる</button></div></div></section>
      : <>
        {consent ? consentId ? <Consent key={consentId} client={client} authorizationId={consentId} userId={session.user.id}/>
          : <p className="connect-error" role="alert">接続の依頼がありません。Museから接続を始めてください。</p> : null}
        {inboxFirst.current ? [inbox,connect] : [connect,inbox]}
        {account.connections?.length ? <section className="connect-block" aria-labelledby="links-title"><div className="block-head"><p className="kicker" lang="en">Links</p><h2 id="links-title">ほかの接続</h2></div>
          <ul className="connect-rows">{account.connections.map(connection=><li key={connection.client_id}><div><h4>{connection.client_name}</h4><p>{[connection.read_summary?'読む':'',connection.deliver_drafts?'届ける':''].filter(Boolean).join('・')||'許可なし'}</p></div><button className="text-button" disabled={busy} onClick={()=>void act(async()=>{
            await accountRequest(client,{action:'revoke',client_id:connection.client_id});
            const result = await client.auth.oauth.revokeGrant({clientId:connection.client_id});
            await refresh();setMessage(result.error?'受信箱への接続を解除しました。Museに残っていれば削除してください。':'接続を解除しました。');
          },'connection')}>解除する<span className="visually-hidden">：{connection.client_name}</span></button></li>)}</ul>
          {feedbackScope==='connection' && <Feedback error={error} message={message}/>}
        </section> : null}
        <p className="connect-fallback">つながらないときは <a href="/setup#compose">コピーと貼り付けで受け取る</a></p>
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
  return <section className="connect-block connect-consent" aria-labelledby="consent-title"><div className="block-head"><p className="kicker" lang="en">Allow</p><h2 id="consent-title">この接続に許可すること</h2></div><div className="connect-paper">
    {error && <p role="alert" className="connect-error">{error}</p>}
    {redirect ? <><p>この依頼はすでに認証されています。接続先に戻って続けてください。</p><a className="save-button" href={redirect}>接続先へ戻る</a></>
      : details ? <><p><strong>{details.client.name || '名称未設定の接続'}</strong> からの依頼です。</p><p className="connect-note">戻り先：{details.redirect_uri}<br/>接続先に渡るアカウント情報：{details.scope.trim().split(/\s+/).filter(Boolean).map(scope=>({openid:'アカウントの識別子',email:'メールアドレス',profile:'名前・プロフィール画像',phone:'電話番号'} as Record<string,string>)[scope]??scope).join('、') || '要求なし'}</p>
        <fieldset disabled={busy}><legend>許可すること</legend><label><input type="checkbox" checked={read} onChange={event=>setRead(event.target.checked)}/> 学習のようすを読む</label>
          <label><input type="checkbox" checked={deliver} onChange={event=>setDeliver(event.target.checked)}/> 教材を受信箱に届ける</label></fieldset>
        <p className="connect-note">本への仕分けはあなたが決めます。接続はこの画面からいつでも解除できます。</p><div className="step-actions"><button className="save-button" disabled={busy||(!read&&!deliver)} onClick={()=>void decide(true)}>選んだ内容で接続を許可</button><button className="text-button" disabled={busy} onClick={()=>void decide(false)}>許可しない</button></div></>
      : !error ? <p role="status">接続の依頼を確認しています…</p> : null}
  </div></section>;
}
