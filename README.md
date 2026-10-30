# The Sentence Book — Muse

A new implementation for the 2026 Meta Global AI Developer Hackathon. Turn something you want to say into a personal English page, review its proposed binder, file it, and practise one sentence at a time.

## Current status

This repository includes a **working local study desk and A5 notebook** at `/`, based on the owner's [Work desktop handoff](docs/desktop-study-desk.md). AI generation is connected locally: `/setup` sends a validated request to `/api/generate`, which calls Meta Model API (`muse-spark-1.3`) with structured output and returns a validated page for preview. The previous standalone typography prototype is retained at `/handwriting`.

- Pure White, Natural and Walnut desks; six selectable horizontal pens, a live index book and optional timer. Material PNGs are separate from live text and native controls.
- A read-only source card and one native editor on the current A5 line. Letters draw as they are typed. Enter checks/saves the sentence and focuses the next line immediately, without rewriting it. The eighth correct entry completes Copy. Five pastel paper index tabs highlight Copy; stages2–5 stay disabled with preparation labels. Animation does not complete learning.
- Copy practises either the synthetic eight-sentence sample or any page filed on the shelf (`/?page=<pageId>`, remembered for the next visit). Each page keeps its own drafts, confirmed progress, personal English writing and review marks locally; display choices are shared.
- Fixed physical A5 composition with measured wrapping, continuation pages and independent SVG/vector PDF renderers. Memo shown/blank retains reserved rows; Japanese phrase glosses are lifted 1mm.
- Readability Italic default, EMS Tech, Print and Pen; independent Klee One/Zen Kurenaido Japanese. Native input fonts derive from the same English centerlines with matching advances.
- Pause/resume, replay/finish and reduced motion. Mobile has fixed-paper zoom, caret-following horizontal scroll and Enter-only check-and-advance.
- A5 portrait finished notes with binding margins; A5 printer sheets or original-size two-up on landscape A4. Export uses confirmed text only, with optional markers and blank memos.
- [Desk architecture and limitations](docs/desktop-study-desk.md); [shared handwriting and font provenance](docs/handwriting-prototype.md).
- Earlier interest/topic-note flow preserved at `/setup`.

- Vite + React + TypeScript application with an empty shelf; themes have no fixed names or count.
- First-run interest selection with multiple choices, custom additions, skip, edit and local persistence. Interest selection does not create binders.
- A topic, explanation-language and level note saved locally in this browser.
- 「教材を作る」 on `/setup`: one request per distinct content (draft ID reused on retry), a bounded server call to Meta Model API with `response_format: json_schema` derived from the shared Zod contract, validation on the server and again in the browser, a read-only preview, and local storage of the page under `sentence-book-muse:pending-drafts:v1` as 「仕分けを待つページ」.
- `/api/generate` returns coded errors (503 when no key is configured, 400/413 for bad or oversized requests, 429 with Retry-After, 502 for upstream or non-conforming output, 504 on timeout) and never stores anything server-side. `/api/health` reports whether generation is configured and which model id is used, never the key.
- Filing: the preview ends with Muse's proposal and the learner's decision — create the proposed (editable) new binder, choose any existing binder, or discard. Binders and pages live under `sentence-book-muse:library:v1` with app-issued IDs; a draft can be filed only once and a new binder is created only through that explicit choice. The shelf lists binders with their pages and the pages still waiting. Existing binders are sent to the model as the only valid existing destinations.
- Bring your own Muse: 「自分のMuseアプリで作る場合」 on `/setup` gives a copyable guide (the same instructions the server uses, the JSON Schema and a request bound to a local ticket); the JSON the Muse app returns is pasted back, validated exactly like a server page, and reviewed and filed the same way (作成 「あなたのMuseアプリ」).
- A filed page opens on the desk from the shelf (「机で練習する」) or straight after filing. Its English is folded to keyboard characters, its meanings back 「意味を見る」, and Muse's review expressions become candidates in the words list.
- The lines on the paper are the learner's: after writing a sentence, tap the words you do not understand on the notebook line itself (a later word extends the span); 「調べて線を引く」 asks Muse (`/api/lookup`, `sentence_book_lookup_v1`) for the meaning of exactly that span in that sentence, and the line with its memo is drawn under the written words right away. Every line is kept with the page and in a shared word list (`sentence-book-muse:wordbook:v1`) shown under My Vocabulary. Shadowing and the later stages, and deployment, are not implemented yet.

