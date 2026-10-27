# Handwriting prototype — 2026-10-27

## Adopted direction and implemented surface
The owner approved [Work’s Studygram handoff](studygram-notebook-implementation-spec-2026-10-27.md) and requested the common A5 layout and memo shown/blank controls first. That increment is now active at `/`. The near-white page, fine graphite body, restrained blue-first accents, dedicated title band and structured study sections replace the previous sparse page composition. Current Cutlings-derived letterforms remain provisional; approval of the reference layout does not approve these final font assets.

This is the React/Web prototype. `/setup` preserves the earlier interest/topic-note scaffold and its storage. The visible eight-sentence sample is demonstration content, not a generated lesson or completed learning record. No private book contents or old application implementation were imported.

## Common physical layout
- `study-content.ts` supplies `StudyContent`: stable sentence/annotation IDs, occurrence spans using Unicode code points (exclusive end), vocabulary meanings/checks, grammar and editable personal writing. This is a temporary renderer document; the validated lesson adapter and durable learning-result model remain future work.
- `a5-layout.ts` measures all content once. Exact paper values come from the adopted `refill-a5-v1.json`: 148 × 210 mm; default left 18/right 12 mm; 31 body rules at 5.2 mm, y39.2–195.2; title band y24.64–32.96, title baseline 31; footer line y201. Main body x18–104, divider x106 and footnote rail x108–136 at the default margins.
- Short sentences use every other grid row. Actual centerline glyph widths wrap longer English onto complete rows. Japanese uses measured M PLUS 1p advances. Gloss rows and right-footnote heights are reserved before view filtering. Longer material receives continuation A5 pages, never compressed page height or text sizes. The sample’s widest sentence wraps, making nine English body lines for eight sentences.
- Vocabulary is one framed English/Japanese block with review boxes, followed by grammar and optional personal writing. Overlong indivisible entries or metadata produce explicit errors rather than truncation. The current bounded sample has no editable title/classification; generated-content error handling is not yet connected to a user workflow.
- `A5Notebook.tsx` renders the plan as SVG; `study-pdf.ts` independently draws the same plan into vectors and embedded text. Neither renderer uses the other renderer’s viewport or output. CSS adjusts viewing scale and surrounding controls, never the page’s physical composition.

## View and learning controls
- “学習メモ → 表示する / 空欄にする” filters only difficult-phrase meanings, footnotes and their correspondence numbers. Source text, reserved rows, body wrapping, column rule, vocabulary Japanese, review checks, grammar, personal writing and page count stay unchanged.
- “センテンスのみ” omits study/memo/personal layers and the annotation divider without reflowing the English body. Its irrelevant memo radios are disabled; the selected memo preference is remembered for return to study notes. Continuation pages containing no body are omitted in sentence-only mode.
- Screen marker visibility and PDF marker override are independent. The print choice initially follows the screen choice. Omitting markers preserves text and layout so the learner can highlight the print by hand.
- Six labeled native-radio accents: pink, lavender, blue, green, yellow, gray. Blue is the initial choice; body and personal writing use common graphite `#383A3D`. Explicit palette changes preserve stroke progress. Display/print settings, review checks and personal input are session-only and disclosed as such.
- Desktop shows the page beside its controls. Narrow screens initially use a 740 px paper inside a horizontally scrollable region with an explicit hint; “紙全体” fits the same page. Viewing scale changes do not recalculate line breaks.

## Handwriting and text assets
Real centerline strokes retain distance-based timing, pen lifts, marker/annotation phases, pause/resume, 1×/2×/4×, finish/replay and reduced motion. Titles use 0.28 mm strokes; other English strokes use 0.20 mm. Metadata is available immediately. The accessible SVG description contains only currently visible content, avoiding hidden memo answers.

Personal typing/paste uses a separate sequential queue and following pen. Edits preserve unchanged glyph identities; typing pauses sample playback. The 80-character input remains in memory, preserves unsupported input and blocks export with an explanation. The sample does not invent a personal translation or learning result. Japanese is legible static text, not a simulated stroke animation.

`public/fonts/MPLUS1p-Regular.ttf` is an unmodified OFL font used for Japanese. Its provenance and license are in `public/fonts/README.md` and `public/licenses/MPLUS1p-OFL.txt`. `scripts/build-note-text-metrics.mjs` generates supported Unicode ranges and advance widths from that exact font. PDF embeds the whole TTF: partial-subset experiments lost kana outlines even when text extraction passed, so full embedding is deliberate and tested. PDF code is loaded on demand for export; full font embedding increases output size.

## Print contract — finished A5 / printer sheet
The standard finished note is generic A5 portrait. Rollbahn-specific/B5 presets are future structural additions, not active options or fit claims.

