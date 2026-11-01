# Sentence Book Muse

Read PROJECT_STATUS.md before working and update it at the end with actual checks and limitations. Read PRODUCT.md and DESIGN.md for UI work.

This is a new first-party implementation. Do not copy application code, private lessons, old assets or audio from the separate personal prototype. Do not touch its app, browser storage or deployment. A prior design or schema must be identified as such.

Keep secrets server-side in Cloudflare Pages encrypted secrets or a gitignored .dev.vars. Never use VITE_* for a model key. The owner confirmed the standalone lesson-schema-v2 is unavailable. Define this rebuild contract in shared/lesson-schema.ts and docs/generation-contract.md; do not claim legacy v2 compatibility. Start with an empty shelf and no preset binders. Since 2026-11-01 (owner decision) /setup holds lesson settings for Muse instead of interest selection: material (conversation only, or also the learner's social posts Muse can see), level, explanation language and delivery days and time; interests are no longer asked for or shared, and Muse learns them in conversation. Older saved interests stay untouched in storage. Create proposed binders only after explicit learner approval. Respect a concrete topic over a forced interest match, and never infer traits or judge a learner from a casual post. Keep generation disabled until server/client validation and a bounded real adapter are connected.

Preserve local user data; unreadable storage must not be overwritten automatically. Use a disposable browser context and separate origin for tests. Commands: npm test, npm run build, npm run pages:build. No deployment or real model call is implied by passing local checks.
