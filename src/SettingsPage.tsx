import { useEffect, useState } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { AppHeader, LanguageSwitch, PageFooter } from './AppHeader';
import { ConnectionKeys } from './ConnectionKeys';
import { AccountLine, ConnectionsList, EnrollBlock, Feedback, Login, ShareSection, isConnected, useAccount, useMuseSession } from './museSession';
import { EMPTY_NOTE, dayLabel, readNote, saveNote, scheduleRequest } from './lib/composer';
import type { ComposerNote, Level, NoteRead } from './lib/composer';
import { buildLearningSummary } from './lib/learning-summary';
import { useT } from './lib/lang';
import { accountRequest, connectionError, museClient } from './lib/muse-client';
import { weekdays } from '../shared/muse-connection';
import './styles.css';
import './connect.css';

// Settings: the things decided once. ① the Muse connection, ② the lessons Muse makes.
export function SettingsPage() {
  const muse = useMuseSession(), t = useT();
  // Saving lesson settings can publish a new shared version; the connection section must then read the account again.
  const [reshared, setReshared] = useState(0);
  return <div className="connect-page">
    <a className="skip-link" href="#main">{t('本文へ')}</a>
    <AppHeader current="settings"><LanguageSwitch/></AppHeader>
    <main className="page-main" id="main">
      <h1 className="visually-hidden" lang="en">Settings</h1>
      {muse.error ? <section className="connect-block"><div className="block-head"><p className="kicker" lang="en">Muse</p><h2>{t('Museとの接続')}</h2></div><p className="connect-error" role="alert">{muse.error}</p><button className="text-button" onClick={muse.retry}>{t('もう一度読み込む')}</button></section>
        : !muse.ready || !muse.client ? <p className="connect-loading" role="status">{t('開いています…')}</p>
        : muse.session ? <ConnectionSettings key={muse.session.user.id} client={muse.client} session={muse.session} reshared={reshared}/> : <Login client={muse.client}/>}
      <LessonSettings onReshared={() => setReshared(value => value + 1)}/>
    </main>
    <PageFooter/>
  </div>;
}

function ConnectionSettings({client,session,reshared}:{client:SupabaseClient;session:Session;reshared:number}) {
  const actions = useAccount(client, session.user.id), t = useT();
  const {account, refresh, setError} = actions;
  useEffect(()=>{ if (reshared) void refresh().catch(failure=>setError(connectionError(failure))); },[reshared,refresh,setError]);
  return <>
    <AccountLine client={client} session={session} actions={actions}/>
    <Feedback actions={actions} scope="account"/>
    {!account ? <button className="text-button" disabled={actions.busy} onClick={()=>void actions.act(actions.refresh)}>{t('読み込む')}</button>
      : !account.member ? <EnrollBlock client={client} actions={actions}/>
      : <>
        <ConnectionKeys client={client} keys={account.keys??[]} disabled={actions.busy} connected={isConnected(account)} shared={Boolean(account.state?.summary)}
          share={<ShareSection client={client} actions={actions}/>} onChange={keys=>actions.setAccount(current=>current?{...current,keys}:current)}/>
        <ConnectionsList client={client} actions={actions}/>
      </>}
  </>;
}

const levels: [Level, string][] = [['A2', 'A2 · 短い文から（TOEIC 225〜545点ほど）'], ['B1', 'B1 · 理由も伝える（TOEIC 550〜780点ほど）'], ['B2', 'B2 · 詳しく伝える（TOEIC 785〜940点ほど）']];

function restore(): NoteRead {
  try { return readNote(window.localStorage); } catch { return { kind: 'unreadable' }; }
}

// After saving, refresh what Muse reads if the learner already shares with Muse from this browser.
async function reshare(): Promise<'shared' | 'local' | 'failed'> {
  try {
    const client = await museClient();
    const { data } = await client.auth.getSession();
    if (!data.session) return 'local';
    const account = await accountRequest(client);
    if (!account.state?.summary) return 'local';
    await accountRequest(client, { action: 'publish', expected_version: account.state.version, summary: buildLearningSummary(window.localStorage) });
    return 'shared';
  } catch (error) { return error instanceof Error && error.message === 'not_configured' ? 'local' : 'failed'; }
}

