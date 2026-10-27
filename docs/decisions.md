# Rebuild decisions — 2026-10-27 JST

The owner requested a new implementation rather than extending the prior prototype. The new repository name is `sentence-book-muse`.

- Owner clarification: start with interest selection and an empty shelf. Do not fix the number or names of binder themes.
- Interest suggestions and custom choices guide Muse’s practical content; they do not create binders. Learners may skip, edit or clear them. A specific daily topic takes priority over a forced match. SNS-style text is optional learner-supplied material; no account collection.
- Propose a new binder when no existing one fits, including the first page; create it only with explicit confirmation. Work themes follow the same rule.
- Build minimal Copy practice first. Detailed typewriter mechanics are optional.
- Candidate demo: prepare an English presentation, approve a work binder, then file a later page into that same binder. Actual speech content is still needed.
- Target models: Binder, Page, FilingProposal and PracticeState, with a new local persistence envelope at schemaVersion 1.
- Owner clarification: the standalone lesson-schema-v2 is unavailable. Define a new sentence_book_page_v1 contract from the supplied design, documented in docs/generation-contract.md. It does not claim compatibility with the unseen prior schema.
- The draft identifier should be issued by the application, reused for retries and remembered when filed. This prevents duplicate adoption locally; it does not by itself guarantee provider billing idempotency.
- Estimated duration is a forecast, not a measured learning time. User-reported reasons such as being busy must not be inferred from counts alone.

The supplied draft's suggestion that commit dates alone prove new work is not adopted. Record the origin of design/schema inputs, actual authorship and changes. No claim of eligibility or completion is made by this scaffold.

Cloudflare compatibility date is 2026-10-26, the current UTC runtime date. Local work is recorded as 2026-10-27 JST. The runtime rejects a future compatibility date.

## Adopted notebook handoff — 2026-10-27

The owner adopted Work’s blue Studygram layout and directed this implementation chat to base further work on its handoff. docs/studygram-notebook-implementation-spec-2026-10-27.md takes precedence over previous temporary notebook composition. Exact geometry comes from refill-a5-v1.json/SVG; generated images are appearance references only. Shared physical layout does not mean screenshot-based PDF: the screen and vector PDF use independent renderers of one measured plan.

Recorded requirements: fixed A5 ruling/title band, short sentences every other row, supplied difficult-phrase glosses and right-footnotes, shown/blank memos without layout change, independent content/marker choices, graphite body and six accents with blue default, continuation pages, and explicit red-sheet answer spans. Preserve source IDs, user writing, checks and progress. Approval covers the layout and behavior; app integration and final glyph/physical tests remain pending. Only newly authored handoff materials were imported, with hashes; old application code/curriculum is excluded.


## Common A5 and memo integration — 2026-10-27

The owner authorized the adopted design's first implementation increment. The live screen and independent vector PDF now consume one physical A5 plan derived from the reference geometry JSON. Real glyph/static-font advances determine wrapping and reserved rows before memo visibility is applied. Blank memos omit only glosses, footnotes and their number marks; stable content IDs, vocabulary meanings/checks, personal writing and body positions are retained. Mobile fit/zoom changes the view, not the plan. Six accents now share graphite body ink with blue default.

Full M PLUS 1p TTF embedding is intentional: subsetting produced missing kana outlines despite successful text extraction. Final output was raster-checked as well as parsed, and the full embedded font bytes are regression tested. A5 finished size stays distinct from A5/A4 printer paper, with no scaling in A4 two-up. Current font assets remain provisional; red-sheet behavior, generated lesson/practice adaptation, durable completed notes and physical printing are separate pending increments. Latest checks are recorded in PROJECT_STATUS.md.

## 2026-10-27 — selectable handwriting
The owner requested choice instead of selecting one exclusive font pairing. Added two English centerline derivatives (Print / Pen) and two static Japanese handwritten fonts (Klee One / Zen Kurenaido). Fonts are independent of content, memo visibility, palette and print-sheet settings. Selected metrics govern line breaks; the PDF uses the same font identity and fully embeds the selected Japanese TTF. Switching previews completed sample ink and preserves input/checks; replay remains explicit. Defaults are provisional. All font sources/notices and modifications are documented in public/fonts/README.md.
