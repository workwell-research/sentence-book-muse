---
name: "The Sentence Book"
description: "Learn digitally. Keep it beautifully."
colors:
  sage: "#52634e"
  sage-deep: "#40513d"
  ink: "#3d443d"
  muted: "#62695c"
  desk: "#eeeae1"
  paper: "#FFFEFB"
  control-paper: "#fffdf5"
  field: "#faf8f0"
  rule: "#D7E0E7"
  divider: "#c9cbbc"
  graphite: "#383A3D"
  control-ink: "#45553f"
  control-border: "#87917c"
  control-hover: "#e1e3d5"
  field-border: "#aeb5a2"
  export-tint: "#e4e7d8"
  export-border: "#8d9a7f"
  pink-accent: "#7c465c"
  pink-marker: "#edbeca"
  lavender-accent: "#66547e"
  lavender-marker: "#cbbde6"
  blue-accent: "#47627A"
  blue-marker: "#D5E7F2"
  green-accent: "#485747"
  green-marker: "#c3d3b1"
  yellow-accent: "#76602f"
  yellow-marker: "#e5d384"
  gray-accent: "#565b61"
  gray-marker: "#ccd0d4"
  focus: "#667752"
  error: "#8c443c"
typography:
  display:
    fontFamily: "\"Lora\", Georgia, serif"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "\"Yu Mincho\", \"Hiragino Mincho ProN\", serif"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "0.025em"
  title:
    fontFamily: "\"Yu Mincho\", \"Hiragino Mincho ProN\", serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Hiragino Kaku Gothic ProN\", \"Noto Sans JP\", sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 2.1
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Hiragino Kaku Gothic ProN\", \"Noto Sans JP\", sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.8
  input:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Hiragino Kaku Gothic ProN\", \"Noto Sans JP\", sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.65
  notebook-gloss:
    fontFamily: "Notebook Klee"
    fontSize: "2.6mm"
    fontWeight: 400
  notebook-meaning:
    fontFamily: "Notebook Klee"
    fontSize: "2.7mm"
    fontWeight: 400
rounded:
  square: "0"
  control: "3px"
spacing:
  control-gap: "8px"
  field-inset: "12px"
  mobile-gutter: "20px"
  section-gap: "28px"
  tablet-gutter: "32px"
  desktop-gutter: "64px"
  workspace-gap: "72px"
components:
  button-primary:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.control-paper}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
  button-primary-hover:
    backgroundColor: "{colors.sage-deep}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.control-ink}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
  button-export:
    backgroundColor: "{colors.export-tint}"
    textColor: "{colors.control-ink}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
    width: "100%"
  input-personal:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    typography: "{typography.input}"
    rounded: "{rounded.control}"
    padding: "12px"
    width: "100%"
  select:
    backgroundColor: "transparent"
    textColor: "#46533e"
    rounded: "{rounded.square}"
    padding: "10px 20px 10px 4px"
  navigation:
    textColor: "{colors.ink}"
    typography: "{typography.display}"
  paper-sheet:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.square}"
    width: "100%"
  handwriting:
    textColor: "{colors.graphite}"
  palette-choice:
    backgroundColor: "transparent"
    textColor: "{colors.blue-accent}"
    rounded: "{rounded.square}"
  memo-choice:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
---

# Design System: The Sentence Book

## Overview

**Creative North Star: "The Handwritten Study Notebook"**

The Sentence Book — Learn digitally. Keep it beautifully. Korean Studygram meets a restrained editorial notebook: near-white paper, fine blue-gray rules, dark graphite handwriting, pale markers and compact study notes. The page is the keepsake; calm sage controls and Japanese labels support it. The typewriter motif and key/case animations are retired.

The owner adopted the Work blue notebook on 2026-10-27. The [implementation specification](docs/studygram-notebook-implementation-spec-2026-10-27.md), exact refill JSON/SVG and final blue references 22/23 govern this surface. The shared physical A5 layout and shown/blank memo controls now run at `/`. Source authority is `a5-layout.ts`, `study-content.ts`, `A5Notebook.tsx`, `study-pdf.ts`, `HandwritingDemo.tsx`, `handwriting.css` and `palettes.ts`. Earlier viewport-driven geometry and the older print-only composition are not the active root renderer.

