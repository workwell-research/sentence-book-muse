import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/lora/latin-400.css';
import '@fontsource/lora/latin-400-italic.css';
import { StudyDesk } from './desk/StudyDesk';
import { HandwritingDemo } from './handwriting/HandwritingDemo';
const Setup = lazy(() => import('./App').then(module => ({ default: module.App })));
const setup = window.location.pathname === '/setup';
createRoot(document.getElementById('root')!).render(<StrictMode>{setup ? <Suspense fallback={<p>開いています…</p>}><Setup /></Suspense> : window.location.pathname==='/handwriting' ? <HandwritingDemo /> : <StudyDesk />}</StrictMode>);
