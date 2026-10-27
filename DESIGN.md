---
name: "The Sentence Book"
description: "Learn digitally. Keep it beautifully."
colors:
  desk-white: "#f5f6f6"
  desk-oak-base: "#dfc49b"
  desk-walnut-base: "#4f3424"
  ink-white: "#474d50"
  ink-natural: "#514638"
  ink-walnut: "#f2e7d5"
  quiet-white: "#636b70"
  quiet-natural: "#655a4b"
  quiet-walnut: "#e5d4ba"
  control-white: "#f9f8f4"
  control-natural: "#f7f0e3"
  control-walnut: "#312c25"
  paper-white: "#FFFEFB"
  paper-natural: "#F9F3E7"
  paper-walnut: "#F6EEDC"
  card-natural: "#faf5e9"
  card-walnut: "#f4ecd9"
  card-ink: "#444b50"
  rule: "#D7E0E7"
  graphite: "#383A3D"
  blue-accent: "#47627A"
  blue-marker: "#D5E7F2"
  pink-accent: "#7c465c"
  pink-marker: "#F2D5DE"
  purple-accent: "#66547e"
  purple-marker: "#E1D9F0"
  gray-accent: "#565b61"
  gray-marker: "#E2E4E6"
  orange-accent: "#78552f"
  orange-marker: "#F5D9B8"
  green-accent: "#485747"
  green-marker: "#DCE7D5"
  focus-white: "#446f91"
  focus-natural: "#745128"
  focus-walnut: "#f4d5a1"
  index-ink: "#514d47"
  index-selected: "#38576b"
  settings-paper: "#fbf9f3"
  export-tint: "#dfe8e5"
  error: "#994b38"
  error-walnut: "#ffbba2"
typography:
  display:
    fontFamily: "\"Lora\", Georgia, serif"
    fontSize: "21px"
    fontWeight: 400
    letterSpacing: "-0.03em"
  model:
    fontFamily: "\"Lora\", Georgia, serif"
    fontSize: "clamp(19px, 1.8vw, 28px)"
    fontWeight: 400
    lineHeight: 1.45
  index-white:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Hiragino Kaku Gothic ProN\", sans-serif"
    fontSize: "clamp(17px, 1.35vw, 22px)"
    fontWeight: 500
    lineHeight: 1.4
  index-natural:
    fontFamily: "\"Notebook Klee\", serif"
    fontSize: "clamp(19px, 1.6vw, 26px)"
    fontWeight: 400
    lineHeight: 1.4
  index-walnut:
    fontFamily: "\"Lora\", serif"
    fontSize: "clamp(17px, 1.35vw, 22px)"
    fontWeight: 400
    lineHeight: 1.4
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Hiragino Kaku Gothic ProN\", \"Noto Sans JP\", sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Hiragino Kaku Gothic ProN\", \"Noto Sans JP\", sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6
  help:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Hiragino Kaku Gothic ProN\", \"Noto Sans JP\", sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.8
  notebook-input:
    fontFamily: "\"Sentence Notebook Readability Input\", sans-serif"
    fontSize: "4.1mm"
    fontWeight: 400
    lineHeight: "5.2mm"
    letterSpacing: "0"
  notebook-gloss:
    fontFamily: "\"Notebook Klee\""
    fontSize: "2.6mm"
    fontWeight: 400
  notebook-meaning:
    fontFamily: "\"Notebook Klee\""
    fontSize: "2.7mm"
    fontWeight: 400
rounded:
  square: "0"
  control: "3px"
  dialog: "4px"
spacing:
  action-gap: "4px"
  label-gap: "8px"
  mobile-gutter: "14px"
  compact-gutter: "16px"
  mobile-stack: "18px"
  tools-gap: "20px"
  page-gap: "24px"
  settings-gap: "38px"
  desk-gap: "48px"
