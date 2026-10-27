# Sentence Book Muse — progress

Last updated: 2026-10-27 JST. Owner: Codex — adopted Work Studygram handoff.

Local checkout: `/Users/maki/sentence-book-muse`
Public repository: https://github.com/workwell-research/sentence-book-muse

## Current scope
The owner has adopted the Work-side notebook design in [the implementation handoff](docs/studygram-notebook-implementation-spec-2026-10-27.md). Its final blue references and exact A5 geometry are now the implementation baseline. The accepted direction uses fine graphite writing, blue accents, every-other-line short sentences, difficult-expression meanings below their anchors and right-column footnotes. Screen and PDF will share the same physical page and line plan through separate renderers. Memo blanking must preserve reserved space, body wrapping, later blocks and page count. Six accent palettes and generic A5 / original-size A4 two-up remain requirements. The current runtime has not yet been integrated with this handoff; final glyphs are still provisional.

Previous implemented print scope: the finished notebook is generic A5 portrait (148 × 210 mm), superseding the earlier Rollbahn L direction. Implemented separate A5 printer-sheet or A4 landscape two-up output, unscaled at 100%, adjustable binding margins and optional printed markers. Six selectable notebook inks share colors between the screen and PDF. The screen’s temporary typography remains unchanged; the PDF now has its own millimetre-based composition. Future B5/Rollbahn presets are structural extension points, not active/verified formats.

Earlier owner feedback, 2026-10-27: the original prototype lettering/page were described as elementary-school-like. The subsequent Work layout and display requirements are now adopted, superseding the earlier unresolved whole-page design direction. This acceptance does not approve the current temporary font or imply that the reference design is already implemented. The owner plans to remake materials.

The owner explicitly replaced the typewriter identity and requested a working Web handwriting prototype. The root route now renders a cream ruled notebook with real sequential strokes, a following pen, marker, annotation and personal writing. PDF export is independent of the animation. This is the React/Web implementation; the earlier Flutter proposal was exploratory.

The separate prior app remains untouched. Existing interest selection and topic-note persistence in this new repository remain available at /setup. The sample sentence is newly authored demonstration content, clearly labeled; no Meta generation or learning completion is implied. See docs/handwriting-prototype.md for architecture, research, font provenance and limits.

## Implemented
- New src/handwriting/ scene, responsive SVG centerline layout, pen lifts and variable stroke pace, phase ordering, pause/resume, 1×/2×/4×, completion/replay and reduced motion.
- Personal input and paste draw sequential strokes with a following pen. Insertions/replacements keep unchanged glyph identities; deleted strokes are removed. Separate pause/resume/finish prevents a queue from blocking input. The demo input is session-only and this is disclosed.
- Six labeled native-radio color sets: pink, lavender, blue, green, yellow, gray. Title/body/annotation/personal/marker roles share colors on screen and in PDF; switching preserves stroke progress. These preferences are session-only.
- Independent vector A5 notebook layout, separate notebook-format and printer-sheet registries. A5 portrait is the default output; A4 landscape places two identical A5 pages at x=0/149 mm, scale 1, with a 1 mm central cutting strip. The UI explicitly distinguishes finished size and printer paper.
- Default left 18 mm binding margin, optional right binding and 12/18/24 mm margins; white print paper, separate section labels/annotation/personal/review space. Marker toggle omits only printed highlight paths. PrintScaling=None plus 100% / actual-size instructions; A4 output is already imposed. Oversized/unsupported content errors instead of clipping or shrinking.
- Third-party Cutlings Singularis source and attribution retained under SIL OFL 1.1; modified font renamed Sentence Study Strokes, with missing ASCII punctuation authored here. No first-party authorship claim for the source font.
- First-run interest selection: multiple choices, custom additions, explicit save, skip, later edit/clear and non-destructive failure handling. No binder is created by selecting interests.
- Interest-aware generation request validation and a pure Muse message builder. Casual notes become source material for useful communication situations; actual model output is not yet tested.
- An empty shelf with no preset themes, plus a topic/language/level note. New binders will be proposed from pages and require learner approval.
- New sentence_book_page_v1 contract, shared Zod validation and JSON Schema export in shared/lesson-schema.ts; see docs/generation-contract.md. This is not a recovered legacy v2 schema.
- Separate localStorage keys for interests and the existing topic note, with explicit save, restore and non-destructive error handling. Profile changes preserve note data.
- Vite/React/TypeScript configuration; Pages Functions health route and unavailable generation route.

