import './styles.css';
import { useId, useMemo, useState } from 'react';
import { LessonPreview } from './LessonPreview';
import type { FilingStatus } from './LessonPreview';
import { Shelf } from './Shelf';
import { EMPTY_NOTE, dayLabel, readNote, saveNote, scheduleRequest } from './lib/composer';
import type { ComposerNote, Level, NoteRead } from './lib/composer';
import { readPendingDrafts, removePendingDraft, savePendingDraft } from './lib/generation';
import type { PendingRead } from './lib/generation';
import { FilingFailure, binderCatalogue, fileDraft, readLibrary } from './lib/library';
import { MODEL_LABEL_OWN_MUSE, clearImportTicket, importLesson, issueImportTicket, musePromptFor } from './lib/import';
import type { FilingDecision, LibraryRead } from './lib/library';
import { buildLearningSummary } from './lib/learning-summary';
import { accountRequest, museClient } from './lib/muse-client';
import type { LessonDraft } from '../shared/lesson-schema';
import { weekdays } from '../shared/muse-connection';

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

const levels: [Level, string][] = [['A2', 'A2 · 短い文から（TOEIC 225〜545点ほど）'], ['B1', 'B1 · 理由も伝える（TOEIC 550〜780点ほど）'], ['B2', 'B2 · 詳しく伝える（TOEIC 785〜940点ほど）']];

function restorePending(): PendingRead {
  try { return readPendingDrafts(window.localStorage); } catch { return { kind: 'unreadable' }; }
}

function restoreLibrary(): LibraryRead {
  try { return readLibrary(window.localStorage); } catch { return { kind: 'unreadable' }; }
}

const filingErrorText: Record<FilingFailure['reason'], string> = {
  'unreadable-storage': '保存した本棚を読み込めないため、仕舞えません。元のデータを守るため、上書きしていません。',
  'duplicate-draft': 'このページはすでに本棚に仕舞ってあります。二重には入れません。',
  'unknown-binder': '選んだ本が見つかりませんでした。本棚を読み直して、もう一度選んでください。',
  'invalid-binder': '本の名前と説明を入れてください（名前80文字・説明240文字まで）。',
  'library-full': '本棚がいっぱいです。これ以上は仕舞えません。',
};

interface Reviewing { draft: LessonDraft; model: string | null; kept: boolean; status: FilingStatus }

