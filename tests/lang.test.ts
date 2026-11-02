import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { en } from '../src/lib/en';
import { LANG_KEY, readLang, setLang, translate } from '../src/lib/lang';
import { scheduleRequest, scheduleText } from '../src/lib/composer';
import { connectionError } from '../src/lib/muse-client';

const memory = () => { const map = new Map<string, string>(); return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, map }; };
afterEach(() => setLang('ja'));

describe('display language', () => {
  it('takes ?lang first, then the saved choice, then Japanese', () => {
    const storage = memory();
    expect(readLang(storage)).toBe('ja');
    expect(readLang(storage, '?lang=en&page=x')).toBe('en');
    expect(storage.map.get(LANG_KEY)).toBe('en');
    expect(readLang(storage)).toBe('en');
    expect(readLang(storage, '?lang=fr')).toBe('en');
    storage.map.set(LANG_KEY, 'zz');
    expect(readLang(storage)).toBe('ja');
    expect(readLang({ getItem: () => { throw new Error('blocked'); }, setItem: () => {} }, '?lang=en')).toBe('en');
    expect(readLang(null)).toBe('ja');
  });

  it('translates by the Japanese wording, fills in values and falls back to Japanese', () => {
    expect(translate('ja', '保存する')).toBe('保存する');
    expect(translate('en', '保存する')).toBe('Save');
    expect(translate('en', '作成済み・{date}まで', { date: '11/30' })).toBe('Created · valid until 11/30');
    expect(translate('ja', '作成済み・{date}まで', { date: '11/30' })).toBe('作成済み・11/30まで');
    expect(translate('en', 'まだ英語がない文')).toBe('まだ英語がない文');
  });

  it('switches the schedule text and the connection errors', () => {
    expect(scheduleText({ days: ['wed', 'mon'], time: '06:30' })).toBe('毎週月・水曜日の6:30');
    setLang('en');
    expect(scheduleText({ days: ['wed', 'mon'], time: '06:30' })).toBe('every Mon, Wed at 6:30');
    expect(scheduleText({ days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], time: '07:00' })).toBe('every day at 7:00');
    expect(scheduleRequest({ days: ['mon'], time: '07:00' })).toContain('every Mon at 7:00');
    expect(connectionError(new Error('unauthorized'))).toMatch(/^Your sign-in has expired/);
    expect(connectionError(new Error('???'))).toBe('Could not finish. Check the connection and try again.');
    setLang('ja');
    expect(connectionError(new Error('unauthorized'))).toMatch(/^ログインの期限が切れました/);
  });

  it('has an English line for every text the connection and settings screens ask for', () => {
    const files = ['src/AppHeader.tsx', 'src/Connect.tsx', 'src/SettingsPage.tsx', 'src/museSession.tsx', 'src/ConnectionKeys.tsx', 'src/lib/muse-client.ts', 'src/lib/composer.ts'];
    const asked = new Set<string>();
    for (const file of files) for (const match of readFileSync(file, 'utf8').matchAll(/\bt\('([^']+)'/g)) asked.add(match[1]);
    for (const line of ['A2 · 短い文から（TOEIC 225〜545点ほど）', 'B1 · 理由も伝える（TOEIC 550〜780点ほど）', 'B2 · 詳しく伝える（TOEIC 785〜940点ほど）', '月', '火', '水', '木', '金', '土', '日',
      ...readFileSync('src/lib/muse-client.ts', 'utf8').matchAll(/:'([^']*[\u3040-\u30ff\u4e00-\u9fff][^']*)',/g).map(m => m[1])]) asked.add(line);
    expect(asked.size).toBeGreaterThan(100);
    const missing = [...asked].filter(line => !(line in en));
    expect(missing).toEqual([]);
    const japanese = Object.entries(en).filter(([, text]) => /[぀-ヿ一-鿿]/.test(text)).map(([key]) => key);
    expect(japanese).toEqual([]);
  });
});