## Verification — 2026-10-27 Work handoff adoption
- Documentation/reference import only: copied 11 newly created handoff/reference resources, including the two adopted blue images, geometry/options JSON, SVG guides and reference PDFs. Source/import hashes are recorded in docs/assets/studygram-2026-10-27/handoff-import.json. Only two absolute PDF links in the options JSON were made repository-relative; no old application code, private learning data or lesson corpus was copied.
- Checked all 9 handoff links and 5 explicit JSON resource links, JSON parsing, source/import hashes, A5 SVG geometry (148 x 210 mm; 31 body rules / 34 horizontal rules; 5.2 mm pitch; 8.32 mm title band), and both supplied gloss occurrence spans. Visually inspected the two adopted blue reference images. Results: docs/assets/studygram-2026-10-27/handoff-checks.json. Generated images remain appearance references; geometry JSON/SVG governs precise positions.
- Updated PRODUCT.md, DESIGN.md/sidecar, README and feature/decision notes to distinguish the adopted target from the current runtime. Existing implementation inventories and earlier verification records remain historical evidence.
- No application source, configuration, browser storage, running server or deployment changed. No new PDF was generated. Application tests/build, browser/device checks and physical printing/red-sheet calibration were not rerun for this documentation-only adoption. First-party text diff checks passed excluding reference PDFs; the byte-identical refill PDF retains required fixed-width xref spaces.

## Verification — 2026-10-27 color / print update
- Implementation: npm test passed all 40 tests; both TypeScript projects and Vite production build passed; npm run pages:build compiled the existing Worker. No runtime/secrets/hosting configuration changed. New tests check readable palette contrasts using the actual marker opacity, marker-only removal, binding/long content, overflow, exact paper sizes, unscaled A5 form placement and the actual PDF color operators.
- Browser: npm run qa:print passed in disposable Chrome at 1440×1040 and mobile 390×844, plus overflow check at 320px. Verified six palettes, native radio arrow keys, no reset of paused stroke progress, matching personal ink, A5/left/18mm defaults, print-only markers, real downloads, reduced motion and untouched fixture storage. No browser errors. This turn did not rerun the full /setup API/browser suite; schema/storage unit tests remained passing and its source was unchanged.
- PDF: actual downloads output/pdf/a5-notebook-marked.pdf and output/pdf/a5-notebook-on-a4-unmarked.pdf, both one page. Pypdf confirmed 148×210 / 297×210 mm MediaBoxes, no image objects, PrintScaling=None. Unit checks decoded embedded A5 forms with scale=1 and physical placements. Poppler renders visually inspected for full English, annotation, personal writing, margins, rules/footer and cutting guides. First text path begins beyond the 18 mm binding edge in the downloaded sample. Artifacts/results: .impeccable/review/print-colors/.
- Review: fresh Impeccable reviewer found required UI/PDF captures valid and all scoped feature fidelity matched. Its only material fix was stale Colors/Print documentation. A documenter updated DESIGN.md and the schemaVersion 2 sidecar; the reviewer scored that documentation finding resolved, disposition ship. Parent inspected the diff, parsed JSON and checked whitespace; no standalone YAML parser was available. The verdict pass covers this finding, not a new whole-surface audit. Temporary lettering/whole-page Studygram acceptance and physical printing are outside this approval.
- Limits: no physical printer/hole fit/grayscale test, hardware test, actual Meta call or Pages deployment. PrintScaling is a viewer hint, so user print-dialog scale must still be 100%. Demo repeats one page twice on A4; multi-day imposition/pagination and other finished formats are future work. Existing 5317 preview stays running; no other server/data was modified.

