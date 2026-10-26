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
  marker: "#d8c66b"
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
---

# Design System: The Sentence Book

## Overview

**Creative North Star: "The Handwritten Study Notebook"**

The Sentence Book — Learn digitally. Keep it beautifully. Korean Studygram meets a restrained editorial notebook: warm cream paper, fine rules, real monoline handwriting, a pale marker and small handwritten annotations. The page is the keepsake; calm sage controls and compact Japanese labels support it. The typewriter motif and key/case animations are retired.

This document captures the implemented identity at `/`, extracted on 2026-10-27 from `src/handwriting/handwriting.css`, `HandwritingDemo.tsx`, `model.ts`, `usePersonalInk.ts`, `personal.ts` and `pdf.ts`. `/setup` retains the earlier interest and topic-note scaffold; its visual refresh is deferred. The current handwriting page is a labeled sample and session-only personal line, not a completed learning record. The source of truth for this surface’s composition and delivery limits is [the handwriting prototype note](docs/handwriting-prototype.md).

**Key Characteristics:**

- Cream ruled paper with one ambient page shadow.
- Actual vector handwriting with a following pen, then marker and annotation.
- Lora for the wordmark, Japanese Mincho for headings, system sans for controls.
- Readable completion, visible keyboard focus and reduced-motion behavior.
- A separate vector print composition that preserves the handwriting.

## Colors

Green-gray ink and sage controls sit on warm cream paper. Frontmatter values are extracted from the implementation; the sidecar’s generated tonal ramps are panel metadata, not new application colors.

- **Primary:** sage and deep sage for playback/status; control ink, border and hover for quiet actions; export tint and border for the PDF action.
- **Secondary:** straw marker beneath the expression at 0.48 opacity; related title, annotation and personal inks distinguish page layers. Warm error ink identifies unsupported input.
- **Neutral:** desk, paper and field establish the material layers; ink and muted organize text; rule, divider and field border provide fine structure. Focus uses a 2px outline with a 4px offset.

**The Marker Rule.** Keep the marker beneath the written letters. It appears after the main writing phase and before the annotation; it never replaces readable ink.

## Typography

Self-hosted **Lora** gives the wordmark its editorial voice; platform **Yu Mincho / Hiragino Mincho ProN** carries Japanese headings. System sans keeps controls readable. Frontmatter records the actual role scale. Mobile wordmark, headline and textarea sizes become 22px, 23px and 16px; controls remain compact, with buttons at 13px.

**Sentence Study Strokes** is an OFL derivative of Ellen Wasbø’s Cutlings Singularis, rendered as separated monoline SVG paths, not a CSS font or continuous cursive. [Provenance and license details](docs/handwriting-prototype.md#candidate-research-and-provenance) accompany the source. Regular/compact model sizes are title 55/39, body 47/38, annotation 32/27 and personal 41/34, scaled against a 200-unit em. Compact geometry applies below 450 units of measured paper width.

**The Stroke Rule.** Handwriting is centerline vector geometry with round caps and joins. A CSS handwriting font, text mask or typewriter character reveal does not implement this identity.

## Layout

The root surface uses a centered shell (maximum 1440px), 64px desktop gutters, a notebook up to 720px and a 270–310px control rail. The gap is 72px, increasing to 90px from 1450px. At 1100px and below, gutters become 32px, the rail 275px and the gap 36px.

At 760px and below, 20px gutters frame the stacked order: invitation, playback, notebook, personal input, print controls, disclosure. Playback precedes the long page; the introductory paragraph and extra page caption disappear. This is the current root-route arrangement, not a mandate for every future surface.

The SVG reflows at the measured paper width. Regular/compact left and right insets are 64/46 and 30/26 units; rule spacing is 59/49. Height grows with content. Rail groups use fine dividers, with 28px margin and 26px padding above adjacent sections (24/22px on mobile). Buttons and selects have a 44px minimum height.

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
- **Print:** three native selectors and a full-width tinted export action with status feedback. Independent vector composition uses A5/A4, left/right binding and 12/18/24mm margins; defaults are A5/left/18mm. Top, bottom and the outside edge use 12mm. Print paper is white, with no screen shadow. Letters, marker and rules are vectors; small labels use Helvetica. Export uses completed content regardless of animation time and rejects overflow. Path letters are not searchable text or a tagged PDF. Physical printing and binding fit remain unverified.

## Do's and Don'ts

### Do:

- Do use the cream page, fine rules and subdued sage controls as the current identity.
- Do keep the same stroke geometry for the sample, the personal line and the completed PDF.
- Do preserve visible focus, native control behavior, pause/finish actions and direct completion for reduced motion.
- Do retain unsupported input, identify it beside the field and block export until it is supported.
- Do keep print layout independent of viewport width and the animation clock.
- Do label the sample and the session-only input honestly; animation completion is not evidence of learning completion.

### Don't:

- Don't restore the retired typewriter, key or case motif.
- Don't substitute a font-outline wipe or character reveal for the centerline handwriting.
- Don't place solid highlight color over the letters or reveal annotation before the main writing and marker phases.
- Don't spread paper shadows to every control or turn the control rail into decorative cards.
- Don't add rankings, confetti or a chat interface to this notebook world.
- Don't describe `/setup` as redesigned, or claim Japanese stroke support, saved completed notes, live generation or verified physical printing.
