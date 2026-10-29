import { useEffect, useRef } from 'react';
import type { LessonDraft } from '../shared/lesson-schema';

interface Props {
  draft: LessonDraft;
  model: string;
  binders: readonly { id: string; title: string }[];
  saved: boolean;
}

const levelLabel: Record<LessonDraft['level'], string> = { A2: 'A2 · 短い文から', B1: 'B1 · 理由も伝える', B2: 'B2 · 詳しく伝える' };

// Read-only review of one generated page. Filing it is a separate, explicit step.
export function LessonPreview({ draft, model, binders, saved }: Props) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus(); }, [draft.draft_id]);
  const filing = draft.filing;
  const existing = filing.kind === 'existing' ? binders.find(binder => binder.id === filing.binderId) : null;
  return <section className="lesson-preview" aria-labelledby="preview-title">
    <div className="preview-head">
      <div>
        <p className="preview-kicker">できあがったページ</p>
        <h2 id="preview-title" ref={title} tabIndex={-1}>{draft.title}</h2>
      </div>
      <dl className="preview-meta">
        <div><dt>レベル</dt><dd>{levelLabel[draft.level]}</dd></div>
        <div><dt>目安</dt><dd>{draft.estimated_minutes}分（モデルの見積もり）</dd></div>
        <div><dt>作成</dt><dd>{model}</dd></div>
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
      <h3 id="preview-filing-title">仕舞う先の提案</h3>
      {filing.kind === 'new'
        ? <p><strong>新しい本「{filing.newBinder.title}」</strong><br />{filing.newBinder.description}</p>
        : <p><strong>既存の本「{existing?.title ?? '不明な本'}」に追加</strong></p>}
      <p className="preview-reason">{filing.reason}</p>
      <p className="preview-tags">{filing.sceneTags.map(tag => <span key={tag}>{tag}</span>)}</p>
      <p className="preview-note">{saved
        ? 'このページは「仕分けを待つページ」に置きました。本棚への追加と仕舞う先の確定は、あなたが確認してから行います（次の工程で実装）。'
        : 'このブラウザに置けなかったため、画面を閉じると消えます。'}</p>
    </aside>
  </section>;
}