The owner rejected the earlier oversized, irregular lettering as elementary-school-like. The owner requested selectable handwriting and then explicitly chose Readability Italic as the default. Readability Italic, EMS Tech, Print and Pen English combine independently with Klee One/Zen Kurenaido Japanese, offering eight combinations. Klee One remains the Japanese default; the selection does not approve unseen production layouts or physical printing. A later Work hand-template proposal is unadopted. The sample, personal input and checks are session-only demonstration content; `/setup` retains its earlier interest/topic-note scaffold. The [finish review](.impeccable/review/shared-a5/finish-review.md) accepts this implementation increment, not final typography, production lesson fitting or physical printing.

**Key Characteristics:**

- One measured A5 refill shared by screen and independently rendered PDF.
- Dark graphite body writing with six accent palettes; blue is the initial choice.
- Whole-row sentence wrapping, anchored meanings, right footnotes and a framed vocabulary block.
- Memo blanking preserves allocated space and the learner's current writing/checks.
- Actual English stroke motion, static licensed Japanese text and reduced-motion completion.
- Fixed paper on narrow screens, with fit or enlarged horizontal scrolling.

## Colors

The frontmatter is normative for the current root surface. It separates the paper's graphite/blue-gray structure from the existing warm desk and sage operation controls. Sidecar tonal ramps are display metadata, not additional application colors.

### Primary

Sage and deep sage support playback and status. Control ink, border and hover keep quiet actions understated; export tint and border distinguish the PDF action. Palette changes do not recolor these controls. Focus remains a visible 2px outline with 4px offset.

### Secondary

Pink, lavender, blue, green, yellow and gray each supply an accent and pale marker. Blue is the first-use selection; choices are currently session-only. Accents color section headings, grammar labels, the annotation divider and vocabulary frames. The notebook title, body, metadata, footnotes, Japanese meanings and personal writing use graphite. The historical `annotation` palette fields are not a separate ink role in the active A5 renderer. Markers use their pale color directly, without the old opacity multiplier, at 2.25mm width.

### Neutral

Paper is the exact refill's near-white screen surface. Rule defines the pale body/title/footer lines. Desk, control-paper, field and muted retain the surrounding interface hierarchy; divider and field border give controls structure. Error ink identifies unsupported input without discarding it.

**The Marker Rule.** Draw each pale marker once beneath the letters. Screen and PDF marker choices change only that ink; they never change text, memo allocation or the page plan.

## Typography

Self-hosted **Lora** carries the wordmark; platform **Yu Mincho / Hiragino Mincho ProN** carries Japanese interface headings. System sans supports controls. Frontmatter records the UI scale. At 760px and below, wordmark, invitation and textarea become 22px, 23px and 16px; buttons become 13px.

**Sentence Notebook Readability** (owner-selected default, EMS Readability Italic / Source Sans Pro Light derivative), **Sentence Notebook Tech** (EMS Tech / Architects Daughter derivative), **Sentence Notebook Print** (EMS Delight / Delius derivative) and **Sentence Notebook Pen** (EMS Neato / Bad Script derivative) offer four separate-letter centerline faces. All are renamed OFL derivatives, with original authors/notices retained. See [font provenance](public/fonts/README.md). The 200-unit model sizes in millimetres are title 5.65, body/grammar/personal 4.1, footnotes 3.2, section headings 4.5, vocabulary English 3.8, grammar labels 2.8, classification 3.2, date 2.9 and footer 2.7. Source normalization is face-specific (Readability/Tech/Print 0.2, Pen 0.145) to keep actual ink inside the grid. Title stroke is 0.28mm; other English strokes are 0.20mm. These are model sizes, not visible character heights. Tech titles are lifted 25 model units (0.70625mm) inside the fixed title band to fit their long descenders; body lettering is not lifted. Real overhangs are reserved in Readability/Tech/Pen advances.

**Notebook Klee** (Klee One Regular, default) and **Notebook Zen** (Zen Kurenaido Regular) supply static Japanese handwriting. The frontmatter records the default family; the user's selected family overrides both Japanese roles. Glosses use 2.6mm and vocabulary meanings 2.7mm. The selected full WOFF2 loads on screen. `text-metrics*.json` contains exact original TTF coverage/advances for shared layout; PDF embeds that original TTF fully to preserve kana. English font choice also governs all personal strokes. Japanese has no stroke animation. Existing interface families and weights stay unchanged.

Two native selectors precede content controls, with 44px minimum height, 12px between fields and 24px below the group. Changing fonts previews completed sample ink; each English face can replay. Personal text and review checks stay intact, while new metrics may change line breaks/page count. English changes complete personal ink instead of carrying stroke indices between faces. Choices are session-only and apply to PDF automatically. Memo shown/blank preserves geometry within each combination.

