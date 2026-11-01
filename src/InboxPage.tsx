import { useId, useMemo, useState } from 'react';
import type { LessonDraft } from '../shared/lesson-schema';
import type { InboxItem } from '../shared/muse-connection';
import { AppHeader, PageFooter } from './AppHeader';
import { shortDate } from './ConnectionKeys';
import { LessonPreview } from './LessonPreview';
import type { FilingStatus } from './LessonPreview';
import { Feedback, isConnected, useAccount, useMuseSession } from './museSession';
import { EMPTY_NOTE, readNote, saveTopic } from './lib/composer';
import { readPendingDrafts, removePendingDraft, savePendingDraft } from './lib/generation';
import type { PendingRead } from './lib/generation';
import { MODEL_LABEL_OWN_MUSE, clearImportTicket, importLesson, issueImportTicket, musePromptFor } from './lib/import';
import { FilingFailure, binderCatalogue, fileDraft, readLibrary } from './lib/library';
import type { FilingDecision, LibraryRead } from './lib/library';
import { accountRequest, connectionError } from './lib/muse-client';
import './styles.css';
import './connect.css';

// The inbox: every page not yet filed, whether Muse delivered it or it was pasted in. Opening one leads to the filing decision.
type Reviewing = { source: 'cloud'; item: InboxItem } | { source: 'local'; draft: LessonDraft; model: string | null; kept: boolean };

function restorePending(): PendingRead { try { return readPendingDrafts(window.localStorage); } catch { return { kind: 'unreadable' }; } }
function restoreLibrary(): LibraryRead { try { return readLibrary(window.localStorage); } catch { return { kind: 'unreadable' }; } }

const filingErrorText: Record<FilingFailure['reason'], string> = {
  'unreadable-storage': '保存した本棚を読み込めないため、仕舞えません。元のデータを守るため、上書きしていません。',
  'duplicate-draft': 'このページはすでに本棚に仕舞ってあります。二重には入れません。',
  'unknown-binder': '選んだ本が見つかりませんでした。本棚を読み直して、もう一度選んでください。',
  'invalid-binder': '本の名前と説明を入れてください（名前80文字・説明240文字まで）。',
  'library-full': '本棚がいっぱいです。これ以上は仕舞えません。',
};

