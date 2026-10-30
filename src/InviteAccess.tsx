import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import './invite-access.css';

type AccessState = 'checking' | 'locked' | 'ready' | 'unavailable';
interface AccessContextValue {
  state: AccessState;
  refresh: () => Promise<void>;
  unlock: (code: string) => Promise<string | null>;
  logout: () => Promise<string | null>;
  expire: () => void;
}
const AccessContext = createContext<AccessContextValue | null>(null);
export function useInviteAccess(): AccessContextValue {
  const context = useContext(AccessContext);
  if (!context) throw new Error('InviteAccessProvider is missing');
  return context;
}

export function InviteAccessProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccessState>('checking');
  const revision = useRef(0);
  const submitting = useRef(false);
  const refresh = useCallback(async () => {
    if (submitting.current) return;
    const id = ++revision.current;
    try {
      const response = await fetch('/api/access', { credentials: 'same-origin', cache: 'no-store' });
      const body = await response.json();
      if (id === revision.current) setState(response.ok ? (body.authorized === true ? 'ready' : 'locked') : 'unavailable');
    } catch { if (id === revision.current) setState('unavailable'); }
  }, []);
  useEffect(() => {
    void refresh();
    const focus = () => { void refresh(); };
    window.addEventListener('focus', focus);
    return () => { ++revision.current; window.removeEventListener('focus', focus); };
  }, [refresh]);
  async function submit(body: { code: string } | { action: 'logout' }): Promise<string | null> {
    submitting.current = true;
    ++revision.current;
    try {
      const response = await fetch('/api/access', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) setState('locked');
        if (response.status === 429) return '入力を繰り返しています。少し待ってから、もう一度お試しください。';
        if (response.status === 503) return '今は利用を確認できません。少し待ってから、もう一度お試しください。';
        return response.status === 401 ? '招待コードが一致しません。コピーした内容を確認してください。' : '利用を確認できませんでした。アプリを開き直してください。';
      }
      setState(result.authorized === true ? 'ready' : 'locked');
      return null;
    } catch { return '通信できませんでした。接続を確認して、もう一度お試しください。'; }
    finally { submitting.current = false; }
  }
  const expire = () => { ++revision.current; setState('locked'); };
  return <AccessContext value={{ state, refresh, unlock: code => submit({ code }), logout: () => submit({ action: 'logout' }), expire }}>{children}</AccessContext>;
}

// Inline so the learner keeps their topic, selected words and notebook in view.
// It may sit inside the existing memo form; no nested form and no implicit memo submission.
export function InviteAccess({ showLogout = false }: { showLogout?: boolean }) {
  const access = useInviteAccess();
  const id = useId();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function act(logout = false) {
    if (pending.current || (!logout && !code.trim())) return;
    pending.current = true; setBusy(true); setError('');
    const problem = await (logout ? access.logout() : access.unlock(code));
    if (problem) setError(problem); else setCode('');
    pending.current = false; setBusy(false);
  }
  if (access.state === 'ready' && !showLogout) return null;
  return <div className="invite-access" role="group" aria-label="招待の確認">
    {access.state === 'checking' ? <p role="status">利用を確認しています…</p>
      : access.state === 'unavailable' ? <><p role="status">今は利用を確認できません。練習はそのまま続けられます。</p><button type="button" onClick={() => { void access.refresh(); }}>もう一度確認する</button></>
      : access.state === 'ready' ? <div className="invite-ready"><span role="status">招待コードを確認済み</span><button type="button" disabled={busy} onClick={() => { void act(true); }}>このブラウザでの利用を終了</button></div>
      : <>
        <p id={`${id}-hint`}>教材づくりと語句の検索は、招待された方が使えます。</p>
        <label htmlFor={id}>招待コード</label>
        <div className="invite-fields">
          <input id={id} type="password" value={code} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={160}
            aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`} aria-invalid={Boolean(error)} disabled={busy}
            onChange={event => { setCode(event.target.value); setError(''); }}
            onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); event.stopPropagation(); void act(); } }} />
          <button type="button" disabled={busy || !code.trim()} aria-busy={busy} onClick={() => { void act(); }}>{busy ? '確認しています…' : 'コードを確認する'}</button>
        </div>
      </>}
    {error && <p id={`${id}-error`} className="invite-error" role="alert">{error}</p>}
  </div>;
}
