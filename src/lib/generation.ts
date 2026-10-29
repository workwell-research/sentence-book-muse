import { z } from 'zod';
import { isGenerationErrorCode } from '../../shared/generation-api';
import type { GenerationErrorCode, GenerationSuccess } from '../../shared/generation-api';
import type { GenerationRequest } from '../../shared/generation-request';
import { lessonDraftSchema, validateLessonDraft } from '../../shared/lesson-schema';
import type { LessonDraft } from '../../shared/lesson-schema';

// Browser side of /api/generate: one request, the same validation as the server, clear failure text.
export type GenerationFailureCode = GenerationErrorCode | 'network' | 'unexpected';
export type GenerationOutcome =
  | { kind: 'ready'; draft: LessonDraft; model: string }
  | { kind: 'failed'; code: GenerationFailureCode; message: string; retryable: boolean };

const failureText: Record<GenerationFailureCode, { message: string; retryable: boolean }> = {
  method_not_allowed: { message: '教材づくりの入口が見つかりませんでした。', retryable: false },
  generation_unavailable: { message: '教材づくりはまだ使えません。サーバー側の接続設定が済むまでお待ちください。', retryable: false },
  request_too_large: { message: '依頼が大きすぎます。話したいことを短くしてください。', retryable: false },
  invalid_request: { message: '関心を選ぶか、話したいことを書いてから作ってください。', retryable: false },
  upstream_auth: { message: 'モデルへの接続設定が受け付けられませんでした。管理者が接続キーを確認する必要があります。', retryable: false },
  upstream_rate_limited: { message: '今は混み合っています。少し待ってからもう一度お試しください。', retryable: true },
  upstream_timeout: { message: '教材づくりに時間がかかりすぎました。もう一度お試しください。', retryable: true },
  upstream_error: { message: 'モデルから教材を受け取れませんでした。もう一度お試しください。', retryable: true },
  invalid_output: { message: '受け取った教材が仕様に合わなかったため、採用しませんでした。もう一度お試しください。', retryable: true },
  network: { message: '通信できませんでした。接続を確認して、もう一度お試しください。', retryable: true },
  unexpected: { message: '教材を受け取れませんでした。もう一度お試しください。', retryable: true },
};

function failed(code: GenerationFailureCode): GenerationOutcome {
  return { kind: 'failed', code, ...failureText[code] };
}

export async function requestLesson(fetchFn: typeof fetch, request: GenerationRequest): Promise<GenerationOutcome> {
  let response: Response;
  try {
    response = await fetchFn('/api/generate', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request),
    });
  } catch { return failed('network'); }
  let body: unknown;
  try { body = await response.json(); } catch { return failed(response.ok ? 'unexpected' : 'upstream_error'); }
  if (!response.ok) {
    const error = (body as { error?: { code?: unknown; reason?: unknown } })?.error;
    const outcome = failed(isGenerationErrorCode(error?.code) ? error.code : 'unexpected');
    // The server's reason code is shown so a failure can be reported precisely without exposing content.
    return outcome.kind === 'failed' && typeof error?.reason === 'string'
      ? { ...outcome, message: `${outcome.message}（理由: ${error.reason}）` } : outcome;
  }
  const success = body as Partial<GenerationSuccess>;
  // The browser re-validates: a tampered or stale server response must not become a page.
  const validated = validateLessonDraft(success.draft, {
    draftId: request.draft_id, level: request.level, nativeLanguage: request.native_language,
    learningStateVersion: request.based_on_learning_state_version, binderIds: request.binders.map(binder => binder.id),
  });
  if (!validated.success) return failed('invalid_output');
  return { kind: 'ready', draft: validated.draft, model: typeof success.model === 'string' ? success.model : 'unknown' };
}

// A draft ID is issued once per distinct request and reused for retries of the same content.
export interface DraftTicket { fingerprint: string; id: string }
export function requestFingerprint(input: { topic: string; level: string; nativeLanguage: string; interests: readonly string[]; binderIds: readonly string[] }): string {
  return JSON.stringify([input.topic.trim(), input.level, input.nativeLanguage, [...input.interests], [...input.binderIds]]);
}
export function draftTicket(previous: DraftTicket | null, fingerprint: string, issue: () => string): DraftTicket {
  if (previous && previous.fingerprint === fingerprint) return previous;
  return { fingerprint, id: issue() };
}

// Reviewed-but-unfiled pages wait in the browser until the learner files them.
export const PENDING_DRAFTS_KEY = 'sentence-book-muse:pending-drafts:v1';
export const MAX_PENDING_DRAFTS = 50;
const pendingSchema = z.strictObject({ schemaVersion: z.literal(1), drafts: z.array(lessonDraftSchema).max(MAX_PENDING_DRAFTS) });
export type PendingRead = { kind: 'ready'; drafts: LessonDraft[] } | { kind: 'unreadable' };
type PendingStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function readPendingDrafts(storage: PendingStorage): PendingRead {
  try {
    const raw = storage.getItem(PENDING_DRAFTS_KEY);
    if (raw === null) return { kind: 'ready', drafts: [] };
    const parsed = pendingSchema.safeParse(JSON.parse(raw));
    return parsed.success ? { kind: 'ready', drafts: parsed.data.drafts } : { kind: 'unreadable' };
  } catch { return { kind: 'unreadable' }; }
}

export function savePendingDraft(storage: PendingStorage, draft: LessonDraft): LessonDraft[] {
  const current = readPendingDrafts(storage);
  if (current.kind === 'unreadable') throw new Error('unreadable-storage');
  const drafts = [draft, ...current.drafts.filter(item => item.draft_id !== draft.draft_id)].slice(0, MAX_PENDING_DRAFTS);
  storage.setItem(PENDING_DRAFTS_KEY, JSON.stringify({ schemaVersion: 1, drafts }));
  return drafts;
}

export function removePendingDraft(storage: PendingStorage, draftId: string): LessonDraft[] {
  const current = readPendingDrafts(storage);
  if (current.kind === 'unreadable') throw new Error('unreadable-storage');
  const drafts = current.drafts.filter(item => item.draft_id !== draftId);
  if (drafts.length !== current.drafts.length) storage.setItem(PENDING_DRAFTS_KEY, JSON.stringify({ schemaVersion: 1, drafts }));
  return drafts;
}