export function InboxPage() {
  const muse = useMuseSession();
  const client = muse.session ? muse.client : null;
  const actions = useAccount(client, muse.session?.user.id);
  const { account, busy, act, refresh } = actions;
  const [pending, setPending] = useState<PendingRead>(restorePending);
  const [library, setLibrary] = useState<LibraryRead>(restoreLibrary);
  const [reviewing, setReviewing] = useState<Reviewing | null>(null);
  const [status, setStatus] = useState<FilingStatus>({ state: 'open' });
  const [receiptRetry, setReceiptRetry] = useState<string | null>(null);
  const member = Boolean(account?.member);
  const cloud = member ? account?.inbox ?? [] : [];
  const local = pending.kind === 'ready' ? pending.drafts : [];
  const binders = library.kind === 'ready' ? library.library.binders : [];

  function open(next: Reviewing) { setReviewing(next); setStatus({ state: 'open' }); setLibrary(restoreLibrary()); setReceiptRetry(null); }
  function close() { setReviewing(null); setReceiptRetry(null); }
  async function resolve(draftId: string, outcome: 'filed' | 'discarded') {
    if (!client) return;
    await accountRequest(client, { action: 'resolve', draft_id: draftId, status: outcome });
    setReceiptRetry(null); await refresh();
  }
  // A failed cloud receipt must never undo a successful local filing.
  async function fileCloud(draft: LessonDraft, decision: FilingDecision) {
    try {
      const existing = readLibrary(localStorage);
      if (existing.kind === 'unreadable') throw new Error('unreadable-storage');
      const saved = existing.library.pages.find(page => page.sourceDraftId === draft.draft_id);
      if (saved) {
        const binder = existing.library.binders.find(item => item.id === saved.binderId)!;
        setStatus({ state: 'filed', binderTitle: binder.title, createdBinder: false, pageId: saved.id });
      } else {
        const result = fileDraft(localStorage, draft, 'muse-app', decision);
        setLibrary({ kind: 'ready', library: result.library });
        setStatus({ state: 'filed', binderTitle: result.binder.title, createdBinder: result.createdBinder, pageId: result.page.id });
      }
    } catch (failure) {
      setStatus({ state: 'failed', message: failure instanceof Error && failure.message === 'unreadable-storage'
        ? connectionError(failure) : 'このブラウザに保存できませんでした。この画面を残して、空き容量を確認し、もう一度お試しください。' });
      return;
    }
    setReceiptRetry(draft.draft_id);
    await resolve(draft.draft_id, 'filed');
  }
  function fileLocal(draft: LessonDraft, model: string, decision: FilingDecision) {
    try {
      const result = fileDraft(window.localStorage, draft, model, decision);
      setLibrary({ kind: 'ready', library: result.library });
      try { setPending({ kind: 'ready', drafts: removePendingDraft(window.localStorage, draft.draft_id) }); } catch { /* the page is filed; a stale pending copy is refused as a duplicate */ }
      setStatus({ state: 'filed', binderTitle: result.binder.title, createdBinder: result.createdBinder, pageId: result.page.id });
    } catch (error) {
      setStatus({ state: 'failed', message: error instanceof FilingFailure ? filingErrorText[error.reason] : '本棚に保存できませんでした。ページはこの画面に残っています。' });
    }
  }
  function file(decision: FilingDecision) {
    if (!reviewing) return;
    if (reviewing.source === 'cloud') void act(() => fileCloud(reviewing.item.draft, decision), 'inbox');
    else fileLocal(reviewing.draft, reviewing.model ?? 'muse-spark', decision);
  }
  function discard() {
    if (!reviewing) return;
    if (reviewing.source === 'cloud') { void act(async () => { try { await resolve(reviewing.item.draft_id, 'discarded'); close(); } catch (failure) { setStatus({ state: 'failed', message: connectionError(failure) }); } }, 'inbox'); return; }
    try { setPending({ kind: 'ready', drafts: removePendingDraft(window.localStorage, reviewing.draft.draft_id) }); }
    catch { setPending({ kind: 'unreadable' }); }
    close();
  }
  function received(draft: LessonDraft, kept: boolean) {
    setPending(restorePending());
    open({ source: 'local', draft, model: MODEL_LABEL_OWN_MUSE, kept });
  }

  const rows = [
    ...cloud.map(item => ({ key: 'cloud:' + item.draft_id, title: item.draft.title, meta: `${shortDate(item.received_at)} · ${item.draft.level} · ${item.draft.sentences.length}文 · Museから`,
      active: reviewing?.source === 'cloud' && reviewing.item.draft_id === item.draft_id, open: () => open({ source: 'cloud', item }) })),
    ...local.map(draft => ({ key: 'local:' + draft.draft_id, title: draft.title, meta: `${draft.level} · ${draft.sentences.length}文 · 貼り付け`,
      active: reviewing?.source === 'local' && reviewing.draft.draft_id === draft.draft_id, open: () => open({ source: 'local', draft, model: null, kept: true }) })),
  ];
  const guide = muse.error ? null : !muse.ready ? null
    : !muse.session ? <a href="/settings">Settingsでログインすると、Museから届きます</a>
    : account && !member ? <a href="/settings">Settingsで受信箱をつくる</a>
    : member && !isConnected(account) ? <a href="/settings">SettingsでMuseとつなぐ</a> : null;

  return <div className="connect-page">
    <a className="skip-link" href="#main">本文へ</a>
    <AppHeader current="inbox" inboxCount={rows.length}/>
    <main className="page-main" id="main">
      <section className="connect-block" aria-labelledby="inbox-title">
        <div className="block-head"><h1 id="inbox-title" lang="en">Inbox</h1>
          {muse.session && account && member && <button className="text-button block-action" disabled={busy} onClick={()=>void act(refresh,'inbox')}>更新</button>}
          {muse.session && !account && <button className="text-button block-action" disabled={busy} onClick={()=>void act(refresh,'inbox')}>読み込む</button>}</div>
        <Feedback actions={actions} scope="account"/>
        {muse.error && <p className="connect-error" role="alert">{muse.error} <button className="text-button" onClick={muse.retry}>もう一度読み込む</button></p>}
        {pending.kind === 'unreadable' && <p className="connect-error" role="alert">このブラウザに置いたページを読み込めませんでした。元のデータを守るため、上書きしていません。</p>}
        <div className="connect-paper">
          {rows.length === 0 ? <p className="connect-empty">{!muse.ready && !muse.error ? '開いています…' : 'まだ届いていません。'}{guide && <><br/>{guide}</>}</p>
            : <ul className="connect-rows connect-inbox">{rows.map(row => <li key={row.key} className={row.active ? 'is-open' : undefined}>
              <div><h2>{row.title}</h2><p>{row.meta}</p></div>
              <button className="save-button" disabled={busy} onClick={row.open}>{row.active ? '確認中' : '開く'}</button></li>)}</ul>}
        </div>
        {rows.length > 0 && guide && <p className="step-note">{guide}</p>}
        <Feedback actions={actions} scope="inbox"/>
        {reviewing && <fieldset className="connect-review" disabled={busy}><legend className="visually-hidden">届いたページの確認</legend>
          <button className="text-button review-close" type="button" onClick={close}>閉じる</button>
          <LessonPreview key={reviewing.source === 'cloud' ? reviewing.item.draft_id : reviewing.draft.draft_id}
            draft={reviewing.source === 'cloud' ? reviewing.item.draft : reviewing.draft} model={reviewing.source === 'cloud' ? 'muse-app' : reviewing.model}
            binders={binders} kept={reviewing.source === 'cloud' || reviewing.kept} inbox={reviewing.source === 'cloud'} status={status}
            onFile={file} onDiscard={discard} onClose={close}/>
        </fieldset>}
        {receiptRetry && <p className="connect-error" role="status">このブラウザには仕舞いました。受信箱への連絡だけ、もう一度送ってください。 <button className="text-button" disabled={busy} onClick={()=>void act(()=>resolve(receiptRetry,'filed'),'inbox')}>もう一度送る</button></p>}
      </section>
      <PasteImport catalogue={library.kind === 'ready' ? binderCatalogue(library.library) : []} onReceived={received}/>
    </main>
    <PageFooter/>
  </div>;
}

