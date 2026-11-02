import { useCallback, useEffect, useRef, useState } from 'react';
import type { OAuthAuthorizationDetails, Session, SupabaseClient } from '@supabase/supabase-js';
import type { LearningSummary } from '../shared/muse-connection';
import { Done, shortDate } from './ConnectionKeys';
import { buildLearningSummary } from './lib/learning-summary';
import { scheduleText } from './lib/composer';
import { accountRequest, connectionError, museClient } from './lib/muse-client';
import type { Account } from './lib/muse-client';
import { locale, useT } from './lib/lang';

// The Muse account pieces shared by the inbox, the settings and the consent page.

export interface MuseSession { client: SupabaseClient | null; session: Session | null; ready: boolean; error: string; retry: () => void }
export function useMuseSession(): MuseSession {
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
  return { client, session, ready, error, retry: () => setAttempt(attempt + 1) };
}

export function Login({client}:{client:SupabaseClient}) {
  const [email,setEmail] = useState(''), [sentTo,setSentTo] = useState(''), [code,setCode] = useState('');
  const [busy,setBusy] = useState(false), [message,setMessage] = useState('');
  const pending = useRef(false), t = useT();
  async function submit(verify: boolean) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setMessage('');
    try {
      const {error} = verify ? await client.auth.verifyOtp({ email:sentTo,token:code.trim(),type:'email' })
        : await client.auth.signInWithOtp({ email:email.trim() });
      if (error) throw error;
      if (!verify) { setSentTo(email.trim()); setCode(''); setMessage(t('数字を送りました。メールを開いてください。')); }
    } catch { setMessage(verify ? t('数字が合いませんでした。最新のメールの数字を入れるか、送り直してください。') : t('送れませんでした。メールアドレスを確かめて、少し待ってからもう一度。')); }
    finally { pending.current = false; setBusy(false); }
  }
  return <section className="connect-block connect-login" aria-labelledby="login-title">
    <div className="block-head"><p className="kicker" lang="en">Sign in</p><h2 id="login-title">{t('メールでログイン')}</h2></div>
    <form className="connect-paper" onSubmit={event=>{event.preventDefault();void submit(Boolean(sentTo));}}>
      <p>{sentTo ? t('メールに届いた数字を入れます。') : t('メールに届く数字で入ります。')}</p>
      {!sentTo ? <label>{t('メールアドレス')}<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)} disabled={busy}/></label>
        : <><p className="connect-address">{sentTo}</p><label>{t('確認の数字')}<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6,8}" required maxLength={8} value={code} onChange={event=>setCode(event.target.value)} disabled={busy}/></label></>}
      <div className="step-actions"><button className="save-button" disabled={busy}>{busy ? t('確認しています…') : sentTo ? t('ログイン') : t('数字を送る')}</button>
        {sentTo && <button className="text-button" type="button" disabled={busy} onClick={()=>{setSentTo('');setMessage('');}}>{t('送り直す')}</button>}</div>
      <p role="status" className="connect-message">{message}</p>
    </form>
    <p className="step-note">{t('同じメールなら、別の端末でも同じ受信箱を開けます。')}</p>
  </section>;
}

export interface AccountActions {
  account: Account | null; setAccount: (update: (current: Account | null) => Account | null) => void;
  busy: boolean; error: string; message: string; scope: string;
  act: (work: () => Promise<void>, scope?: string) => Promise<void>; refresh: () => Promise<void>;
  setMessage: (message: string) => void; setError: (error: string) => void; setScope: (scope: string) => void;
}
// Account state for one signed-in user. `userId` changes remount the data; a null client means nobody is signed in.
export function useAccount(client: SupabaseClient | null, userId?: string): AccountActions {
  const [account,setAccount] = useState<Account | null>(null), [busy,setBusy] = useState(false);
  const [error,setError] = useState(''), [message,setMessage] = useState(''), [scope,setScope] = useState('account');
  const pending = useRef(false), live = useRef(true);
  const refresh = useCallback(async () => { if (!client) return; const next = await accountRequest(client); if (live.current) setAccount(next); },[client]);
  useEffect(()=>{
    live.current=true; setAccount(null); setError(''); setMessage('');
    if (client && userId) void refresh().catch(failure=>{if(live.current)setError(connectionError(failure));});
    return()=>{live.current=false;};
  },[client,userId,refresh]);
  async function act(work:()=>Promise<void>, nextScope = 'account') {
    if(pending.current)return;
    pending.current=true;setBusy(true);setError('');setMessage('');setScope(nextScope);
    try {await work();} catch(failure) {if(live.current)setError(connectionError(failure));}
    finally {pending.current=false;if(live.current)setBusy(false);}
  }
  return { account, setAccount, busy, error, message, scope, act, refresh, setMessage, setError, setScope };
}

