import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Connection, InboxItem, SharedState } from '../../shared/muse-connection';

export interface Account { member: boolean; state?: SharedState; inbox?: InboxItem[]; connections?: Connection[] }
let clientPromise: Promise<SupabaseClient> | null = null;
export function museClient() {
  return clientPromise ??= (async () => {
    const response = await fetch('/api/muse/config', { cache:'no-store' });
    const config = await response.json();
    if (!response.ok || !config.configured) throw new Error('not_configured');
    return createClient(config.url,config.publishableKey,{ auth:{ storageKey:'sentence-book-muse:account:v1',detectSessionInUrl:false,flowType:'pkce' } });
  })().catch(error => { clientPromise = null; throw error; });
}
export async function accountRequest<T = Account>(client: SupabaseClient, action?: Record<string,unknown>): Promise<T> {
  const { data,error } = await client.auth.getSession();
  if (error || !data.session) throw new Error('unauthorized');
  const response = await fetch('/api/muse/manage',{ method:action ? 'POST':'GET',cache:'no-store',headers:{
    Authorization:`Bearer ${data.session.access_token}`,...(action ? {'Content-Type':'application/json'} : {}),
  },...(action ? {body:JSON.stringify(action)} : {}) });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.code ?? 'network');
  return body as T;
}
export function connectionError(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  return ({
    not_configured:'接続機能の準備中です。今の教材は本棚から練習できます。',
    unauthorized:'ログインの期限が切れました。一度ログアウトして、確認コードで入り直してください。',
    state_conflict:'別の端末で共有内容が更新されました。最新の状態を読み込み直してください。',
    invitation_required:'招待コードを確認してから、受信箱を有効にしてください。',
    invite_required:'招待コードを確認してから、受信箱を有効にしてください。',
    permission_denied:'この接続には許可がありません。Museから接続をやり直してください。',
    'unreadable-storage':'このブラウザの保存データを読み取れないため、処理を止めました。元のデータは残しています。',
    delivery_conflict:'このページは別の端末で処理済みです。最新の受信箱を読み込み直してください。',
    invalid_authorization:'接続の依頼を確認できません。Museから接続をやり直してください。',
  } as Record<string,string>)[code] ?? '処理を完了できませんでした。接続を確認して、もう一度お試しください。';
}
