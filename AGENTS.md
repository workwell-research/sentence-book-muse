# Sentence Book Muse

Read PROJECT_STATUS.md before working and update it at the end with actual checks and limitations. Read PRODUCT.md and DESIGN.md for UI work.

This is a new first-party implementation. Do not copy application code, private lessons, old assets or audio from the separate personal prototype. Do not touch its app, browser storage or deployment. A prior design or schema must be identified as such.

Keep secrets server-side in Cloudflare Pages encrypted secrets or a gitignored .dev.vars. Never use VITE_* for a model key. Do not infer missing lesson-schema-v2 types. Keep generation disabled until server/client validation and a bounded real adapter exist.

Preserve local user data; unreadable storage must not be overwritten automatically. Use a disposable browser context and separate origin for tests. Commands: npm test, npm run build, npm run pages:build. No deployment or real model call is implied by passing local checks.
