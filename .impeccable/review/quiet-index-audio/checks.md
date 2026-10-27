# 2026-10-27 — quiet index and keyboard actions

Owner: Codex. Scoped self-review of requested refinements; no independent-reviewer or detector claim.

- Implementation: all Copy Next/complete buttons and their gutters removed. Enter continues exact-check/save/advance. Legacy confirmed records normalize in memory without a load-time write. Personal entry remains available after completion.
- Design: Copy / Shadowing / Dictation / Reconstruction / Speaking only. Active sage #dbe7db, inactive neutral #f0f0eb. No numbers or status badges. Four future stages remain natively disabled. Narrow strips can scroll without splitting labels.
- Audio: Option/Alt+R uses physical KeyR. IME/AltGraph/settings/repeat guards; loading/speaking/error UI; stale callbacks ignored. Existing browser synthesis, no external API.
- Tests: 78 passed across 11 files, including seven new audio tests. Both TypeScript projects and Vite build passed, index-BVsyQ0Lm.js. Existing bundle-size warning remains.
- Browser: CUA/IAB dedicated origin5327 at1280×720. Option+R entered speaking state and returned to idle without changing typo draft or focus. Wrong Enter retained draft/error; corrected Enter advanced with empty focused editor. Continued from4/8 through8/8 using Enter; personal text saved by Enter and survived reload. No captured errors/warnings.
- Visual: opened desktop synthetic capture and actual746×777 preview capture; one sage/four neutral labels, no Next buttons, no document overflow. User reload retained5/8, empty draft and Orange. User screenshot is kept only locally in /tmp, not this public repo. Dedicated QA server/tab closed; existing5317 preserved.
- Limits: no new320/390, theme-matrix, realOS IME, physical-device, heard voice quality, legacy-load browser fixture, PDF render/physical print, API/configuration or deployment checks. Saved older QA scripts adapted and syntax checked, not rerun. Existing A5/PDF contract tests passed; their renderer/layout code is unchanged.
- Next: owner evaluates the quieter index and keyboard flow; later stages and generated-lesson integration remain future work.
