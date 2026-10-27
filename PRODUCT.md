# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Vite + React + TypeScript Web prototype, Cloudflare Pages and Pages Functions. The user explicitly requested Web handwriting; earlier Flutter discussion was exploratory. Existing interests and topic notes use localStorage. Notebook display preferences, personal input and review checks are session-only.

## Users and purpose
People who want to practise English about their own lives, ideas and work. A requested page becomes part of a growing theme binder after the learner reviews it.

## Current prototype
The root route demonstrates sequential English handwriting, a following pen, expression markers, supplied Japanese meanings and right-column footnotes. The owner-approved common A5 layout and shown/blank memo controls are implemented. A boxed vocabulary list retains its English, Japanese and learner review checks in both memo states; supplied grammar and the learner's own English line remain separate blocks. Six accent palettes share dark graphite body text, with blue selected initially.

The screen and an independent vector PDF renderer use the same physical page and measured line plan. The finished notebook is A5 portrait. A5 single-page and A4 landscape two-up are printer-sheet choices; A4 places two copies of each note at actual size. Screen and PDF marker choices are independent. The demo uses labeled synthetic study content, session-only personal input and session-only checks. Completing an animation or checking a word does not record a learning result. The earlier interest/topic workflow remains at /setup.

## Adopted notebook design — current increment
The owner selected the blue Studygram notebook from Work on 2026-10-27. The authority is [the implementation specification](docs/studygram-notebook-implementation-spec-2026-10-27.md), its exact refill JSON/SVG and final blue references 22/23. Generated reference images express visual direction; they are not application backgrounds or lesson data. The import manifest records provenance. A later Work hand-template proposal has not been adopted and does not replace this baseline.

The implemented increment uses the common A5 refill, every-other-row short sentences, measured whole-row wrapping, anchored difficult-expression meanings, right-side footnotes and a framed vocabulary list. Memo blanking removes only those meanings, footnotes and their number marks after layout; it keeps reserved rows, columns, later blocks, page count, source content, personal writing and checks. Sentence-only mode retains the English line plan, hides study/personal/memo layers and their rail, and remembers the disabled memo choice for returning to study content. It may omit pages containing only supplemental study material. Narrow screens scale or scroll the fixed paper rather than changing its text wrapping.

Long-content continuation on identical pages is implemented and covered by layout tests; visual evidence covers the current one-page sample. Final glyph creation/approval, full grammar bracket artwork, authored personal translations, red-sheet answer ranges/output and physical print calibration remain outstanding. The current Cutlings-derived English strokes are provisional. Japanese uses static licensed text, not handwriting animation. See PROJECT_STATUS.md for dated implementation, browser/PDF evidence and its limits.

## Workflow
First choose interests (multiple suggestions or custom text, editable and skippable). Then optionally write a daily note or a short post in the learner's language, choose A2/B1/B2, generate with Muse, review content and filing destination, explicitly approve, and practise Copy. Interest onboarding and local note saving work; generation, filing and practice remain planned.

## Constraints
New first-party implementation. The prior app remains independent. No copied application source, private lessons, illustrations or audio. No account, sync, MCP, full five-pass course or saved speech assets. Interests guide the content Muse prioritizes; they do not create or constrain binder categories. Ordinary short posts can seed useful communication practice without judging their author. No SNS account connection or automatic collection is included. The shelf starts empty, with no fixed theme names or theme count. New binders grow from the learner's pages and require explicit approval. No bundled curriculum. The newly authored synthetic study fixture is demonstration material and is never inserted into learning history.

## Brand commitments
The Sentence Book — Learn digitally. Keep it beautifully. The chosen identity is a carefully organized Studygram notebook: white/subtle ivory paper, small consistent handwriting, fine rules, pale accent colors and compact annotations. Useful learning information has clear hierarchy and sufficient density. The owner explicitly retired the typewriter motif and its key/case animations. Korean Studygram × restrained editorial design; the note itself is the artifact. Learning should progressively produce a beautiful page worth printing. No rankings, confetti or chat interface.

## Evidence and open inputs
On 2026-10-27 the owner supplied pastel and near-monochrome Studygram references and rejected the earlier demo's oversized, irregular handwriting as too elementary-school-like. The adopted Work layout resolves the page direction, and this increment implements its common geometry and display controls. That does not approve the remaining Cutlings-derived letterforms. The owner plans to remake materials later; smaller technical strokes alone are not final typography acceptance. The finish review's ship disposition covers this increment only.

A user-supplied rebuild design exists. The owner clarified that standalone lesson-schema-v2 is unavailable and five themes are unnecessary. The new contract is documented in docs/generation-contract.md; actual Meta model access is outstanding. Abu Dhabi presentation preparation is a proposed demo topic; no personal speech, claims or specialist content has been supplied.

## Accessibility
Readable labels, keyboard operation, visible focus, native form controls, reduced motion, a focusable scroll region and explicit fit/enlarged paper choices. Memo descriptions follow visible content. Static Japanese font embedding preserves its PDF characters; English vector paths are not searchable or tagged PDF text. Physical-device and physical-print verification remain outstanding.
