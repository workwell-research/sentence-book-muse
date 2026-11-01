import { useState } from 'react';
import type { ReactNode } from 'react';
import { readPendingDrafts } from './lib/generation';
import './header.css';

export type Destination = 'desk' | 'shelf' | 'inbox' | 'settings';
const destinations: { id: Destination; href: string; label: string }[] = [
  { id: 'desk', href: '/', label: 'Desk' },
  { id: 'shelf', href: '/shelf', label: 'Folder' },
  { id: 'inbox', href: '/inbox', label: 'Inbox' },
  { id: 'settings', href: '/settings', label: 'Settings' },
];

// Pages that do not know the cloud inbox still show the pages waiting in this browser.
function localPendingCount(): number {
  try { const read = readPendingDrafts(window.localStorage); return read.kind === 'ready' ? read.drafts.length : 0; }
  catch { return 0; }
}

export function AppHeader({ current, inboxCount, wide = false, className = '', children }: {
  current?: Destination; inboxCount?: number; wide?: boolean; className?: string; children?: ReactNode;
}) {
  const [local] = useState(localPendingCount);
  const count = inboxCount ?? local;
  return <header className={`app-header${wide ? ' is-wide' : ''}${className ? ' ' + className : ''}`}>
    <a className="app-wordmark" href="/">The Sentence Book</a><span className="app-tagline" lang="en">with Muse</span>
    <nav className="app-nav" aria-label="行き先">
      {destinations.map(d => <a key={d.id} href={d.href} aria-current={current === d.id ? 'page' : undefined}>
        {d.label}{d.id === 'inbox' && count > 0 && <span className="app-count">{count}</span>}
      </a>)}
    </nav>
    {children && <div className="app-header-extra">{children}</div>}
  </header>;
}

export function PageFooter() {
  return <footer className="page-footer"><span>The Sentence Book <i lang="en">with Muse</i></span><span>一文ずつ、あなたのペースで。</span></footer>;
}
