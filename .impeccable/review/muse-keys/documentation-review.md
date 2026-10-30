# Muse connection keys — documentation review

Date: 2026-10-30 JST. Project: `/Users/maki/sentence-book-muse`.

## Documentation verdict

Complete for this ordinary extension. The finished connection-key UI inherits the incumbent Connect surface; it does not establish a new visual world or change the shared design system. Preserve `PRODUCT.md`, `DESIGN.md`, and `.impeccable/design.json`. Their existing drift is recorded below rather than repaired without authorization. The surface contract sufficiently states the local extension’s purpose, layout, interaction order, and inherited treatment.

This documentation verdict is scoped to the Connect extension and the supplied evidence. The parent reports the independent finish reviewer’s disposition as `ship`, with no material findings and two nonblocking notes. This pass does not replace that review or certify the whole app, authenticated Muse integration, or deployment.

## Evidence checked

- Read Impeccable `reference/document.md` and section 7 of `reference/new-work.md`.
- Read the project’s current progress/context and work-in-progress entry, `PRODUCT.md`, `DESIGN.md`, `.impeccable/surfaces/muse-connection-keys.md`, and the sidecar’s schema, metadata, component snippets, extensions, and narrative. Parsed `.impeccable/design.json` successfully as schema version 2 with nine component examples.
- Inspected `src/ConnectionKeys.tsx`, `src/Connect.tsx`, `src/connect.css`, and `src/lib/muse-client.ts`; compared tracked changes to the incumbent Connect source. Checked the inherited color, typography, focus, action, and layout rules in `src/styles.css`.
- Opened all six supplied synthetic captures: `.impeccable/review/muse-keys/{desktop,desktop-form,mobile,mobile-form,user-1726,user-1726-form}.png`. They show full pages from the masthead through the footer, with the expected form or masked issued-key state. No blank region or wrong-state capture was observed. Widths are 1280, 375, and 1726 pixels; the supplied mobile evidence is 375px, not 390px.
- Read `.impeccable/review/muse-keys/results.json`: disposable origin `http://127.0.0.1:8804`, synthetic fixtures, unchecked initial permissions, public instructions without a key, issue failure/retry, masked/focused one-time display, copy, show/hide/dismiss, reload, revocation, and logout checks. Its only recorded console error is the parent-described injected 503.

## Comparison with the incumbent

The new section follows the existing inbox and explicit summary sharing, as the direction contract requires. It reuses the flat warm background, lighter paper insert, fine horizontal rules, Japanese serif section headings, graphite body text, sage actions, and labeled native fields. The added CSS references existing `--paper`, `--ink`, `--line`, and `--sage` variables; it introduces no new palette, type family, decorative motion, or asset. The monospace face is confined to the credential field.

The 580px form width, 24px inset result surface, 18px mobile inset, wrapped actions, inherited 640px breakpoint, and stacked key list keep the addition consistent with Connect’s summary and list patterns. Form controls retain 44px action/label targets, inherited visible focus, disabled issuance until a name and permission are selected, and nearby alert/status feedback. Static captures support the layout comparison; source and recorded synthetic actions support the state comparison.

The copy separates public instructions from the one-time credential, states permissions/30-day expiry/five-key limit, explains that logout does not revoke a key, and presents revocation by name. It preserves the learner’s explicit summary-sharing and manual filing steps. The code hides the connection-key section on OAuth consent routes.

## Existing documentation drift, preserved

1. `PRODUCT.md` remains centered on the earlier sample desk and still states that generation/filing/general history are planned and that there is no account, sync, or MCP. The existing Connect implementation and current project status already describe personal login, shared inbox, summary publication, and OAuth/MCP. These statements predate this key extension and need a separately scoped product-document refresh.
2. `DESIGN.md` and `.impeccable/design.json` primarily document the desk rather than the established Connect/setup shell. Connect already uses a distinct warm-paper palette, 15px body text, Japanese serif headings, sage actions, and a 640px breakpoint. Applying desk-only tokens to this extension would contradict its explicit incumbent-surface contract. No Connect token migration is warranted by this task.
3. Existing root-design and sidecar descriptions are not fully synchronized: the design prose retains older model/paper shadows while sidecar shadow metadata records contact shadows; the model-card snippet still contains the older shadow and near-white fill. Sidecar narrative also retains older wording about mobile actions/current-line action. This pass records these preexisting inconsistencies without changing either source.

## Limits and retained notes

The parent reports 200 passing tests and TypeScript/Vite/Worker checks. I did not rerun those checks or independently inspect their command logs; this review adds source, documentation, capture, and saved synthetic-evidence inspection only. Real Muse authenticated use remains unverified, and production migration was in progress when this review was requested. No deployment outcome, physical-device, assistive-technology, real clipboard-service, or end-to-end integration claim is made here.

The finish reviewer’s two nonblocking notes remain visible in source: clipboard errors are not cleared by a later successful copy, and OAuth consent-route copy refers to keys “above” although that section is hidden there. Neither is repaired by this documentation pass.

Only this temporary review file was written. No application, product/design document, project-status, user data, or asset was modified. The parent remains responsible for the required final project-status/history update and for rechecking documentation consistency if the implementation changes after this pass.
