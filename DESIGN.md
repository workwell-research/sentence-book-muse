---
name: "The Sentence Book"
description: "Learn digitally. Keep it beautifully."
colors:
  sage: "#52634e"
  sage-deep: "#40513d"
  ink: "#3d443d"
  muted: "#62695c"
  desk: "#eeeae1"
  paper: "#fffdf5"
  field: "#faf8f0"
  rule: "#d8ddd1"
  divider: "#c9cbbc"
  control-ink: "#45553f"
  control-border: "#87917c"
  control-hover: "#e1e3d5"
  field-border: "#aeb5a2"
  export-tint: "#e4e7d8"
  export-border: "#8d9a7f"
  title-ink: "#485747"
  annotation-ink: "#526a57"
  personal-ink: "#4f6052"
  marker: "#c3d3b1"
  pink-title: "#7c465c"
  pink-body: "#59464d"
  pink-annotation: "#785369"
  pink-personal: "#634652"
  pink-marker: "#edbeca"
  lavender-title: "#66547e"
  lavender-body: "#4d485b"
  lavender-annotation: "#6b5d81"
  lavender-personal: "#5b4f70"
  lavender-marker: "#cbbde6"
  blue-title: "#415f7e"
  blue-body: "#414f60"
  blue-annotation: "#4c687f"
  blue-personal: "#46647b"
  blue-marker: "#b8d4e8"
  yellow-title: "#76602f"
  yellow-body: "#574f39"
  yellow-annotation: "#776338"
  yellow-personal: "#695b37"
  yellow-marker: "#e5d384"
  gray-title: "#565b61"
  gray-body: "#484c50"
  gray-annotation: "#60656b"
  gray-personal: "#545b62"
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
    textColor: "{colors.paper}"
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
    textColor: "{colors.ink}"
  palette-choice:
    backgroundColor: "transparent"
    textColor: "{colors.title-ink}"
    rounded: "{rounded.square}"
---

# Design System: The Sentence Book

## Owner reference correction — 2026-10-27

The owner supplied two Studygram reference images and described the current demo as looking like an elementary-school notebook. This feedback overrides the earlier positive finish review as evidence of visual acceptance. The working stroke/PDF mechanism is verified; its current visual identity has not been accepted.

The intended page has small, consistent, carefully aligned lettering and useful study density. Titles, example sentences, translations, vocabulary, grammar and marginal notes form a clear hierarchy; breathing room comes between these groups rather than between every oversized letter. White or subtle ivory paper, fine rules/grid, and restrained pink/lavender/blue/green accents support organization. The references include both pastel and near-monochrome treatments; no single accent color is fixed by this clarification. Desktop study density must still reflow legibly on phones.

The current Cutlings-derived font is **temporary prototype material**, not the approved final handwriting. Its large, irregular, widely spaced letterforms are part of the mismatch. Merely shrinking those letterforms or adding pastel decoration will not resolve it. Future lettering needs stable height, baseline, spacing and line weight while retaining natural stroke motion.

The owner plans to remake materials later. The supplied images establish art direction; no reference image or its private source path has been copied into this public repository. Surrounding stationery and desk objects are context, not a requirement to reproduce a desk scene. The notebook's typography and information organization lead.

This update records direction only. The token inventory and component descriptions below still describe the current prototype; they are not proof that the requested visual revision is implemented.

## Overview

**Creative North Star: "The Handwritten Study Notebook"**

The Sentence Book — Learn digitally. Keep it beautifully. Korean Studygram meets a restrained editorial notebook: warm cream paper, fine rules, real monoline handwriting, a pale marker and small handwritten annotations. The page is the keepsake; calm sage controls and compact Japanese labels support it. The typewriter motif and key/case animations are retired.

This document captures the implemented identity at `/`, extracted on 2026-10-27 from `src/handwriting/handwriting.css`, `HandwritingDemo.tsx`, `model.ts`, `usePersonalInk.ts`, `personal.ts`, `palettes.ts`, `print-layout.ts` and `pdf.ts`. `/setup` retains the earlier interest and topic-note scaffold; its visual refresh is deferred. The current handwriting page is a labeled sample and session-only personal line, not a completed learning record. The source of truth for this surface’s composition and delivery limits is [the handwriting prototype note](docs/handwriting-prototype.md).

**Key Characteristics:**

