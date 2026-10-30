-- Personal bearer keys are separate from OAuth grants and direct login sessions.
-- Only a SHA-256 digest is stored; a key grants two narrow operations, never account management.
create table muse_private.connection_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key_hash text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  label text not null check (char_length(label) between 1 and 80),
  read_summary boolean not null,
  deliver_drafts boolean not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  check (read_summary or deliver_drafts),
  check (expires_at > created_at)
);
create index connection_keys_user_id_idx on muse_private.connection_keys(user_id);
alter table muse_private.connection_keys enable row level security;
revoke all on muse_private.connection_keys from public,anon,authenticated;
grant select,insert,delete on muse_private.connection_keys to service_role;

create function public.muse_key_identity(p_hash text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce((select jsonb_build_object('user_id',k.user_id,'key_id',k.id)
    from muse_private.connection_keys k join auth.users u on u.id=k.user_id
    join muse_private.members m on m.user_id=k.user_id and m.enabled
    where k.key_hash=p_hash and k.expires_at>now() and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until<=now())),jsonb_build_object('error','unauthorized'));
$$;
revoke all on function public.muse_key_identity(text) from public,anon,authenticated;
grant execute on function public.muse_key_identity(text) to service_role;

-- Replace the old signature atomically. Five-argument callers still use the default
-- sixth argument during deployment; no overload ambiguity in PostgREST.
drop function public.muse_gateway(uuid,uuid,uuid,text,jsonb);
create or replace function public.muse_gateway(p_user uuid, p_session uuid, p_client uuid, p_op text, p_args jsonb default '{}'::jsonb, p_key_hash text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  identity jsonb;
  state muse_private.learning_states%rowtype;
  item muse_private.inbox%rowtype;
  permission muse_private.connections%rowtype;
  connection_key muse_private.connection_keys%rowtype;
  output jsonb;
  target_client uuid;
  new_version bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));
  if p_key_hash is not null then
    -- Re-check inside the same per-user lock as revocation and delivery.
    select * into connection_key from muse_private.connection_keys
      where user_id=p_user and id=p_client and key_hash=p_key_hash and expires_at>now();
    if p_session is not null or connection_key.id is null then return jsonb_build_object('error','unauthorized'); end if;
    identity := jsonb_build_object(
      'valid',exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null and (banned_until is null or banned_until<=now())),
      'member',exists(select 1 from muse_private.members where user_id=p_user and enabled));
  else
    identity := public.muse_session(p_user,p_session,p_client);
  end if;
  if not (identity->>'valid')::boolean then return jsonb_build_object('error','unauthorized'); end if;
  if p_op = 'enroll' and p_client is null then
    -- Only a verified direct personal session may enable its own inbox.
    insert into muse_private.members(user_id) values(p_user) on conflict do nothing;
    return jsonb_build_object('member',exists(select 1 from muse_private.members where user_id=p_user and enabled));
  end if;
  if p_op = 'status' and p_client is null then return identity; end if;
  if not (identity->>'member')::boolean then return jsonb_build_object('error','invitation_required'); end if;
  if p_client is not null then
    if p_key_hash is not null then
      permission.read_summary := connection_key.read_summary;
      permission.deliver_drafts := connection_key.deliver_drafts;
    else
      select * into permission from muse_private.connections where user_id=p_user and client_id=p_client;
    end if;
    if p_op = 'state' and not coalesce(permission.read_summary,false) then return jsonb_build_object('error','permission_denied'); end if;
    if p_op in ('deliver','receipt','delivery_context') and not coalesce(permission.deliver_drafts,false) then return jsonb_build_object('error','permission_denied'); end if;
    if p_op not in ('state','receipt','deliver','delivery_context','guide') then return jsonb_build_object('error','permission_denied'); end if;
    if not coalesce(permission.read_summary or permission.deliver_drafts,false) then return jsonb_build_object('error','permission_denied'); end if;
  end if;
  if p_op = 'guide' then return jsonb_build_object('allowed',true); end if;
  -- These operations are after the delegated-operation allowlist above.
  if p_op = 'keys' then
    select coalesce(jsonb_agg(to_jsonb(k) - 'user_id' - 'key_hash' order by k.created_at desc),'[]'::jsonb)
      into output from muse_private.connection_keys k where k.user_id=p_user;
    return output;
  end if;
  if p_op = 'create_key' then
    if not coalesce((p_args->>'read_summary')::boolean or (p_args->>'deliver_drafts')::boolean,false)
      or coalesce(char_length(btrim(p_args->>'label')),0) not between 1 and 80
      or not coalesce(p_args->>'key_hash' ~ '^[0-9a-f]{64}$',false)
      then return jsonb_build_object('error','invalid_request'); end if;
    delete from muse_private.connection_keys where user_id=p_user and expires_at<=now();
    if (select count(*) from muse_private.connection_keys where user_id=p_user) >= 5 then return jsonb_build_object('error','key_limit'); end if;
    insert into muse_private.connection_keys(user_id,key_hash,label,read_summary,deliver_drafts)
      values(p_user,p_args->>'key_hash',btrim(p_args->>'label'),coalesce((p_args->>'read_summary')::boolean,false),coalesce((p_args->>'deliver_drafts')::boolean,false))
      returning * into connection_key;
    return to_jsonb(connection_key) - 'user_id' - 'key_hash';
  end if;
  if p_op = 'revoke_key' then
    delete from muse_private.connection_keys where user_id=p_user and id=(p_args->>'key_id')::uuid;
    return jsonb_build_object('revoked',true);
  end if;
  if p_op = 'connections' then
    select coalesce(jsonb_agg(jsonb_build_object('client_id',c.client_id,'client_name',c.client_name,
      'read_summary',c.read_summary,'deliver_drafts',c.deliver_drafts,'created_at',c.created_at)), '[]'::jsonb) into output
      from muse_private.connections c where c.user_id=p_user;
    return output;
  end if;
  if p_op = 'grant' then
    target_client := (p_args->>'client_id')::uuid;
    -- The server verifies the authorization/user/client through Auth before this call.
    -- The existing foreign key still rejects nonexistent clients.
    insert into muse_private.connections(user_id,client_id,client_name,read_summary,deliver_drafts)
      values(p_user,target_client,coalesce(nullif(left(p_args->>'client_name',200),''),'Muse'),(p_args->>'read_summary')::boolean,(p_args->>'deliver_drafts')::boolean)
      on conflict(user_id,client_id) do update set client_name=excluded.client_name, read_summary=excluded.read_summary, deliver_drafts=excluded.deliver_drafts;
    return jsonb_build_object('saved',true);
  end if;
  if p_op = 'revoke' then
    delete from muse_private.connections where user_id=p_user and client_id=(p_args->>'client_id')::uuid;
    return jsonb_build_object('revoked',true);
  end if;
  select * into state from muse_private.learning_states where user_id=p_user;
  if p_op in ('state','own_state','delivery_context') then
    select count(*) into new_version from muse_private.inbox where user_id=p_user and status='pending';
    return jsonb_build_object('version',coalesce(state.version,0),'summary',state.summary,'updated_at',state.updated_at,'inbox_pending_count',new_version);
  end if;
  if p_op in ('publish','unshare') then
    if coalesce(state.version,0) <> (p_args->>'expected_version')::bigint then return jsonb_build_object('error','state_conflict'); end if;
    new_version := coalesce(state.version,0)+1;
    insert into muse_private.learning_states(user_id,version,summary) values(p_user,new_version,
      case when p_op='unshare' then null else p_args->'summary' end)
      on conflict(user_id) do update set version=excluded.version,summary=excluded.summary,updated_at=now();
    return jsonb_build_object('version',new_version,'updated_at',now());
  end if;
  if p_op = 'inbox' then
    select coalesce(jsonb_agg(to_jsonb(i) - 'user_id' - 'payload_hash' - 'processed_at' order by i.received_at desc),'[]'::jsonb)
      into output from muse_private.inbox i where i.user_id=p_user and i.status='pending';
    return output;
  end if;
  select * into item from muse_private.inbox where user_id=p_user and draft_id=(p_args->>'draft_id')::uuid;
  if p_op = 'receipt' then
    if item.draft_id is null then return jsonb_build_object('found',false); end if;
    return jsonb_build_object('found',true,'payload_hash',item.payload_hash,'status',item.status);
  end if;
  if p_op = 'resolve' then
    if item.draft_id is null then return jsonb_build_object('error','not_found'); end if;
    if p_args->>'status' not in ('filed','discarded') then return jsonb_build_object('error','invalid_request'); end if;
    if item.status <> 'pending' and item.status <> p_args->>'status' then return jsonb_build_object('error','delivery_conflict'); end if;
    update muse_private.inbox set status=p_args->>'status',draft=null,processed_at=coalesce(processed_at,now()) where user_id=p_user and draft_id=item.draft_id;
    return jsonb_build_object('status',p_args->>'status');
  end if;
  if p_op = 'deliver' then
    if item.draft_id is not null then
      if item.payload_hash <> p_args->>'payload_hash' then return jsonb_build_object('error','delivery_conflict'); end if;
      return jsonb_build_object('receipt','duplicate','draft_id',item.draft_id,'status',item.status);
    end if;
    if state.summary is null then return jsonb_build_object('error','summary_not_shared'); end if;
    if state.version <> (p_args->>'expected_version')::bigint then return jsonb_build_object('error','state_conflict'); end if;
    if (select count(*) from muse_private.inbox where user_id=p_user and status='pending') >= 50 then return jsonb_build_object('error','inbox_full'); end if;
    insert into muse_private.inbox(user_id,draft_id,draft,payload_hash)
      values(p_user,(p_args->>'draft_id')::uuid,p_args->'draft',p_args->>'payload_hash');
    return jsonb_build_object('receipt','accepted','draft_id',p_args->>'draft_id','status','pending');
  end if;
  return jsonb_build_object('error','invalid_request');
end;
$$;
revoke all on function public.muse_gateway(uuid,uuid,uuid,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.muse_gateway(uuid,uuid,uuid,text,jsonb,text) to service_role;
