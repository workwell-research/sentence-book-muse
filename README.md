# The Sentence Book — Muse

A new implementation for the 2026 Meta Global AI Developer Hackathon. Turn something you want to say into a personal English page, review its proposed binder, file it, and practise one sentence at a time.

## What it is (as of 2026-11-04)

The learner's own Muse writes a short English page about what they want to say; the learner files it into a binder, practises it one sentence at a time on an A5 desk, and prints it as a real notebook page. Everything the learner writes stays in their browser; Muse sees only the summary they chose to share.

Public site: https://sentence-book-muse.pages.dev — four destinations with one header: 机 `/` (desk), 本棚 `/shelf` (folder of approved books), 受信箱 `/inbox` (pages delivered by Muse or pasted in), 設定 `/settings` (Muse connection, lesson settings, display language). Progress and verification records are in [PROJECT_STATUS.md](PROJECT_STATUS.md).

### The desk

- **Five passes on one page.** Copy (type each sentence onto the A5 line; letters draw as you type, Enter checks and advances), Shadowing (the spoken word is marked as the browser reads), Dictation (the sentence is taped over, Enter checks, missed words get the marker), Reconstruction (write the sentence from its meaning; the model reviews each line and writes the more natural phrasing with a note), Speaking (a taped question and a sample answer to listen to; not scored).
- **The learner draws the lines.** After writing a sentence, tap the words you do not understand on the notebook line; 「調べて線を引く」 asks the model for the meaning of exactly that span and draws the line with its memo under the words. A line drawn by mistake can be erased. Lines are kept with the page and in My Vocabulary.
- **Printing.** Each page exports as a two-sided A5 PDF at 100%: the copied page on the front, the check questions on the back; A5 sheets or two-up on landscape A4; one side at a time for printers without A5 duplex. 「全文を書き終えた形で（見本用）」 prints every line as written, for a sample, without touching the learning record.
- Pure White, Natural and Walnut desks, six pens, four English hand faces and two Japanese faces derived from licensed fonts, a timer, reduced motion, and a mobile layout with fixed-paper zoom.

### Muse

