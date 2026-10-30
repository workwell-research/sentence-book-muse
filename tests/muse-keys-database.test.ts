import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll,afterAll,describe,it,expect } from 'vitest';

const userA='10000000-0000-4000-8000-000000000001',userB='10000000-0000-4000-8000-000000000002';
const sessionA='20000000-0000-4000-8000-000000000001',sessionB='20000000-0000-4000-8000-000000000002';
const client='30000000-0000-4000-8000-000000000001',oauthA='20000000-0000-4000-8000-000000000003';
const draft='40000000-0000-4000-8000-000000000001';
let db:PGlite;
async function call(user:string,session:string|null,clientId:string|null,op:string,args:unknown={},keyHash:string|null=null) {
  await db.exec('set role service_role');
  try {return (await db.query<{result:Record<string,unknown>}>('select public.muse_gateway($1,$2,$3,$4,$5::jsonb,$6) as result',[user,session,clientId,op,JSON.stringify(args),keyHash])).rows[0]!.result;}
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
  await db.exec(readFileSync(new URL('../supabase/migrations/20261030140542_muse_connection_keys.sql',import.meta.url),'utf8'));
},30000);
afterAll(async()=>{await db.close();});

const hashA='a'.repeat(64),hashB='b'.repeat(64);
const permissions={label:'My Muse',read_summary:true,deliver_drafts:true};
let keyA:string;
async function identity(hash:string) {
  await db.exec('set role service_role');
  try{return (await db.query<{result:Record<string,unknown>}>('select public.muse_key_identity($1) as result',[hash])).rows[0]!.result;}
  finally{await db.exec('reset role');}
}
describe.sequential('personal connection keys (actual database migrations)',()=>{
  it('denies browser roles both table reads and key RPCs',async()=>{
    for(const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`);
      await expect(db.query('select * from muse_private.connection_keys')).rejects.toThrow(/permission denied/);
      await expect(db.query('select public.muse_key_identity($1)',[hashA])).rejects.toThrow(/permission denied/);
      await expect(db.query('select public.muse_gateway($1,null,null,$2,$3::jsonb,$4)',[userA,'keys','{}',hashA])).rejects.toThrow(/permission denied/);
      await db.exec('reset role');
    }
  });
  it('requires a verified enabled personal account and explicit nonempty permissions',async()=>{
    expect(await call(userA,sessionA,null,'create_key',{...permissions,key_hash:hashA})).toEqual({error:'invitation_required'});
    await call(userA,sessionA,null,'enroll');await call(userB,sessionB,null,'enroll');
    expect(await call(userB,sessionA,null,'create_key',{...permissions,key_hash:hashA})).toEqual({error:'unauthorized'});
    expect(await call(userA,sessionA,null,'create_key',{...permissions,key_hash:hashA,read_summary:false,deliver_drafts:false})).toEqual({error:'invalid_request'});
    expect(await call(userA,sessionA,null,'create_key',{...permissions,key_hash:'raw-credential'})).toEqual({error:'invalid_request'});
    expect(await call(userA,sessionA,null,'create_key',{...permissions,key_hash:hashA,label:' '})).toEqual({error:'invalid_request'});
  });
  it('issues a 30-day key and never returns its hash on create/list',async()=>{
    const issued=await call(userA,sessionA,null,'create_key',{...permissions,key_hash:hashA});
    keyA=String(issued.id);
    expect(issued).toMatchObject(permissions);expect(issued).not.toHaveProperty('key_hash');expect(issued).not.toHaveProperty('user_id');
    expect(Date.parse(String(issued.expires_at))-Date.parse(String(issued.created_at))).toBe(30*86400000);
    expect(await identity(hashA)).toEqual({user_id:userA,key_id:keyA});
    expect(await call(userA,sessionA,null,'keys')).toEqual([issued]);
    expect(await call(userB,sessionB,null,'keys')).toEqual([]);
  });
  it('rejects mismatched identity, id, hash and session combinations',async()=>{
    for(const [user,session,key,hash] of [[userB,null,keyA,hashA],[userA,sessionA,keyA,hashA],[userA,null,client,hashA],[userA,null,keyA,hashB],[userA,null,null,hashA],[userA,null,keyA,null]] as const) {
      expect(await call(user,session,key,'guide',{},hash)).toEqual({error:'unauthorized'});
    }
    expect(await identity(hashB)).toEqual({error:'unauthorized'});
    expect(await call(userA,null,keyA,'guide',{},hashA)).toEqual({allowed:true});
  });
  it('keys and OAuth cannot create/revoke keys or manage user data',async()=>{
    await call(userA,sessionA,null,'grant',{...permissions,client_id:client});
    for(const op of ['create_key','revoke_key','keys','grant','revoke','enroll','publish','unshare','inbox','resolve','own_state','status']) {
      expect(await call(userA,null,keyA,op,{},hashA)).toEqual({error:'permission_denied'});
      expect(await call(userA,oauthA,client,op)).toEqual({error:'permission_denied'});
    }
  });
  it('uses the same per-user state/delivery isolation and duplicate receipts',async()=>{
    await call(userA,sessionA,null,'publish',{expected_version:0,summary:{level:'B1'}});
    expect(await call(userA,null,keyA,'state',{},hashA)).toMatchObject({version:1,summary:{level:'B1'}});
    const args={draft_id:draft,draft:{title:'Synthetic key delivery'},payload_hash:'c'.repeat(64),expected_version:1};
    expect(await call(userA,null,keyA,'deliver',args,hashA)).toMatchObject({receipt:'accepted'});
    expect(await call(userA,null,keyA,'deliver',args,hashA)).toMatchObject({receipt:'duplicate'});
    expect(await call(userB,sessionB,null,'inbox')).toEqual([]);
    const issued=await call(userB,sessionB,null,'create_key',{...permissions,key_hash:hashB});
    expect(await call(userB,null,String(issued.id),'receipt',{draft_id:draft},hashB)).toEqual({found:false});
    expect(await call(userB,null,String(issued.id),'state',{},hashB)).toMatchObject({summary:null});
  });
  it('enforces separate read and delivery permissions',async()=>{
    for(const read of [true,false]) {
      const hash=(read?'d':'e').repeat(64);
      const key=await call(userA,sessionA,null,'create_key',{...permissions,key_hash:hash,read_summary:read,deliver_drafts:!read});
      expect(await call(userA,null,String(key.id),read?'receipt':'state',{},hash)).toEqual({error:'permission_denied'});
      expect(await call(userA,null,String(key.id),'guide',{},hash)).toEqual({allowed:true});
    }
  });
  it('caps five active keys per user and removes expired entries when issuing',async()=>{
    for(const digit of ['f','1'])await call(userA,sessionA,null,'create_key',{...permissions,key_hash:digit.repeat(64)});
    expect(await call(userA,sessionA,null,'create_key',{...permissions,key_hash:'2'.repeat(64)})).toEqual({error:'key_limit'});
    await db.query("update muse_private.connection_keys set created_at=now()-interval '32 days', expires_at=now()-interval '1 day' where user_id=$1 and id<>$2",[userA,keyA]);
    expect(await call(userA,sessionA,null,'create_key',{...permissions,key_hash:'2'.repeat(64)})).toHaveProperty('id');
    expect(await call(userA,sessionA,null,'keys')).toHaveLength(2);
  });
  it('keys survive direct logout but obey account disable and verification on each call',async()=>{
    await db.query('delete from auth.sessions where id=$1',[sessionA]);
    expect(await call(userA,null,keyA,'guide',{},hashA)).toEqual({allowed:true});
    await db.query('update muse_private.members set enabled=false where user_id=$1',[userA]);
    expect(await identity(hashA)).toEqual({error:'unauthorized'});
    expect(await call(userA,null,keyA,'guide',{},hashA)).toEqual({error:'invitation_required'});
    await db.query('update muse_private.members set enabled=true where user_id=$1',[userA]);
    await db.query("update auth.users set banned_until=now()+interval '1 hour' where id=$1",[userA]);
    expect(await identity(hashA)).toEqual({error:'unauthorized'});
    expect(await call(userA,null,keyA,'guide',{},hashA)).toEqual({error:'unauthorized'});
    await db.query('update auth.users set banned_until=null,email_confirmed_at=null where id=$1',[userA]);
    expect(await identity(hashA)).toEqual({error:'unauthorized'});
    expect(await call(userA,null,keyA,'guide',{},hashA)).toEqual({error:'unauthorized'});
    await db.query('update auth.users set email_confirmed_at=now() where id=$1',[userA]);
    await db.query('insert into auth.sessions values($1,$2,null,null)',[sessionA,userA]);
  });
  it('rechecks expiry and revocation even after identity was authenticated',async()=>{
    expect(await identity(hashA)).toHaveProperty('key_id');
    await db.query("update muse_private.connection_keys set created_at=now()-interval '32 days',expires_at=now()-interval '1 day' where id=$1",[keyA]);
    expect(await call(userA,null,keyA,'guide',{},hashA)).toEqual({error:'unauthorized'});
    expect(await identity(hashA)).toEqual({error:'unauthorized'});
    await db.query("update muse_private.connection_keys set expires_at=now()+interval '1 day' where id=$1",[keyA]);
    await call(userB,sessionB,null,'revoke_key',{key_id:keyA});
    expect(await identity(hashA)).toHaveProperty('key_id');
    await call(userA,sessionA,null,'revoke_key',{key_id:keyA});
    expect(await identity(hashA)).toEqual({error:'unauthorized'});
    expect(await call(userA,null,keyA,'deliver',{},hashA)).toEqual({error:'unauthorized'});
  });
});
