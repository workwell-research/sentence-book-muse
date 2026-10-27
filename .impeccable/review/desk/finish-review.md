## verdict

2026-10-27 — Verdict pass on the five material findings from the initial desk finish review. All five fixes are resolved. This verdict scores that fix list and associated regressions only; it is not a new whole-surface review or numeric comp-reproduction approval.

| Original finding | Score | Current evidence |
| --- | --- | --- |
| 1. Duplicate ink when re-editing saved personal text | resolved | `personal-edit.png` shows one editable “My edited words.” line on the continuation sheet without the previous saved sentence underneath it. `confirmedLayout(..., personalMode)` removes personal ink only from the active screen scene; `exportPdf` calls the canonical confirmed plan without that editing filter. `review-fix-checks.json` reports the personal-edit check passed. Saved canonical content remains separate from the draft. |
| 2. Mobile Confirm/Next outside the visible viewport | resolved | Regenerated 390px/320px full-page captures show a native action strip outside horizontal paper scrolling. `mobile-action-390.png` and `mobile-action-320.png` visibly keep confirmation reachable beside the current-line navigation while the paper stays enlarged. Source gives the sticky action targets a 44px minimum and preserves the desktop notebook-side control. The direct checks report reachable actions, caret-driven paper panning and explicit Confirm/Next at both widths; source follows selection/focus/input without adding another textarea or changing A5 layout. |
| 3. Missing theme-specific index headings | resolved | White now has modern sans headings, Natural has neat Klee handwriting and Walnut retains restrained Lora serif. The desktop theme captures show the intended distinction. The 1280px and narrow White captures retain readable heading wrapping and the same navigation structure; the model/input type remains common. |
| 4. Missing theme-specific model-card rules | resolved | White has a fine pale rule, Natural a warm restrained rule and Walnut a delicate double printed rule, visible in the theme captures. The outer card geometry and read-only model/actions remain intact; decoration stays clear of text and does not enter the notebook/PDF. |
| 5. Missing playback resumption | resolved | Source now toggles playing without resetting time, with “筆記を一時停止” / “筆記を続ける” labels and completion/reduced-motion guards. `review-fix-checks.json` reports resume passed; `motion-check.json` reports real sequential strokes, held pause position and Finish not advancing Copy. Replay remains a separate reset-to-start action. |

Evidence validity: opened all ten regenerated required captures at their original paths — `desktop-white.png`, `desktop-natural.png`, `desktop-walnut.png`, `desktop-hidden.png`, `desktop-1280.png`, `mobile-390.png`, `mobile-320.png`, `completed.png`, `pdf-a5.png`, `pdf-a4.png` — plus `mobile-action-390.png`, `mobile-action-320.png` and `personal-edit.png`. All are valid for their named states; the action captures intentionally show a scrolled working viewport. No fix-batch regression was identified in these targeted captures and source changes. No raster assets were added in this fix batch.

Reviewed direct evidence: `review-fix-checks.json`, `motion-check.json`, current `StudyDesk.tsx`, `desk.css` and the personal-filter change in `note.ts`. Earlier `qa.json`, `edge-checks.json` and `pdf-checks.json` retain their recorded scope. The parent reports 60 passing tests/build after the fixes and direct mobile QA after caret following; this reviewer did not rerun commands or independently certify the final production build.

## remaining

Clear for the five scored findings. The report authorizes the statement “the reviewer scored all five fixes resolved.” Native OS IME/audio, actual mobile devices, physical printing, unseen lessons, production deployment and a successful Impeccable detector/comp-diff remain outside this verdict. The initial acceptance of darker native draft rasterization remains unchanged. The separate documentation handoff must record the actual implementation and verification limits.

disposition: ship
