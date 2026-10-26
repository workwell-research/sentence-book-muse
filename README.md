# The Sentence Book — Muse

A new implementation for the 2026 Meta Global AI Developer Hackathon. Turn something you want to say into a personal English page, review its proposed binder, file it, and practise one sentence at a time.

## Current status

This repository is a **scaffold**, not a working AI demo yet.

- Vite + React + TypeScript application with five empty theme binders.
- A topic, explanation-language and level note saved locally in this browser.
- Cloudflare Pages Functions routes for health and the future generation endpoint.
- `/api/generate` deliberately returns HTTP 503 and makes **no model request**.

The standalone `lesson-schema-v2` document has not yet been supplied. Its detailed `questions` and `review_items` definitions are not guessed here. Model access, API credentials, actual generation, filing, practice, deployment and physical-device behavior remain unverified.

## Provenance

The author has a separate personal prototype, built and published before the hackathon. This project starts new first-party application code. The concept, the five theme names, and design lessons inform this implementation. No old application source, lesson corpus, illustrations or saved audio are copied into this repository.

The supplied rebuild design references a prior lesson schema. Any adopted schema will be identified as prior design, with the new filing extension documented separately. Commit timestamps are supporting records; they do not by themselves establish originality or rule eligibility. Dependencies and fonts remain third-party work under their own licenses. Do not describe this scaffold as the completed submission.

## Local development

Use Node.js 22.12+ (CI uses Node 24).

```sh
npm ci
npm run types
npm run dev
```

The browser app uses `http://127.0.0.1:5307`. This is a separate origin from the prior app. Its only storage key is `sentence-book-muse:composer:v1`; it does not read or migrate the prior application's data.

```sh
npm test
npm run build
npm run pages:build
npm run pages:dev
```

The last command serves `dist` and the Functions on `http://127.0.0.1:8797`. `npm run dev` serves the frontend only. The generate route still returns 503 with or without credentials.

## Next implementation steps

1. Read the actual lesson-schema-v2; define a shared response validator with filing metadata.
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
