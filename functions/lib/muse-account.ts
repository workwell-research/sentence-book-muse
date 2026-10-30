import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from 'jose';
import { z } from 'zod';
import type { AccessEnv } from './access';
import { accessConfig } from './access';
import { noStore, readJsonBody } from './route';
import { dailyDraftId, deliverySchema, learningSummarySchema, lessonGuide, permissionsSchema } from '../../shared/muse-connection';
import { validateLessonDraft } from '../../shared/lesson-schema';

export interface MuseEnv extends AccessEnv { SUPABASE_URL?: string; SUPABASE_PUBLISHABLE_KEY?: string; SUPABASE_SECRET_KEY?: string }
export interface Principal { userId: string; sessionId: string | null; clientId: string | null; keyHash?: string }
export class MuseError extends Error { constructor(readonly code: string, readonly status = 400) { super(code); } }
export interface MuseStore {
  authenticate(token: string): Promise<Principal>;
  call<T = unknown>(who: Principal, operation: string, args?: Record<string, unknown>): Promise<T>;
  authorization(token: string, authorizationId: string, userId: string): Promise<{ clientId: string; clientName: string }>;
}
export function museConfig(env: MuseEnv) {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY || !env.SUPABASE_SECRET_KEY) return null;
  try {
    const url = new URL(env.SUPABASE_URL);
    if (url.origin !== env.SUPABASE_URL || url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) return null;
    return { url: url.origin, publishableKey: env.SUPABASE_PUBLISHABLE_KEY, secret: env.SUPABASE_SECRET_KEY };
  } catch { return null; }
}
const uuid = z.uuid();
export async function connectionKeyHash(token: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))), b => b.toString(16).padStart(2,'0')).join('');
}
function newConnectionKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return 'sbm_' + btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function supabaseMuseStore(env: MuseEnv): MuseStore {
  const config = museConfig(env);
  if (!config) throw new MuseError('not_configured', 503);
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, signal: AbortSignal.any([...(init?.signal ? [init.signal] : []), AbortSignal.timeout(12_000)]) }),
  } };
  const auth = createClient(config.url, config.publishableKey, options);
  const db = createClient(config.url, config.secret, options);
  async function oauthClient(clientId: string) {
    const { data, error } = await db.auth.admin.oauth.getClient(clientId);
    if (error) throw new MuseError(error.status === 404 ? 'unauthorized' : 'store_unavailable', error.status === 404 ? 401 : 503);
    if (!data || data.client_id !== clientId) throw new MuseError('unauthorized', 401);
    return data;
  }
  return {
    async authenticate(token) {
      if (token.startsWith('sbm_')) {
        if (!/^sbm_[A-Za-z0-9_-]{43}$/.test(token)) throw new MuseError('unauthorized',401);
        const keyHash = await connectionKeyHash(token);
        const { data,error } = await db.rpc('muse_key_identity',{p_hash:keyHash});
        if (error) throw new MuseError('store_unavailable',503);
        if (data?.error || !uuid.safeParse(data?.user_id).success || !uuid.safeParse(data?.key_id).success) throw new MuseError('unauthorized',401);
        return {userId:data.user_id,sessionId:null,clientId:data.key_id,keyHash};
      }
      // getUser verifies the signed token with Auth. Only then read its session/client claims.
      const { data, error } = await auth.auth.getUser(token);
      if (error || !data.user || data.user.is_anonymous || !data.user.email_confirmed_at) throw new MuseError('unauthorized', 401);
      let claims;
      try { claims = decodeJwt(token); } catch { throw new MuseError('unauthorized', 401); }
      if (claims.sub !== data.user.id || claims.iss !== config.url + '/auth/v1' || claims.role !== 'authenticated' || claims.aud !== 'authenticated'
        || typeof claims.exp !== 'number' || claims.exp <= Date.now()/1000
        || !uuid.safeParse(claims.session_id).success || (claims.client_id != null && !uuid.safeParse(claims.client_id).success)) throw new MuseError('unauthorized', 401);
      if (claims.client_id != null) await oauthClient(String(claims.client_id));
      return { userId: data.user.id, sessionId: String(claims.session_id), clientId: claims.client_id == null ? null : String(claims.client_id) };
    },
    async call<T>(who: Principal, operation: string, args: Record<string, unknown> = {}) {
      const { data, error } = await db.rpc('muse_gateway', { p_user: who.userId, p_session: who.sessionId, p_client: who.clientId, p_op: operation, p_args: args, ...(who.keyHash ? {p_key_hash:who.keyHash} : {}) });
      if (error) throw new MuseError('store_unavailable', 503);
      if (data?.error) throw new MuseError(data.error, errorStatus(data.error));
      return data as T;
    },
    async authorization(token, authorizationId, userId) {
      // Explicit REST request avoids loading/setting a second persisted browser session.
      const response = await options.global.fetch(`${config.url}/auth/v1/oauth/authorizations/${encodeURIComponent(authorizationId)}`, {
        headers: { apikey: config.publishableKey, Authorization: `Bearer ${token}` },
      });
      const data = await response.json() as { client?: { id?: string }; user?: { id?: string }; authorization_id?: string };
      if (!response.ok || data.authorization_id !== authorizationId || data.user?.id !== userId || !uuid.safeParse(data.client?.id).success) throw new MuseError('invalid_authorization', 400);
      const client = await oauthClient(data.client!.id!);
      return { clientId: client.client_id, clientName: client.client_name?.slice(0,200) || 'Muse' };
    },
  };
}

