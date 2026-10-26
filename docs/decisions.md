# Rebuild decisions — 2026-10-27 JST

The owner requested a new implementation rather than extending the prior prototype. The new repository name is `sentence-book-muse`.

- Start with Everyday, Travel, Conversation, Love and Quiet Thoughts as an empty classification vocabulary.
- Work themes can be proposed when appropriate and require explicit confirmation.
- Build minimal Copy practice first. Detailed typewriter mechanics are optional.
- Candidate demo: prepare an English presentation, approve a work binder, then file a later page into that same binder. Actual speech content is still needed.
- Target models: Binder, Page, FilingProposal and PracticeState, with a new local persistence envelope at schemaVersion 1.
- Generation uses the prior lesson-schema-v2 plus filing. The source schema is outstanding, so no response contract has been fabricated.
- The draft identifier should be issued by the application, reused for retries and remembered when filed. This prevents duplicate adoption locally; it does not by itself guarantee provider billing idempotency.
- Estimated duration is a forecast, not a measured learning time. User-reported reasons such as being busy must not be inferred from counts alone.

The supplied draft's suggestion that commit dates alone prove new work is not adopted. Record the origin of design/schema inputs, actual authorship and changes. No claim of eligibility or completion is made by this scaffold.

Cloudflare compatibility date is 2026-10-26, the current UTC runtime date. Local work is recorded as 2026-10-27 JST. The runtime rejects a future compatibility date.
