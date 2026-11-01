import { binderSummaries } from './lib/library';
import type { LibraryRead } from './lib/library';

interface Props { library: LibraryRead }

function shortDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : `${date.getMonth() + 1}/${date.getDate()}`;
}

// Binders approved by the learner, each page opening on the desk. Pages still waiting live in the inbox.
export function Shelf({ library }: Props) {
  const summaries = library.kind === 'ready' ? binderSummaries(library.library) : [];
  return <section className="library" id="shelf" aria-labelledby="shelf-title">
    <div className="section-heading"><h1 id="shelf-title">Folder</h1><span>{library.kind === 'ready' ? `${summaries.length} 冊` : '読み込めません'}</span></div>
    {library.kind === 'unreadable' && <p className="error" role="alert">保存した本棚を読み込めませんでした。元のデータを守るため、仕舞う操作を止めています。</p>}
    {summaries.length === 0 ? <div className="empty-shelf">
      <span className="empty-shelf-rule" aria-hidden="true" />
      <h3>はじまりは、まだ白紙。</h3>
      <p>届いたページを仕舞うと、ここに本が増えていきます。<br /><a href="/inbox">Inboxを見る</a></p>
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
              <a className="page-practice" href={`/?page=${page.id}`}>Deskで練習する <span aria-hidden="true">→</span></a>
            </li>)}
          </ol>
        </details>
      </li>)}
    </ul>}
    <div className="shelf-edge" aria-hidden="true" />
  </section>;
}
