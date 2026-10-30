import { z } from 'zod';
import { isGenerationErrorCode, rateLimitMessage } from '../../shared/generation-api';
import type { GenerationErrorCode } from '../../shared/generation-api';
import { validateLookup } from '../../shared/lookup-schema';
import type { LookupRequest, LookupResult } from '../../shared/lookup-schema';
import type { CopyRecord, LookupEntry } from '../desk/core';

// Browser side of /api/lookup, the learner's word picking, and where a looked-up word is kept.

export type LookupFailureCode = GenerationErrorCode | 'network' | 'unexpected';
export type LookupOutcome =
  | { kind: 'ready'; result: LookupResult; model: string }
  | { kind: 'failed'; code: LookupFailureCode; message: string; retryable: boolean };

const failureText: Record<LookupFailureCode, { message: string; retryable: boolean }> = {
  invite_required: { message: '招待コードを入力して、もう一度お試しください。', retryable: false },
  invalid_invite: { message: '招待コードを確認してください。', retryable: false },
  access_denied: { message: 'いつものアプリのURLから開き直してください。', retryable: false },
  method_not_allowed: { message: '調べる入口が見つかりませんでした。', retryable: false },
  generation_unavailable: { message: '調べる機能はまだ使えません。サーバー側の接続設定が済むまでお待ちください。', retryable: false },
  request_too_large: { message: '選んだ語句が長すぎます。短く選び直してください。', retryable: false },
  invalid_request: { message: '調べる語句は、その文の中から選んでください。', retryable: false },
  upstream_auth: { message: 'モデルへの接続設定が受け付けられませんでした。管理者が接続キーを確認する必要があります。', retryable: false },
  upstream_rate_limited: { message: '今は混み合っています。少し待ってからもう一度お試しください。', retryable: true },
  upstream_timeout: { message: '調べるのに時間がかかりすぎました。もう一度お試しください。', retryable: true },
  upstream_error: { message: '意味を受け取れませんでした。もう一度お試しください。', retryable: true },
  invalid_output: { message: '受け取った意味が選んだ語句と合わなかったため、採用しませんでした。もう一度お試しください。', retryable: true },
  rate_limited: { message: rateLimitMessage(undefined), retryable: true },
  network: { message: '通信できませんでした。接続を確認して、もう一度お試しください。', retryable: true },
  unexpected: { message: '意味を受け取れませんでした。もう一度お試しください。', retryable: true },
};
const failed = (code: LookupFailureCode): LookupOutcome => ({ kind: 'failed', code, ...failureText[code] });

export async function requestLookup(fetchFn: typeof fetch, request: LookupRequest): Promise<LookupOutcome> {
  let response: Response;
  try {
    response = await fetchFn('/api/lookup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) });
  } catch { return failed('network'); }
  let body: unknown;
  try { body = await response.json(); } catch { return failed(response.ok ? 'unexpected' : 'upstream_error'); }
  if (!response.ok) {
    const error = (body as { error?: { code?: unknown; reason?: unknown } })?.error;
    const outcome = failed(isGenerationErrorCode(error?.code) ? error.code : 'unexpected');
    if (outcome.kind === 'failed' && error?.reason === 'rate_limit_unavailable') return { ...outcome, message: '利用回数を確認できないため、いったん止めています。少し待ってから、もう一度お試しください。', retryable: true };
    if (outcome.kind === 'failed' && outcome.code === 'rate_limited') return { ...outcome, message: rateLimitMessage(error?.reason) };
    return outcome.kind === 'failed' && typeof error?.reason === 'string' ? { ...outcome, message: `${outcome.message}（理由: ${error.reason}）` } : outcome;
  }
  // The browser re-validates: the meaning must be for exactly the span the learner picked.
  const validated = validateLookup((body as { result?: unknown })?.result, request);
  if (!validated.success) return failed('invalid_output');
  const model = (body as { model?: unknown }).model;
  return { kind: 'ready', result: validated.result, model: typeof model === 'string' ? model : 'unknown' };
}

// Words the learner can tap. Offsets are code points, matching the notebook's gloss anchors.
export interface WordToken { text: string; start: number; end: number; word: boolean }
const wordish = (char: string) => /[\p{L}\p{N}'’-]/u.test(char);
export function tokenize(sentence: string): WordToken[] {
  const chars = [...sentence];
  const tokens: WordToken[] = [];
  let i = 0;
  while (i < chars.length) {
    const kind = wordish(chars[i]);
    let j = i;
    while (j < chars.length && wordish(chars[j]) === kind) j++;
    const text = chars.slice(i, j).join('');
    tokens.push({ text, start: i, end: j, word: kind && /[\p{L}\p{N}]/u.test(text) });
    i = j;
  }
  return tokens;
}
export const expressionOf = (sentence: string, start: number, end: number) => [...sentence].slice(start, end).join('');

// A line the learner drew on this page: replaced when the same span is looked up again.
export const MAX_LOOKUPS = 40;
export const lookupId = (sentenceId: string, start: number, end: number) => `lookup-${sentenceId}-${start}-${end}`;
export function addLookup(record: CopyRecord, entry: Omit<LookupEntry, 'id'>): CopyRecord {
  const id = lookupId(entry.sentenceId, entry.start, entry.end);
  const others = record.lookups.filter(lookup => lookup.id !== id);
  if (others.length >= MAX_LOOKUPS) throw new Error(`このページに引ける線は${MAX_LOOKUPS}本までです。`);
  return { ...record, lookups: [...others, { ...entry, id }] };
}

// The shared word list across pages: every line the learner drew, newest first.
export const WORDBOOK_KEY = 'sentence-book-muse:wordbook:v1';
export const MAX_WORDBOOK = 500;
const wordbookEntrySchema = z.strictObject({
  pageId: z.string().min(1).nullable(),
  pageTitle: z.string().min(1).max(160),
  sentenceId: z.string().min(1),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  sentence: z.string().min(1).max(500),
  expression: z.string().min(1).max(120),
  native: z.string().min(1).max(120),
  note: z.string().max(200).nullable(),
  lookedUpAt: z.iso.datetime(),
});
export type WordbookEntry = z.infer<typeof wordbookEntrySchema>;
const wordbookSchema = z.strictObject({ version: z.literal(1), entries: z.array(wordbookEntrySchema).max(MAX_WORDBOOK) });
export type WordbookRead = { kind: 'ready'; entries: WordbookEntry[] } | { kind: 'unreadable' };
type WordbookStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function readWordbook(storage: WordbookStorage): WordbookRead {
  try {
    const raw = storage.getItem(WORDBOOK_KEY);
    if (raw === null) return { kind: 'ready', entries: [] };
    const parsed = wordbookSchema.safeParse(JSON.parse(raw));
    return parsed.success ? { kind: 'ready', entries: parsed.data.entries } : { kind: 'unreadable' };
  } catch { return { kind: 'unreadable' }; }
}
export function saveWordbookEntry(storage: WordbookStorage, entry: WordbookEntry): WordbookEntry[] {
  const current = readWordbook(storage);
  if (current.kind === 'unreadable') throw new Error('unreadable-storage');
  const same = (item: WordbookEntry) => item.pageId === entry.pageId && item.expression.toLowerCase() === entry.expression.toLowerCase();
  const entries = [wordbookEntrySchema.parse(entry), ...current.entries.filter(item => !same(item))].slice(0, MAX_WORDBOOK);
  storage.setItem(WORDBOOK_KEY, JSON.stringify({ version: 1, entries }));
  return entries;
}