// Bring your own Muse: copy the request, paste the JSON reply, and the page joins the same inbox.
function PasteImport({ catalogue, onReceived }: { catalogue: { id: string; title: string; description: string }[]; onReceived: (draft: LessonDraft, kept: boolean) => void }) {
  const [note] = useState(() => { try { const read = readNote(window.localStorage); return read.kind === 'ready' ? read.note : null; } catch { return null; } });
  const [topic, setTopic] = useState(note?.topic ?? '');
  const [topicSaved, setTopicSaved] = useState('');
  const [text, setText] = useState('');
  const [message, setMessage] = useState<{ text: string; failed: boolean } | null>(null);
  const [copied, setCopied] = useState('');
  const [epoch, setEpoch] = useState(0);
  const [open, setOpen] = useState(() => location.hash === '#paste');
  const topicId = useId(), importId = useId();
  const level = note?.level ?? EMPTY_NOTE.level, nativeLanguage = note?.nativeLanguage ?? EMPTY_NOTE.nativeLanguage;
  const binderKey = catalogue.map(binder => binder.id).join(',');
  // A locally issued ticket binds the pasted page to this request, like a server draft ID.
  const ticket = useMemo(() => issueImportTicket(window.localStorage, { level, nativeLanguage, binderIds: binderKey ? binderKey.split(',') : [] }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level, nativeLanguage, binderKey, epoch]);
  const prompt = musePromptFor(ticket, { topic }, [], catalogue);

  async function copyPrompt() {
    if (!prompt) return;
    try { await navigator.clipboard.writeText(prompt); setCopied('コピーしました。Museアプリに貼って送ってください。'); }
    catch { setCopied('自動でコピーできませんでした。下の文を選んでコピーしてください。'); }
  }
  function receive() {
    const outcome = importLesson(text, ticket);
    if (outcome.kind === 'failed') { setMessage({ text: outcome.message, failed: true }); return; }
    let kept = false;
    try { savePendingDraft(window.localStorage, outcome.draft); kept = true; } catch { kept = false; }
    clearImportTicket(window.localStorage);
    setEpoch(value => value + 1);
    setText('');
    setMessage({ text: 'ページを受け取りました。上の一覧で確認して、仕舞う先を決めてください。', failed: false });
    onReceived(outcome.draft, kept);
  }

  return <section className="connect-block" aria-labelledby="paste-title">
    <details className="own-muse paste-import" id="paste" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
      <summary id="paste-title">貼り付けて受け取る</summary>
      <div className="connect-paper">
        <label htmlFor={topicId}>作ってほしい話題</label>
        <textarea id={topicId} value={topic} maxLength={2000} rows={3}
          placeholder="たとえば、今日は電車が遅れて、コーヒーを買う時間がなかった。"
          aria-describedby={`${topicId}-saved`}
          onChange={event => { const value = event.target.value; setTopic(value); if (!note) return;
            try { saveTopic(window.localStorage, value); setTopicSaved('話題はこのブラウザに残ります。'); } catch { setTopicSaved('話題を保存できませんでした。書いた文はこの画面に残っています。'); } }} />
        <p className="own-muse-intro" id={`${topicId}-saved`} role="status">{topicSaved}</p>
        {prompt ? <>
          <div className="own-muse-actions"><button type="button" className="text-button" onClick={copyPrompt}>Museへの頼み方をコピー</button><span role="status">{copied}</span></div>
          <textarea className="own-muse-prompt" readOnly value={prompt} rows={5} aria-label="Museへの頼み方" onFocus={event => event.currentTarget.select()} />
        </> : <p className="own-muse-intro">話題を書くと、頼み方ができます。</p>}
        <label htmlFor={importId}>Museの返事（JSON）</label>
        <textarea id={importId} value={text} rows={5} placeholder='{"draft_id": …}' spellCheck={false}
          onChange={event => { setText(event.target.value); setMessage(null); }} />
        <div className="form-actions"><button type="button" className="save-button" onClick={receive} disabled={!text.trim()}>受け取る</button></div>
        <p className={message?.failed ? 'save-status error' : 'save-status'} role="status">{message?.text ?? ''}</p>
      </div>
    </details>
  </section>;
}
