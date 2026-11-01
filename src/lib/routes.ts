// One place decides which page a URL opens, and which old addresses are forwarded.
export type AppRoute = 'desk' | 'shelf' | 'inbox' | 'settings' | 'consent' | 'handwriting';
export interface ResolvedRoute { route: AppRoute; replace?: string }

const pages: Record<string, AppRoute> = {
  '/': 'desk', '/shelf': 'shelf', '/inbox': 'inbox', '/settings': 'settings', '/oauth/consent': 'consent', '/handwriting': 'handwriting',
};

// Old links keep working: Muse guides and e-mails may still say /connect, and the desk linked /setup#shelf.
export function resolveRoute(pathname: string, hash = '', search = ''): ResolvedRoute {
  const known = pages[pathname];
  if (known) return { route: known };
  if (pathname === '/setup') {
    if (hash === '#shelf') return { route: 'shelf', replace: '/shelf' + search };
    if (hash === '#own-muse') return { route: 'inbox', replace: '/inbox' + search + '#paste' };
    return { route: 'settings', replace: '/settings' + search };
  }
  if (pathname === '/connect') return { route: 'inbox', replace: '/inbox' + search };
  return { route: 'desk' };
}