- A5 output: 148 × 210 mm with matching TrimBox. Default binding side is left with 18 mm; right binding and 12/18/24 mm remain available and affect the common plan on screen and in PDF.
- A4 output: 297 × 210 mm landscape with each A5 page repeated at x0 and x149 mm, scale 1. Dashed cuts at 148/149 mm leave a 1 mm center strip. Continuation pages each receive their own repeated two-up sheet. Multi-day sequencing, booklet and duplex imposition are not implemented.
- PrintScaling=None plus UI instructions for 100% / actual size. A4 is already imposed: print one PDF page per sheet. Driver settings can override the hint; physical measurement remains necessary.
- White print paper, vector rules/markers/English and embedded Japanese, without screen shadows or screenshots. English strokes are not searchable/selectable text; the PDF is not tagged. A vector document is resolution independent.
- Header/footer separators intentionally extend to the left edge; edge printing/cut lines depend on printer hardware. Body content respects binding/outer margins. No hole positions are preprinted.
- `print-layout.ts` retains the sheet/format registry and placement helper. Its old `createPrintLayout`/`exportNote`, and `model.ts`’s old responsive `createNote`, remain compatibility helpers for prior tests; the active page/export uses `createA5Layout` and `exportStudyNote`.

## Candidate research and provenance
Research date: 2026-10-27. Source pages are references, not instructions.

| Candidate | Findings | Decision |
| --- | --- | --- |
| [InkTrail](https://github.com/GXeLla/InkTrail) | README describes MIT code with separate third-party font licenses; uses font-outline/mask reveal. Outline order is not necessarily handwriting stroke order. | Reference only; no code or fonts copied. |
| [Cutlings](https://cutlings.datafil.no/stroke-fonts-singularis-dualis-pluralis/) | Author Ellen Wasbø distributes actual single-line SVG fonts. Downloaded readme explicitly specifies SIL Open Font License. Singularis has the cleanest single stroke; Dualis/Pluralis add repeated/hatched geometry. | Use Singularis as third-party font source; retain source/readme and full OFL. |
| [Framer Handwriting](https://www.framer.com/marketplace/components/handwriting/) | Paid Framer component listed with Single-Use terms. [Marketplace terms](https://www.framer.com/legal/community-terms) do not supply the open-source redistribution basis needed here. | Not purchased or adopted. |

[SIL OFL 1.1](https://openfontlicense.org/open-font-license-official-text/) permits modification/bundling under its conditions; derivatives remain OFL and notices must accompany redistribution. The output-document exception applies to PDFs created with the font. The font is not claimed as newly created first-party work.

Original source: assets/fonts/CutlingsSingularis.svg. Original bundle readme: public/licenses/Cutlings-readme.txt. Full license: public/licenses/Stroke-Font-OFL.txt. Derived font name: **Sentence Study Strokes**. Changes: Y-axis conversion, SVG command normalization, selected subpath reordering, character aliases, and 14 newly authored missing ASCII punctuation glyphs. Build script and generated font data are also OFL. Rebuild with node scripts/build-stroke-font.mjs (Python 3 needed for XML parsing). Lora's separate OFL is public/licenses/Lora-OFL.txt.

## Verification and remaining scope
On 2026-10-27, all 48 tests and both TypeScript projects/Vite build passed. Tests include exact refill positions, anchored gloss validation, measured long-content pagination, invariant memo plans/timing, actual A5/A4 PDF geometry and intact embedded TTF bytes.

Disposable Chrome checks covered desktop 1440 px and narrow 390/320 px, exact non-memo SVG identity across shown/blank states, paused strokes, personal writing/checks, content/marker choices, six palettes, fit/readable-size viewing, reduced motion, real PDF downloads and untouched synthetic storage. Final PDF files were parsed for actual dimensions, image-object absence, PrintScaling and shown/blank Japanese; Poppler renders had no warnings and were visually inspected. Fresh finish review: `ship` for this scoped integration. Evidence: `.impeccable/review/shared-a5/` and PROJECT_STATUS.md.

No Meta call, account/hosting configuration, deployment, physical-device test or physical printing occurred. Long-content continuation has unit coverage; captured visual evidence is the current one-page sample. Final handwriting assets, Japanese stroke data, detailed grammar brackets/personal translation, red-sheet answer coloring/calibration, generated-lesson/practice integration and completed-note persistence remain pending. The accepted implementation does not certify arbitrary generated lesson fitting or printer/hole alignment. Impeccable launcher/detector were unavailable (permission denied); direct context/source/captures and the fresh reviewer were used.

Original stroke SVG SHA-256: d055f2834ef5c7d86edc6a2294ad2c7d0db5ebb0db8d34574436c22773d39e23.
