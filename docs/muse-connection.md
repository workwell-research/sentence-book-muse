# Personal Muse connection

Implementation started 2026-10-30. This document describes the implementation and configuration contract; current deployment/verification status is in PROJECT_STATUS.md. The earlier personal prototype is not changed.

## Learner flow

1. Open `/connect`, sign in with an email confirmation code, and enable your personal inbox. Anyone may connect their own Muse; no invitation code is required.
2. Preview the learning summary from this browser, then explicitly publish it. Updates are manual. Stopping sharing clears the server snapshot and blocks new deliveries.
3. Add `https://sentence-book-muse.pages.dev/mcp` to Muse as an OAuth MCP connection. The `/oauth/consent` page shows the real OAuth client, requested account information, and separate opt-in permissions for summary reading and draft delivery. Actual Muse consumer compatibility still needs a live check.
4. Ask Muse to read the guide and current state, then deliver a draft. A schedule is a separate learner choice; the app does not create one.
5. Review the cloud inbox and explicitly file or discard. Filing copies a lesson into this browser's existing library. After a successful local write, the server receives a completion receipt. A failed receipt can be retried without a second local copy. Resolving an inbox item removes its body from the common inbox on every device; local books/practice are not synchronized.

## Server boundary

- Separate Supabase project: `wgyyfxlabbzhnrbtwmcc`, Tokyo, `sentence-book-muse`, in `workwell-research's Org`. Created at the tool's quoted $0/month. Existing project `mmnbymoivpzzbvmdshlb` is untouched.
- Four tables live in `muse_private`, with RLS enabled and no browser roles granted schema/table access. Deliberately no RLS allow policies: the advisor's four INFO notices reflect default deny. Neither anonymous nor authenticated roles can invoke the public gateway functions.
- Pages alone uses `SUPABASE_SECRET_KEY`. It verifies the JWT with Supabase Auth, then checks issuer, audience `authenticated`, expiry, user and session/client IDs. The database independently checks the live Auth session, confirmed email, ban, enabled membership and active OAuth consent. Every row operation uses that verified user ID. App grants are separate from the OAuth OIDC scopes.
- `muse_gateway` uses security-invoker and service-only execute access, a fixed operation list, and a transaction advisory lock per user. It has column-only read grants for live Auth identity/consent checks. No SECURITY DEFINER or arbitrary browser-provided table filters.
- Personal sessions alone may enroll, publish/unshare, resolve or manage grants. OAuth sessions cannot call those operations. Grant creation verifies the authorization request with Auth and takes the client ID from its response, not caller input. App revocation denies access immediately; the browser also requests Auth grant revocation to stop token refresh.
- The owner opened personal Muse enrollment to everyone on 2026-10-30. Verified email, a live personal session and per-client consent still protect each account. The applied migration retains the legacy internal error name `invitation_required` for a missing/disabled membership and an historical invitation-cookie comment; the cookie gate was in the server handler and is now removed. No table permissions or RLS were relaxed.
- Paid generation/lookup keep their existing invitation-cookie guard. Muse delivery does not call the app owner's model API.

## Tools and receipts

`get_lesson_guide` returns the shared lesson contract and instructions. `get_learning_state` returns only the explicitly shared snapshot, version, pending count, and a stable daily draft ID for the learner-selected date. Accuracy and time spent are unknown (`null`), not estimated from inactivity. `deliver_page_draft` accepts a strict `{contract, delivery_date, draft}` object with `sentence_book_page_v1` content. The ID derives from user/date; level, language, version and binder IDs must match the current snapshot. New deliveries accept dates from seven days ago through tomorrow (UTC allowance covers local date differences).

Delivery is idempotent by user/draft ID plus canonical payload hash. Same payload returns a duplicate receipt even after filing/discard; changed content conflicts. Pending inbox capacity is 50. A processed item keeps only receipt metadata/hash, not the lesson body. There is no auto-filing. Request bodies are capped at 64KiB; D1 limits MCP/REST calls to 30/min, 500/day per caller address and 10,000/day total, failing closed on storage errors. These are coarse usage limits, not a provider spending budget.

MCP uses the official TypeScript SDK, per-request stateless HTTP, with legacy 2025 streamable HTTP support. Protected-resource metadata is at `/.well-known/oauth-protected-resource/mcp`. The default Supabase `authenticated` audience is project-wide; live client grants and operation checks supply the application boundary. This is not a claim that Supabase tokens have a resource-specific MCP audience.

## Configuration

1. Apply `supabase/migrations/20261030035947_muse_inbox.sql` to the new project only. The public functions are exposed through its Data API but executable solely by service_role.
2. Set Auth Site URL to `https://sentence-book-muse.pages.dev`; OAuth server authorization path `/oauth/consent`. Enable OAuth server and Dynamic OAuth Apps for automatic MCP client registration. Dynamic registration is public; client names are untrusted, and only an enrolled learner's explicit consent grants access.
3. Configure custom SMTP. Intended existing sender: `noreply@auth.workwell-ai.com`, name `The Sentence Book`, host `smtp.resend.com`, port 465, user `resend`. Enter the Resend sending key in the dashboard; never commit it. Provider quotas are shared with any other app using that account/domain. Configure **both** Confirm sign up and Magic link or OTP templates with `supabase/templates/login-code.html`, subject `The Sentence Book の確認コード`. Keep email confirmation enabled. No password or unverified-email bypass.
4. Put the new project's secret API key in Cloudflare Pages `sentence-book-muse` as encrypted `SUPABASE_SECRET_KEY`. The URL and publishable key are public configuration in wrangler.jsonc. Do not use a VITE secret. Cloud settings require a new deployment to take effect.
5. Verify a real email sign-in, enrollment without an invitation, summary publication, OAuth authorization/refresh/revoke, MCP tool discovery, valid draft delivery and manual filing. Browser mocks and database tests do not establish production OAuth/Muse compatibility or email delivery.

If authentication cannot be configured, `/connect` reports unavailable, and the existing app remains usable. No fallback admits anonymous inbox access.

## Validation

`tests/muse-database.test.ts` executes the actual migration in PGlite with disposable Auth fixtures: role denial, cross-account isolation, direct/delegated separation, version conflicts, duplicate receipts, cap, unsharing, session expiry, disabled membership and revocation. `tests/muse-connection.test.ts` covers gateway validation, invitation-free personal enrollment, anonymous/delegated denial, Origin and JWT claim checks, summary privacy, stable IDs, lesson context checks and real SDK stateless MCP initialization/listing. `scripts/qa-muse-connect-server.mjs` is a synthetic UI-only mock server on port 8803 and must never be deployed; it sends no emails and has no real secrets.

Primary references: [Supabase OAuth server](https://supabase.com/docs/guides/auth/oauth-server/getting-started), [OAuth token security](https://supabase.com/docs/guides/auth/oauth-server/token-security), [MCP authentication](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication), [email passwordless login](https://supabase.com/docs/guides/auth/auth-email-passwordless).
