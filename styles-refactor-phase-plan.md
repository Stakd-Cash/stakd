<!--
Build Audit - 2026-03-23

1. CSS loading today:
   - `scripts/build.mjs` only bundles the JS entry point `app.jsx`.
   - `styles.css` is not imported from JS and is not an esbuild entry point.
   - Foundation/admin CSS is currently loaded directly from `index.html` via:
     `/src/styles/tokens.css`, `/src/styles/components.css`, `/critical.css`, `/styles.css`, and `/src/styles/admin.css`.

2. esbuild CSS capabilities vs current config:
   - The current config does not define CSS entry points.
   - Because it uses a single `outfile`, it is not currently configured for multiple entry points.
   - CSS imported from JS is supported in practice because `src/components/admin/UIComponents.jsx` imports `react-day-picker/style.css`, which causes esbuild to emit `dist/app.css`.
   - `@import` chaining is safe for directly linked CSS files because the browser resolves it, but those files are not currently processed by esbuild.

3. `critical.css` delivery:
   - `critical.css` is not inlined into `index.html` at build time.
   - It is loaded as a separate stylesheet link: `/critical.css?v=...`.

4. Existing CSS imports in JSX:
   - Yes. `src/components/admin/UIComponents.jsx` imports `react-day-picker/style.css`.
   - There are no current local app CSS imports from `app.jsx` or the cashier/result/history component files.

5. Important repo reality:
   - The repo is already partially refactored compared with the task brief.
   - `src/styles/tokens.css`, `src/styles/components.css`, and `src/styles/admin.css` already exist and are active.
   - Phase 1 in this branch should finish the foundation split cleanly instead of recreating it from scratch.
-->

# styles.css Refactor Phase Plan

## Phase 1

- Document the active CSS/build architecture so follow-up work uses the real pipeline.
- Create `src/styles/reset.css` and move foundation reset/base element rules out of `src/styles/components.css`.
- Create `src/styles/typography.css` and move shared typography/body text defaults out of `src/styles/components.css`.
- Create `src/styles/base.css` as the foundation import layer for `tokens.css`, `reset.css`, and `typography.css`.
- Rewire `index.html` to load `base.css` before shared component CSS, while leaving `critical.css` untouched.
- Remove extracted foundation rules from the legacy shared file so the split is real.
- Keep feature-local styles in `styles.css`; do not change JSX class names or component ownership in this phase.

## Phase 2

- Split `styles.css` by feature/component into colocated CSS files.
- Start with the largest wins: cashier flow, result/history/settings, then admin/login/pathway/pinpad.
- Import each component stylesheet from its JSX file after the build path is verified.

## Phase 3

- Lazy-load admin-only CSS when admin/login routes are active.
- Only do this after Phase 2 establishes clean route/component ownership.

## Phase 4

- Enable CSS Modules for new components only after the build config is explicitly updated for `.module.css`.
