import './styles.css';
import { useId, useRef, useState } from 'react';
import { InterestSetup } from './InterestSetup';
import { LessonPreview } from './LessonPreview';
import type { FilingStatus } from './LessonPreview';
import { Shelf } from './Shelf';
import { readInterests } from './lib/interests';
import type { InterestRead } from './lib/interests';
import { EMPTY_NOTE, readNote, saveNote } from './lib/composer';
import type { ComposerNote, Level, NoteRead } from './lib/composer';
import { draftTicket, readPendingDrafts, removePendingDraft, requestFingerprint, requestLesson, savePendingDraft } from './lib/generation';
import type { DraftTicket, GenerationOutcome, PendingRead } from './lib/generation';
import { FilingFailure, binderCatalogue, fileDraft, readLibrary } from './lib/library';
import type { FilingDecision, LibraryRead } from './lib/library';
import { createGenerationRequest } from '../shared/generation-request';
import type { LessonDraft } from '../shared/lesson-schema';

function restore(): NoteRead {
  try { return readNote(window.localStorage); } catch { return { kind: 'unreadable' }; }
}

function restoreInterests(): InterestRead {
  try { return readInterests(window.localStorage); } catch { return { kind: 'unreadable' }; }
}

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
  const [profile, setProfile] = useState<InterestRead>(restoreInterests);
  const [choosingInterests, setChoosingInterests] = useState(profile.kind !== 'ready');
  function finishInterests() {
    setChoosingInterests(false);
    requestAnimationFrame(() => document.getElementById('compose-title')?.focus());
  }
  const [initial] = useState(restore);
  const [note, setNote] = useState<ComposerNote>(initial.kind === 'ready' ? initial.note : EMPTY_NOTE);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const topicId = useId();
  const blocked = initial.kind === 'unreadable';
  const [pending, setPending] = useState<PendingRead>(restorePending);
  const [library, setLibrary] = useState<LibraryRead>(restoreLibrary);
  const [generating, setGenerating] = useState(false);
  const [failure, setFailure] = useState<Extract<GenerationOutcome, { kind: 'failed' }> | null>(null);
  const [reviewing, setReviewing] = useState<Reviewing | null>(null);
  const ticket = useRef<DraftTicket | null>(null);
  const interests = profile.kind === 'ready' ? profile.profile.interests : [];
  const binders = library.kind === 'ready' ? library.library.binders : [];
  const canGenerate = !blocked && !generating && (note.topic.trim().length > 0 || interests.length > 0);

  async function generate() {
    if (!canGenerate) return;
    // Existing binders go to the model as the only valid destinations; a new one is still only a proposal.
    const catalogue = library.kind === 'ready' ? binderCatalogue(library.library) : [];
    // The same content keeps its draft ID across retries; edited content gets a new one.
    ticket.current = draftTicket(ticket.current, requestFingerprint({ ...note, interests, binderIds: catalogue.map(binder => binder.id) }), () => crypto.randomUUID());
    let request;
    try { request = createGenerationRequest(ticket.current.id, note, interests, catalogue); }
    catch { setFailure({ kind: 'failed', code: 'invalid_request', message: '関心を選ぶか、話したいことを書いてから作ってください。', retryable: false }); return; }
    setGenerating(true);
    setFailure(null);
    const result = await requestLesson(fetch, request);
    if (result.kind === 'ready') {
      let kept = false;
      try { setPending({ kind: 'ready', drafts: savePendingDraft(window.localStorage, result.draft) }); kept = true; } catch { kept = false; }
      setReviewing({ draft: result.draft, model: result.model, kept, status: { state: 'open' } });
    } else setFailure(result);
    setGenerating(false);
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
    setFailed(false);
  }

  function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      saveNote(window.localStorage, note);
      setMessage('このブラウザにメモを保存しました。');
      setDirty(false);
      setFailed(false);
    } catch {
      setMessage('メモを保存できませんでした。入力はこの画面に残っています。文章をコピーして控えてください。');
      setFailed(true);
    }
  }

  return <>
    <a className="skip-link" href={choosingInterests ? "#interests" : "#compose"}>{choosingInterests ? "関心を選ぶ" : "メモを書く"}</a>
    <header className="masthead">
      <a className="wordmark" href={choosingInterests ? "#interests" : "#shelf"}>The Sentence Book<span>自分の言葉を、自分の本に。</span></a>
      <a className="header-link" href={choosingInterests ? "#interests" : "#compose"}>{choosingInterests ? "関心を選ぶ" : "メモを書く"} <span aria-hidden="true">→</span></a>
    </header>
    <main>
      {choosingInterests ? <InterestSetup initial={profile} onDismiss={finishInterests}
        onSaved={saved => { setProfile({ kind: 'ready', profile: saved }); finishInterests(); }} /> : <>
      <section className="intro" aria-labelledby="intro-title">
        <h1 id="intro-title">話したいことから、<br />一ページずつ。</h1>
        <p>旅のこと、日々のこと、大切なこと。<br />自分の言葉で練習するための、小さな本棚です。</p>
      </section>
      <div className="workspace">
        <Shelf library={library} pending={pending} reviewingId={reviewing?.draft.draft_id ?? null} onReview={review} onDiscard={discard} />
        <section className="writing-paper" id="compose" aria-labelledby="compose-title">
          <h2 id="compose-title" tabIndex={-1}>今日は、何を話したい？</h2>
          <p className="paper-intro">今日のひとことや、SNSに書いた短いメモでも。</p>
          <div className="interest-summary">
            <div><span>いまの関心</span><p>{profile.kind === 'ready' && profile.profile.interests.length
              ? profile.profile.interests.join('、') : profile.kind === 'unreadable' ? '保存した関心を読み込めません' : 'まだ選んでいません'}</p></div>
            <button className="text-button" type="button" onClick={() => setChoosingInterests(true)}>関心を変更</button>
          </div>
          <form onSubmit={save}>
            <label htmlFor={topicId}>話したいこと</label>
            <textarea id={topicId} value={note.topic} maxLength={2000} rows={5}
              placeholder="たとえば、今日は電車が遅れて、コーヒーを買う時間がなかった。"
              onChange={event => update({ topic: event.target.value })}
              aria-describedby={`${topicId}-hint`} />
            <div className="field-hint" id={`${topicId}-hint`}><span>ひとことでも、空欄でも大丈夫。</span><span>{note.topic.length} / 2,000</span></div>
            <div className="preferences">
              <label>説明に使う言語<select value={note.nativeLanguage} onChange={event => update({ nativeLanguage: event.target.value })}>
                <option value="ja">日本語</option><option value="en">English</option><option value="es">Español</option>
                <option value="fr">Français</option><option value="ko">한국어</option><option value="zh">中文</option>
              </select></label>
              <label>練習する英語<select value={note.level} onChange={event => update({ level: event.target.value as Level })}>
                <option value="A2">A2 · 短い文から</option><option value="B1">B1 · 理由も伝える</option><option value="B2">B2 · 詳しく伝える</option>
              </select></label>
            </div>
            {blocked && <p className="error" role="alert">保存したメモを読み込めませんでした。元のデータを守るため、保存を停止しています。入力する場合は、文章をコピーして控えてください。</p>}
            <div className="form-actions"><button className="save-button" type="submit" disabled={blocked || !dirty}>メモを保存</button><span>このブラウザだけに保存</span></div>
            <p className={failed ? 'save-status error' : 'save-status'} role="status">{message || (dirty ? 'まだ保存されていない変更があります。' : '')}</p>
            <div className="generation-note">
              <button type="button" className={canGenerate ? 'generate-button' : undefined} onClick={generate} disabled={!canGenerate} aria-busy={generating}>{generating ? 'Muse が教材を作っています…' : '教材を作る'}</button>
              <p>{generating ? '十数秒ほどかかります。このまま待ってください。' : canGenerate
                ? <>関心と話したいことから、英語8文のページを1枚作ります。<br />できたページは、確認してから仕舞います。</>
                : <>関心を選ぶか、話したいことを書くと、教材を作れます。</>}</p>
              {failure && <p className="error generation-error" role="alert">{failure.message}</p>}
            </div>
          </form>
        </section>
      </div>
      {reviewing && <LessonPreview key={reviewing.draft.draft_id} draft={reviewing.draft} model={reviewing.model} binders={binders} kept={reviewing.kept}
        status={reviewing.status} onFile={file} onDiscard={() => discard(reviewing.draft.draft_id)} onClose={() => setReviewing(null)} />}
      </>}
    </main>
    <footer><span>The Sentence Book <i>with Muse</i></span><span>あなたのペースで、一文ずつ。</span></footer>
  </>;
}
