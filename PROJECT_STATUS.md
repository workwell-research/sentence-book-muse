# Sentence Book Muse — progress

Last updated: 2026-10-27 JST. Owner: Codex — interest onboarding and Muse content guidance.

Local checkout: `/Users/maki/sentence-book-muse`
Public repository: https://github.com/workwell-research/sentence-book-muse

## Current scope
New repository scaffold based on the supplied rebuild design. The separate existing app is untouched. See README.md for provenance and docs/decisions.md for the four implementation choices.

## Implemented
- First-run interest selection: multiple choices, custom additions, explicit save, skip, later edit/clear and non-destructive failure handling. No binder is created by selecting interests.
- Interest-aware generation request validation and a pure Muse message builder. Casual notes become source material for useful communication situations; actual model output is not yet tested.
- An empty shelf with no preset themes, plus a topic/language/level note. New binders will be proposed from pages and require learner approval.
- New sentence_book_page_v1 contract, shared Zod validation and JSON Schema export in shared/lesson-schema.ts; see docs/generation-contract.md. This is not a recovered legacy v2 schema.
- Separate localStorage keys for interests and the existing topic note, with explicit save, restore and non-destructive error handling. Profile changes preserve note data.
- Vite/React/TypeScript configuration; Pages Functions health route and unavailable generation route.

## Verification
- `npm test`: 25 tests passed: original 15 plus 10 tests for interest persistence/skip/invalid data/quota errors, topic-free interest requests, empty requests and safe separation of prompt instructions from task data.
- `npm run types`: generated Cloudflare runtime types during the initial scaffold; runtime configuration is unchanged in this update.
- `npm run build`: app and Functions type checks plus Vite production build passed.
- `npm run pages:build`: Worker compilation passed.
- `node scripts/qa-scaffold.mjs`: disposable Chrome contexts at 1440×1040 and 390×844; first-run selection, keyboard checks, custom interests, save/reload, editing/cancel, persistent skip and profile quota failure passed. Existing note save/reload and unreadable data protection passed; no horizontal overflow or pageerrors. Generation remains disabled.
- Local HTTP checks: health 200, generate POST 503, generate GET 405, no-store response headers.
- Batched desktop/mobile inspection of onboarding and the saved-interest shelf, followed by one confirmation after shortening a mobile label and fixing offscreen skip-link rendering. Images and results are under `docs/qa/`. The initial heading locator needed a whitespace-tolerant match before browser checks could run.
- The local runtime rejected compatibility date 2026-10-27 as future UTC; configuration is 2026-10-26. Work dates here use JST.

No API call, credential setup, Pages deployment or physical-device test has been performed.

## Outstanding
- No longer waiting for standalone lesson-schema-v2: the owner indicated it is unavailable. The new contract is defined; its Meta JSON Schema compatibility and server/client integration still need verification.
- Meta account/model access and server secret configuration.
- Wire the saved interests and note to the real generation route, connect the prepared request/prompt/validators, and evaluate lesson usefulness with varied casual notes. Then add validated draft storage, filing/duplicate protection, Copy practice and Reader.
- Pages project creation and deployment. The public GitHub repository has been created.

## Work in progress
| Owner | Files | Work |
| --- | --- | --- |
| Codex | Interest onboarding, profile storage, shared generation request, prompt helper, tests and docs | Complete: local interest flow and preparation helpers verified; actual Meta generation and lesson quality still pending |

## History
- 2026-10-27: Started new code from the supplied design. No old source, lesson corpus, illustrations or saved audio copied. Prior concepts/theme names and intended schema provenance recorded.

- 2026-10-27: Passed local tests/build/Functions and disposable browser checks. Initial schema-dependent functionality remains unimplemented.

- 2026-10-27: Created the public GitHub repository; finalized the independent checkout under `/Users/maki/sentence-book-muse`. Dedicated QA server and disposable browsers stopped. The former app was not edited or redeployed.

- 2026-10-27: Owner clarified that the standalone schema is unavailable and themes need not be five. Removed the preset constants and shelf display, authored the new contract/validator and updated scope/provenance docs. Passed 15 tests, both type checks, app/Functions builds and disposable desktop/mobile browser QA. Note storage format and data were preserved. Dedicated QA server stopped. No Meta call, credential/configuration change, deployment or physical-device verification.

- 2026-10-27: Implemented the owner’s interest-first direction. Added editable/skippable interest profiles, custom choices, independent persistence, request validation and Muse prompt guidance that develops casual notes into practical scenes without judging the author. Updated docs and 25 passing tests; app/Functions builds and disposable desktop/mobile QA passed. No real API call, SNS collection, credential setup, deployment or physical-device testing. Dedicated QA server stopped; old app and its data untouched.
