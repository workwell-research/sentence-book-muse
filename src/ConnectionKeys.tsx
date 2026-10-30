import { useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { LESSON_CONTRACT } from '../shared/lesson-schema';
import type { ConnectionKey, IssuedConnectionKey } from '../shared/muse-connection';
import { accountRequest, connectionError } from './lib/muse-client';

export function connectionInstructions(origin: string) {
  const host = new URL(origin).hostname;
  return `Sentence Book Museに、私専用の接続キーでつないでください。まだ教材の作成・送信や定期実行はしません。

1. credentials.request_api_access で APIキー方式の安全な入力画面を出してください。auth_scheme は api_key、配置は bearer_header、送信先は ${host} のみです。OAuthリンクは使いません。キーは私が専用画面に直接入力します。チャットで聞いたり、出力・URL・ファイルに含めたりしないでください。MetaやResendのAPIキーではありません。
2. 入力後は、保存した資格情報をAuthorization: Bearerとして注入するHTTP機能を使います。その機能がなければ、できない点を教えてください。接続成功とはまだ言わないでください。
3. 公開ガイドを GET ${origin}/api/muse/guide で取得してください。
4. 私が要約の読み取りを許可した場合、POST ${origin}/api/muse/learning-state へ Content-Type: application/json、本文 {"delivery_date":"YYYY-MM-DD"} を送り、YYYY-MM-DDは今日の日付に置き換えてください。キーは登録先以外へ送りません。200と返答のstate_version・draft_idを確認できたら、接続できたことだけ知らせてください。

教材を依頼した時だけ：ガイドのJSON Schemaと取得した要約を読み、同じdelivery_date・draft_id・state_versionに合う教材を作成し、POST ${origin}/api/muse/deliver へ {"contract":"${LESSON_CONTRACT}","delivery_date":"YYYY-MM-DD","draft":教材オブジェクト} を送ります。実際のcontractは必ずガイドの値を使ってください。同じ依頼の再送は同じ内容・IDにします。401はキーの失効、403は権限不足、409は要約の未共有・更新などを確認し、無限に再試行しないでください。本に仕舞うのは私が行います。

MCPに直接接続できる場合のURLは ${origin}/mcp です。どちらの方法でも、実際に応答を確認した範囲だけ報告してください。`;
}

export function ConnectionKeys({ client, keys, onChange, disabled }: {
  client: SupabaseClient; keys: ConnectionKey[]; onChange: (keys: ConnectionKey[]) => void; disabled: boolean;
}) {
  const [label,setLabel] = useState('Muse'), [read,setRead] = useState(false), [deliver,setDeliver] = useState(false);
  const [issued,setIssued] = useState<IssuedConnectionKey | null>(null), [visible,setVisible] = useState(false);
  const [busy,setBusy] = useState(false), [error,setError] = useState(''), [message,setMessage] = useState('');
  const [instructions,setInstructions] = useState(false);
  const live = useRef(true), pending = useRef(false), result = useRef<HTMLDivElement>(null);
  const locked = busy || disabled;
  useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
  useEffect(()=>{if(issued)result.current?.focus();},[issued]);
  async function act(work:()=>Promise<void>) {
    if(pending.current || disabled)return;
    pending.current=true;setBusy(true);setError('');setMessage('');
    try {await work();} catch(failure) {if(live.current)setError(connectionError(failure));}
    finally {pending.current=false;if(live.current)setBusy(false);}
  }
  async function issue() {
    const value = await accountRequest<IssuedConnectionKey>(client,{action:'create_key',label,permissions:{read_summary:read,deliver_drafts:deliver}});
    if(!live.current)return;
    setIssued(value);setVisible(false);onChange([value.key,...keys.filter(k=>Date.parse(k.expires_at)>Date.now())]);
  }
  async function copy(value:string, secret=false) {
    try {await navigator.clipboard.writeText(value);if(live.current)setMessage(secret?'キーをコピーしました。Museの「APIキー」欄へ貼り付けてください。':'接続案内をコピーしました。Museのチャットへ貼り付けてください。');}
    catch {if(live.current){setError(secret?'コピーできませんでした。「キーを表示」で表示し、入力欄から選択してコピーしてください。':'コピーできませんでした。下の接続案内を選択してコピーしてください。');if(!secret)setInstructions(true);}}
  }
  return <section className="connect-section connect-keys" id="connection-key">
    <h2>接続キーでMuseをつなぐ</h2>
    <p>あなたの受信箱専用のキーを発行します。先に接続案内をMuseへ送り、開いた「APIキー」欄にキーを貼り付けてください。</p>
    <div className="filing-actions"><button className="text-button" type="button" onClick={()=>void copy(connectionInstructions(location.origin))}>Museへの接続案内をコピー</button>
      <button className="text-button" type="button" aria-expanded={instructions} onClick={()=>setInstructions(!instructions)}>接続案内を{instructions?'閉じる':'読む'}</button></div>
    {instructions && <label className="connect-instructions">Museへ送る案内<textarea readOnly rows={10} value={connectionInstructions(location.origin)} onFocus={e=>e.target.select()}/></label>}
    {!issued ? <form className="connect-key-form" onSubmit={e=>{e.preventDefault();void act(issue);}}>
      <label>接続の名前<input required maxLength={80} value={label} disabled={locked} onChange={e=>setLabel(e.target.value)} autoComplete="off"/></label>
      <fieldset disabled={locked}><legend>Museに許可すること</legend>
        <label><input type="checkbox" checked={read} onChange={e=>setRead(e.target.checked)}/>共有した学習の要約を読む</label>
        <label><input type="checkbox" checked={deliver} onChange={e=>setDeliver(e.target.checked)}/>教材を自分の受信箱へ届ける</label>
      </fieldset>
      <p className="connect-note">教材を作って届けてもらう場合は、両方を選びます。要約の共有は上の欄で別途行います。有効期間は30日、キーは5個までです。</p>
      <button className="save-button" disabled={locked || (!read && !deliver) || !label.trim()}> {busy?'発行しています…':'この権限でキーを発行'}</button>
    </form> : <div ref={result} tabIndex={-1} className="connect-key-result">
      <h3>キーを発行しました</h3><p>この画面を閉じると、同じキーは再表示できません。Museの専用入力欄へ直接貼り付けてください。</p>
      <label>今回の接続キー<input type={visible?'text':'password'} readOnly value={issued.token} autoComplete="off" spellCheck={false} onFocus={e=>e.target.select()}/></label>
      <div className="filing-actions"><button className="save-button" type="button" onClick={()=>void copy(issued.token,true)}>キーをコピー</button>
        <button className="text-button" type="button" aria-pressed={visible} onClick={()=>setVisible(!visible)}>キーを{visible?'隠す':'表示'}</button>
        <button className="text-button" type="button" onClick={()=>{setIssued(null);setVisible(false);setMessage('キーの表示を閉じました。接続キー自体は有効です。');}}>表示を閉じる</button></div>
      <p className="connect-note">有効期限：{new Date(issued.key.expires_at).toLocaleString('ja-JP')}。チャット本文には貼らないでください。</p>
    </div>}
    {error && <p className="connect-error" role="alert">{error}</p>}
    <p className="connect-message" role="status">{message}</p>
    <h3>発行した接続キー</h3>
    {!keys.length ? <p className="connect-note">まだ発行していません。</p> : <ul className="connect-inbox">{keys.map(key=><li key={key.id}><div>
      <h4>{key.label}</h4><p>{[key.read_summary?'要約を読む':'',key.deliver_drafts?'教材を届ける':''].filter(Boolean).join(' ／ ')}</p>
      <p>{Date.parse(key.expires_at)<=Date.now()?'期限切れ':'有効期限'}：{new Date(key.expires_at).toLocaleString('ja-JP')}</p></div>
      <button className="text-button" type="button" disabled={locked} onClick={()=>void act(async()=>{
        await accountRequest(client,{action:'revoke_key',key_id:key.id});
        if(!live.current)return;
        onChange(keys.filter(k=>k.id!==key.id));if(issued?.key.id===key.id){setIssued(null);setVisible(false);}
        setMessage('このキーを無効にしました。Muse側にも残っていれば削除してください。');
      })}>キーを無効にする<span className="visually-hidden">：{key.label}</span></button></li>)}</ul>}
    <p className="connect-note">ログアウトしても接続キーは有効です。接続を止めるときは「キーを無効にする」を選んでください。キーをなくした場合も、ここから無効にして発行し直せます。</p>
  </section>;
}