**The Stroke Rule.** English handwriting uses centerline vector paths with round caps and joins. Static Japanese text is an explicit supported fallback, not a claim of Japanese stroke animation.

## Layout

The surrounding shell remains centered at a 1440px maximum, with 64px desktop gutters, a paper column up to 720px and a 270–310px control rail. Its 72px gap becomes 90px from 1450px. At 1100px and below, gutters are 32px, the rail 275px and gap 36px.

At 760px and below, 20px gutters frame the order: invitation, view settings, playback, notebook, personal input, review checks, print controls and disclosure. The introductory paragraph and secondary page caption disappear. The workspace gap is 20px. Palette radios have six columns, reducing to three at 1100px. Buttons, selectors, memo labels and review controls retain 44px minimum targets.

### Common A5 refill

`a5-layout.ts` imports the adopted refill JSON directly. Both renderers consume its allocated runs, rules, boxes and markers; visibility settings are applied afterwards. Coordinates below are millimetres from the top-left:

| Structure | Current geometry |
| --- | --- |
| Paper | 148 × 210; SVG viewBox remains 0 0 148 210 |
| Default margins | Left 18, right 12 |
| Body ruling | 31 rules, x18–136, y39.2–195.2, pitch 5.2, width 0.10 |
| Title band | y24.64–32.96, height 8.32; title baseline y31 |
| Title/footer rules | x0–136, width 0.35; footer rule y201 |
| Metadata | Classification right-aligned at x136/y11; date/page at x136/y17 |
| Body and footnotes | English x18–104; divider x106; footnote text x108–136 |
| Footer text | Right-aligned at x136/y206 |
| Vocabulary structure | Frame 0.25; review boxes 2.5 × 2.5 |

Short sentences leave one full ruled row after the sentence. Real glyph widths decide longer wrapping onto whole rows; anchored meanings reserve their own rows before the next content. Readability and Tech each wrap the eight-sentence sample to twelve body rows. Print wraps the third and seventh sentences; Pen fits each supplied sentence on one row. The vocabulary-to-grammar gap leaves one empty row. Footnotes are measured independently and subsequent blocks start below both columns. Long content continues on identical pages; it never lengthens the paper or changes the grid. Layout tests cover continuation. The Readability/Tech comparison captures and PDFs include two pages: study content first, with the supplied personal line on a continuation page. Content is not shrunk to force one page. Metadata that does not fit raises an explicit error and retains its source; long-title/metadata display-name workflows remain future work.

Memo blanking preserves the entire allocated layout and hides only anchored Japanese glosses, footnote text and its number marks. It retains the divider, body, vocabulary English/Japanese, boxes, checks, grammar and personal input. Sentence-only mode hides study, memo and personal layers, including the rail, but keeps English positions and the remembered memo selection. Supplemental pages with no body sentence are omitted in sentence-only mode.

### Paper viewport and print

The screen scales the fixed sheet in fit mode. Enlarged reading uses at least 740px paper width inside its own focusable horizontal scroll region, with an explicit scroll hint. Initial narrow-screen mode is enlarged; desktop starts fitted. Switching viewport mode does not rewrap or repaginate text. Sheets have a 24px screen gap, reduced to 18px on mobile.

A5 remains the finished note. A5 printer paper is 148 × 210mm; A4 landscape is 297 × 210mm and carries two identical copies of each A5 page at x0 and x149, scale 1. Cut guides at x148 and x149 mark the 1mm center strip. Both screen and PDF share explicit left/right binding variants of 12, 18 or 24mm; the opposite margin remains 12mm. These deliberate paper settings may relayout content, whereas memo/marker/zoom choices do not.

`study-pdf.ts` renders the shared plan independently of SVG, viewport and animation time. `print-layout.ts` still supplies sheet registries, defaults and placement; its earlier `createPrintLayout` typography is no longer the root export composition. A5 note pages set TrimBox and the document requests PrintScaling=None. Export instructions require 100%/actual size and one PDF page per printer sheet for already-imposed A4. A viewer/driver can override that hint. B5 and measured notebook formats remain deferred.

## Elevation & Depth

One ambient screen shadow lifts each A5 sheet: `0 6px 20px #3b46551a`. Controls are flat, organized by rules and restrained fills. The older two-layer paper shadow belongs to the inactive prototype stylesheet. Print uses unprinted white paper, with no shadow or texture plate.

**The Paper Rule.** Reserve the ambient shadow for the screen notebook. Controls stay flat and the PDF leaves the physical paper unprinted.

## Shapes