export function App() {
  const [initial] = useState(restore);
  const [note, setNote] = useState<ComposerNote>(initial.kind === 'ready' ? initial.note : EMPTY_NOTE);
  const [message, setMessage] = useState('');
  const [shared, setShared] = useState<'shared' | 'local' | 'failed' | null>(null);
  const [saving, setSaving] = useState(false);
  const [scheduleCopied, setScheduleCopied] = useState('');
  const [fallbackOpen, setFallbackOpen] = useState(() => location.hash === '#own-muse');
  const [failed, setFailed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const topicId = useId();
  const blocked = initial.kind === 'unreadable';
  const [pending, setPending] = useState<PendingRead>(restorePending);
  const [library, setLibrary] = useState<LibraryRead>(restoreLibrary);
  const [reviewing, setReviewing] = useState<Reviewing | null>(null);
  // Bring your own Muse: a locally issued ticket binds the pasted page to this request, like a server draft ID.
  const [importText, setImportText] = useState('');
  const [importMessage, setImportMessage] = useState<{ text: string; failed: boolean } | null>(null);
  const [promptCopied, setPromptCopied] = useState('');
  const [ticketEpoch, setTicketEpoch] = useState(0);
  const importId = useId();
  const binders = library.kind === 'ready' ? library.library.binders : [];
  const catalogue = library.kind === 'ready' ? binderCatalogue(library.library) : [];
  const binderKey = catalogue.map(binder => binder.id).join(',');
  const importTicket = useMemo(() => issueImportTicket(window.localStorage, { level: note.level, nativeLanguage: note.nativeLanguage, binderIds: binderKey ? binderKey.split(',') : [] }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [note.level, note.nativeLanguage, binderKey, ticketEpoch]);
  const musePrompt = musePromptFor(importTicket, note, [], catalogue);

  async function copyPrompt() {
    if (!musePrompt) return;
    try { await navigator.clipboard.writeText(musePrompt); setPromptCopied('コピーしました。Museアプリに貼って送ってください。'); }
    catch { setPromptCopied('自動でコピーできませんでした。下の文を選んでコピーしてください。'); }
  }
  function importFromMuse() {
    const outcome = importLesson(importText, importTicket);
    if (outcome.kind === 'failed') { setImportMessage({ text: outcome.message, failed: true }); return; }
    let kept = false;
    try { setPending({ kind: 'ready', drafts: savePendingDraft(window.localStorage, outcome.draft) }); kept = true; } catch { kept = false; }
    setReviewing({ draft: outcome.draft, model: MODEL_LABEL_OWN_MUSE, kept, status: { state: 'open' } });
    clearImportTicket(window.localStorage);
    setTicketEpoch(epoch => epoch + 1);
    setImportText('');
    setImportMessage({ text: 'ページを受け取りました。下で確認して、仕舞う先を決めてください。', failed: false });
  }

  function review(draft: LessonDraft) {
    setReviewing({ draft, model: null, kept: true, status: { state: 'open' } });
  }

  function discard(draftId: string) {
    try { setPending({ kind: 'ready', drafts: removePendingDraft(window.localStorage, draftId) }); }
    catch { setPending({ kind: 'unreadable' }); }
    if (reviewing?.draft.draft_id === draftId) setReviewing(null);
  }

  function file(decision: FilingDecision) {
    if (!reviewing) return;
    try {
      const result = fileDraft(window.localStorage, reviewing.draft, reviewing.model ?? 'muse-spark', decision);
      setLibrary({ kind: 'ready', library: result.library });
      try { setPending({ kind: 'ready', drafts: removePendingDraft(window.localStorage, reviewing.draft.draft_id) }); } catch { /* the page is filed; a stale pending copy is refused as a duplicate */ }
      setReviewing({ ...reviewing, status: { state: 'filed', binderTitle: result.binder.title, createdBinder: result.createdBinder, pageId: result.page.id } });
    } catch (error) {
      const text = error instanceof FilingFailure ? filingErrorText[error.reason] : '本棚に保存できませんでした。ページはこの画面に残っています。';
      setReviewing({ ...reviewing, status: { state: 'failed', message: text } });
    }
  }

  function update(patch: Partial<ComposerNote>) {
    setNote(current => ({ ...current, ...patch }));
    setDirty(true);
    setMessage('');
    setShared(null);
    setFailed(false);
  }
  function toggleDay(day: typeof weekdays[number]) {
    const days = note.days.includes(day) ? note.days.filter(d => d !== day) : weekdays.filter(d => d === day || note.days.includes(d));
    if (days.length) update({ days });
  }
  async function copySchedule() {
    try { await navigator.clipboard.writeText(scheduleRequest(note)); setScheduleCopied('コピーしました。Museに貼って送ってください。'); }
    catch { setScheduleCopied('コピーできませんでした。もう一度押してください。'); }
  }

  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      saveNote(window.localStorage, note);
    } catch {
      setMessage('設定を保存できませんでした。選んだ内容はこの画面に残っています。');
      setFailed(true);
      return;
    }
    setDirty(false); setFailed(false); setSaving(true); setMessage('保存しました。Museとの共有を確かめています…');
    const result = await reshare();
    setSaving(false); setShared(result);
    setMessage(result === 'shared' ? '保存しました。Museと共有している内容も新しくしたので、次のレッスンから使われます。'
      : result === 'local' ? '保存しました。Museに使ってもらうには、受信箱の①で共有してください。'
      : '保存しました。ただ、Museとの共有は新しくできませんでした。受信箱の①で共有し直してください。');
  }

  return <>
    <a className="skip-link" href="#compose">レッスンの設定へ</a>
    <header className="masthead">
      <a className="wordmark" href="/">The Sentence Book</a><span className="tagline" lang="en">with Muse</span>
      <nav aria-label="ページ"><a href="/">机へ</a><a href="/connect">受信箱</a></nav>
    </header>
    <main>
      <h1 className="visually-hidden">本棚とレッスンの設定</h1>
      <div className="workspace">
        <Shelf library={library} pending={pending} reviewingId={reviewing?.draft.draft_id ?? null} onReview={review} onDiscard={discard} />
        <section className="writing-paper" id="compose" aria-labelledby="compose-title">
          <h2 id="compose-title" tabIndex={-1}>Museに作ってもらうレッスン</h2>
          <p className="paper-intro">毎日のレッスンを作るときに、Museが見る設定です。</p>
          <form onSubmit={save}>
            <fieldset className="lesson-setting">
              <legend>何から作るか</legend>
              <label className="choice"><input type="radio" name="source" checked={note.source === 'conversation'} onChange={() => update({ source: 'conversation' })} /><span><b>会話だけ使う</b><small>Museとの会話から作ります。</small></span></label>
              <label className="choice"><input type="radio" name="source" checked={note.source === 'conversation_and_social'} onChange={() => update({ source: 'conversation_and_social' })} /><span><b>SNSも参照する</b><small>Museが見られるSNSの投稿も使います。</small></span></label>
            </fieldset>
            <div className="preferences">
              <label>練習する英語<select value={note.level} onChange={event => update({ level: event.target.value as Level })}>
                {levels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select><small>TOEICの点数は目安です。</small></label>
              <label>説明に使う言語<select value={note.nativeLanguage} onChange={event => update({ nativeLanguage: event.target.value })}>
                <option value="ja">日本語</option><option value="en">English</option><option value="es">Español</option>
                <option value="fr">Français</option><option value="ko">한국어</option><option value="zh">中文</option>
              </select></label>
            </div>
            <fieldset className="lesson-setting">
              <legend>届けるペース</legend>
              <div className="weekdays">{weekdays.map(day => <label key={day} className="weekday"><input type="checkbox" checked={note.days.includes(day)} onChange={() => toggleDay(day)} /><span>{dayLabel(day)}</span></label>)}</div>
              <label className="delivery-time">時間<input type="time" value={note.time} required step={300} onChange={event => { if (/^\d\d:\d\d$/.test(event.target.value)) update({ time: event.target.value }); }} /></label>
              <div className="schedule-tell"><button type="button" className="text-button" onClick={() => void copySchedule()}>Museに予定を伝える</button><span role="status">{scheduleCopied || '届ける時間は、Museの予定で決まります。変えたら、Museにも伝えてください。'}</span></div>
            </fieldset>
            {blocked && <p className="error" role="alert">保存した設定を読み込めませんでした。元のデータを守るため、保存を停止しています。</p>}
            <div className="form-actions"><button className="save-button" type="submit" disabled={blocked || !dirty || saving}>保存する</button><span>Museと共有していれば、共有内容も新しくなります</span></div>
            <p className={failed ? 'save-status error' : 'save-status'} role="status">{message || (dirty ? 'まだ保存されていない変更があります。' : '')}{shared && shared !== 'shared' && <> <a href="/connect">受信箱へ</a></>}</p>
          </form>
          <details className="own-muse" id="own-muse" open={fallbackOpen} onToggle={event => setFallbackOpen(event.currentTarget.open)}>
            <summary>つながらないとき：コピーと貼り付けで受け取る</summary>
            <p className="own-muse-intro">作ってほしい話題を書いて、下の頼み方をMuseアプリに貼って送ります。返ってきた JSON をここに貼ると、同じ確認と仕舞う流れに入ります。</p>
            <label htmlFor={topicId}>作ってほしい話題</label>
            <textarea id={topicId} value={note.topic} maxLength={2000} rows={3}
              placeholder="たとえば、今日は電車が遅れて、コーヒーを買う時間がなかった。"
              onChange={event => setNote(current => ({ ...current, topic: event.target.value }))} />
            {musePrompt ? <>
              <div className="own-muse-actions"><button type="button" className="text-button" onClick={copyPrompt}>Museへの頼み方をコピー</button><span role="status">{promptCopied}</span></div>
              <textarea className="own-muse-prompt" readOnly value={musePrompt} rows={5} aria-label="Museへの頼み方" onFocus={event => event.currentTarget.select()} />
            </> : <p className="own-muse-intro">話題を書くと、頼み方ができます。</p>}
            <label htmlFor={importId}>Museの返事（JSON）</label>
            <textarea id={importId} value={importText} rows={5} placeholder='{"draft_id": …}' spellCheck={false}
              onChange={event => { setImportText(event.target.value); setImportMessage(null); }} />
            <div className="form-actions"><button type="button" className="save-button" onClick={importFromMuse} disabled={!importText.trim()}>確認する</button><span>このブラウザだけで検証</span></div>
            <p className={importMessage?.failed ? 'save-status error' : 'save-status'} role="status">{importMessage?.text ?? ''}</p>
          </details>
        </section>
      </div>
      {reviewing && <LessonPreview key={reviewing.draft.draft_id} draft={reviewing.draft} model={reviewing.model} binders={binders} kept={reviewing.kept}
        status={reviewing.status} onFile={file} onDiscard={() => discard(reviewing.draft.draft_id)} onClose={() => setReviewing(null)} />}
    </main>
    <footer><span>The Sentence Book <i>with Muse</i></span><span>あなたのペースで、一文ずつ。</span></footer>
  </>;
}