function errorStatus(code: string) {
  if (code === 'unauthorized') return 401;
  if (['permission_denied','invitation_required'].includes(code)) return 403;
  if (['state_conflict','delivery_conflict','summary_not_shared','inbox_full','key_limit'].includes(code)) return 409;
  if (code === 'not_found') return 404;
  return 400;
}
export function museFailure(error: unknown, origin?: string) {
  const known = error instanceof MuseError ? error : new MuseError('store_unavailable', 503);
  return Response.json({ error: { code: known.code } }, { status: known.status, headers: {
    ...noStore,
    ...(known.status === 401 && origin ? { 'WWW-Authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"` } : {}),
  } });
}
export function bearer(request: Request): string {
  const header = request.headers.get('authorization') ?? '';
  if (!/^Bearer [A-Za-z0-9_.-]{32,8192}$/.test(header)) throw new MuseError('unauthorized', 401);
  return header.slice(7);
}
export function requestOrigin(request: Request, env: MuseEnv, browser: boolean) {
  const config = accessConfig(env);
  if (!config) throw new MuseError('not_configured', 503);
  if (new URL(request.url).origin !== config.origin) throw new MuseError('wrong_origin', 403);
  const origin = request.headers.get('origin');
  if ((origin && origin !== config.origin) || (browser && request.method !== 'GET' && origin !== config.origin)) throw new MuseError('wrong_origin', 403);
  if (request.method === 'POST' && !/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) throw new MuseError('invalid_media_type', 415);
  return config.origin;
}
export async function principal(request: Request, store: MuseStore, integration: boolean) {
  const who = await store.authenticate(bearer(request));
  if (integration ? !who.clientId : Boolean(who.clientId)) throw new MuseError('permission_denied', 403);
  return who;
}

const manageSchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('enroll') }),
  z.strictObject({ action: z.literal('publish'), expected_version: z.number().int().nonnegative(), summary: learningSummarySchema }),
  z.strictObject({ action: z.literal('unshare'), expected_version: z.number().int().nonnegative() }),
  // Auth authorization IDs are opaque strings, distinct from session/client UUIDs.
  z.strictObject({ action: z.literal('grant'), authorization_id: z.string().min(1).max(512), permissions: permissionsSchema }),
  z.strictObject({ action: z.literal('revoke'), client_id: uuid }),
  z.strictObject({ action: z.literal('create_key'), label: z.string().trim().min(1).max(80), permissions: permissionsSchema.refine(p => p.read_summary || p.deliver_drafts) }),
  z.strictObject({ action: z.literal('revoke_key'), key_id: uuid }),
  z.strictObject({ action: z.literal('resolve'), draft_id: uuid, status: z.enum(['filed','discarded']) }),
]);
export async function manageAccount(request: Request, env: MuseEnv, store: MuseStore): Promise<Response> {
  requestOrigin(request, env, true);
  const who = await principal(request, store, false);
  if (request.method === 'GET') {
    const status = await store.call<{ valid: boolean; member: boolean }>(who, 'status');
    if (!status.member) return Response.json({ member: false }, { headers: noStore });
    const [state, inbox, connections, keys] = await Promise.all([store.call(who,'own_state'), store.call(who,'inbox'), store.call(who,'connections'), store.call(who,'keys')]);
    return Response.json({ member: true, state, inbox, connections, keys }, { headers: noStore });
  }
  if (request.method !== 'POST') throw new MuseError('method_not_allowed', 405);
  const body = await readJsonBody(request, 64 * 1024);
  if (!body.ok) return body.response;
  const parsed = manageSchema.safeParse(body.json);
  if (!parsed.success) throw new MuseError('invalid_request');
  const action = parsed.data;
  let result;
  if (action.action === 'enroll') {
    // Anyone with a verified personal session may use their own Muse.
    // The invitation cookie only protects the owner's model-backed routes.
    result = await store.call(who,'enroll');
  } else if (action.action === 'create_key') {
    const token = newConnectionKey();
    const key = await store.call(who,'create_key',{label:action.label,...action.permissions,key_hash:await connectionKeyHash(token)});
    result = {key,token}; // One response only. The database never receives the raw credential.
  } else if (action.action === 'grant') {
    const verified = await store.authorization(bearer(request), action.authorization_id, who.userId);
    result = await store.call(who,'grant',{ client_id: verified.clientId, client_name: verified.clientName, ...action.permissions });
  } else {
    const { action: operation, ...args } = action;
    result = await store.call(who,operation,args);
  }
  return Response.json(result, { headers: noStore });
}

