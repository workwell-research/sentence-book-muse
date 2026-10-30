import { createHash } from 'node:crypto';
import { accessConfig, issueSession, sessionCookie } from '../../functions/lib/access';
export const TEST_INVITE = 'only-a-test-invitation-not-for-production';
export const ACCESS_ENV = {
  ACCESS_ORIGIN: 'https://example.test',
  INVITE_CODE_SHA256: createHash('sha256').update(TEST_INVITE).digest('hex'),
  SESSION_SECRET: 'test-session-secret-at-least-thirty-two-characters',
};
export async function accessHeaders() {
  const config = accessConfig(ACCESS_ENV)!;
  return { origin: config.origin, cookie: sessionCookie(config, await issueSession(config)).split(';')[0] };
}