The paper, vocabulary frame, checkboxes and native selectors are square. Buttons and textarea use a small 3px radius. Handwriting and marker paths have round caps/joins; frames remain fine geometric lines. The following pen uses a blue body and warm nib, with a pale-blue marker body; movement lifts between strokes without the older opacity-fade treatment.

## Components

### View settings

A native content selector precedes labeled shown/blank memo radios and a screen-marker checkbox. Defaults are study content, shown memos and markers on. Sentence-only disables the memo fieldset with an explanatory message while keeping its value. Help stays outside the printed page; blank mode never prints a placeholder answer. Switching settings filters an already allocated plan and preserves source IDs, in-progress body strokes, personal ink and review checks.

### Playback and personal input

A sage primary button supports pause/resume/replay; a quiet action completes immediately; a native selector offers 1×/2×/4×. Hover transitions take 150ms and disabled buttons use half opacity. Reduced motion shows completed strokes and disables sample playback/speed.

The personal textarea has a cream field, thin border, italic Lora placeholder, help and character count. It accepts up to 80 characters, converts newlines to spaces and visibly discloses session-only state. Unsupported characters remain in the input, produce an adjacent error and block PDF export. Typing pauses sample playback. Personal strokes draw sequentially with their own pen, pause/resume and finish actions; unchanged character identities preserve progress through edits. The personal block appears only when supplied and is included in study-content mode. No fictional reference sentence or translation replaces the learner's input.

### Navigation and notebook

Lora wordmark/tagline, setup link and license footer retain their existing hierarchy. Links inherit ink with a 5px underline offset; a focus-revealed skip link reaches the controls. The SVG title and description reflect the displayed content, including blank memos. Stroke progress uses `t - 0.105 × sin(2πt)`. Main English writing precedes markers and memo strokes. Static memo text appears at the memo phase; vocabulary Japanese is static study content.

The notebook includes source-based classification/date, title, numbered folio, sentences, optional meanings/footnotes, one vocabulary frame per allocated block, grammar and supplied personal writing. Review checkboxes are native controls in a disclosure outside the sheet; their corresponding vector marks appear on screen and in PDF. Checks are learner marks, not automatic assessment or stored completion.

### Palette selection

Six labeled native radio choices above the notebook use an accent underline, pale swatch and subtle selected fill. Blue is selected initially. Changing palette updates section/structure accents and marker colors in screen/PDF without restarting writing; body and personal ink remain graphite. Choices are session-only.

### Print

A fixed A5 finished-size readout precedes the printer-sheet selector, placement diagram, binding-side/margin selectors and PDF-marker checkbox. Defaults are A5 paper, left/18mm binding. The PDF marker setting initially follows the screen setting, then remains an independent override after explicit change. Content and memo settings match the current screen selection. Export is a full-width tinted action with status feedback and works before animation completion.

The PDF contains vector paths/rules plus embedded static Japanese; it contains no screenshot, paper fill or screen shadow. English paths are not searchable text and the PDF is not tagged. Current PDF evidence confirms the final sample's Japanese and geometry; physical printing, grayscale, printer-edge cut guides, hole fit, red-sheet behavior and arbitrary production lessons remain unverified. Full grammar brackets, personal translations, final glyph assets and saved completed learning pages are outside this increment.

## Do's and Don'ts

### Do:

- Do derive screen and PDF from the same A5 layout and measured glyph advances.
- Do allocate memo space before filtering visible ink; keep body positions, page count and study/check content unchanged between shown and blank.
- Do keep graphite body ink across all six palettes and pale markers beneath it.
- Do preserve visible focus, native controls, explicit pause/finish actions and direct completion for reduced motion.
- Do retain unsupported input, explain it beside the field and block export until it is supported.
- Do label the sample, session-only input and review checks honestly; animation completion is not learning completion.
- Do distinguish the finished A5 note from its printer sheet and require actual-size printing.

### Don't:

- Don't reflow notebook text to the viewport, stretch the sheet, compress the grid or shrink letters to fit more content.
- Don't remove reserved space, vocabulary Japanese, checks, grammar or personal writing when blanking memos.
- Don't treat the provisional glyphs or a technical ship verdict as owner approval of the final handwriting.
- Don't restore the retired typewriter, key or case motif, or substitute a character reveal for English centerline strokes.
- Don't spread paper shadows to controls, cover letters with markers, or paint the screen's paper tint into the PDF.
- Don't add rankings, confetti or a chat interface to this notebook world.
- Don't claim saved completed notes, live generation, red-sheet output, Japanese stroke animation, a redesigned /setup or verified physical printing.
