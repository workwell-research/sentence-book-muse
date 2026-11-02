import { useState } from 'react';
import type { ReactNode } from 'react';
import { readPendingDrafts } from './lib/generation';
import { browserStorage, setLang, useLang, useT } from './lib/lang';
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
  const t = useT();
  const [local] = useState(localPendingCount);
  const count = inboxCount ?? local;
  return <header className={`app-header${wide ? ' is-wide' : ''}${className ? ' ' + className : ''}`}>
    <a className="app-wordmark" href="/">The Sentence Book</a><span className="app-tagline" lang="en">with Muse</span>
    <nav className="app-nav" aria-label={t('行き先')}>
      {destinations.map(d => <a key={d.id} href={d.href} aria-current={current === d.id ? 'page' : undefined}>
        {d.label}{d.id === 'inbox' && count > 0 && <span className="app-count">{count}</span>}
      </a>)}
    </nav>
    {children && <div className="app-header-extra">{children}</div>}
  </header>;
}

// Japanese or English for the connection and settings screens; the choice is kept in this browser.
export function LanguageSwitch() {
  const lang = useLang(), t = useT();
  return <div className="lang-switch" role="group" aria-label={t('表示言語')}>
    {(['ja', 'en'] as const).map(value => <button key={value} type="button" lang={value} aria-pressed={lang === value} onClick={() => setLang(value, browserStorage())}>{value === 'ja' ? '日本語' : 'English'}</button>)}
  </div>;
}

export function PageFooter() {
  const t = useT();
  return <footer className="page-footer"><span>The Sentence Book <i lang="en">with Muse</i></span><span>{t('一文ずつ、あなたのペースで。')}</span></footer>;
}