components:
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink-white}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    typography: "{typography.body}"
  button-confirm:
    backgroundColor: "{colors.control-white}"
    textColor: "{colors.ink-white}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    width: "76px"
    typography: "{typography.label}"
  button-export:
    backgroundColor: "{colors.export-tint}"
    textColor: "#444c4c"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    width: "100%"
  input-notebook:
    backgroundColor: "transparent"
    textColor: "{colors.graphite}"
    rounded: "{rounded.square}"
    padding: "0"
    typography: "{typography.notebook-input}"
  select-setting:
    backgroundColor: "transparent"
    textColor: "#444c4c"
    width: "100%"
  index-navigation:
    backgroundColor: "transparent"
    textColor: "{colors.index-ink}"
    rounded: "{rounded.square}"
    padding: "8px 0"
  model-card:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.card-ink}"
    rounded: "{rounded.square}"
    padding: "24px 30px 16px"
    height: "234px"
  paper-sheet:
    backgroundColor: "{colors.paper-white}"
    rounded: "{rounded.square}"
    width: "100%"
  settings-dialog:
    backgroundColor: "{colors.settings-paper}"
    textColor: "#444c4c"
    rounded: "{rounded.dialog}"
    padding: "24px 30px"
---

# Design System: The Sentence Book

## Overview

**Creative North Star: "The Personal Study Desk"**

The Sentence Book — Learn digitally. Keep it beautifully. A measured Studygram notebook sits among a few useful study objects. The chosen world is an overhead desk with Pure White, Natural and Walnut material families: white stationery and a digital timer; light oak with pastel pens; deep walnut with black-and-brass pens and a watch. Live text, native controls and a growing handwritten page carry the work. Quiet paper shadows and thin rules give the objects enough depth without competing with the writing.

The owner-approved desktop handoff replaces the former sage control-rail composition at `/`, while retaining the adopted physical A5 notebook. The three themes change material, paper tint, index-heading character and the model-card rule; they do not change source content or the chosen notebook face. The retired typewriter/key/case motif stays retired. Product scope is in [PRODUCT.md](PRODUCT.md), composition and interaction authority in [the surface brief](.impeccable/surfaces/study-desk.md), implementation/provenance in [the desk note](docs/desktop-study-desk.md). `/handwriting` preserves the older typography demo and `/setup` its earlier scaffold; neither defines the current desk shell.

**Key Characteristics:**

- Separate generated material plates beneath live semantic HTML and SVG.
- Three desk families, six labeled pen choices and one shared optional timer.
- A read-only model card and one native editor on the current notebook line.
- Small graphite handwriting, pale markers and a fixed measured A5 grid.
- Draft letters draw as they are typed; Enter checks/saves the answer and focuses the next line in one action.
- Mobile actions remain reachable beside enlarged, horizontally scrollable paper.

## Colors

Frontmatter records current source colors; the three material families combine neutral furniture with common graphite and six pale accent pairs. Tonal ramps in the sidecar are preview metadata, not additional application colors. Source authority is `src/desk/desk.css`, `StudyDesk.tsx`, `handwriting/palettes.ts` and the adopted refill JSON.

### Primary

Blue is the default notebook accent. It colors section headings, vocabulary frames and the annotation divider; its pale partner marks phrases. The title, body, metadata, footnotes, Japanese meanings and personal writing remain graphite. Pink, Purple, Gray, Orange and Green use the same roles. The root pen order is Blue/Pink/Purple/Gray/Orange/Green. Historical Lavender/Yellow entries remain for the older prototype and are not remapped to these root choices.

### Neutral

Pure White has a cool pale ground, gray ink and near-white note. Natural pairs a cover-scaled light-oak texture with brown ink, warm paper and a cream card. Walnut pairs a cover-scaled dark-wood texture with pale desk labels, a warm ivory note/card and dark action surfaces. The open index book keeps the same neutral material plate and dark text in all three. Wood base colors are fallbacks beneath actual assets; textures are not asserted seamless.

Focus is blue in White, brown in Natural and pale gold in Walnut, with a 2px outline and 3px offset on desk controls. The notebook field instead uses a subtle translucent wash and bottom line at focus, with a blue caret. Errors use rust ink, switching to light peach on Walnut. PDF paper stays white.

**The Ink Rule.** Keep body and personal writing graphite. Accent colors identify study structure; pale markers sit beneath letters once and never move the layout.

## Typography

**Display Font:** self-hosted Lora with Georgia/serif fallback, used for the wordmark, model sentence and selected editorial labels. **Body Font:** system sans with Japanese fallbacks. **Index Heading Fonts:** system sans in Pure White, Notebook Klee in Natural, Lora in Walnut. The frontmatter contains the desktop scale; the three index heading families are deliberate theme details.

The wordmark is 21px (20px on mobile), model sentence uses the recorded clamp (22px on mobile), card label is 18px Lora, index tabs are 15px Lora and body controls are 13px. Compact desktop reduces index heading/tab sizes to 16/12px; mobile uses 15/11px except Natural's 18px handwritten heading. Help is 11px and smaller disclosures are 10px. Avoid enlarging the fixed notebook glyphs to solve surrounding UI hierarchy.

