# The Sentence Book — Muse

**Your life becomes your textbook.**

The Sentence Book turns the context a learner shares with their personal AI into a daily English lesson, then helps them practise it and build a printable book, page by page.

It is a language-learning app and a working example of a broader idea: a personal AI agent can bring context into a focused application without making the user explain their life again every day.

Built for the **2026 Meta Global AI Developer Hackathon**.

- **Live app:** https://sentence-book-muse.pages.dev
- **3-minute demo:** https://youtu.be/dnnXryEMOBs
- **English connection/settings screen:** https://sentence-book-muse.pages.dev/settings?lang=en
- **Implementation and verification history:** [PROJECT_STATUS.md](PROJECT_STATUS.md)

## The problem

Generic lessons teach useful situations, but not necessarily the things you want to say about your own life. Free conversation asks you to produce those expressions before you have practised them. Writing a diary or choosing a new prompt every day adds another task.

The Sentence Book connects these experiences: your own Muse prepares a lesson from the context available to it, delivers it on a schedule, and the app provides structured practice before you return to conversation.

## Why Meta: two distinct roles

**The learner's own Muse supplies personal context and lessons.** With the learner's permission, it can use their conversations and social posts that it can access, read a shared learning-state summary, and deliver a lesson draft to their inbox. The schedule runs in Muse, not in a background timer inside this web app.

**Meta Model API supplies focused help during practice.** The app calls `muse-spark-1.3` through server-side routes for contextual expression meanings and English reconstruction feedback. The provider key stays on the server.

This separation is the point of the project: the personal agent knows the learner's context; the application provides a specific learning experience. Social posting is optional. The app does not independently collect a learner's social-media accounts or automatically publish posts.

A possible longer-term loop is life and posts → personal lessons → expressions the learner can use → new conversations or posts. This is a product hypothesis, not a measured engagement or learning result.

## Try it

1. Open the live **Desk** and try the built-in sample page.
2. To receive personal lessons, open **Settings**, sign in, create an inbox, and choose what to share with Muse.
3. Follow the connection instructions: review the shared summary and permissions, ask Muse to connect, create a connection key, and enter it into Muse's secure input.
4. Ask Muse to deliver lessons at your preferred time. Settings include lesson material, level, explanation language, delivery days and time; the schedule request must be conveyed to Muse.
5. Open **Inbox**, preview an arriving draft, and decide whether to file it in an existing or new binder. Delivery does not automatically file a page.
6. Open the filed page from **Folder**, practise on **Desk**, and export a notebook PDF.

Copy-and-paste lesson import remains available in Inbox when a direct connection is unavailable. Your personal Muse account and its available features are required for the personal-agent workflow; the public sample does not require that connection.

## Five stages of practice

1. **Copy:** type the model sentences onto the notebook. The handwriting appears as you type. Tap an expression for its meaning and keep it with a marker line.
2. **Shadowing:** listen and repeat, with replay and slower speech.
3. **Dictation:** listen, write what you hear, and compare it with the model.
4. **Reconstruction:** use the meaning as a cue to write your own English. Meta Model API checks the line and provides a correction or short advice when needed; a valid alternative need not match the model word for word.
5. **Speaking:** hear a question, answer aloud, and hear the sample answer. The app does not record or score your speech. A copyable request takes the practice back to your own Muse. In the demo, Muse asks aloud, the learner answers by voice, and Muse returns written feedback; this is not a claim of embedded real-time voice conversation.

In-app playback uses the browser's speech synthesis and available voices. It is separate from Muse's voice features.

## A notebook worth keeping

- Three desk themes: Pure White, Natural and Walnut.
- Four English handwriting faces, two Japanese faces, pens, markers and a timer.
- Browser-local binders, filed pages, vocabulary and practice records.
- A measured A5 layout rendered independently on screen and in vector PDF.
- A5 output or two original-size A5 copies on landscape A4, with front-only, back-only and duplex export.
- Review backs with meaning prompts and writing space.
- An optional **filled sample** export for demonstrations. It prints the completed form of a lesson without changing actual practice progress.

Print at 100% and test one sheet first; duplex orientation and paper handling depend on the printer.

## Architecture and data boundaries

- **Frontend:** React, TypeScript and Vite.
- **Application backend:** Cloudflare Pages Functions.
- **Model calls:** Meta Model API, with shared Zod contracts, structured output, server validation and browser-side validation.
- **Personal connection:** authenticated learner accounts, a cloud inbox and an explicitly shared learning-state summary, backed by Supabase.
- **Agent interface:** lesson guide, shared learning-state read and draft delivery. The demonstrated personal-Muse path uses a scoped connection key. OAuth/MCP support is also implemented for compatible clients; do not assume every client has the same connection flow.
- **Abuse controls:** same-origin/canonical-origin checks and D1-backed usage counters for model routes.

