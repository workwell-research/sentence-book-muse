# Handwriting prototype — 2026-10-27

## User direction and surface
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
- PDF uses pdf-lib to lay out the content independently of the responsive page and animation clock. A5/A4, left/right binding, 12/18/24 mm margins; white paper saves ink. Text strokes, marker, and rules are vectors. Overflow raises an error rather than clipping.
- PDF body letters are paths, so they are not selectable/searchable text or a tagged accessible document. The screen SVG has a complete textual description. No screenshots are embedded in the PDF.

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
