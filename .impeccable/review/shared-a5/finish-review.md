disposition: ship

Inputs and limits: reviewed the pinned A5 implementation request, AGENTS.md, PROJECT_STATUS.md, PRODUCT.md, DESIGN.md, the adopted handoff/geometry JSON, supplied source and QA, the generated composition reference, and all nine required captures. No QUALITY BAR card, concept seed, approved comp, or comp-diff artifacts were supplied; this is a pinned-geometry functional integration, not a new artwork or comp reproduction. The detector was reported unavailable (permission denied) and was not rerun. This reviewer did not execute the browser, tests, PDF renderer, a physical printer, an API call, or deployment.

## persistence

Pass for the scoped implementation. PRODUCT.md, DESIGN.md, the adopted specification, exact refill JSON/SVG, current source, tests, browser QA script/results, and review captures exist. The earlier design/status documents still describe integration as pending and contain superseded palette defaults; the assigned documenter must reconcile them after this review. That scheduled documentation handoff is not a UI failure or evidence that final glyphs were approved.

Evidence validity passed: desktop.png (1440 × 1909), desktop-blank.png (1440 × 2141), mobile.png (390 × 2537), mobile-zoom.png (390 × 3096), mobile-320.png (320 × 2495), paper-shown.png, paper-blank.png, pdf-shown.png, and pdf-blank-a4.png were opened. Full-page captures include their document tops, contain the expected controls/content, and have no failed or blank rendering. The right edge cropped in mobile-zoom.png is the intentional scrollable paper viewport, accompanied by a visible horizontal-scroll hint. The paper/PDF captures are valid artifact views rather than full app captures.

State preservation is supported by HandwritingDemo.tsx separating view settings from content/layout, A5Notebook.tsx filtering layers after layout, and scripts/qa-a5.mjs assertions for exact non-memo SVG identity, paused body strokes, personal stroke content, vocabulary checks, and untouched disposable localStorage fixtures. The checked vocabulary item and personal line also remain visible in the shown/blank capture pair.

## fidelity

| Element or promise | Verdict | Evidence and scope |
| --- | --- | --- |
| Fixed A5 physical refill | match | a5-layout.ts imports the adopted JSON: 148 × 210 mm; 31 rules from y39.2 to y195.2 at 5.2 mm; default rules x18–136; title rules y24.64/32.96; footer rule y201. The screen uses the 148 × 210 viewBox and the PDF independently draws the same plan. tests/a5-layout.test.ts checks these coordinates. |
| Body width and annotation rail | match | Default body x18–104 with the divider at x106. Shown/blank paper captures retain that structure and line positions. Existing explicit binding variants remain available; the accepted default is unchanged. |
| Measured whole-row wrapping | match | The wider seventh sentence wraps onto a second full 5.2 mm row, followed by a full reserved row; later sections remain inside the fixed sheet. No compressed paper or text-size adjustment is used to force the supplied sample onto one line. |
| Shown/blank memo control | match | Native labeled radios are visible on desktop and both narrow sizes. The blank capture omits difficult-phrase meanings, right-column footnotes and their number marks while preserving body, markers, rules, vocabulary meanings, checks, grammar and personal writing. visibleLayer applies after allocation. |
| Vocabulary frame and review state | match | A single frame, four checkboxes, English and Japanese pairs are retained in both modes. Review controls disclose session-only state and do not claim learning completion. |
| Six accents and graphite body | match | Blue is the initial choice; the six labeled palette radios remain. Main/personal ink is #383A3D, and section/structural accents remain separate. QA checks all six body colors and the displayed paper shows pale markers beneath dark strokes. |
| Screen zoom without reflow | match | mobile.png and mobile-320.png show a complete fitted sheet; mobile-zoom.png shows the fixed larger sheet inside its own horizontal scroll region. The viewBox and body baselines are invariant in the supplied QA. New memo labels are measured at least 44 px high. |
| Independent matching PDF | match | study-pdf.ts consumes A5Layout rather than screen measurements or animation time. pdf-shown.png matches paper composition with complete Japanese text. pdf-blank-a4.png contains two unscaled matching A5 copies with the central cutting strip, omitted memo ink, retained vocabulary Japanese/checks, and no screen shadow. Unit assertions cover MediaBoxes and PrintScaling=None; browser QA records actual downloads. |
| Independent content/marker choices | match | Source separates content, memos, screen markers and PDF-marker override. Sentence-only hides study layers, disables the irrelevant memo control and retains source settings. QA exercises the content/marker combinations and the memo transition. |
| Input, source identity and truth | match | Stable sentence/gloss IDs and validated code-point occurrence spans are used. Personal input is supplied from the editable field, not replaced with the reference's fictional personal sentence. The interface labels the material as a sample, discloses session-only input/checks, and identifies generation/history integration as future work. |
| TYPE | adaptation | The existing Cutlings-derived centerline lettering is thinner and registered on the grid but visibly differs from the smoother generated reference. PRODUCT.md and the explicit review scope identify it as provisional; final glyph creation/approval is deferred. Static M PLUS 1p Japanese is permitted by the handoff when Japanese stroke assets are unavailable and is legible in the latest PDF capture. This verdict does not approve the final typeface. |
| MATERIAL | match | The page is actual ruled vector geometry with stroke paths and embedded text. The generated image is a composition critique reference, not a screenshot background, paper plate, or embedded lesson. No fake texture or physical-material effect substitutes for the notebook. |
| GROUND | match | The screen paper is the authoritative #FFFEFB from the refill JSON, visually near white; print uses unprinted white. The surrounding warm desk is the retained app surface, not an unauthorized change to the paper. |
| Long-content continuation | adaptation | Allocation and tests cover multiple identical pages, wrapped meanings/footnotes, bounded glyph positions and identical shown/blank page counts. Supplied rendered captures cover the current one-page sample; arbitrary multi-page lesson rendering and final production fitting are not visually certified by this review. |

## ceiling

Reached for common physical A5 layout and reversible memo visibility. The fixed geometry, stable whitespace, independently rendered PDF, graphite hierarchy and narrow-screen paper viewing are present. Smoother commissioned glyphs, full grammar bracket artwork, authored personal translation, red-sheet behavior, generated lesson/practice integration, persistent completed pages and physical print calibration remain outside this increment; the generated reference is not treated as approval of the provisional letterforms.

## material_fixes

None within this increment. The supplied QA results report zero browser errors; the parent reports 48 passing tests and a passing build. This review inspected the relevant assertions and outputs rather than rerunning those checks. Post-review documentation reconciliation remains a required delivery step already assigned to the documenter, not an additional UI repair.

## keep

Keep the single measured A5 plan, dark body ink, memo-space reservation before visibility filtering, six accents, stable source/user state, actual-size A5/A4 PDF geometry, and explicit provisional-font/demo boundaries.