- Cream ruled paper with one ambient page shadow.
- Actual vector handwriting with a following pen, then marker and annotation.
- Lora for the wordmark, Japanese Mincho for headings, system sans for controls.
- Readable completion, visible keyboard focus and reduced-motion behavior.
- Six coordinated ink sets for the notebook; sage controls retain their existing colors.
- A separate vector print composition for a fixed A5 note, on A5 or landscape A4 paper.

## Colors

Six notebook ink sets—pink, lavender, blue, green, yellow and gray—sit on warm cream paper; green is the default. Each set has coordinated title, body, annotation, personal-writing and pale-marker colors. Frontmatter values come from `palettes.ts` and the incumbent stylesheet; the sidecar’s generated tonal ramps are panel metadata, not additional application colors.

- **Primary:** sage and deep sage remain the playback/status colors. Control ink, border and hover support quiet actions; export tint and border support the PDF action. Changing the notebook palette leaves these controls unchanged.
- **Secondary:** each selected set supplies the page’s five ink roles to both screen and PDF. The default green set uses `title-ink`, `ink`, `annotation-ink`, `personal-ink` and `marker`; the other sets use the corresponding `pink-*`, `lavender-*`, `blue-*`, `yellow-*` and `gray-*` tokens. The pale marker sits beneath the expression at 0.48 opacity. Warm error ink identifies unsupported input.
- **Neutral:** desk, paper and field establish the material layers; muted organizes interface text; rule, divider and field border provide fine structure. Focus uses a 2px outline with a 4px offset.

**The Marker Rule.** Keep the marker beneath the written letters. It appears after the main writing phase and before the annotation; it never replaces readable ink. Printed markers are optional: omitting them leaves the screen marker, written content and annotations intact.

## Typography

Self-hosted **Lora** gives the wordmark its editorial voice; platform **Yu Mincho / Hiragino Mincho ProN** carries Japanese headings. System sans keeps controls readable. Frontmatter records the actual role scale. Mobile wordmark, headline and textarea sizes become 22px, 23px and 16px; controls remain compact, with buttons at 13px.

