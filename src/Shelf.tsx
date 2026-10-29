import type { LessonDraft } from '../shared/lesson-schema';
import { binderSummaries } from './lib/library';
import type { LibraryRead } from './lib/library';
import type { PendingRead } from './lib/generation';

interface Props {
  library: LibraryRead;
  pending: PendingRead;
  reviewingId: string | null;
  onReview: (draft: LessonDraft) => void;
  onDiscard: (draftId: string) => void;
}

function shortDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : `${date.getMonth() + 1}/${date.getDate()}`;
}

// Binders approved by the learner, then pages still waiting for a filing decision.
export function Shelf({ library, pending, reviewingId, onReview, onDiscard }: Props) {
  const summaries = library.kind === 'ready' ? binderSummaries(library.library) : [];
  return <section className="library" id="shelf" aria-labelledby="shelf-title">
    <div className="section-heading"><h2 id="shelf-title">あなたの本棚</h2><span>{library.kind === 'ready' ? `${summaries.length} 冊` : '読み込めません'}</span></div>
    {library.kind === 'unreadable' && <p className="error" role="alert">保存した本棚を読み込めませんでした。元のデータを守るため、仕舞う操作を止めています。</p>}
    {summaries.length === 0 ? <div className="empty-shelf">
      <span className="empty-shelf-rule" aria-hidden="true" />
      <h3>はじまりは、まだ白紙。</h3>
      <p>テーマは、これから。<br />話したいことに合わせて育てていく本棚です。</p>
    </div> : <ul className="binders">
      {summaries.map(({ binder, pages, lastFiledAt }) => <li key={binder.id} className="binder">
        <details>
          <summary>
            <span className="binder-spine" aria-hidden="true" />
            <span className="binder-title">{binder.title}</span>
            <span className="binder-meta">{pages.length} ページ{lastFiledAt && ` · ${shortDate(lastFiledAt)}`}</span>
          </summary>
          <p className="binder-description">{binder.description}</p>
          <ol className="binder-pages">
            {pages.map(page => <li key={page.id}>
              <span className="page-title">{page.title}</span>
              <span className="page-meta">{page.level} · {shortDate(page.filedAt)} · {page.sentences.length}文</span>
              <span className="page-first" lang="en">{page.sentences[0]?.en}</span>
            </li>)}
          </ol>
        </details>
      </li>)}
    </ul>}
    <div className="shelf-edge" aria-hidden="true" />
    <p className="shelf-caption">{summaries.length === 0
      ? <>教材づくりが始まったら、仕舞う先を提案します。<br />新しい本を増やすときは、あなたが確認してから。</>
      : <>ページは、あなたが確認した本にだけ増えていきます。<br />練習への接続は次の工程です。</>}</p>
    <div className="inbox-line"><span>仕分けを待つページ</span><span>{pending.kind === 'ready' ? `${pending.drafts.length} ページ` : '読み込めません'}</span></div>
    {pending.kind === 'ready' && pending.drafts.length > 0 && <ul className="pending-list">
      {pending.drafts.map(draft => <li key={draft.draft_id} className={draft.draft_id === reviewingId ? 'pending-item is-reviewing' : 'pending-item'}>
        <div>
          <span className="page-title">{draft.title}</span>
          <span className="page-meta">{draft.level} · {draft.sentences.length}文 · {draft.filing.kind === 'new' ? `新しい本「${draft.filing.newBinder.title}」の提案` : '既存の本への提案'}</span>
        </div>
        <div className="pending-actions">
          <button type="button" className="text-button" onClick={() => onReview(draft)}>{draft.draft_id === reviewingId ? '確認中' : '確認して仕舞う'}</button>
          <button type="button" className="text-button" onClick={() => onDiscard(draft.draft_id)}>使わない</button>
        </div>
      </li>)}
    </ul>}
  </section>;
}
