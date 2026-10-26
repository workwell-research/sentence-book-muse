# Sentence Book Muse — progress

Last updated: 2026-10-27 JST. Owner: Codex — open-ended shelf and new generation contract.

Local checkout: `/Users/maki/sentence-book-muse`
Public repository: https://github.com/workwell-research/sentence-book-muse

## Current scope
New repository scaffold based on the supplied rebuild design. The separate existing app is untouched. See README.md for provenance and docs/decisions.md for the four implementation choices.

## Implemented
- An empty shelf with no preset themes, plus a topic/language/level note. New binders will be proposed from pages and require learner approval.
- New sentence_book_page_v1 contract, shared Zod validation and JSON Schema export in shared/lesson-schema.ts; see docs/generation-contract.md. This is not a recovered legacy v2 schema.
- Isolated localStorage key with explicit save, restore and non-destructive error handling.
- Vite/React/TypeScript configuration; Pages Functions health route and unavailable generation route.

## Verification
- `npm test`: 15 tests passed: 4 storage tests and 11 generation-contract tests, including mismatched requests, unknown destinations, conflicting destinations, missing fields, content limits and invalid review references.
- `npm run types`: generated Cloudflare runtime types during the initial scaffold; runtime configuration is unchanged in this update.
- `npm run build`: app and Functions type checks plus Vite production build passed.
- `npm run pages:build`: Worker compilation passed.
- `node scripts/qa-scaffold.mjs`: disposable Chrome contexts at 1440×1040 and 390×844; no horizontal overflow or pageerrors; save/reload and language/level state verified; unreadable storage preserved; generation disabled.
- Local HTTP checks: health 200, generate POST 503, generate GET 405, no-store response headers.
- One batched visual pass for the revised empty shelf on desktop and mobile. Screenshots and machine-readable results are under `docs/qa/`. The initial scaffold had a separate prior visual pass.
- The local runtime rejected compatibility date 2026-10-27 as future UTC; configuration is 2026-10-26. Work dates here use JST.

No API call, credential setup, Pages deployment or physical-device test has been performed.

## Outstanding
- No longer waiting for standalone lesson-schema-v2: the owner indicated it is unavailable. The new contract is defined; its Meta JSON Schema compatibility and server/client integration still need verification.
- Meta account/model access and server secret configuration.
- Actual generation, validated draft storage, filing/duplicate protection, Copy practice and Reader.
- Pages project creation and deployment. The public GitHub repository has been created.

## Work in progress
| Owner | Files | Work |
| --- | --- | --- |
| Codex | src/App.tsx, src/styles.css, shared/, tests/, project docs and QA | Complete: fixed themes removed, new contract defined and locally verified; real generation and filing flow remain next |

## History
- 2026-10-27: Started new code from the supplied design. No old source, lesson corpus, illustrations or saved audio copied. Prior concepts/theme names and intended schema provenance recorded.

- 2026-10-27: Passed local tests/build/Functions and disposable browser checks. Initial schema-dependent functionality remains unimplemented.

- 2026-10-27: Created the public GitHub repository; finalized the independent checkout under `/Users/maki/sentence-book-muse`. Dedicated QA server and disposable browsers stopped. The former app was not edited or redeployed.

- 2026-10-27: Owner clarified that the standalone schema is unavailable and themes need not be five. Removed the preset constants and shelf display, authored the new contract/validator and updated scope/provenance docs. Passed 15 tests, both type checks, app/Functions builds and disposable desktop/mobile browser QA. Note storage format and data were preserved. Dedicated QA server stopped. No Meta call, credential/configuration change, deployment or physical-device verification.
