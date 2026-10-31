import { useEffect, useId, useRef, useState } from 'react';
import type { LessonDraft } from '../shared/lesson-schema';
import type { Binder, FilingDecision } from './lib/library';

export type FilingStatus =
  | { state: 'open' }
  | { state: 'filed'; binderTitle: string; createdBinder: boolean; pageId: string }
  | { state: 'failed'; message: string };

interface Props {
  draft: LessonDraft;
  model: string | null;
  binders: readonly Binder[];
  kept: boolean;
  inbox?: boolean;
  status: FilingStatus;
  onFile: (decision: FilingDecision) => void;
  onDiscard: () => void;
  onClose: () => void;
}

const levelLabel: Record<LessonDraft['level'], string> = { A2: 'A2 · 短い文から', B1: 'B1 · 理由も伝える', B2: 'B2 · 詳しく伝える' };
const NEW = '__new__';

// Read-only review of one generated page, followed by the learner's explicit filing decision.
export function LessonPreview({ draft, model, binders, kept, inbox = false, status, onFile, onDiscard, onClose }: Props) {
  const title = useRef<HTMLHeadingElement>(null);
  const ids = { destination: useId(), title: useId(), description: useId() };
  const filing = draft.filing;
  const proposedExisting = filing.kind === 'existing' && binders.some(binder => binder.id === filing.binderId) ? filing.binderId : null;
  const [destination, setDestination] = useState<string>(proposedExisting ?? NEW);
  const [newTitle, setNewTitle] = useState(filing.kind === 'new' ? filing.newBinder.title : '');
  const [newDescription, setNewDescription] = useState(filing.kind === 'new' ? filing.newBinder.description : '');
  useEffect(() => {
    title.current?.focus();
    setDestination(proposedExisting ?? NEW);
    setNewTitle(filing.kind === 'new' ? filing.newBinder.title : '');
    setNewDescription(filing.kind === 'new' ? filing.newBinder.description : '');
  }, [draft.draft_id]); // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = destination === NEW ? null : binders.find(binder => binder.id === destination) ?? null;
  const proposedBinder = filing.kind === 'existing' ? binders.find(binder => binder.id === filing.binderId) : null;
  const canFile = status.state !== 'filed' && (chosen !== null || (newTitle.trim().length > 0 && newDescription.trim().length > 0));

  function file() {
    if (!canFile) return;
    onFile(chosen ? { kind: 'existing', binderId: chosen.id } : { kind: 'new', title: newTitle.trim(), description: newDescription.trim() });
  }

  return <section className="lesson-preview" aria-labelledby="preview-title">
    <div className="preview-head">
      <div>
        <p className="preview-kicker">できあがったページ</p>
        <h2 id="preview-title" ref={title} tabIndex={-1}>{draft.title}</h2>
      </div>
      <dl className="preview-meta">
        <div><dt>レベル</dt><dd>{levelLabel[draft.level]}</dd></div>
        <div><dt>目安</dt><dd>{draft.estimated_minutes}分（モデルの見積もり）</dd></div>
        {model && <div><dt>作成</dt><dd>{model === 'muse-app' ? 'あなたのMuseアプリ' : model}</dd></div>}
      </dl>
    </div>
    <ol className="preview-sentences">
      {draft.sentences.map((sentence, index) => <li key={index}>
        <span lang="en">{sentence.en}</span>
        <span className="preview-native">{sentence.native}</span>
      </li>)}
    </ol>
    <div className="preview-columns">
      <section aria-labelledby="preview-questions">
        <h3 id="preview-questions">話してみる問い</h3>
        <ul>{draft.questions.map((question, index) => <li key={index}>
          <span lang="en">{question.en}</span>
          <span className="preview-native">{question.native}</span>
          <span className="preview-answer"><span lang="en">{question.sample_answer.en}</span> — {question.sample_answer.native}</span>
        </li>)}</ul>
      </section>
      <section aria-labelledby="preview-review">
        <h3 id="preview-review">覚えておきたい表現</h3>
        {draft.review_items.length ? <ul>{draft.review_items.map((item, index) => <li key={index}>
          <span lang="en">{item.expression}</span>
          <span className="preview-native">{item.native}（{item.sentence_index + 1}文目）</span>
        </li>)}</ul> : <p className="preview-native">このページでは特にありません。</p>}
      </section>
    </div>
    <aside className="preview-filing" aria-labelledby="preview-filing-title">
      <h3 id="preview-filing-title">どの本に仕舞いますか</h3>
      <p className="preview-proposal">Museの提案：{filing.kind === 'new'
        ? <>新しい本「{filing.newBinder.title}」</>
        : <>{proposedBinder ? <>既存の本「{proposedBinder.title}」に追加</> : '一覧にない本（提案は無効）'}</>}</p>
      <p className="preview-reason">{filing.reason}</p>
      <p className="preview-tags">{filing.sceneTags.map(tag => <span key={tag}>{tag}</span>)}</p>
      {status.state === 'filed' ? <>
        <p className="preview-filed" role="status">{status.createdBinder ? `新しい本「${status.binderTitle}」を作って、このページを仕舞いました。` : `「${status.binderTitle}」にこのページを仕舞いました。`}</p>
        {inbox && <p className="preview-note">このブラウザの本棚に仕舞いました。連絡が済むと、ほかの端末の受信箱からも消えます。</p>}
        <div className="filing-actions"><a className="save-button" href={`/?page=${status.pageId}`}>このページを机で練習する</a><button type="button" className="text-button" onClick={onClose}>閉じる</button></div>
      </> : <>
        <div className="filing-form">
          <label htmlFor={ids.destination}>仕舞う先</label>
          <select id={ids.destination} value={destination} onChange={event => setDestination(event.target.value)}>
            <option value={NEW}>{filing.kind === 'new' ? `新しい本「${filing.newBinder.title}」を作る` : '新しい本を作る'}</option>
            {binders.map(binder => <option key={binder.id} value={binder.id}>{binder.title}（既存）</option>)}
          </select>
          {destination === NEW && <div className="new-binder">
            <label htmlFor={ids.title}>本の名前</label>
            <input id={ids.title} value={newTitle} maxLength={80} onChange={event => setNewTitle(event.target.value)} />
            <label htmlFor={ids.description}>どんな本か</label>
            <input id={ids.description} value={newDescription} maxLength={240} onChange={event => setNewDescription(event.target.value)} />
          </div>}
        </div>
        {status.state === 'failed' && <p className="error" role="alert">{status.message}</p>}
        {inbox && <p className="preview-note">「仕舞う」でこのブラウザの本棚へ。「使わない」で削除。どちらも、すべての端末の受信箱から消えます。</p>}
        <div className="filing-actions">
          <button type="button" className="save-button" onClick={file} disabled={!canFile}>
            {chosen ? `「${chosen.title}」に仕舞う` : newTitle.trim() ? `新しい本「${newTitle.trim()}」を作って仕舞う` : '新しい本を作って仕舞う'}
          </button>
          <button type="button" className="text-button" onClick={onDiscard}>このページは使わない</button>
        </div>
        <p className="preview-note">{inbox ? '決めるまで、受信箱に置いておけます。' : kept
          ? '仕舞うまで、このページは「仕分けを待つページ」に置いてあります。新しい本は、ここで決めたときだけ作られます。'
          : 'このブラウザに置けなかったため、仕舞わずに画面を閉じると消えます。'}</p>
      </>}
    </aside>
  </section>;
}
