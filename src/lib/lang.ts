import { useCallback, useSyncExternalStore } from 'react';
import { en } from './en';

// Display language of the connection and settings screens. The learner's book keeps its own languages; only the chrome changes.
export type Lang = 'ja' | 'en';
export const LANG_KEY = 'sentence-book-muse:lang:v1';
type LangStorage = Pick<Storage, 'getItem' | 'setItem'>;
type Vars = Record<string, string | number>;

export const isLang = (value: unknown): value is Lang => value === 'ja' || value === 'en';

// `?lang=en` wins and is remembered; otherwise the saved choice; otherwise Japanese.
export function readLang(storage: LangStorage | null, search = ''): Lang {
  const asked = new URLSearchParams(search).get('lang');
  if (isLang(asked)) { try { storage?.setItem(LANG_KEY, asked); } catch { /* the choice still applies to this page */ } return asked; }
  try { const saved = storage?.getItem(LANG_KEY); return isLang(saved) ? saved : 'ja'; } catch { return 'ja'; }
}

let current: Lang = 'ja';
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const currentLang = (): Lang => current;
export function setLang(lang: Lang, storage: LangStorage | null = null): void {
  current = lang;
  try { storage?.setItem(LANG_KEY, lang); } catch { /* the choice still applies to this page */ }
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  listeners.forEach(listener => listener());
}
export function useLang(): Lang { return useSyncExternalStore(subscribe, currentLang, () => 'ja'); }

// Texts are keyed by their Japanese wording. A line without an English version stays Japanese rather than going blank.
export function translate(lang: Lang, ja: string, vars?: Vars): string {
  const text = lang === 'en' ? en[ja] ?? ja : ja;
  return vars ? text.replace(/\{(\w+)\}/g, (match, name: string) => name in vars ? String(vars[name]) : match) : text;
}
export const t = (ja: string, vars?: Vars): string => translate(current, ja, vars);
export function useT(): (ja: string, vars?: Vars) => string {
  const lang = useLang();
  return useCallback((ja: string, vars?: Vars) => translate(lang, ja, vars), [lang]);
}
export const locale = (): string => current === 'en' ? 'en-US' : 'ja-JP';

export function browserStorage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}