## Verification — 2026-10-27 handwriting update
- Implementation: npm test passed 33 tests (25 existing, 8 handwriting/edit/PDF tests). npm run build passed both TypeScript projects and Vite production build. npm run pages:build compiled the Worker. Runtime config and generated types were unchanged.
- Browser: scripts/qa-handwriting.mjs passed in disposable Chrome contexts at 1440×1040 and 390×844. Pen movement, sample pause/resume/speed/finish/replay, sequential pasted input, personal pause/resume/finish, unsupported input preservation, PDF before sample completion, reduced motion, keyboard skip link, no overflow/pageerrors and untouched fixture storage verified.
- Regression: scripts/qa-scaffold.mjs passed at /setup against local Pages port 8798. Interest selection/custom text/save/reload/cancel/skip/quota failure, note preservation, corrupt-storage protection, HTTP health 200 and generation 503/405 remain correct. Results: docs/qa/setup-regression-2026-10-27.json.
- Visual: desktop/mobile batched inspection, one correction/confirmation, then a fresh Impeccable review. The reviewer requested sequential personal handwriting; one correction batch was recaptured and the reviewer scored that single finding resolved, disposition ship. The verdict pass is not a new whole-surface audit. Screenshots and results: .impeccable/review/.
- PDF: actual browser download at output/pdf/handwriting-note.pdf. Pypdf verified one A5 page (419.5276 × 595.2756 pt), no embedded image objects. Poppler raster reviewed for complete lettering, annotation, margins and footer. Initial Poppler fontconfig failure was resolved with a temporary font/cache configuration; no system font settings changed.
- Documentation: fresh documenter replaced the retired DESIGN.md and generated schemaVersion 2 .impeccable/design.json from actual tokens/components. Parent read the design, parsed the sidecar and verified the route/feature limits. Source implementation commit: d52e85d.
- Tool limits: Impeccable context/concept-seed/detector launcher could not execute (permission denied). User-pinned direction, direct context, actual screenshots and fresh reviewer were used; no generated seed/card/comp is claimed.
- Local preview remains available on http://127.0.0.1:5317 while its process runs. The temporary Pages regression server was stopped after checks. No other contributor server was stopped.

No Meta/API call, credential setup, Pages deployment, physical-device test or physical printing occurred. The handwriting body of the PDF is vector paths, not selectable/searchable/tagged text.

## Outstanding
- Implement the adopted handoff: begin with the common A5 refill and shared physical line planning, then independent content/memo/marker settings with blank memos preserving layout. Integrate fine graphite body writing and six accent palettes (blue first-use default while retaining explicit saved choices), long-content pagination, Japanese text embedding and validated red-sheet answer spans. Verify the handoff acceptance matrix against actual screen/PDF outputs. Final glyphs remain provisional; physical print/red-sheet calibration and future B5/Rollbahn presets remain unverified.
- Connect a validated generated lesson and actual practice results to the new notebook; completion animation alone is not a recorded learning result. Persist completed notes only when that model is agreed.
- No longer waiting for standalone lesson-schema-v2: the owner indicated it is unavailable. The new contract is defined; its Meta JSON Schema compatibility and server/client integration still need verification.
- Meta account/model access and server secret configuration.
- Wire the saved interests and note to the real generation route, connect the prepared request/prompt/validators, and evaluate lesson usefulness with varied casual notes. Then add validated draft storage, filing/duplicate protection, Copy practice and Reader.
- Pages project creation and deployment. The public GitHub repository has been created.

