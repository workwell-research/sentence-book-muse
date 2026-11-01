import { describe, expect, it } from 'vitest';
import { resolveRoute } from '../src/lib/routes';

describe('resolveRoute', () => {
  it('opens the four destinations and the consent page directly', () => {
    expect(resolveRoute('/')).toEqual({ route: 'desk' });
    expect(resolveRoute('/shelf')).toEqual({ route: 'shelf' });
    expect(resolveRoute('/inbox')).toEqual({ route: 'inbox' });
    expect(resolveRoute('/settings')).toEqual({ route: 'settings' });
    expect(resolveRoute('/oauth/consent', '', '?authorization_id=abc')).toEqual({ route: 'consent' });
    expect(resolveRoute('/handwriting')).toEqual({ route: 'handwriting' });
  });
  it('keeps the desk page address untouched', () => {
    expect(resolveRoute('/', '', '?page=sample')).toEqual({ route: 'desk' });
  });
  it('forwards the old /setup addresses', () => {
    expect(resolveRoute('/setup')).toEqual({ route: 'settings', replace: '/settings' });
    expect(resolveRoute('/setup', '#shelf')).toEqual({ route: 'shelf', replace: '/shelf' });
    expect(resolveRoute('/setup', '#own-muse')).toEqual({ route: 'inbox', replace: '/inbox#paste' });
  });
  it('forwards /connect to the inbox and keeps the query', () => {
    expect(resolveRoute('/connect', '', '?x=1')).toEqual({ route: 'inbox', replace: '/inbox?x=1' });
  });
  it('shows the desk for unknown paths', () => {
    expect(resolveRoute('/nowhere')).toEqual({ route: 'desk' });
  });
});