**Sentence Study Strokes** is an OFL derivative of Ellen Wasbø’s Cutlings Singularis, rendered as separated monoline SVG paths, not a CSS font or continuous cursive. [Provenance and license details](docs/handwriting-prototype.md#candidate-research-and-provenance) accompany the source. Regular/compact model sizes are title 55/39, body 47/38, annotation 32/27 and personal 41/34, scaled against a 200-unit em. Compact geometry applies below 450 units of measured paper width.

**The Stroke Rule.** Handwriting is centerline vector geometry with round caps and joins. A CSS handwriting font, text mask or typewriter character reveal does not implement this identity.

## Layout

The root surface uses a centered shell (maximum 1440px), 64px desktop gutters, a notebook up to 720px and a 270–310px control rail. The gap is 72px, increasing to 90px from 1450px. At 1100px and below, gutters become 32px, the rail 275px and the gap 36px.

At 760px and below, 20px gutters frame the stacked order: invitation, playback, notebook, personal input, print controls, disclosure. Playback precedes the long page; the introductory paragraph and extra page caption disappear. This is the current root-route arrangement, not a mandate for every future surface.

The SVG reflows at the measured paper width. Regular/compact left and right insets are 64/46 and 30/26 units; rule spacing is 59/49. Height grows with content. Rail groups use fine dividers, with 28px margin and 26px padding above adjacent sections (24/22px on mobile). Buttons and selects have a 44px minimum height.

Palette choices form six equal columns, becoming three columns at 1100px and below. Their native radio, swatch and label occupy a minimum 44px height; the selected option adds an ink-colored underline and a subtle paper tint.

### Print composition

The finished notebook is generic A5 portrait (148 × 210 mm). A5 prints one note; landscape A4 (297 × 210 mm) carries two identical, unscaled copies at x=0 and x=149 mm. Dashed cut guides at 148 and 149 mm identify the 1mm center strip. A4 is a printer sheet, not a larger finished notebook. B5 and measured notebook presets remain future formats.

Print geometry is defined independently in millimetres by `print-layout.ts`, sharing content and glyph paths with the screen. Title, body, annotation and personal lettering use 7, 5, 4.3 and 5mm model sizes; body, personal and review line spacing is 8mm. Left/right binding accepts 12, 18 or 24mm, with 18mm on the left by default; the opposite edge is 12mm, plus 2mm inside the text width for stroke overhang. The date and footer sit 12mm from the top and 10mm from the bottom. Overflow raises an error without shrinking or clipping letters. These are prototype print measurements, not approval of the temporary lettering or the whole-page design.

Keep finished-note dimensions separate from printer-sheet dimensions. Place the A5 composition at 100% scale regardless of screen width or sheet choice. Future presets must declare measured finished dimensions and compatible sheet placement before becoming available.

## Elevation & Depth

One ambient shadow lifts the notebook from the desk: `0 12px 34px #4d4c3820, 0 2px 5px #4d4c3812`. The sidecar holds this value. Controls remain flat; rules and subtle fills provide structure.

**The Paper Rule.** Reserve the ambient shadow for the notebook sheet. The control rail stays flat, divided by fine rules.

## Shapes

Paper and native selects are square. Buttons and textarea use a small 3px radius. Handwritten and marker strokes have rounded caps and joins. The inline SVG pen has a sage body and warm nib; the sample pen fades and lifts between strokes.

## Components

- **Playback:** one sage-filled primary, a transparent-border completion action and native 1×/2×/4× selector. Pause, resume, replay and immediate completion are explicit. Button hover transitions take 150ms; disabled buttons have half opacity. Reduced motion shows completion and disables sample playback/speed controls.
- **Personal input:** cream textarea, thin border, italic Lora placeholder, help and character count. Up to 80 characters; newlines become spaces. Input is visibly session-only. Unsupported characters remain in the field, are identified and block export. Typing pauses the sample. Personal strokes draw sequentially with a following pen; retained prefix/suffix IDs preserve unchanged letters through edits. Pause/resume and finish appear while pending; reduced motion completes directly.
- **Navigation:** Lora wordmark/tagline, small setup link and quiet footer/license link. Links inherit ink with a 5px underline offset. A focus-revealed skip link reaches the controls; native focus remains visible.
- **Notebook:** date, title, body, expression marker, annotation, personal space and folio. An accessible SVG title/description provides complete text. Writing progress uses `t - 0.105 × sin(2πt)`; pen geometry follows it. Distance-based timing and pauses separate strokes, words, punctuation and lines. Marker animation follows body writing but its layer stays below ink. The same stroke renderer serves personal text.
- **Palette selection:** a labeled native radio group above the notebook exposes all six ink sets with a swatch and text label. Green is selected initially. Selection updates screen handwriting, personal strokes and the next PDF without restarting writing. Palette and print choices are session-only.
- **Print:** the fixed A5 finished-size readout precedes a native printer-sheet selector, a small placement diagram, binding-side and margin selectors, and a checkbox for printed markers. Defaults are an A5 sheet, left binding, 18mm and markers on. The A4 diagram and copy explicitly describe two copies of the same page and two cut guides. Export is a full-width tinted action with status feedback. The interface requests 100% / actual-size printing and, for A4, one PDF page per printer sheet because placement is already complete. The PDF also requests no scaling, but a viewer or driver may override that hint. Print paper is white, without a screen shadow. Letters, optional markers and rules are vectors; small labels use Helvetica. Export uses completed content regardless of animation time and rejects overflow. Removing printed markers preserves all text, annotations, positions and margins. Path letters are not searchable text or a tagged PDF. Physical printing, grayscale appearance, printer-edge cut guides and binding fit remain unverified.

## Do's and Don'ts

### Do:

- Do use the cream page, fine rules and subdued sage controls as the current identity.
- Do keep the same stroke geometry for the sample, the personal line and the completed PDF.
- Do preserve visible focus, native control behavior, pause/finish actions and direct completion for reduced motion.
- Do retain unsupported input, identify it beside the field and block export until it is supported.
- Do keep print layout independent of viewport width and the animation clock, and distinguish the finished A5 note from its printer sheet.
- Do label the sample and the session-only input honestly; animation completion is not evidence of learning completion.

### Don't:

- Don't restore the retired typewriter, key or case motif.
- Don't substitute a font-outline wipe or character reveal for the centerline handwriting.
- Don't place solid highlight color over the letters or reveal annotation before the main writing and marker phases.
- Don't spread paper shadows to every control or turn the control rail into decorative cards.
- Don't add rankings, confetti or a chat interface to this notebook world.
- Don't describe `/setup` as redesigned, or claim Japanese stroke support, saved completed notes, live generation or verified physical printing.
