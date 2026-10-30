import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll,afterAll,describe,it,expect } from 'vitest';

const userA='10000000-0000-4000-8000-000000000001',userB='10000000-0000-4000-8000-000000000002';
const sessionA='20000000-0000-4000-8000-000000000001',sessionB='20000000-0000-4000-8000-000000000002';
const client='30000000-0000-4000-8000-000000000001',oauthA='20000000-0000-4000-8000-000000000003';
const draft='40000000-0000-4000-8000-000000000001';
let db:PGlite;
async function call(user:string,session:string,clientId:string|null,op:string,args:unknown={}) {
  await db.exec('set role service_role');
  try {return (await db.query<{result:Record<string,unknown>}>('select public.muse_gateway($1,$2,$3,$4,$5::jsonb) as result',[user,session,clientId,op,JSON.stringify(args)])).rows[0]!.result;}
  finally {await db.exec('reset role');}
}
beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; grant usage on schema auth to service_role;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz,banned_until timestamptz);
    create table auth.oauth_clients(id uuid primary key,client_name text,deleted_at timestamptz);
    create table auth.sessions(id uuid primary key,user_id uuid,oauth_client_id uuid,not_after timestamptz);
    create table auth.oauth_consents(user_id uuid,client_id uuid,revoked_at timestamptz);
    insert into auth.users values('${userA}',now(),null),('${userB}',now(),null);
    insert into auth.oauth_clients values('${client}','Synthetic Muse',null);
    insert into auth.sessions values('${sessionA}','${userA}',null,null),('${sessionB}','${userB}',null,null),('${oauthA}','${userA}','${client}',null);
    insert into auth.oauth_consents values('${userA}','${client}',null);`);
  await db.exec(readFileSync(new URL('../supabase/migrations/20261030035947_muse_inbox.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../supabase/migrations/20261030085531_restore_muse_oauth_read_grants.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../supabase/migrations/20261030085841_use_supported_muse_oauth_checks.sql',import.meta.url),'utf8'));
},30000);
afterAll(async()=>{await db.close();});
describe.sequential('private account and inbox boundary (actual migration)',()=>{
  it('works without any direct OAuth-table read privileges',async()=>{
    expect(await call(userB,sessionA,null,'status')).toEqual({error:'unauthorized'});
    for(const table of ['oauth_consents','oauth_clients']) {
      for(const role of ['service_role','anon','authenticated']) {
        expect((await db.query<{allowed:boolean}>("select has_any_column_privilege($1,$2,'SELECT') as allowed",[role,`auth.${table}`])).rows[0]!.allowed).toBe(false);
      }
    }
  });
  it('refuses anonymous/authenticated table and RPC access',async()=>{
    for(const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`);
      await expect(db.query('select * from muse_private.inbox')).rejects.toThrow(/permission denied/);
      await expect(db.query('select public.muse_gateway($1,$2,null,$3)',[userA,sessionA,'enroll'])).rejects.toThrow(/permission denied/);
      await db.exec('reset role');
    }
  });
  it('enrolls a live verified direct session only; no cross-user session impersonation',async()=>{
    expect(await call(userB,sessionA,null,'enroll')).toEqual({error:'unauthorized'});
    expect(await call(userA,sessionA,client,'enroll')).toEqual({error:'unauthorized'});
    expect(await call(userA,oauthA,client,'enroll')).toEqual({error:'invitation_required'});
    expect(await call(userA,sessionA,null,'enroll')).toEqual({member:true});
    expect(await call(userB,sessionB,null,'enroll')).toEqual({member:true});
  });
  it('requires an app grant in addition to OAuth consent',async()=>{
    expect(await call(userA,oauthA,client,'guide')).toEqual({error:'permission_denied'});
    await call(userA,sessionA,null,'grant',{client_id:client,client_name:'Verified Muse',read_summary:true,deliver_drafts:false});
    expect(await call(userA,oauthA,client,'guide')).toEqual({allowed:true});
    expect(await call(userA,sessionA,null,'connections')).toMatchObject([{client_id:client,client_name:'Verified Muse'}]);
    expect(await call(userA,oauthA,client,'deliver')).toEqual({error:'permission_denied'});
    expect(await call(userA,oauthA,client,'grant',{client_id:client,read_summary:true,deliver_drafts:true})).toEqual({error:'permission_denied'});
    expect(await call(userA,oauthA,client,'inbox')).toEqual({error:'permission_denied'});
  });
  it('publishes with optimistic version protection and isolates another account',async()=>{
    expect(await call(userA,sessionA,null,'publish',{expected_version:0,summary:{level:'A2'}})).toMatchObject({version:1});
    expect(await call(userA,sessionA,null,'publish',{expected_version:0,summary:{level:'B2'}})).toEqual({error:'state_conflict'});
    expect(await call(userA,oauthA,client,'state')).toMatchObject({version:1,summary:{level:'A2'}});
    expect(await call(userB,sessionB,null,'own_state')).toMatchObject({version:0,summary:null});
  });
  it('accepts one delivery, deduplicates retries and rejects changed content',async()=>{
    await call(userA,sessionA,null,'grant',{client_id:client,read_summary:false,deliver_drafts:true});
    expect(await call(userA,oauthA,client,'state')).toEqual({error:'permission_denied'});
    const args={draft_id:draft,draft:{title:'Synthetic'},payload_hash:'a'.repeat(64),expected_version:1};
    expect(await call(userA,oauthA,client,'deliver',{...args,expected_version:0})).toEqual({error:'state_conflict'});
    expect(await call(userA,oauthA,client,'deliver',args)).toMatchObject({receipt:'accepted',draft_id:draft});
    expect(await call(userA,oauthA,client,'deliver',args)).toMatchObject({receipt:'duplicate'});
    expect(await call(userA,oauthA,client,'deliver',{...args,payload_hash:'b'.repeat(64)})).toEqual({error:'delivery_conflict'});
    expect(await call(userB,sessionB,null,'inbox')).toEqual([]);
    expect(await call(userB,sessionB,null,'resolve',{draft_id:draft,status:'discarded'})).toEqual({error:'not_found'});
  });
  it('keeps a tombstone after explicit filing, preventing retry resurrection',async()=>{
    expect(await call(userA,sessionA,null,'resolve',{draft_id:draft,status:'filed'})).toEqual({status:'filed'});
    expect(await call(userA,sessionA,null,'inbox')).toEqual([]);
    expect((await db.query<{draft:unknown}>('select draft from muse_private.inbox')).rows[0]!.draft).toBeNull();
    expect(await call(userA,oauthA,client,'deliver',{draft_id:draft,draft:{},payload_hash:'a'.repeat(64),expected_version:0})).toMatchObject({receipt:'duplicate',status:'filed'});
  });
  it('blocks new delivery immediately after unsharing',async()=>{
    await call(userA,sessionA,null,'unshare',{expected_version:1});
    expect(await call(userA,oauthA,client,'deliver',{draft_id:'40000000-0000-4000-8000-000000000002',draft:{},payload_hash:'c'.repeat(64),expected_version:2})).toEqual({error:'summary_not_shared'});
  });
  it('enforces the pending cap in the database',async()=>{
    await call(userA,sessionA,null,'publish',{expected_version:2,summary:{level:'A2'}});
    await db.query(`insert into muse_private.inbox(user_id,draft_id,draft,payload_hash) select $1,gen_random_uuid(),'{}'::jsonb,repeat('d',64) from generate_series(1,50)`,[userA]);
    expect(await call(userA,oauthA,client,'deliver',{draft_id:'40000000-0000-4000-8000-000000000002',draft:{},payload_hash:'c'.repeat(64),expected_version:3})).toEqual({error:'inbox_full'});
  });
  it('revokes app access while the OAuth session is still alive',async()=>{
    await call(userA,sessionA,null,'revoke',{client_id:client});
    expect(await call(userA,oauthA,client,'guide')).toEqual({error:'permission_denied'});
    expect(await call(userA,oauthA,client,'receipt',{draft_id:draft})).toEqual({error:'permission_denied'});
  });
  it('also refuses OAuth consent revocation, session expiry, and disabled membership',async()=>{
    await call(userA,sessionA,null,'grant',{client_id:client,read_summary:true,deliver_drafts:true});
    // Supabase revokeGrant revokes consent and deletes the client's sessions.
    await db.exec('update auth.oauth_consents set revoked_at=now()');
    await db.query('delete from auth.sessions where user_id=$1 and oauth_client_id=$2',[userA,client]);
    expect(await call(userA,oauthA,client,'guide')).toEqual({error:'unauthorized'});
    await db.query('update auth.sessions set not_after=now()-interval \'1 second\' where id=$1',[sessionB]);
    expect(await call(userB,sessionB,null,'inbox')).toEqual({error:'unauthorized'});
    await db.query('update muse_private.members set enabled=false where user_id=$1',[userA]);
    expect(await call(userA,sessionA,null,'enroll')).toEqual({member:false});
    expect(await call(userA,sessionA,null,'inbox')).toEqual({error:'invitation_required'});
  });
});