The owner clarified that standalone `lesson-schema-v2` is unavailable. The new [`sentence_book_page_v1` contract](docs/generation-contract.md) and shared validator define this version’s generation format. They are wired into the live local generation flow as of 2026-10-29 (see PROJECT_STATUS.md for the real calls and browser checks). Deployment and physical-device behavior remain unverified; filing and Copy practice of a generated page were checked in the local browser on 2026-10-29/30. The synthetic local Copy flow is implemented separately.

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

For the current typing interaction, run `QA_ORIGIN=http://127.0.0.1:5327 node scripts/qa-live-ink.mjs` against a dedicated Vite dev server. It checks live stroke progression, editing/Undo, composition fallback, restore, four English faces and mobile Enter behavior; evidence is in `.impeccable/review/live-input/`.

Run `npm test` and `npm run build`. With a dedicated Vite development origin, `QA_ORIGIN=http://127.0.0.1:5327 npm run qa:desk` checks the local Copy flow, persistence/failure handling, 18 theme/color pairs, font advances, desktop/mobile layouts, timer and actual PDF downloads in disposable Chrome contexts. `QA_ORIGIN=http://127.0.0.1:5327 node scripts/qa-desk-review.mjs` checks reachable mobile Enter behavior/caret scrolling, personal editing and animation resume. Neither script touches the user's preview storage. Current evidence is in `.impeccable/review/desk/`; exported fixtures are `output/pdf/desk-a5-completed.pdf` and `output/pdf/desk-a5-on-a4-blank.pdf`.

`npm run qa:a5` targets the retained `/handwriting` prototype; `qa:handwriting` and `qa:print` alias it and need not all be repeated. For the interest flow, use a separate `npm run pages:dev` origin and `node scripts/qa-scaffold.mjs`. Synthetic IME events are not real OS/mobile-keyboard verification. Physical devices, audio and printed output require separate checks.

Current Enter-flow QA: `node scripts/qa-enter-flow.mjs` checks atomic advancement, focus, legacy confirmed records, failure guards and the five learning index tabs. Run against the dedicated development origin5327; evidence is in `.impeccable/review/enter-flow/`. The earlier desk/PDF captures remain dated evidence.

## Next implementation steps

1. Done 2026-10-29: request, prompt, structured output and validation on both sides are connected; `muse-spark-1.3` confirmed. For local Functions, copy `.dev.vars.example` to the ignored `.dev.vars`. `MODEL_API_BASE_URL`/`MODEL_ID` can point the same code at another OpenAI-compatible host (for example OpenRouter `meta/muse-spark-1.3`).
2. Done 2026-10-29 (late) and 2026-10-30: explicit filing approval, binders with stable IDs, duplicate-draft rejection, multi-page persistence, and the desk's Copy flow opening filed pages with per-page progress.
3. Add a request/cost limit (Cloudflare rate-limit rule or token bucket) and a semantic check pass before the endpoint is public.
4. Set `META_MODEL_API_KEY` as an encrypted Pages secret, never a `VITE_*` variable; create a new Pages project and deploy. Do not replace the existing personal prototype.

Account sync, login, OAuth/MCP, the old curriculum, saved audio, the full five-pass course and the prior Notebook/Cards are outside this version's scope.

## References

- [Cloudflare Pages Functions secrets](https://developers.cloudflare.com/pages/functions/bindings/#secrets)
- [Pages Functions TypeScript](https://developers.cloudflare.com/pages/functions/typescript/)
- [Pages Functions configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [Meta Model API quickstart](https://dev.meta.ai/docs/quickstart)

See `PROJECT_STATUS.md` for performed checks and `docs/decisions.md` for the current scope.

2026-10-27 interaction refinement: English-only learning index tabs color only the current step. Enter checks/saves/advances without Next buttons; Option+R (Mac) / Alt+R (Windows) reads the current model. Dedicated CUA checks and the 78-test suite are recorded in `PROJECT_STATUS.md`; older browser scripts were adapted, not rerun in this increment.
