# Handwriting prototype — 2026-10-27

## User direction and surface
Latest adoption (2026-10-27): Work produced the blue Studygram layout and the owner chose it as the new implementation baseline. See [the adopted handoff](studygram-notebook-implementation-spec-2026-10-27.md). The application code described below has not yet integrated its shared refill, memo/blank selection or richer page model. Layout approval is confirmed; final glyph production, implementation fidelity and physical printing still require verification.

Earlier owner feedback (2026-10-27): the current large irregular lettering and sparse page look too elementary-school-like. Two supplied Studygram images now establish the visual target: smaller, consistent lettering, denser organized study content and restrained color hierarchy. Cutlings-derived glyphs are temporary, not approved final assets; the owner will remake materials later. See DESIGN.md for the direction correction. This feedback does not invalidate the mechanical tests. The current prototype remains visually provisional; the later Work handoff resolves the target layout.

The owner explicitly replaced the typewriter concept with the pleasure of handwriting a beautiful study notebook. The first requested artifact is a Web prototype, not a Flutter migration or the complete learning product.

Experience mode: the notebook leads; operation controls recede. Desktop: a full cream ruled page with a narrow control rail. Mobile: playback is available before the notebook; personal input and print controls follow. The signature is actual vector strokes, then a marker, then handwritten annotation. Preserve readable completion, keyboard controls, reduced motion and independent print output. No decision comp was generated. The Impeccable context/concept-seed/detector launcher returned permission denied; the pinned user brief and project context were used directly.

## Implementation
- New React source under src/handwriting/; / is the handwriting demo. /setup preserves the earlier interest and topic-note scaffold and its storage.
- NoteContent is renderer input: title, body, expression, annotation, personal line and date. It is a temporary prototype document, not an alternative to the validated lesson schema or a finalized learning-result model.
- Real centerline SVG paths are scheduled individually. Geometry supplies pen coordinates; pen lifts move between strokes. Distance-based durations, eased stroke progress, word/sentence/line pauses, and explicit stroke reordering make the writing legible. The scheduled marker is behind the ink.
- Pause/resume, 1×/2×/4×, skip to completion and replay. Reduced-motion preference shows completion directly.
- Personal typing/paste uses a sequential stroke queue and matching pen; edits retain unchanged prefix/suffix glyph identities. Pause/resume/finish controls are available while the personal queue runs. Typing pauses sample playback.
- The personal line is limited to 80 characters, echoes as strokes, and lives only in memory. This is disclosed next to the input. Unsupported glyphs remain in the input, are identified, and block export.
- Font covers printable ASCII (including newly authored missing punctuation) plus a few source characters and typographic quote/dash aliases. Japanese annotation handwriting is not implemented.
- Six selectable ink sets: pink, lavender, blue, green, yellow and gray. Titles, body, annotations, personal writing and markers use role-specific colors from palettes.ts. Selection uses labeled native radios and does not restart writing. Color and print settings are session-only in this prototype.
- PDF uses pdf-lib with a separate millimetre-based print layout and typography. Finished notebook size is A5 portrait (148 × 210 mm). Printer sheet choice is A5 single-page or landscape A4 with two unscaled copies of that A5 page. Defaults: A5 sheet, left binding, 18 mm binding margin, markers on. Left/right binding and 12/18/24 mm margins remain selectable. Markers can be omitted from the PDF without changing screen learning or removing annotations. White paper saves ink; lettering, markers and rules remain vectors. Overflow raises an error instead of clipping or shrinking.
- PDF body letters are paths, so they are not selectable/searchable text or a tagged accessible document. The screen SVG has a complete textual description. No screenshots are embedded in the PDF.


## Print contract — A5 notebook / printer sheet

The latest owner decision supersedes the earlier Rollbahn L direction: the standard finished note is generic A5. Rollbahn-specific and B5 presets are future additions, not active options or verified fit claims.