function LessonSettings({ onReshared }: { onReshared: () => void }) {
  const t = useT();
  const [initial] = useState(restore);
  const [note, setNote] = useState<ComposerNote>(initial.kind === 'ready' ? initial.note : EMPTY_NOTE);
  const [message, setMessage] = useState('');
  const [shared, setShared] = useState<'shared' | 'local' | 'failed' | null>(null);
  const [saving, setSaving] = useState(false);
  const [scheduleCopied, setScheduleCopied] = useState('');
  const [failed, setFailed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const blocked = initial.kind === 'unreadable';

  function update(patch: Partial<ComposerNote>) {
    setNote(current => ({ ...current, ...patch }));
    setDirty(true); setMessage(''); setShared(null); setFailed(false);
  }
  function toggleDay(day: typeof weekdays[number]) {
    const days = note.days.includes(day) ? note.days.filter(d => d !== day) : weekdays.filter(d => d === day || note.days.includes(d));
    if (days.length) update({ days });
  }
  async function copySchedule() {
    try { await navigator.clipboard.writeText(scheduleRequest(note)); setScheduleCopied(t('コピーしました。Museに貼って送ってください。')); }
    catch { setScheduleCopied(t('コピーできませんでした。もう一度押してください。')); }
  }
  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    try { saveNote(window.localStorage, note); }
    catch { setMessage(t('設定を保存できませんでした。選んだ内容はこの画面に残っています。')); setFailed(true); return; }
    setDirty(false); setFailed(false); setSaving(true); setMessage(t('保存しました。Museとの共有を確かめています…'));
    const result = await reshare();
    setSaving(false); setShared(result);
    if (result !== 'local') onReshared();
    setMessage(result === 'shared' ? t('保存しました。Museと共有している内容も新しくしたので、次のレッスンから使われます。')
      : result === 'local' ? t('保存しました。Museに使ってもらうには、上の「Museとつなぐ」で共有してください。')
      : t('保存しました。ただ、Museとの共有は新しくできませんでした。上の「Museとつなぐ」で共有し直してください。'));
  }

  return <section className="connect-block" id="lessons" aria-labelledby="lessons-title">
    <div className="block-head"><p className="kicker" lang="en">Lessons</p><h2 id="lessons-title">{t('Museに作ってもらうレッスン')}</h2></div>
    <form className="connect-paper lesson-settings" onSubmit={save}>
      <fieldset className="lesson-setting">
        <legend>{t('何から作るか')}</legend>
        <label className="choice"><input type="radio" name="source" checked={note.source === 'conversation'} onChange={() => update({ source: 'conversation' })} /><span><b>{t('会話だけ使う')}</b><small>{t('Museとの会話から作ります。')}</small></span></label>
        <label className="choice"><input type="radio" name="source" checked={note.source === 'conversation_and_social'} onChange={() => update({ source: 'conversation_and_social' })} /><span><b>{t('SNSも参照する')}</b><small>{t('Museが見られるSNSの投稿も使います。')}</small></span></label>
      </fieldset>
      <div className="preferences">
        <label>{t('練習する英語')}<select value={note.level} onChange={event => update({ level: event.target.value as Level })}>
          {levels.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
        </select><small>{t('TOEICの点数は目安です。')}</small></label>
        <label>{t('説明に使う言語')}<select value={note.nativeLanguage} onChange={event => update({ nativeLanguage: event.target.value })}>
          <option value="ja">日本語</option><option value="en">English</option><option value="es">Español</option>
          <option value="fr">Français</option><option value="ko">한국어</option><option value="zh">中文</option>
        </select></label>
      </div>
      <fieldset className="lesson-setting">
        <legend>{t('届けるペース')}</legend>
        <div className="weekdays">{weekdays.map(day => <label key={day} className="weekday"><input type="checkbox" checked={note.days.includes(day)} onChange={() => toggleDay(day)} /><span>{dayLabel(day)}</span></label>)}</div>
        <label className="delivery-time">{t('時間')}<input type="time" value={note.time} required step={300} onChange={event => { if (/^\d\d:\d\d$/.test(event.target.value)) update({ time: event.target.value }); }} /></label>
        <div className="schedule-tell"><button type="button" className="text-button" onClick={() => void copySchedule()}>{t('Museに予定を伝える')}</button><span role="status">{scheduleCopied || t('届ける時間は、Museの予定で決まります。変えたら、Museにも伝えてください。')}</span></div>
      </fieldset>
      {blocked && <p className="error" role="alert">{t('保存した設定を読み込めませんでした。元のデータを守るため、保存を停止しています。')}</p>}
      <div className="form-actions"><button className="save-button" type="submit" disabled={blocked || !dirty || saving}>{t('保存する')}</button></div>
      <p className={failed ? 'save-status error' : 'save-status'} role="status">{message || (dirty ? t('まだ保存されていない変更があります。') : '')}{shared && shared !== 'shared' && <> <a href="#connection-key">{t('Museとつなぐへ')}</a></>}</p>
    </form>
  </section>;
}
