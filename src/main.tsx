import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/lora/latin-400.css';
import '@fontsource/lora/latin-400-italic.css';
import { StudyDesk } from './desk/StudyDesk';
import { HandwritingDemo } from './handwriting/HandwritingDemo';
import { resolveRoute } from './lib/routes';

const pages = {
  shelf: lazy(() => import('./ShelfPage').then(module => ({ default: module.ShelfPage }))),
  inbox: lazy(() => import('./InboxPage').then(module => ({ default: module.InboxPage }))),
  settings: lazy(() => import('./SettingsPage').then(module => ({ default: module.SettingsPage }))),
  consent: lazy(() => import('./Connect').then(module => ({ default: module.Connect }))),
};
const { route, replace } = resolveRoute(window.location.pathname, window.location.hash, window.location.search);
if (replace) window.history.replaceState(null, '', replace);
const Page = route === 'desk' ? StudyDesk : route === 'handwriting' ? HandwritingDemo : pages[route];
createRoot(document.getElementById('root')!).render(<StrictMode><Suspense fallback={<p>開いています…</p>}><Page /></Suspense></StrictMode>);
