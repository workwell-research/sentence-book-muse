import { useState } from 'react';
import { AppHeader, PageFooter } from './AppHeader';
import { Shelf } from './Shelf';
import { readLibrary } from './lib/library';
import type { LibraryRead } from './lib/library';
import './styles.css';
import './connect.css';

function restoreLibrary(): LibraryRead {
  try { return readLibrary(window.localStorage); } catch { return { kind: 'unreadable' }; }
}

// The shelf: the books the learner approved, each page opening on the desk.
export function ShelfPage() {
  const [library] = useState<LibraryRead>(restoreLibrary);
  return <div className="connect-page">
    <a className="skip-link" href="#main">本文へ</a>
    <AppHeader current="shelf"/>
    <main className="page-main" id="main"><Shelf library={library}/></main>
    <PageFooter/>
  </div>;
}
