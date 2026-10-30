-- Restore the existing gateway's narrow reads after OAuth configuration.
-- Production verification found these column grants missing; the cause is unconfirmed.
-- Browser roles remain denied, and the gateway remains SECURITY INVOKER.
grant select(user_id, client_id, revoked_at) on auth.oauth_consents to service_role;
grant select(id, client_name, deleted_at) on auth.oauth_clients to service_role;