export function Feedback({actions,scope}:{actions:AccountActions;scope:string}) {
  if (actions.scope !== scope) return null;
  return <>{actions.error && <p className="connect-error" role="alert">{actions.error}</p>}{actions.message && <p className="connect-message" role="status">{actions.message}</p>}</>;
}

export function AccountLine({client,session,actions}:{client:SupabaseClient;session:Session;actions:AccountActions}) {
  const t = useT();
  return <div className="connect-account"><span>{session.user.email}</span>
    <button className="text-button" disabled={actions.busy} onClick={()=>void actions.act(async()=>{const r=await client.auth.signOut({scope:'local'});if(r.error)throw r.error;})}>{t('ログアウト')}</button></div>;
}

export function EnrollBlock({client,actions}:{client:SupabaseClient;actions:AccountActions}) {
  const t = useT();
  return <section className="connect-block" aria-labelledby="enroll-title"><div className="block-head"><p className="kicker" lang="en">Inbox</p><h2 id="enroll-title">{t('受信箱をつくる')}</h2></div>
    <div className="connect-paper"><p>{t('Museから届く教材を受け取る、あなた専用の受信箱です。')}</p>
      <div className="step-actions"><button className="save-button" disabled={actions.busy} onClick={()=>void actions.act(async()=>{await accountRequest(client,{action:'enroll'});await actions.refresh();})}>{t('受信箱をつくる')}</button></div></div></section>;
}

// Shared with Muse and reachable through a live key or an allowed connection.
export function isConnected(account: Account | null): boolean {
  const shared = Boolean(account?.state?.summary), now = Date.now();
  return shared && (Boolean(account?.connections?.some(c=>c.read_summary&&c.deliver_drafts))
    || Boolean(account?.keys?.some(k=>k.read_summary&&k.deliver_drafts&&Date.parse(k.expires_at)>now)));
}

export function ShareSection({client,actions}:{client:SupabaseClient;actions:AccountActions}) {
  const {account,busy,act,refresh,setMessage,setError,setScope} = actions;
  const [preview,setPreview] = useState<LearningSummary | null>(null);
  const t = useT();
  const panel = useRef<HTMLHeadingElement>(null);
  const shared = Boolean(account?.state?.summary);
  useEffect(()=>{if(preview){panel.current?.focus({preventScroll:true});panel.current?.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}},[preview]);
  const openSummary = ()=>{setScope('summary');setMessage('');try{setPreview(buildLearningSummary(localStorage));setError('');}catch(failure){setError(connectionError(failure));}};
  return <>
    {shared && <Done>{t('共有中・{date}', { date: shortDate(account!.state!.updated_at) })}</Done>}
    <div className="step-actions"><button className={shared?'text-button':'save-button'} type="button" disabled={busy} aria-expanded={Boolean(preview)} aria-controls="summary-panel" onClick={openSummary}>{t('内容を確かめる')}</button>
      {shared && <button className="text-button" type="button" disabled={busy} onClick={()=>void act(async()=>{await accountRequest(client,{action:'unshare',expected_version:account!.state!.version});setPreview(null);await refresh();setMessage(t('共有をやめました。新しい教材も届きません。'));},'summary')}>{t('共有をやめる')}</button>}</div>
    {preview && <div className="connect-paper connect-summary" id="summary-panel"><h3 ref={panel} tabIndex={-1}>{t('Museと共有する内容')}</h3><Summary summary={preview}/>
      <p className="step-note">{t('教材の全文や書きかけのメモは含みません。共有したくない名前がないか確かめてください。')}</p>
      <div className="step-actions"><button className="save-button" type="button" disabled={busy} onClick={()=>void act(async()=>{await accountRequest(client,{action:'publish',expected_version:account?.state?.version??0,summary:preview});setPreview(null);await refresh();setMessage(t('Museと共有しました。'));},'summary')}>{t('この内容で共有する')}</button><button className="text-button" type="button" disabled={busy} onClick={()=>setPreview(null)}>{t('閉じる')}</button></div></div>}
    {!preview && account?.state?.summary && <details className="connect-shown"><summary>{t('いま共有している内容')}</summary><Summary summary={account.state.summary}/></details>}
    <Feedback actions={actions} scope="summary"/>
  </>;
}