## Work in progress
| Owner | Files | Work |
| --- | --- | --- |
| Codex | Adopted Work handoff/reference files; PRODUCT.md, DESIGN.md/sidecar, docs and statuses | Handoff adoption complete; no active edits. Runtime integration of the shared A5 layout and memo settings is next. |

## History
- 2026-10-27: Started new code from the supplied design. No old source, lesson corpus, illustrations or saved audio copied. Prior concepts/theme names and intended schema provenance recorded.

- 2026-10-27: Passed local tests/build/Functions and disposable browser checks. Initial schema-dependent functionality remains unimplemented.

- 2026-10-27: Created the public GitHub repository; finalized the independent checkout under `/Users/maki/sentence-book-muse`. Dedicated QA server and disposable browsers stopped. The former app was not edited or redeployed.

- 2026-10-27: Owner clarified that the standalone schema is unavailable and themes need not be five. Removed the preset constants and shelf display, authored the new contract/validator and updated scope/provenance docs. Passed 15 tests, both type checks, app/Functions builds and disposable desktop/mobile browser QA. Note storage format and data were preserved. Dedicated QA server stopped. No Meta call, credential/configuration change, deployment or physical-device verification.

- 2026-10-27: Implemented the owner’s interest-first direction. Added editable/skippable interest profiles, custom choices, independent persistence, request validation and Muse prompt guidance that develops casual notes into practical scenes without judging the author. Updated docs and 25 passing tests; app/Functions builds and disposable desktop/mobile QA passed. No real API call, SNS collection, credential setup, deployment or physical-device testing. Dedicated QA server stopped; old app and its data untouched.

- 2026-10-27: Received the notebook-first redesign concept and proposed Flutter screen/component structure, shared content/evidence/note models, Studygram/editorial design rules, independent PDF rendering and a submission-sized vertical slice. No code or platform migration. Existing implementation and local data preserved; prior test results were not rerun. Flutter choice, initial paper size and learning-stage scope remain open.

- 2026-10-27: Implemented the requested Web handwriting identity in the new repository: sequential vector pen strokes, marker/annotation, personal writing with edit preservation, and independent vector PDF. Retained the /setup flow and prior storage. Added licensed third-party font provenance. 33 tests, production/Functions builds, disposable desktop/mobile and regression checks, PDF parsing/render inspection passed. Fresh reviewer requested one input-motion fix and scored it resolved after correction. No Meta call, deployment, hardware or physical-print claim.

- 2026-10-27: Documented the implemented handwriting design and sidecar; preserved font-source bytes and original readme (upstream CRLF/trailing spaces retained). First-party staged diff checks passed; original vendor formatting is intentionally unchanged.

- 2026-10-27: Owner supplied two Studygram references and rejected the demo’s large irregular handwriting/sparse page as elementary-school-like. Recorded smaller consistent lettering, structured study density, subtle colors and temporary font status. Documentation-only update; reference images/private paths not copied, no application or PDF changes and no repeated runtime checks. Previous reviewer ship verdict is not owner visual approval.

- 2026-10-27: Implemented six ink sets and replaced ambiguous A5/A4 finished-size selection with a fixed A5 notebook plus separate A5/A4 printer sheet. Added independent mm print composition, original-size two-up, optional markers, cut guides and print instructions. 40 tests/build/Worker, disposable desktop/narrow browser and actual PDF dimension/vector/render checks passed. Preserved prior owner reference correction; current font remains provisional. Fresh reviewer’s sole documentation finding resolved, disposition ship; deferred typography acceptance preserved. No physical print, actual AI call or deployment.

- 2026-10-27: Adopted the owner-approved Work notebook handoff as the implementation baseline. Imported 11 new design/reference resources with provenance hashes and portable PDF links; checked reference links, JSON/SVG geometry and gloss anchors, and viewed both final blue samples. Reconciled current-vs-target documentation in both workspaces. Documentation-only: no runtime/configuration/data/server/deployment changes, new PDF generation or repeated application/browser/physical-print tests. Shared A5 layout and memo blanking integration are next.
