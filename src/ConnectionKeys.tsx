import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { LESSON_CONTRACT } from '../shared/lesson-schema';
import type { ConnectionKey, IssuedConnectionKey } from '../shared/muse-connection';
import { accountRequest, connectionError } from './lib/muse-client';

// The learner only copies this to Muse; Muse explains the steps in plain words and handles the technical part.
export function connectionInstructions(origin: string) {
  const host = new URL(origin).hostname;
  return `Sentence Book（英語を一文ずつ書き写して学ぶノート）と、あなた（Muse）をつなぎたいです。つなぎ方の案内は、あなたにお願いします。まだ教材の作成・送信や定期実行はしません。

【私への案内のしかた】
・私が書いている言語で話してください。
・1回に1つの手順だけ、短い文で伝えてください。私が「できた」と言ったら次へ進みます。
・API、Bearer、エンドポイント、HTTPなどの専門用語は使わないでください。「キー」「貼り付け欄」「ボタン」のような言葉で伝えてください。
・私の操作は、接続画面 ${origin}/connect の番号とボタン名で伝えてください。
  ① Museと共有することを決める：「内容を確かめる」→「この内容で共有する」（このメッセージを送る前に済ませています）
  ② Museに依頼する：このメッセージです
  ③ 接続キーを作る：「キーを作る」
  ④ Museの貼り付け欄に貼る：「キーをコピー」→ あなたが開いた貼り付け欄に貼る
・キーをチャットに貼らせないでください。③は、あなたが貼り付け欄を開いてから案内してください。
・うまくいかないときは、起きたことを一言で伝え、次にできることを1つだけ示してください。

【あなたの作業（私への説明は不要です）】
1. このメッセージを受け取ったら、credentials.request_api_access で APIキー方式の安全な貼り付け欄を開いてください。auth_scheme は api_key、配置は bearer_header、送信先は ${host} のみです。OAuthリンクは使いません。キーをチャットで聞いたり、出力・URL・ファイルに含めたりしないでください。MetaやResendのAPIキーではありません。
2. 貼り付け欄が開いたら、③と④を案内してください。
3. 入力後は、保存した資格情報をAuthorization: Bearerとして注入するHTTP機能を使います。その機能がなければ、できないことを私に短く伝えてください。接続成功とはまだ言わないでください。
4. 公開ガイドを GET ${origin}/api/muse/guide で取得してください。
5. POST ${origin}/api/muse/learning-state へ Content-Type: application/json、本文 {"delivery_date":"YYYY-MM-DD"} を送り、YYYY-MM-DDは今日の日付に置き換えてください。キーは登録先以外へ送りません。200と返答のstate_version・draft_idを確認できたら、「つながりました」とだけ伝えてください。401ならキーが無効なので③④のやり直しを、403なら①で両方にチェックして③④をやり直すことを、409なら①の「この内容で共有する」を案内してください。何度も繰り返し試さないでください。

【教材を頼んだときだけ】
ガイドのJSON Schemaと取得した要約を読み、同じdelivery_date・draft_id・state_versionに合う教材を作成し、POST ${origin}/api/muse/deliver へ {"contract":"${LESSON_CONTRACT}","delivery_date":"YYYY-MM-DD","draft":教材オブジェクト} を送ります。実際のcontractは必ずガイドの値を使ってください。同じ依頼の再送は同じ内容・IDにします。無限に再試行しないでください。本に仕舞うのは私が行います。

MCPに直接接続できる場合のURLは ${origin}/mcp です。どちらの方法でも、実際に応答を確認した範囲だけ報告してください。`;
}