export function Summary({summary}:{summary:LearningSummary}) {
  const t = useT();
  return <dl className="connect-facts"><div><dt>{t('レベル・訳の言語')}</dt><dd>{summary.level} · {summary.native_language}</dd></div>
    <div><dt>{t('何から作るか')}</dt><dd>{summary.lesson_source === 'conversation_and_social' ? t('会話とSNS') : t('会話だけ')}</dd></div>
    {summary.delivery && <div><dt>{t('届けるペース')}</dt><dd>{scheduleText(summary.delivery)}</dd></div>}
    {summary.interests.length > 0 && <div><dt>{t('関心')}</dt><dd>{summary.interests.join(t('、'))}</dd></div>}
    <div><dt>{t('本の一覧')}</dt><dd>{summary.binders.length ? <ul>{summary.binders.map(book=><li key={book.id}>{book.title} — {book.description}</li>)}</ul> : t('まだありません')}</dd></div>
    <div><dt>{t('このブラウザの練習量')}</dt><dd>{t('未仕分け {pending}ページ ／ 未着手 {unpractised}ページ ／ 直近7日のCopy完了 {completed}ページ', { pending: summary.local_pending_count, unpractised: summary.unpractised_count, completed: summary.completed_last_7_days })}</dd></div>
    <div><dt>{t('復習する語句')}</dt><dd>{summary.review_candidates.map(word=>t('{expression}（{native}）', { expression: word.expression, native: word.native })).join(t('、'))||t('まだありません')}</dd></div>
    <div><dt>{t('確認した日時')}</dt><dd>{new Date(summary.observed_at).toLocaleString(locale())}</dd></div></dl>;
}

export function ConnectionsList({client,actions}:{client:SupabaseClient;actions:AccountActions}) {
  const {account,busy,act,refresh,setMessage} = actions;
  const t = useT();
  if (!account?.connections?.length) return null;
  return <section className="connect-block" aria-labelledby="links-title"><div className="block-head"><p className="kicker" lang="en">Links</p><h2 id="links-title">{t('ほかの接続')}</h2></div>
    <ul className="connect-rows">{account.connections.map(connection=><li key={connection.client_id}><div><h4>{connection.client_name}</h4><p>{[connection.read_summary?t('読む'):'',connection.deliver_drafts?t('届ける'):''].filter(Boolean).join(t('・'))||t('許可なし')}</p></div><button className="text-button" disabled={busy} onClick={()=>void act(async()=>{
      await accountRequest(client,{action:'revoke',client_id:connection.client_id});
      const result = await client.auth.oauth.revokeGrant({clientId:connection.client_id});
      await refresh();setMessage(result.error?t('受信箱への接続を解除しました。Museに残っていれば削除してください。'):t('接続を解除しました。'));
    },'connection')}>{t('解除する')}<span className="visually-hidden">{t('：')}{connection.client_name}</span></button></li>)}</ul>
    <Feedback actions={actions} scope="connection"/>
  </section>;
}

export function Consent({client,authorizationId,userId}:{client:SupabaseClient;authorizationId:string;userId:string}) {
  const [details,setDetails] = useState<OAuthAuthorizationDetails | null>(null), [redirect,setRedirect] = useState('');
  const [read,setRead] = useState(false), [deliver,setDeliver] = useState(false);
  const [error,setError] = useState(''), [busy,setBusy] = useState(false);
  const pending=useRef(false), t=useT();
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
  return <section className="connect-block connect-consent" aria-labelledby="consent-title"><div className="block-head"><p className="kicker" lang="en">Allow</p><h2 id="consent-title">{t('この接続に許可すること')}</h2></div><div className="connect-paper">
    {error && <p role="alert" className="connect-error">{error}</p>}
    {redirect ? <><p>{t('この依頼はすでに認証されています。接続先に戻って続けてください。')}</p><a className="save-button" href={redirect}>{t('接続先へ戻る')}</a></>
      : details ? <><p><strong>{details.client.name || t('名称未設定の接続')}</strong>{t(' からの依頼です。')}</p><p className="connect-note">{t('戻り先：')}{details.redirect_uri}<br/>{t('接続先に渡るアカウント情報：')}{details.scope.trim().split(/\s+/).filter(Boolean).map(scope=>({openid:t('アカウントの識別子'),email:t('メールアドレス'),profile:t('名前・プロフィール画像'),phone:t('電話番号')} as Record<string,string>)[scope]??scope).join(t('、')) || t('要求なし')}</p>
        <fieldset disabled={busy}><legend>{t('許可すること')}</legend><label><input type="checkbox" checked={read} onChange={event=>setRead(event.target.checked)}/> {t('学習のようすを読む')}</label>
          <label><input type="checkbox" checked={deliver} onChange={event=>setDeliver(event.target.checked)}/> {t('教材を受信箱に届ける')}</label></fieldset>
        <p className="connect-note">{t('本への仕分けはあなたが決めます。接続は設定からいつでも解除できます。')}</p><div className="step-actions"><button className="save-button" disabled={busy||(!read&&!deliver)} onClick={()=>void decide(true)}>{t('選んだ内容で接続を許可')}</button><button className="text-button" disabled={busy} onClick={()=>void decide(false)}>{t('許可しない')}</button></div></>
      : !error ? <p role="status">{t('接続の依頼を確認しています…')}</p> : null}
  </div></section>;
}
