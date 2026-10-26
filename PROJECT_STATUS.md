# Sentence Book Muse — progress

Last updated: 2026-10-27 JST. Owner: Codex.

Local checkout: `/Users/maki/sentence-book-muse`
Public repository: https://github.com/workwell-research/sentence-book-muse

## Current scope
New repository scaffold based on the supplied rebuild design. The separate existing app is untouched. See README.md for provenance and docs/decisions.md for the four implementation choices.

## Implemented
- Five empty theme binders and a topic/language/level note.
- Isolated localStorage key with explicit save, restore and non-destructive error handling.
- Vite/React/TypeScript configuration; Pages Functions health route and unavailable generation route.

## Verification
- `npm test`: 4 tests passed (isolated storage, malformed data, future schema and quota failure).
- `npm run types`: generated Cloudflare runtime types successfully.
- `npm run build`: app and Functions type checks plus Vite production build passed.
- `npm run pages:build`: Worker compilation passed.
- `node scripts/qa-scaffold.mjs`: disposable Chrome contexts at 1440×1040 and 390×844; no horizontal overflow or pageerrors; save/reload and language/level state verified; unreadable storage preserved; generation disabled.
- Local HTTP checks: health 200, generate POST 503, generate GET 405, no-store response headers.
- One batched visual pass and one confirmation after fixing the mobile header and label contrast. Screenshots and machine-readable results are under `docs/qa/`.
- The local runtime rejected compatibility date 2026-10-27 as future UTC; configuration is 2026-10-26. Work dates here use JST.

No API call, credential setup, Pages deployment or physical-device test has been performed.

## Outstanding
- Standalone lesson-schema-v2 definitions, especially questions/review_items.
- Meta account/model access and server secret configuration.
- Actual generation, validated draft storage, filing/duplicate protection, Copy practice and Reader.
- Pages project creation and deployment. The public GitHub repository has been created.

## Work in progress
| Owner | Files | Work |
| --- | --- | --- |
| Codex | New repository only | Scaffold and local verification complete; public repository created |

## History
- 2026-10-27: Started new code from the supplied design. No old source, lesson corpus, illustrations or saved audio copied. Prior concepts/theme names and intended schema provenance recorded.

- 2026-10-27: Passed local tests/build/Functions and disposable browser checks. Initial schema-dependent functionality remains unimplemented.

- 2026-10-27: Created the public GitHub repository; finalized the independent checkout under `/Users/maki/sentence-book-muse`. Dedicated QA server and disposable browsers stopped. The former app was not edited or redeployed.
