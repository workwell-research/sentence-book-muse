-- Managed OAuth tables do not give postgres SELECT WITH GRANT OPTION.
-- The preceding grant-only repair therefore did not change production access.
-- Use Auth APIs for client details and auth.sessions for live authorization.
-- Supabase revokeGrant deletes the client's sessions and refresh tokens:
-- https://supabase.com/docs/reference/javascript/oauth-server-revokegrant
-- Keep service-only SECURITY INVOKER functions and default-deny browser access.
alter table muse_private.connections add column client_name text not null default 'Muse'
  check (char_length(client_name) <= 200);
revoke select(user_id,client_id,revoked_at) on auth.oauth_consents from service_role;
revoke select(id,client_name,deleted_at) on auth.oauth_clients from service_role;

create or replace function public.muse_session(p_user uuid, p_session uuid, p_client uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'valid', exists(select 1 from auth.sessions s join auth.users u on u.id = s.user_id
      where s.id = p_session and s.user_id = p_user and s.oauth_client_id is not distinct from p_client
        and (s.not_after is null or s.not_after > now()) and u.email_confirmed_at is not null
        and (u.banned_until is null or u.banned_until <= now())),
    'member', exists(select 1 from muse_private.members m where m.user_id = p_user and m.enabled)
  );
$$;
revoke all on function public.muse_session(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.muse_session(uuid,uuid,uuid) to service_role;

-- One gateway with fixed operations avoids exposing arbitrary table filters.
-- The caller is verified again inside the transaction so revoke/delivery cannot race.
create or replace function public.muse_gateway(p_user uuid, p_session uuid, p_client uuid, p_op text, p_args jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  identity jsonb;
  state muse_private.learning_states%rowtype;
  item muse_private.inbox%rowtype;
  permission muse_private.connections%rowtype;
  output jsonb;
  target_client uuid;
  new_version bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));
  identity := public.muse_session(p_user,p_session,p_client);
  if not (identity->>'valid')::boolean then return jsonb_build_object('error','unauthorized'); end if;
  if p_op = 'enroll' and p_client is null then
    -- Only a verified direct personal session may enable its own inbox.
    insert into muse_private.members(user_id) values(p_user) on conflict do nothing;
    return jsonb_build_object('member',exists(select 1 from muse_private.members where user_id=p_user and enabled));
  end if;
  if p_op = 'status' and p_client is null then return identity; end if;
  if not (identity->>'member')::boolean then return jsonb_build_object('error','invitation_required'); end if;
  if p_client is not null then
    select * into permission from muse_private.connections where user_id=p_user and client_id=p_client;
    if p_op = 'state' and not coalesce(permission.read_summary,false) then return jsonb_build_object('error','permission_denied'); end if;
    if p_op in ('deliver','receipt','delivery_context') and not coalesce(permission.deliver_drafts,false) then return jsonb_build_object('error','permission_denied'); end if;
    if p_op not in ('state','receipt','deliver','delivery_context','guide') then return jsonb_build_object('error','permission_denied'); end if;
    if not coalesce(permission.read_summary or permission.deliver_drafts,false) then return jsonb_build_object('error','permission_denied'); end if;
  end if;
  if p_op = 'guide' then return jsonb_build_object('allowed',true); end if;
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
revoke all on function public.muse_gateway(uuid,uuid,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.muse_gateway(uuid,uuid,uuid,text,jsonb) to service_role;
