import { fail } from './route';

// One shared invitation for this small private demo; never sent in a URL or stored in JS.
// Changing the invitation hash or signing secret immediately invalidates all sessions.
export interface AccessEnv { ACCESS_ORIGIN?: string; INVITE_CODE_SHA256?: string; SESSION_SECRET?: string }
export interface AccessConfig { origin: string; inviteHash: string; secret: string; secure: boolean }
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
const unhex = (value: string) => Uint8Array.from(value.match(/.{2}/g) ?? [], byte => parseInt(byte, 16));

export function accessConfig(env: AccessEnv): AccessConfig | null {
  if (!env.ACCESS_ORIGIN || !/^[a-f0-9]{64}$/.test(env.INVITE_CODE_SHA256 ?? '') || (env.SESSION_SECRET?.length ?? 0) < 32) return null;
  try {
    const url = new URL(env.ACCESS_ORIGIN);
    const secure = url.protocol === 'https:';
    if (url.origin !== env.ACCESS_ORIGIN || (!secure && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) return null;
    return { origin: url.origin, inviteHash: env.INVITE_CODE_SHA256!, secret: env.SESSION_SECRET!, secure };
  } catch { return null; }
}

const cookieName = (config: AccessConfig) => config.secure ? '__Host-sentence-book-access' : 'sentence-book-access-local';
export function sessionCookie(config: AccessConfig, token: string, maxAge = SESSION_SECONDS): string {
  return `${cookieName(config)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${config.secure ? '; Secure' : ''}`;
}
async function signingKey(config: AccessConfig) {
  return crypto.subtle.importKey('raw', encoder.encode(config.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
const signedData = (config: AccessConfig, payload: string) => encoder.encode(`${config.origin}|${config.inviteHash}|${payload}`);

export async function invitationMatches(code: string, config: AccessConfig): Promise<boolean> {
  const actual = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(code.trim())));
  // Delegate comparison to Web Crypto verification, avoiding timing-sensitive string equality.
  const key = await signingKey(config);
  const expected = await crypto.subtle.sign('HMAC', key, unhex(config.inviteHash));
  return crypto.subtle.verify('HMAC', key, expected, actual);
}
export async function issueSession(config: AccessConfig, now = Date.now()): Promise<string> {
  const nonce = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const payload = `v1.${Math.floor(now / 1000) + SESSION_SECONDS}.${nonce}`;
  return `${payload}.${hex(await crypto.subtle.sign('HMAC', await signingKey(config), signedData(config, payload)))}`;
}
export async function hasSession(request: Request, config: AccessConfig, now = Date.now()): Promise<boolean> {
  const matches = (request.headers.get('cookie') ?? '').split(';').map(part => part.trim()).filter(part => part.startsWith(`${cookieName(config)}=`));
  if (matches.length !== 1) return false;
  const token = matches[0].slice(cookieName(config).length + 1);
  const match = /^(v1\.(\d{10})\.([a-f0-9]{32}))\.([a-f0-9]{64})$/.exec(token);
  if (!match) return false;
  const expires = Number(match[2]), seconds = Math.floor(now / 1000);
  if (expires <= seconds || expires > seconds + SESSION_SECONDS) return false;
  return crypto.subtle.verify('HMAC', await signingKey(config), unhex(match[4]), signedData(config, match[1]));
}

// Canonical-host checks also close the new deployment's hash/branch aliases.
// Origin/media type are CSRF protection, never a substitute for the signed session.
export function requestBoundary(request: Request, config: AccessConfig): Response | null {
  if (new URL(request.url).origin !== config.origin) return fail(403, 'access_denied', 'いつものアプリのURLから開いてください。');
  if (request.method !== 'GET') {
    if (request.headers.get('origin') !== config.origin || (request.headers.get('sec-fetch-site') && request.headers.get('sec-fetch-site') !== 'same-origin'))
      return fail(403, 'access_denied', 'アプリを開き直して、もう一度お試しください。');
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json')
      return fail(415, 'invalid_request', 'JSON形式で送信してください。');
  }
  return null;
}
export async function requireAccess(request: Request, env: AccessEnv): Promise<Response | null> {
  const config = accessConfig(env);
  if (!config) return fail(503, 'generation_unavailable', '利用の準備が整うまでお待ちください。', 'access_unconfigured');
  const boundary = requestBoundary(request, config);
  if (boundary) return boundary;
  if (!await hasSession(request, config)) return fail(401, 'invite_required', '招待コードを入力してください。');
  return null;
}
