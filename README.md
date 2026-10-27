# The Sentence Book — Muse

A new implementation for the 2026 Meta Global AI Developer Hackathon. Turn something you want to say into a personal English page, review its proposed binder, file it, and practise one sentence at a time.

## Current status

This repository includes a **working local study desk and A5 notebook** at `/`, based on the owner's [Work desktop handoff](docs/desktop-study-desk.md). AI generation remains a scaffold. The previous standalone typography prototype is retained at `/handwriting`.

- Pure White, Natural and Walnut desks; six selectable horizontal pens, a live index book and optional timer. Material PNGs are separate from live text and native controls.
- A read-only source card and one native editor on the current A5 line. Letters draw as they are typed. Explicit confirmation checks and saves the sentence without rewriting it; Next advances. Animation does not complete learning.
- One synthetic eight-sentence Copy lesson, with locally saved drafts, confirmed progress, personal English writing, review marks and display choices. This is not multi-lesson history or AI-generated material.
- Fixed physical A5 composition with measured wrapping, continuation pages and independent SVG/vector PDF renderers. Memo shown/blank retains reserved rows; Japanese phrase glosses are lifted 1mm.
- Readability Italic default, EMS Tech, Print and Pen; independent Klee One/Zen Kurenaido Japanese. Native input fonts derive from the same English centerlines with matching advances.
- Pause/resume, replay/finish and reduced motion. Mobile has fixed-paper zoom, caret-following horizontal scroll and reachable confirmation/Next controls.
- A5 portrait finished notes with binding margins; A5 printer sheets or original-size two-up on landscape A4. Export uses confirmed text only, with optional markers and blank memos.
- [Desk architecture and limitations](docs/desktop-study-desk.md); [shared handwriting and font provenance](docs/handwriting-prototype.md).
- Earlier interest/topic-note flow preserved at `/setup`.

- Vite + React + TypeScript application with an empty shelf; themes have no fixed names or count.
- First-run interest selection with multiple choices, custom additions, skip, edit and local persistence. Interest selection does not create binders.
- A topic, explanation-language and level note saved locally in this browser.
- Validated interest-aware request and Muse prompt preparation. These helpers do not make a model request yet.
- Cloudflare Pages Functions routes for health and the future generation endpoint.
- `/api/generate` deliberately returns HTTP 503 and makes **no model request**.

The owner clarified that standalone `lesson-schema-v2` is unavailable. The new [`sentence_book_page_v1` contract](docs/generation-contract.md) and shared validator define this version’s generation format. They are not wired into a live generation flow yet. Model access, API credentials, actual generation, filing, generated-lesson practice, deployment and physical-device behavior remain unverified. The synthetic local Copy flow is implemented separately.

## Provenance

The author has a separate personal prototype, built and published before the hackathon. This project starts new first-party application code. The concept and design lessons inform this implementation. The initial five-theme scaffold was removed after the owner chose an open-ended shelf. No old application source, lesson corpus, illustrations or saved audio are copied into this repository. The new handwriting runtime uses third-party EMS-derived stroke fonts and selectable Klee One / Zen Kurenaido Japanese fonts, explicitly licensed and credited under SIL OFL 1.1; see public/licenses/. Font data is not claimed as first-party hackathon work.

The supplied rebuild design references a prior lesson schema whose source is unavailable. This project uses the design’s field requirements and a newly authored contract; no legacy schema compatibility is claimed. Commit timestamps are supporting records; they do not by themselves establish originality or rule eligibility. Dependencies and fonts remain third-party work under their own licenses. Do not describe this scaffold as the completed submission.

## Local development

Use Node.js 22.12+ (CI uses Node 24).

```sh
npm ci
npm run types
npm run dev
```

The browser app uses `http://127.0.0.1:5307`. This is a separate origin from the prior app. The earlier flow uses `sentence-book-muse:composer:v1` and `sentence-book-muse:interests:v1`. The desk adds `sentence-book-muse:desk-display:v1` and `sentence-book-muse:sample-copy:v1`; it does not read or migrate the prior application’s data. Existing topic notes are preserved when interests are added or changed.

```sh
npm test
npm run build
npm run pages:build
npm run pages:dev
```

The last command serves `dist` and the Functions on `http://127.0.0.1:8797`. `npm run dev` serves the frontend only. The generate route still returns 503 with or without credentials.

## Local verification

For the current typing interaction, run `QA_ORIGIN=http://127.0.0.1:5327 node scripts/qa-live-ink.mjs` against a dedicated Vite dev server. It checks live stroke progression, editing/Undo, composition fallback, restore, four English faces and mobile actions; evidence is in `.impeccable/review/live-input/`.

Run `npm test` and `npm run build`. With a dedicated Vite development origin, `QA_ORIGIN=http://127.0.0.1:5327 npm run qa:desk` checks the local Copy flow, persistence/failure handling, 18 theme/color pairs, font advances, desktop/mobile layouts, timer and actual PDF downloads in disposable Chrome contexts. `QA_ORIGIN=http://127.0.0.1:5327 node scripts/qa-desk-review.mjs` checks reachable mobile actions/caret scrolling, personal editing and animation resume. Neither script touches the user's preview storage. Current evidence is in `.impeccable/review/desk/`; exported fixtures are `output/pdf/desk-a5-completed.pdf` and `output/pdf/desk-a5-on-a4-blank.pdf`.

`npm run qa:a5` targets the retained `/handwriting` prototype; `qa:handwriting` and `qa:print` alias it and need not all be repeated. For the interest flow, use a separate `npm run pages:dev` origin and `node scripts/qa-scaffold.mjs`. Synthetic IME events are not real OS/mobile-keyboard verification. Physical devices, audio and printed output require separate checks.

## Next implementation steps

1. Connect the interest-aware generation request, Muse prompt and response validator on both server and client; verify actual model output with varied ordinary notes.
2. Confirm the accessible model ID in the Meta portal. `muse-spark-1.3` is only a candidate.
3. Set `META_MODEL_API_KEY` as an encrypted Pages secret, never a `VITE_*` variable. For local Functions, use an ignored `.dev.vars` file based on `.dev.vars.example`.
4. Implement a bounded server request, structured output and server/client validation. Add request limits before a paid public endpoint becomes reachable.
5. Implement explicit filing approval, stable page IDs, duplicate-draft rejection, multi-lesson persistence and connect the existing sample Copy flow to accepted lessons.
6. Verify with disposable data, then create a new Pages project and deploy the new app. Do not replace the existing personal prototype.

Account sync, login, OAuth/MCP, the old curriculum, saved audio, the full five-pass course and the prior Notebook/Cards are outside this version's scope.

## References

- [Cloudflare Pages Functions secrets](https://developers.cloudflare.com/pages/functions/bindings/#secrets)
- [Pages Functions TypeScript](https://developers.cloudflare.com/pages/functions/typescript/)
- [Pages Functions configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [Meta Model API quickstart](https://dev.meta.ai/docs/quickstart)

See `PROJECT_STATUS.md` for performed checks and `docs/decisions.md` for the current scope.