type IconName = 'copy' | 'share' | 'key' | 'paste';
const iconPaths: Record<IconName, ReactNode> = {
  copy: <><rect x="5" y="9" width="17" height="23" rx="1.5"/><path d="M9.5 15.5h8M9.5 20.5h8M9.5 25.5h5"/><path d="M25 21h6m-2.5-2.5L31 21l-2.5 2.5"/><path d="M35.5 14h7a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-3.5l-3 3v-3h-.5a1.5 1.5 0 0 1-1.5-1.5v-8a1.5 1.5 0 0 1 1.5-1.5z"/></>,
  share: <><rect x="8" y="6" width="22" height="29" rx="1.5"/><path d="M13 13h12M13 18h12M13 23h7"/><path className="icon-fill" d="M23 36c3-4.4 6.6-6.5 10.5-6.5S41 31.6 44 36c-3 4.4-6.6 6.5-10.5 6.5S26 40.4 23 36z"/><circle cx="33.5" cy="36" r="2.4"/></>,
  key: <><circle cx="14" cy="24" r="7.5"/><circle cx="14" cy="24" r="2.2"/><path d="M21.5 24H43M36 24v6M41 24v4.5"/></>,
  paste: <><circle cx="24" cy="7.5" r="4"/><path d="M24 11.5v10m-3.5-3.5 3.5 3.5 3.5-3.5"/><rect x="4" y="27" width="40" height="13" rx="1.5"/><path d="M10 30.5v6"/></>,
};
function StepIcon({ name }: { name: IconName }) {
  return <svg className="step-icon" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{iconPaths[name]}</svg>;
}
export function Done({ children }: { children: ReactNode }) {
  return <p className="step-done"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>{children}</p>;
}
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });

