# The Sentence Book — Muse

A new implementation for the 2026 Meta Global AI Developer Hackathon. Turn something you want to say into a personal English page, review its proposed binder, file it, and practise one sentence at a time.

## Current status

This repository includes a **working handwriting and PDF prototype** at /. AI generation remains a scaffold. The shared A5 composition and memo visibility from the owner-adopted [Work design handoff](docs/studygram-notebook-implementation-spec-2026-10-27.md) are implemented on screen and in PDF. Final handwriting assets and the generated-lesson/practice connection remain pending.

- Fixed physical A5 notebook: shared ruled geometry, measured sentence/gloss/footnote placement and continuation pages; independent SVG and PDF renderers.
- Memo shown/blank controls preserve body wrapping, reserved rows, vocabulary meanings, review checks and personal writing. Sentence-only and marker choices are independent.
- SVG stroke animation, following pen and markers; mobile fit or scrollable readable-size view without text reflow.
- Pause/resume, fast-forward, completion and reduced motion.
- Personal English line and review checks (session-only), six accent sets with graphite body ink, blue default and optional printed markers.
- A5 portrait finished notes with binding margins; choose an A5 printer sheet or unscaled two-up on landscape A4.
- [Handwriting architecture, research and font provenance](docs/handwriting-prototype.md).
- Earlier interest/topic-note flow preserved at /setup.

- Vite + React + TypeScript application with an empty shelf; themes have no fixed names or count.
- First-run interest selection with multiple choices, custom additions, skip, edit and local persistence. Interest selection does not create binders.
- A topic, explanation-language and level note saved locally in this browser.
- Validated interest-aware request and Muse prompt preparation. These helpers do not make a model request yet.
- Cloudflare Pages Functions routes for health and the future generation endpoint.
- `/api/generate` deliberately returns HTTP 503 and makes **no model request**.

The owner clarified that standalone `lesson-schema-v2` is unavailable. The new [`sentence_book_page_v1` contract](docs/generation-contract.md) and shared validator define this version’s generation format. They are not wired into a live generation flow yet. Model access, API credentials, actual generation, filing, practice, deployment and physical-device behavior remain unverified.

## Provenance

The author has a separate personal prototype, built and published before the hackathon. This project starts new first-party application code. The concept and design lessons inform this implementation. The initial five-theme scaffold was removed after the owner chose an open-ended shelf. No old application source, lesson corpus, illustrations or saved audio are copied into this repository. The new handwriting runtime uses a third-party Cutlings-derived stroke font, explicitly licensed and credited under SIL OFL 1.1; see public/licenses/. Font data is not claimed as first-party hackathon work.

The supplied rebuild design references a prior lesson schema whose source is unavailable. This project uses the design’s field requirements and a newly authored contract; no legacy schema compatibility is claimed. Commit timestamps are supporting records; they do not by themselves establish originality or rule eligibility. Dependencies and fonts remain third-party work under their own licenses. Do not describe this scaffold as the completed submission.

## Local development

Use Node.js 22.12+ (CI uses Node 24).

```sh
npm ci
npm run types
npm run dev
```

The browser app uses `http://127.0.0.1:5307`. This is a separate origin from the prior app. Its isolated storage keys are `sentence-book-muse:composer:v1` and `sentence-book-muse:interests:v1`; it does not read or migrate the prior application’s data. Existing topic notes are preserved when interests are added or changed.

```sh
npm test
npm run build
npm run pages:build
npm run pages:dev
```

The last command serves `dist` and the Functions on `http://127.0.0.1:8797`. `npm run dev` serves the frontend only. The generate route still returns 503 with or without credentials.

## Prototype verification

Run `npm test` and `npm run build`. With `npm run preview` running on its separate origin, `QA_BASE_URL=http://127.0.0.1:5308 npm run qa:a5` checks desktop/narrow layouts, memo-state preservation, six accents, content/marker settings, reduced motion and actual A5/A4 PDF downloads in disposable Chrome contexts. `qa:handwriting` and `qa:print` currently alias this same script; do not rerun all three. The older directly named QA scripts remain historical and target the previous page. Latest outputs are `output/pdf/shared-a5-memos-shown.pdf` and `output/pdf/shared-a5-on-a4-memos-blank.pdf`; evidence is in `.impeccable/review/shared-a5/`. For the interest flow, use `npm run pages:dev` and `node scripts/qa-scaffold.mjs`. No real learning data is used.

## Next implementation steps

1. Connect the interest-aware generation request, Muse prompt and response validator on both server and client; verify actual model output with varied ordinary notes.
2. Confirm the accessible model ID in the Meta portal. `muse-spark-1.3` is only a candidate.
3. Set `META_MODEL_API_KEY` as an encrypted Pages secret, never a `VITE_*` variable. For local Functions, use an ignored `.dev.vars` file based on `.dev.vars.example`.
4. Implement a bounded server request, structured output and server/client validation. Add request limits before a paid public endpoint becomes reachable.
5. Implement explicit filing approval, stable page IDs, duplicate-draft rejection, local persistence and Copy practice.
6. Verify with disposable data, then create a new Pages project and deploy the new app. Do not replace the existing personal prototype.

Account sync, login, OAuth/MCP, the old curriculum, saved audio, the full five-pass course and the prior Notebook/Cards are outside this version's scope.

## References

- [Cloudflare Pages Functions secrets](https://developers.cloudflare.com/pages/functions/bindings/#secrets)
- [Pages Functions TypeScript](https://developers.cloudflare.com/pages/functions/typescript/)
- [Pages Functions configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [Meta Model API quickstart](https://dev.meta.ai/docs/quickstart)

See `PROJECT_STATUS.md` for performed checks and `docs/decisions.md` for the current scope.
