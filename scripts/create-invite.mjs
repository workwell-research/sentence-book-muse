// Local administration only. Never print the code/signing secret or put them in CLI arguments.
import fs from 'node:fs/promises';
import { randomBytes, createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const codePath = path.join(root, '.invite-code.txt');
const envPath = path.join(root, '.dev.vars');
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--rotate')) throw new Error('Usage: node scripts/create-invite.mjs [--rotate]');
const exists = await fs.stat(codePath).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; });
if (exists && !args.includes('--rotate')) throw new Error('Invitation already exists. Use --rotate only to replace it and revoke all sessions after redeploy.');
const code = randomBytes(24).toString('base64url');
const values = { INVITE_CODE_SHA256: createHash('sha256').update(code).digest('hex'), SESSION_SECRET: randomBytes(32).toString('base64url') };
let env = await fs.readFile(envPath, 'utf8').catch(error => { if (error.code === 'ENOENT') return ''; throw error; });
for (const [key, value] of Object.entries(values)) {
  const line = new RegExp(`^${key}=.*$`, 'gm');
  env = line.test(env) ? env.replace(line, `${key}=${value}`) : `${env.replace(/\n?$/, '\n')}${key}=${value}\n`;
}
if (!/^ACCESS_ORIGIN=/m.test(env)) env += 'ACCESS_ORIGIN=http://127.0.0.1:8797\n';
await fs.writeFile(envPath, env, { mode: 0o600 }); await fs.chmod(envPath, 0o600);
await fs.writeFile(codePath, code + '\n', { mode: 0o600 }); await fs.chmod(codePath, 0o600);
console.log('Saved private invitation to .invite-code.txt and server configuration to .dev.vars (both 0600).');
console.log('Publish only INVITE_CODE_SHA256 and SESSION_SECRET as encrypted Pages secrets, then redeploy.');
