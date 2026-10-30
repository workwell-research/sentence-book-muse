import { z } from 'zod';
import { accessConfig, hasSession, invitationMatches, issueSession, requestBoundary, sessionCookie } from '../lib/access';
import type { AccessEnv } from '../lib/access';
import { checkRateLimit } from '../lib/rate-limit';
import type { RateLimitEnv } from '../lib/rate-limit';
import { fail, noStore, rateLimitFailure, readJsonBody } from '../lib/route';

const LOGIN_POLICY = { name: 'invite', perMinute: 5, perDay: 30, globalPerDay: 500 };
const loginSchema = z.strictObject({ code: z.string().trim().min(1).max(160) });

export async function handleAccess(request: Request, env: AccessEnv & RateLimitEnv): Promise<Response> {
  if (!['GET', 'POST'].includes(request.method)) return fail(405, 'method_not_allowed', 'Use GET or POST.', undefined, { Allow: 'GET, POST' });
  const config = accessConfig(env);
  if (!config) return fail(503, 'generation_unavailable', '利用の準備が整うまでお待ちください。', 'access_unconfigured');
  const boundary = requestBoundary(request, config);
  if (boundary) return boundary;
  if (request.method === 'GET') return Response.json({ authorized: await hasSession(request, config) }, { headers: noStore });
  const body = await readJsonBody(request, 1024);
  if (!body.ok) return body.response;
  if (z.strictObject({ action: z.literal('logout') }).safeParse(body.json).success)
    return Response.json({ authorized: false }, { headers: { ...noStore, 'Set-Cookie': sessionCookie(config, '', 0) } });
  const parsed = loginSchema.safeParse(body.json);
  if (!parsed.success) return fail(400, 'invalid_request', '招待コードを入力してください。');
  const verdict = await checkRateLimit(env, request, LOGIN_POLICY);
  if (!verdict.ok) return rateLimitFailure(verdict, LOGIN_POLICY);
  if (!await invitationMatches(parsed.data.code, config)) return fail(401, 'invalid_invite', '招待コードが一致しません。コピーした内容を確認してください。');
  return Response.json({ authorized: true }, { headers: { ...noStore, 'Set-Cookie': sessionCookie(config, await issueSession(config)) } });
}
export const onRequest: PagesFunction<AccessEnv & RateLimitEnv> = ({ request, env }) => handleAccess(request, env);