- The learner connects their own Muse from `/settings`: sign in with an email code, turn on the inbox, share a learning summary (level, weekdays, pace, what has been practised), and let Muse connect over MCP (`/mcp`, OAuth through the app's consent page) or with a 30-day connection key pasted into Muse's secure key field. The instructions Muse needs are copyable from the same screen.
- Muse reads the shared summary and delivers a page (`sentence_book_page_v1`, validated on the server and again in the browser) to the inbox; the learner files it into a proposed or existing binder, or discards it. Filing copies the page into this browser and sends Muse a completion receipt. Nothing else is synchronised.
- Without a connection, the same page format can be produced by any Muse conversation from the copyable guide and pasted into the inbox.
- The connection and settings screens have a Japanese / English switch (`?lang=en` opens them in English).

### Server

Cloudflare Pages Functions: `/api/review` (Reconstruction review) and `/api/lookup` (expression meaning) call Meta Model API `muse-spark-1.3` with structured output, store nothing, and are bounded by per-address and shared daily caps in D1; `/api/muse/*` and `/mcp` carry the Muse connection, backed by a separate Supabase project that holds only the shared summary snapshot, inbox items and key digests. `/api/generate` (the app generating lessons on the owner's key) remains, invitation-only, but the current screens no longer use it: for the hackathon, lessons come only from the learner's own Muse.

## Provenance

The author has a separate personal prototype, built and published before the hackathon. This project starts new first-party application code. The concept and design lessons inform this implementation. The initial five-theme scaffold was removed after the owner chose an open-ended shelf. No old application source, lesson corpus, illustrations or saved audio are copied into this repository. The new handwriting runtime uses third-party EMS-derived stroke fonts and selectable Klee One / Zen Kurenaido Japanese fonts, explicitly licensed and credited under SIL OFL 1.1; see public/licenses/. Font data is not claimed as first-party hackathon work.

The supplied rebuild design references a prior lesson schema whose source is unavailable. This project uses the design’s field requirements and a newly authored contract; no legacy schema compatibility is claimed. Commit timestamps are supporting records; they do not by themselves establish originality or rule eligibility. Dependencies and fonts remain third-party work under their own licenses. The scaffold stage described above is over; the application in this repository is the submission.

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

The last command serves `dist` and the Functions on `http://127.0.0.1:8797`. `npm run dev` serves the frontend only; model-backed routes need `.dev.vars` (copy `.dev.vars.example`).

## Deployment

Public site: https://sentence-book-muse.pages.dev (Cloudflare Pages project `sentence-book-muse`, production branch `main`). Deploys are manual:

```bash
npm run build && npx wrangler pages deploy dist --project-name sentence-book-muse --branch main
```

`META_MODEL_API_KEY` is an encrypted Pages secret (`wrangler pages secret put META_MODEL_API_KEY --project-name sentence-book-muse`, value piped from the ignored `.dev.vars`); a secret set after a deployment applies from the next deployment. `MODEL_API_BASE_URL` and `MODEL_ID` are plain vars in `wrangler.jsonc`. Usage caps: `/api/generate` 3 per minute, 20 per day per client address and 300 per day in total; `/api/lookup` 20 / 150 / 3,000. Counts live in the D1 database `sentence-book-muse-limits` (binding `RATE_LIMIT` in `wrangler.jsonc`; created with `wrangler d1 create`, no migration needed) and addresses are hashed with the `RATE_SALT` secret. Over the cap the route answers 429 `rate_limited` with `Retry-After`; without the binding or on a counter-store error it answers 503. Generation retries consume another slot; these are attempt limits, not a dollar budget.

## Invitation-only routes

`/api/generate` and `/api/access` still require a shared invitation code (a signed, expiring HttpOnly cookie); the current screens do not use them. `/api/lookup` and `/api/review` are open to everyone on the canonical origin and are bounded by the D1 caps above. See [invitation setup, rotation and old-deployment cleanup](docs/invitation-access.md). No invitation or model secret is bundled into frontend assets.

## Local verification

For the current typing interaction, run `QA_ORIGIN=http://127.0.0.1:5327 node scripts/qa-live-ink.mjs` against a dedicated Vite dev server. It checks live stroke progression, editing/Undo, composition fallback, restore, four English faces and mobile Enter behavior; evidence is in `.impeccable/review/live-input/`.

Run `npm test` and `npm run build`. With a dedicated Vite development origin, `QA_ORIGIN=http://127.0.0.1:5327 npm run qa:desk` checks the local Copy flow, persistence/failure handling, 18 theme/color pairs, font advances, desktop/mobile layouts, timer and actual PDF downloads in disposable Chrome contexts. `QA_ORIGIN=http://127.0.0.1:5327 node scripts/qa-desk-review.mjs` checks reachable mobile Enter behavior/caret scrolling, personal editing and animation resume. Neither script touches the user's preview storage. Current evidence is in `.impeccable/review/desk/`; exported fixtures are `output/pdf/desk-a5-completed.pdf` and `output/pdf/desk-a5-on-a4-blank.pdf`.

`npm run qa:a5` targets the retained `/handwriting` prototype; `qa:handwriting` and `qa:print` alias it and need not all be repeated. For the interest flow, use a separate `npm run pages:dev` origin and `node scripts/qa-scaffold.mjs`. Synthetic IME events are not real OS/mobile-keyboard verification. Physical devices, audio and printed output require separate checks.

Current Enter-flow QA: `node scripts/qa-enter-flow.mjs` checks atomic advancement, focus, legacy confirmed records, failure guards and the five learning index tabs. Run against the dedicated development origin5327; evidence is in `.impeccable/review/enter-flow/`. The earlier desk/PDF captures remain dated evidence.

## Out of scope for this version

Personal accounts beyond the Muse connection sign-in, synchronising books or practice between devices, the old curriculum, saved audio and the prior Notebook/Cards. Physical printing has been checked by the owner on one printer; other printers and devices are unverified.

## References

- [Cloudflare Pages Functions secrets](https://developers.cloudflare.com/pages/functions/bindings/#secrets)
- [Pages Functions TypeScript](https://developers.cloudflare.com/pages/functions/typescript/)
- [Pages Functions configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [Meta Model API quickstart](https://dev.meta.ai/docs/quickstart)

See `PROJECT_STATUS.md` for performed checks and `docs/decisions.md` for the current scope.

