import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { AppHeader, PageFooter } from './AppHeader';
import { AccountLine, Consent, EnrollBlock, Feedback, Login, ShareSection, useAccount, useMuseSession } from './museSession';
import './styles.css';
import './connect.css';

// /oauth/consent: Muse arrives here to ask for permission. Everything else about the account lives in the settings.
export function Connect() {
  const muse = useMuseSession();
  return <div className="connect-page">
    <a className="skip-link" href="#main">本文へ</a>
    <AppHeader/>
    <main className="page-main" id="main">
      <h1 className="connect-title">Museとの接続を確認</h1>
      {muse.error ? <section className="connect-block"><p className="connect-error" role="alert">{muse.error}</p><button className="text-button" onClick={muse.retry}>もう一度読み込む</button></section>
        : !muse.ready || !muse.client ? <p className="connect-loading" role="status">開いています…</p>
        : muse.session ? <ConsentView key={muse.session.user.id} client={muse.client} session={muse.session}/> : <Login client={muse.client}/>}
    </main>
    <PageFooter/>
  </div>;
}

function ConsentView({client,session}:{client:SupabaseClient;session:Session}) {
  const actions = useAccount(client, session.user.id);
  const consentId = new URLSearchParams(location.search).get('authorization_id');
  return <>
    <AccountLine client={client} session={session} actions={actions}/>
    <Feedback actions={actions} scope="account"/>
    {!actions.account ? <button className="text-button" disabled={actions.busy} onClick={()=>void actions.act(actions.refresh)}>受信箱を読み込む</button>
      : !actions.account.member ? <EnrollBlock client={client} actions={actions}/>
      : <>
        {consentId ? <Consent key={consentId} client={client} authorizationId={consentId} userId={session.user.id}/>
          : <p className="connect-error" role="alert">接続の依頼がありません。Museから接続を始めてください。</p>}
        <section className="connect-block" aria-labelledby="share-title"><div className="block-head"><p className="kicker" lang="en">Share</p><h2 id="share-title">Museと共有する学習内容</h2></div><ShareSection client={client} actions={actions}/></section>
      </>}
  </>;
}