interface State { version: number; summary: z.infer<typeof learningSummarySchema> | null; updated_at: string | null; inbox_pending_count: number }
export async function getLearningState(store: MuseStore, who: Principal, date: string) {
  if (!z.iso.date().safeParse(date).success) throw new MuseError('invalid_date');
  const state = await store.call<State>(who,'state');
  if (!state.summary) throw new MuseError('summary_not_shared',409);
  return { ...state, state_version: state.version, delivery_date: date, draft_id: await dailyDraftId(who.userId,date), accuracy: null, time_spent: null, evidence_scope: 'Explicit snapshot of one browser; not full account history.' };
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  if (value !== null && typeof value === 'object') return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
  return JSON.stringify(value);
}
async function payloadHash(value: unknown) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value)))),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function deliverDraft(store: MuseStore, who: Principal, input: unknown) {
  const parsed = deliverySchema.safeParse(input);
  if (!parsed.success) throw new MuseError('invalid_draft');
  const { delivery_date, draft } = parsed.data;
  if (draft.draft_id !== await dailyDraftId(who.userId,delivery_date)) throw new MuseError('draft_id_mismatch');
  const hash = await payloadHash(parsed.data);
  const receipt = await store.call<{ found: boolean; payload_hash?: string; status?: string }>(who,'receipt',{ draft_id: draft.draft_id });
  if (receipt.found) {
    if (receipt.payload_hash !== hash) throw new MuseError('delivery_conflict',409);
    return { receipt: 'duplicate', draft_id: draft.draft_id, status: receipt.status };
  }
  const today = Math.floor(Date.now() / 86_400_000), day = Date.parse(delivery_date) / 86_400_000;
  if (day < today - 7 || day > today + 1) throw new MuseError('delivery_date_out_of_range');
  const state = await store.call<State>(who,'delivery_context');
  if (!state.summary) throw new MuseError('summary_not_shared',409);
  const checked = validateLessonDraft(draft,{ draftId: draft.draft_id,level: state.summary.level,nativeLanguage: state.summary.native_language,
    learningStateVersion: state.version,binderIds: state.summary.binders.map(b=>b.id) });
  if (!checked.success) throw new MuseError(checked.reason === 'request_mismatch' ? 'state_conflict' : checked.reason,409);
  return store.call(who,'deliver',{ draft_id: draft.draft_id, draft: checked.draft, payload_hash: hash, expected_version: state.version });
}
export async function integrationTool(store: MuseStore, who: Principal, name: string, args: unknown) {
  if (name === 'get_lesson_guide') { await store.call(who,'guide'); return lessonGuide(); }
  if (name === 'get_learning_state') {
    const input = z.strictObject({ delivery_date: z.iso.date() }).safeParse(args);
    if (!input.success) throw new MuseError('invalid_request');
    return getLearningState(store,who,input.data.delivery_date);
  }
  if (name === 'deliver_page_draft') return deliverDraft(store,who,args);
  throw new MuseError('unknown_tool',404);
}
