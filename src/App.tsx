import './styles.css';
import { useId, useRef, useState } from 'react';
import { InterestSetup } from './InterestSetup';
import { LessonPreview } from './LessonPreview';
import { readInterests } from './lib/interests';
import type { InterestRead } from './lib/interests';
import { EMPTY_NOTE, readNote, saveNote } from './lib/composer';
import type { ComposerNote, Level, NoteRead } from './lib/composer';
import { draftTicket, readPendingDrafts, requestFingerprint, requestLesson, savePendingDraft } from './lib/generation';
import type { DraftTicket, GenerationOutcome, PendingRead } from './lib/generation';
import { createGenerationRequest } from '../shared/generation-request';

function restore(): NoteRead {
  try { return readNote(window.localStorage); } catch { return { kind: 'unreadable' }; }
}

function restoreInterests(): InterestRead {
  try { return readInterests(window.localStorage); } catch { return { kind: 'unreadable' }; }
}

function restorePending(): PendingRead {
  try { return readPendingDrafts(window.localStorage); } catch { return { kind: 'unreadable' }; }
}

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
  const [generating, setGenerating] = useState(false);
  const [outcome, setOutcome] = useState<(GenerationOutcome & { saved?: boolean }) | null>(null);
  const ticket = useRef<DraftTicket | null>(null);
  const interests = profile.kind === 'ready' ? profile.profile.interests : [];
  const canGenerate = !blocked && !generating && (note.topic.trim().length > 0 || interests.length > 0);

  async function generate() {
    if (!canGenerate) return;
    // The same content keeps its draft ID across retries; edited content gets a new one.
    ticket.current = draftTicket(ticket.current, requestFingerprint({ ...note, interests, binderIds: [] }), () => crypto.randomUUID());
    let request;
    try { request = createGenerationRequest(ticket.current.id, note, interests, []); }
    catch { setOutcome({ kind: 'failed', code: 'invalid_request', message: '関心を選ぶか、話したいことを書いてから作ってください。', retryable: false }); return; }
    setGenerating(true);
    setOutcome(null);
    const result = await requestLesson(fetch, request);
    if (result.kind === 'ready') {
      let saved = false;
      try { setPending({ kind: 'ready', drafts: savePendingDraft(window.localStorage, result.draft) }); saved = true; } catch { saved = false; }
      setOutcome({ ...result, saved });
    } else setOutcome(result);
    setGenerating(false);
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
        <section className="library" id="shelf" aria-labelledby="shelf-title">
          <div className="section-heading"><h2 id="shelf-title">あなたの本棚</h2><span>0 冊</span></div>
          <div className="empty-shelf">
            <span className="empty-shelf-rule" aria-hidden="true" />
            <h3>はじまりは、まだ白紙。</h3>
            <p>テーマは、これから。<br />話したいことに合わせて育てていく本棚です。</p>
          </div>
          <div className="shelf-edge" aria-hidden="true" />
          <p className="shelf-caption">教材づくりが始まったら、仕舞う先を提案します。<br />新しい本を増やすときは、あなたが確認してから。</p>
          <div className="inbox-line"><span>仕分けを待つページ</span><span>{pending.kind === 'ready' ? `${pending.drafts.length} ページ` : '読み込めません'}</span></div>
        </section>
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
              {outcome?.kind === 'failed' && <p className="error generation-error" role="alert">{outcome.message}</p>}
            </div>
          </form>
        </section>
      </div>
      {outcome?.kind === 'ready' && <LessonPreview draft={outcome.draft} model={outcome.model} binders={[]} saved={outcome.saved ?? false} />}
      </>}
    </main>
    <footer><span>The Sentence Book <i>with Muse</i></span><span>あなたのペースで、一文ずつ。</span></footer>
  </>;
}