**Notebook faces:** Sentence Notebook Readability (owner-selected default), Tech, Print and Pen are renamed OFL centerline derivatives of EMS Readability Italic, Tech, Delight and Neato. Klee One (default) and Zen Kurenaido supply static Japanese. All four English/two Japanese choices apply independently. [Font provenance](public/fonts/README.md) retains original SVGs, authors, licenses, hashes and build instructions; these are third-party derivatives, not first-party hackathon lettering.

English model sizes in millimetres are title 5.65; body/grammar/personal 4.1; footnotes 3.2; section headings 4.5; vocabulary 3.8; grammar labels 2.8; classification 3.2; date 2.9; footer 2.7. These are 200-unit model sizes, not visible character heights. Title strokes are 0.28mm and other English strokes 0.20mm, with round caps/joins. Face normalization is Readability/Tech/Print 0.2 and Pen 0.145; actual overhangs are reserved where required. Tech's title alone is lifted 0.70625mm inside the existing band. Body lettering keeps its baseline.

Japanese phrase glosses use 2.6mm; vocabulary meanings use 2.7mm. Phrase glosses are lifted 1mm within their reserved rows; their horizontal anchor, row allocation and the rest of the plan stay unchanged. The selected complete WOFF2 loads on screen and the original complete TTF embeds in PDF. Japanese is static; English strokes animate.

The native editor uses the selected renamed `Sentence Notebook … Input` WOFF2 derived from those same centerlines and advances. Its 4.1mm model size and 5.2mm line height scale to the actual paper width. It disables kerning/ligatures and preserves native selection, caret and composition. Font readiness gates confirmation; unsupported input remains editable. Supported English is drawn as SVG during typing, with native glyph fill hidden but caret/selection retained. Composition, unsupported text and drafts over 500 characters use visible native text; reduced motion shows complete SVG ink immediately. Changing fonts can reflow the physical plan and completes current ink rather than carrying incompatible stroke indices.

**The Face Rule.** Use the selected English face for editor advances and final centerlines, and the selected Japanese face for screen and PDF. Theme headings never override notebook typography.

## Layout

The desk has a 1552px maximum content width and 24px horizontal outer padding. Its desktop grid uses 1.25fr/1fr columns, a 48px gap and a 334px first row. Timer/pens occupy upper left, the open index sits below, the five paper index tabs and model card are upper right and notebook is below it. At 761–1200px, outer padding becomes 16px, columns 1.1fr/1fr and gap 24px. The timer retains its allocated space when hidden. Six complete horizontal pens occupy six labeled rows (54px high desktop, 44px mobile), with native radio hit areas and a selected check.

At 760px and below, 14px gutters and an 18px vertical gap stack tools, model, notebook and index. The tagline disappears, settings become one column and the model card is 246px high. Mobile starts with enlarged paper; the 806px page row includes 740px paper plus the reserved 66px side space. Desktop enlarged rows are 824px (740px paper plus 84px). Fit rows cap at 556px including their side space. These are viewing scales only. Mobile check-and-advance shares the A5/zoom toolbar in a sticky region (top 8px) outside horizontal scrolling. The separate “現在の行へ” control and its band are removed; native caret/selection movement pans the enlarged paper. The desktop action remains beside the active line. Validation is in a sticky controls region above the paper, below the mobile actions when present. A 13px correction message uses the theme control surface and dark rust (light rust on Walnut); invalid inputs have a rust underline. The message is absent when there is no error. It names the first differing word, distinguishes whitespace/incomplete text, and never corrects saved text automatically.

### Learning index tabs

Five paper tabs touch the model card’s top edge, following the owner’s physical-divider reference. Sage `#dbe7db`, yellow `#f3e2b0`, peach `#efc7b4`, rose `#eccbd4` and lavender `#ddd7e8`; graphite labels remain opaque when disabled. Copy sits 8px higher, joining a 5px sage edge on the card. Tabs have rounded top corners and square bases,5px gaps (4px mobile),70px minimum height (76px mobile). Each carries its sequence, short label and 学習中/完了/準備中 state. One native selected tab controls the Copy panel; four later tabs are disabled until those stages exist. No stage transition, learning or storage behavior is invented by the visual tabs.

### Common A5 refill