export function ConnectionKeys({ client, keys, onChange, disabled, connected, shared, share, sharePanel }: {
  client: SupabaseClient; keys: ConnectionKey[]; onChange: (keys: ConnectionKey[]) => void; disabled: boolean;
  connected: boolean; shared: boolean; share: ReactNode; sharePanel: ReactNode;
}) {
  const [read,setRead] = useState(true), [deliver,setDeliver] = useState(true);
  const [issued,setIssued] = useState<IssuedConnectionKey | null>(null), [visible,setVisible] = useState(false);
  const [busy,setBusy] = useState(false), [error,setError] = useState(''), [message,setMessage] = useState('');
  const [instructions,setInstructions] = useState(false), [open,setOpen] = useState(!connected);
  const live = useRef(true), pending = useRef(false), result = useRef<HTMLDivElement>(null);
  const locked = busy || disabled;
  const active = keys.filter(key => Date.parse(key.expires_at) > Date.now());
  useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
  useEffect(()=>{if(issued)result.current?.focus();},[issued]);
  async function act(work:()=>Promise<void>) {
    if(pending.current || disabled)return;
    pending.current=true;setBusy(true);setError('');setMessage('');
    try {await work();} catch(failure) {if(live.current)setError(connectionError(failure));}
    finally {pending.current=false;if(live.current)setBusy(false);}
  }
  async function issue() {
    const value = await accountRequest<IssuedConnectionKey>(client,{action:'create_key',label:'Muse',permissions:{read_summary:read,deliver_drafts:deliver}});
    if(!live.current)return;
    setIssued(value);setVisible(false);onChange([value.key,...active]);
  }
  async function copy(value:string, secret=false) {
    setError('');
    try {await navigator.clipboard.writeText(value);if(live.current)setMessage(secret?'キーをコピーしました。Museの貼り付け欄に貼ってください。':'コピーしました。Museのチャットに貼ってください。');}
    catch {if(live.current){setMessage('');setError(secret?'コピーできませんでした。「表示」を押して、キーを選んでコピーしてください。':'コピーできませんでした。下の文を選んでコピーしてください。');if(!secret)setInstructions(true);}}
  }
  return <section className="connect-block" id="connection-key" aria-labelledby="connect-title">
    <div className="block-head"><p className="kicker" lang="en">Connect</p><h2 id="connect-title">Museとつなぐ</h2>{connected && <Done>つながっています</Done>}</div>
    <details className="connect-guide" open={open} onToggle={event=>setOpen(event.currentTarget.open)}>
      <summary>{connected ? 'つなぎ直す' : 'つなぎ方'}</summary>
      <ol className="connect-steps">
        <li className={shared ? 'connect-step is-done' : 'connect-step'}>
          <div className="step-top"><span className="step-number">1</span><StepIcon name="share"/></div>
          <h3>Museと共有することを決める</h3>
          <fieldset className="step-permissions" disabled={locked}><legend className="visually-hidden">Museと共有すること</legend>
            <label><input type="checkbox" checked={read} onChange={e=>setRead(e.target.checked)}/>学習内容</label>
            <label><input type="checkbox" checked={deliver} onChange={e=>setDeliver(e.target.checked)}/>教材を届ける</label>
          </fieldset>
          {share}
          {sharePanel}
        </li>
        <li className="connect-step">
          <div className="step-top"><span className="step-number">2</span><StepIcon name="copy"/></div>
          <h3>Museに依頼する</h3>
          <p>この文をコピーして、Museのチャットに貼ります。あとはMuseが案内します。</p>
          <div className="step-actions"><button className="save-button" type="button" onClick={()=>void copy(connectionInstructions(location.origin))}>コピー</button>
            <button className="text-button" type="button" aria-expanded={instructions} aria-controls="muse-instructions" onClick={()=>setInstructions(!instructions)}>{instructions?'閉じる':'中身を見る'}</button></div>
          {instructions && <label className="connect-instructions" id="muse-instructions"><span className="visually-hidden">Museに依頼する文</span><textarea readOnly rows={12} value={connectionInstructions(location.origin)} onFocus={e=>e.target.select()}/></label>}
        </li>
        <li className={active.length ? 'connect-step is-done' : 'connect-step'}>
          <div className="step-top"><span className="step-number">3</span><StepIcon name="key"/></div>
          <h3>接続キーを作る</h3>
          <p>Museと接続するためのキーを作成します。</p>
          <form onSubmit={e=>{e.preventDefault();void act(issue);}}>
            <div className="step-actions"><button className="save-button" disabled={locked || (!read && !deliver)}>{busy?'作っています…':'キーを作る'}</button></div>
          </form>
          {!read && !deliver && <p className="step-wait">①で共有することを選んでください</p>}
          {active.length > 0 && !issued && <Done>作成済み・{shortDate(active[0].expires_at)}まで</Done>}
        </li>
        <li className={issued ? 'connect-step is-current' : 'connect-step'}>
          <div className="step-top"><span className="step-number">4</span><StepIcon name="paste"/></div>
          <h3>Museの貼り付け欄に貼る</h3>
          <p>キーをコピーして、Museが開いた貼り付け欄に貼ります。</p>
          {issued ? <div ref={result} tabIndex={-1} className="step-key">
            <label><span className="visually-hidden">今回のキー</span><input type={visible?'text':'password'} readOnly value={issued.token} autoComplete="off" spellCheck={false} onFocus={e=>e.target.select()}/></label>
            <div className="step-actions"><button className="save-button" type="button" onClick={()=>void copy(issued.token,true)}>キーをコピー</button>
              <button className="text-button" type="button" aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?'隠す':'表示'}</button>
              <button className="text-button" type="button" onClick={()=>{setIssued(null);setVisible(false);setMessage('');}}>閉じる</button></div>
            <p className="step-note">このキーは今だけ表示されます。チャットには貼りません。</p>
          </div> : <p className="step-wait">③のあとで</p>}
        </li>
      </ol>
    </details>
    {error && <p className="connect-error" role="alert">{error}</p>}
    <p className="connect-message" role="status">{message}</p>
    {keys.length > 0 && <div className="connect-keylist"><h3>作ったキー</h3>
      <ul className="connect-rows">{keys.map(key=>{const expired=Date.parse(key.expires_at)<=Date.now();return <li key={key.id}><div>
        <h4>{key.label}</h4><p>{[key.read_summary?'読む':'',key.deliver_drafts?'届ける':''].filter(Boolean).join('・')} ／ {expired?'期限切れ':`${shortDate(key.expires_at)}まで`}</p></div>
        <button className="text-button" type="button" disabled={locked} onClick={()=>void act(async()=>{
          await accountRequest(client,{action:'revoke_key',key_id:key.id});
          if(!live.current)return;
          onChange(keys.filter(k=>k.id!==key.id));if(issued?.key.id===key.id){setIssued(null);setVisible(false);}
          setMessage('キーを無効にしました。Museに残っていれば削除してください。');
        })}>無効にする<span className="visually-hidden">：{key.label}</span></button></li>;})}</ul>
      <p className="step-note">止めたいときは「無効にする」。ログアウトしてもキーは有効です。</p></div>}
  </section>;
}