Local practice and filed books are not a fully synchronized cloud library. A shared learning summary and cloud inbox are distinct from the browser's complete local records. The learner controls sharing and filing.

Connection keys are scoped, revocable and expire after 30 days. Only their hashes are stored server-side. Never include a live key, session token or private lesson in an issue, screenshot or submission.

### Model access

The current practice routes `/api/lookup` and `/api/review` do **not** require the old shared invitation code. They retain origin checks, validation and usage limits.

Current limits (per hashed client address per minute / per day / shared per day):

- Expression lookup: **20 / 150 / 3,000**
- Reconstruction review: **10 / 80 / 1,500**

The earlier `/api/generate` route remains invitation-gated, with limits **3 / 20 / 300**. It is not the current personal-Muse lesson workflow or a visible lesson-generation entry point. Limits count attempts, not dollars; missing usage-counter configuration or store failures stop model requests.

## Current release and verification

As recorded on **2026-11-02**, the latest release entry is main commit `9287e9f` / deployment `5ade9c52` (PR #13). It includes the filled-sample PDF option, the earlier erase-marker feature, and Japanese/English selection for connection and settings screens. Desk, Inbox and Folder are not fully translated into English.

[PROJECT_STATUS.md](PROJECT_STATUS.md) records:
- Owner-reported daily Muse delivery at 07:00 and filing of delivered pages.
- Production checks of expression/reconstruction features and real-model reconstruction feedback.
- 238 passing tests and a successful TypeScript/Vite build for the latest release, plus synthetic PDF checks and a production check of the new print option.

These are dated development and owner reports, not a new independent end-to-end audit or a guarantee across all devices. The separate Reconstruction-back printing branch is not merged and is not included in this release. Browser-local storage, browser voice availability and printer-specific behavior remain relevant limitations.

## Local development

Use **Node.js 22.12 or later** (CI uses Node 24).

```sh
npm ci
npm run types
npm run dev
```

The frontend runs at `http://127.0.0.1:5307`. This command does not start the Pages Functions.

For the full local Pages build:

```sh
npm test
npm run build
npm run pages:build
npm run pages:dev
```

Pages development uses port `8797`. Configure the exact local origin in `ACCESS_ORIGIN`. Copy `.dev.vars.example` to a gitignored `.dev.vars` and supply the server-side values required by the features you are testing. Use a separate QA backend for account/inbox tests; do not point destructive fixtures at production.

- `META_MODEL_API_KEY`: server-side model credential.
- `MODEL_API_BASE_URL` / `MODEL_ID`: provider configuration; current defaults are Meta Model API and `muse-spark-1.3`.
- `RATE_SALT` and the `RATE_LIMIT` D1 binding: usage counters.
- `SUPABASE_SECRET_KEY`: server-only account/inbox backend credential; configure corresponding project settings separately.
- `INVITE_CODE_SHA256` / `SESSION_SECRET`: retained invitation-gated generation route.

Never put model or backend secret keys in `VITE_*` variables, frontend assets or Git. The example file contains historical invitation wording; the route distinction above describes current behavior.

Deployment is manual and separate from testing:

```sh
npm run build
npx wrangler pages deploy dist --project-name sentence-book-muse --branch main
```

Deploy only the intended reviewed commit and verify the resulting release. Keep the separate pre-hackathon prototype and its storage/deployment untouched.

## Provenance and licenses

The author has a separate personal prototype built before the hackathon. This repository is a new first-party application implementation informed by that concept and design experience. No old application source, lesson corpus, illustrations or saved audio are copied into this repository.

The project defines a new `sentence_book_page_v1` contract; it does not claim compatibility with the unavailable prior lesson schema. Third-party dependencies and fonts remain third-party work, not newly authored hackathon assets.

The handwriting runtime uses EMS-derived stroke fonts and Klee One / Zen Kurenaido Japanese fonts, with SIL OFL 1.1 notices and attribution. See [font provenance](public/fonts/README.md), [licenses](public/licenses/) and [the generation contract](docs/generation-contract.md). Commit dates alone are not proof of competition eligibility.

Older design documents and chronological status entries may describe superseded plans. For the present submission, use this README together with the newest release entries in [PROJECT_STATUS.md](PROJECT_STATUS.md).