The exact adopted JSON is imported by `a5-layout.ts`; screen SVG and independent PDF consume the same plan. Coordinates are millimetres from top left:

| Structure | Current geometry |
| --- | --- |
| Paper | 148 × 210; SVG viewBox 0 0 148 210 |
| Default binding / outer margin | Left 18 / right 12; selectable binding 12, 18 or 24 on either side |
| Body ruling | 31 rules; x18–136; y39.2–195.2; pitch 5.2; width 0.10 |
| Title band | y24.64–32.96; height 8.32 (1.6 rows); title baseline y31 |
| Title/footer rules | x0–136; width 0.35; footer rule y201 |
| Metadata | Right-aligned x136; classification y11 and date/page y17 |
| Main column / footnotes | Body x18–104; divider x106; footnotes x108–136 |
| Footer text | Right-aligned x136/y206 |
| Vocabulary | Frame width 0.25; review squares 2.5 × 2.5 |

Sentences wrap in whole ruled rows using selected advances. Memo blanking hides glosses, footnotes and number marks after allocation; it leaves their space and other content intact. Root confirmed-ink filtering reveals only actual entries, then study blocks after explicit completion. Vocabulary/grammar toggles hide their ink without reallocating. Longer source/personal content can continue on identical sheets; indivisible overflow produces an error instead of shrinking/clipping. Sentence-only mode hides study/personal/memo layers and can omit sheets with no body run.

**The Paper Rule.** Measure the full source before hiding ink. Memo blanking preserves reserved rows; viewport changes scale or scroll the page instead of changing its line breaks.

## Elevation & Depth

Depth comes from photographed material plates and restrained shadows under real paper objects. The open book, pen and timer atlases have native alpha; live headings, tab selection, labels, numbers and clock hands sit above them. Seven original generated PNGs total about 11.76MB, with exact prompts, hashes and measured crops in [assets.json](public/desk/assets.json). Prompt embedding succeeded; pixel arrays were retained. Selected families are referenced; shared book/timer atlases remain common. Do not treat these source bytes as a measured per-view network budget.

### Shadow Vocabulary

- **Model card:** `0 6px 16px #26343e12`.
- **Notebook paper:** `0 6px 18px #1f25221c`.
- **Line action:** `0 3px 9px #1f252214`.
- **Mobile action strip:** `0 3px 12px #2430381a`.
- **Settings dialog:** `0 16px 60px #14252b33`, with `#222a304d` backdrop.

**The Material Rule.** Keep numbers, labels, rules, selection and learning content live. Material plates supply only the physical object; no flattened interface enters the notebook or PDF.

## Shapes

Paper and the read-only model card have square corners. Ordinary actions and pen hit areas use restrained 3px corners; the settings dialog uses 4px. The pen/book/timer silhouettes belong to their supplied material plates. The model card has a fine pale rule in White, a warm fine rule in Natural and a 3px double rule in Walnut, placed 62px above the card bottom. These are card details, not notebook ruling or PDF content.

The native notebook input is transparent, borderless, square and positioned on the current measured line. It has no surrounding decorative field box. The model card stays read-only. Thin index dividers and selected dark-blue text establish navigation without changing the blank book artwork.

## Components

### Buttons

Quiet native buttons use transparent backgrounds, theme ink, 3px corners, 8×12px padding and a 44px minimum height. Hover uses a translucent gray wash; disabled buttons are half-opacity. The desktop line action is 76px wide, at least 62px high, and combines a live SVG check/arrow with Japanese text on the theme control surface. Mobile uses the sticky strip with 44px targets. The full-width PDF action uses a pale green-gray tint. Toolbar and compact mobile timer/index controls are smaller documented exceptions; do not claim universal 44px targets.

### Inputs / Fields

Only one textarea appears at a time, in Copy or personal-writing mode. Enter confirms only outside composition and its immediate end guard; modifier/repeat handling preserves editing. Exact-text mismatch and storage failures keep the draft with adjacent alert text. Reopening personal text hides its old screen SVG while retaining canonical confirmed text for PDF. Font readiness temporarily disables input. Native settings selects use a bottom rule; theme, memo and marker controls remain labeled native choices.

### Cards / Containers

The model card combines a heading/progress row, Lora sentence, a reserved meaning area, theme rule and audio/meaning actions. Toggling meaning keeps its area rather than shifting the card. The note is a measured SVG with a live textarea overlay and textual title/description; visible memo accessibility text follows visible ink. The settings dialog groups desk/type and content/print controls, with two desktop columns and one mobile column.