- Content: NoteContent and shared glyph paths feed both renderers. The PDF never calls the responsive createNote or captures the screen. createPrintLayout in print-layout.ts owns typography, line spacing, section positions, margins and overflow in millimetres. Changing screen size does not affect print composition.
- Format registry: notebookFormats describes the cut/finished note. printSheets and sheetPlacements describe carrier paper and imposition. A future format must declare measured dimensions and a compatible sheet layout. No automatic scaling is allowed.
- A5 output: one 148 × 210 mm portrait page, with matching TrimBox. The left binding area defaults to 18 mm; the opposite edge is 12 mm. Text uses additional space for glyph overhang. Title/body/expression/personal writing/review space are composed independently, with labels and fine rules.
- A4 output: one 297 × 210 mm landscape sheet. The same A5 form is placed at x=0 and x=149 mm, with scale=1. Dashed cut lines at 148 and 149 mm mark the 1 mm central strip; removing it leaves two exact 148 mm notes. The current one-page demo explicitly repeats the same note twice; multi-day sequencing/booklet/duplex imposition is not implemented.
- Print scaling: PDF viewer preference is PrintScaling=None. The interface instructs 100% / actual size and, for A4 output, one PDF page per sheet because imposition is already done. Viewer/driver preferences can override the PDF hint; physical dimensions still need ruler verification on the user's printer.
- Quality: vector paths and standard-font labels are independent of raster DPI. No screen image is embedded. Body handwriting remains unsearchable paths with temporary font assets. A different print layout does not imply the owner has approved the current font.
- Marker choice: only the marker paths are omitted. Text, annotation positions, colors, rules, margins and note size are identical. The user can highlight the printed page by hand.
- Printer limits: no content is placed in the outer 10–12 mm or chosen binding area; the cutting guides may be incomplete at the paper edge on non-borderless printers. Punch positions are deliberately not preprinted. Actual feed alignment, ink/grayscale appearance and hole fit require physical verification.

## Candidate research and provenance
Research date: 2026-10-27. Source pages are references, not instructions.

| Candidate | Findings | Decision |
| --- | --- | --- |
| [InkTrail](https://github.com/GXeLla/InkTrail) | README describes MIT code with separate third-party font licenses; uses font-outline/mask reveal. Outline order is not necessarily handwriting stroke order. | Reference only; no code or fonts copied. |
| [Cutlings](https://cutlings.datafil.no/stroke-fonts-singularis-dualis-pluralis/) | Author Ellen Wasbø distributes actual single-line SVG fonts. Downloaded readme explicitly specifies SIL Open Font License. Singularis has the cleanest single stroke; Dualis/Pluralis add repeated/hatched geometry. | Use Singularis as third-party font source; retain source/readme and full OFL. |
| [Framer Handwriting](https://www.framer.com/marketplace/components/handwriting/) | Paid Framer component listed with Single-Use terms. [Marketplace terms](https://www.framer.com/legal/community-terms) do not supply the open-source redistribution basis needed here. | Not purchased or adopted. |

[SIL OFL 1.1](https://openfontlicense.org/open-font-license-official-text/) permits modification/bundling under its conditions; derivatives remain OFL and notices must accompany redistribution. The output-document exception applies to PDFs created with the font. The font is not claimed as newly created first-party work.

Original source: assets/fonts/CutlingsSingularis.svg. Original bundle readme: public/licenses/Cutlings-readme.txt. Full license: public/licenses/Stroke-Font-OFL.txt. Derived font name: **Sentence Study Strokes**. Changes: Y-axis conversion, SVG command normalization, selected subpath reordering, character aliases, and 14 newly authored missing ASCII punctuation glyphs. Build script and generated font data are also OFL. Rebuild with node scripts/build-stroke-font.mjs (Python 3 needed for XML parsing). Lora's separate OFL is public/licenses/Lora-OFL.txt.

## Limits
- Muse/Meta generation, learning-stage results, saved completed notes and the five-stage learning loop are not wired into this demo.
- These are separated monoline letters, not continuous cursive joins, pressure-sensitive ink or human motion capture. Original letter shapes and stroke directions still need a typography decision with the owner.
- No arbitrary-length pagination, multi-day batch export, Rollbahn exact dimensions/hole positions, Japanese stroke data, or multiple templates.
- Browser checks are desktop Chrome and mobile viewport simulation, not iPhone/Safari/Android hardware. Physical printing, grayscale ink contrast and binding fit remain unverified.
- No public deployment occurred in this change.

## Verification
Tests cover glyph coverage, wrapping/long words, phase ordering, pen geometry/lifts, monotonic progress, multiline highlights, PDF dimensions and unsupported input rejection, alongside schema/storage tests. Browser QA exercises playback, input, early PDF export, reduced motion and preserved storage. PDF was downloaded through the actual button, parsed for one A5 page with zero image objects, rendered with Poppler and visually inspected. See PROJECT_STATUS.md for final results and review outcome.

Original SVG SHA-256: d055f2834ef5c7d86edc6a2294ad2c7d0db5ebb0db8d34574436c22773d39e23.