### Navigation

The open index keeps five live vertical tabs on its left page and the selected panel on the right. Arrow Up/Down, Home and End move the roving tab focus. Selected text is darker blue and semibold; both pages can scroll internally. My Vocabulary and Review expose the sample's native checkboxes, while Completed Notes reflects the explicit completion state of the same local sample. Topic Index links to the existing `/setup` workflow. Wordmark, skip link and license footer remain live links.

### Pens, timer and handwriting

Each pen row contains a native radio, decorative atlas crop, visible color name and selected check. Hover moves only the art 3px over 150ms; reduced motion removes that transition. The optional timer has shared deadline logic, Start/Pause/Resume/Reset, live digits in White/Natural and live hands plus a numeric reading in Walnut. Timer expiry announces itself without completing Copy; changing themes or hiding it preserves the mounted timer.

Keystrokes draw newly inserted/replaced letters directly on the note, without a following pen graphic; the native caret remains the insertion indicator. Existing character identities retain their ink; deletion removes only deleted letters. A new edit completes any previous pending stroke so typing cannot build a queue. One character takes up to 160ms, small insertions share at most 300ms and pastes over six characters appear immediately. Restored drafts and font changes show completed ink. Enter checks and persists the canonical entry together with the next editing position in one write, then animates only its annotations. Focus returns to the new line immediately; automatic annotation pens are hidden while editing. Legacy confirmed records expose a focused resume action. Incorrect text or a failed save retains the current line. The eighth correct Enter completes Copy; the remaining four learning stages stay visibly pending. Replay resets ink only; Pause/Resume preserves current time; Finish completes animation only. Reduced motion shows confirmed strokes directly. Meanings/markers are revealed with their associated confirmed content. Actual native speech synthesis is a browser capability and its hardware/audio behavior was not certified by synthetic QA.

### Print

Export uses canonical confirmed layout, never the textarea draft or the temporary personal-edit screen filter. The finished note stays A5. A5 uses a 148×210mm page/TrimBox; A4 uses a 297×210mm landscape sheet with two scale-1 copies at x0/149mm and a 1mm cut strip. Each continuation page repeats twice on its own A4 sheet. Print markers initially follow screen markers until overridden. Content/memo choices are shared; theme tint, furniture, controls and shadows are excluded. Request PrintScaling=None and instruct 100% actual size, one PDF page per printer sheet. English paths remain unsearchable and the PDF is not tagged.

### Evidence boundary

The 2026-10-27 build/test/browser/PDF records are summarized in [PROJECT_STATUS.md](PROJECT_STATUS.md) and [the desk note](docs/desktop-study-desk.md). The finish reviewer independently opened all 13 required/targeted captures and scored its five findings resolved (`ship`); this is scoped acceptance, not a numerical comp-reproduction or whole-product certification. This documenter read source/evidence and opened the three desktop theme captures. This documentation update adds no fresh runtime check. Real OS IME/audio, mobile hardware, physical print, unseen lessons, Meta integration and deployment remain unverified. No successful detector/comp-diff is claimed.

## Do's and Don'ts

### Do:

- Do derive screen and independent PDF from the same A5 layout and measured glyph advances.
- Do preserve native textarea selection, composition, caret behavior and the current-line action.
- Do animate draft edits in place and let one Enter save checked Copy text and open the next line.
- Do keep memo space, stable IDs, drafts, checks and canonical saved personal text when changing presentation.
- Do retain labeled native controls, visible focus, reduced-motion completion and adjacent error/status feedback.
- Do use the existing material families and retain original asset prompts, hashes and font notices.
- Do distinguish a local synthetic sample from real lesson history and actual-size A5 notes from printer sheets.

### Don't:

- Don't reflow notebook text to the viewport, stretch the A5 sheet, compress the grid or shrink letters to fit content.
- Don't put the editor in the model card or add a second simultaneous text input.
- Don't expose the saved personal SVG beneath its active editor, discard its canonical PDF value, or export a draft.
- Don't remove reserved rows, vocabulary Japanese, grammar or checks as a side effect of blanking memos.
- Don't treat animation, timer expiry or a vocabulary check as Copy completion.
- Don't paint desk textures, controls, theme paper tint or screen shadows into the PDF.
- Don't revive the typewriter motif or add rankings, confetti or a chat interface.
- Don't claim native-device/IME/audio, physical-print, production-generation or deployment verification from synthetic browser evidence.
