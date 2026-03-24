# stakd CSS Migration — Completion Record

## What this was

A full migration of the stakd auth and admin UI away from a monolithic 
`styles.css` toward a token-driven component system (`tokens.css` + 
`components.css`) using semantic `sk-` prefixed classes.

The landing page and counter/cashier UI were explicitly out of scope.

---

## What was done

### Phase 0 — Foundation audit
Reconciled `DESIGN-SYSTEM.md` (aspirational) against actual token and 
component definitions. Added missing tokens (`--z-auth`, `--sh-auth-card`, 
`--control-hover-bg`, `--sh-auth-staff-hover`, `--t-on-solid`). Fixed 
hardcoded colors in existing `sk-btn` rules to use tokens.

### Phase 1–4 — Auth surface
Converted `PathwayPage.jsx`, `PinPad.jsx`, and `LoginPage.jsx` to `sk-` 
classes. Built out the full auth component kit in `components.css`:
- Page layout: `sk-page-full`, `sk-auth-container`, `sk-auth-card`
- Typography: `sk-auth-heading`, `sk-auth-subtext`, `sk-company-label`
- Forms: `sk-auth-form`, `sk-field`, `sk-input`, `sk-field-hint`, 
  `sk-field-error`, `sk-search-input`
- Navigation: `sk-back-btn`, `sk-back-btn--fixed`, `sk-nav-actions`
- Staff/PIN: `sk-staff-row`, `sk-avatar`, `sk-pin-grid`, `sk-pin-key`, 
  `sk-pin-dots`, `sk-pin-dot`
- Steppers: `sk-stepper`, `sk-stepper-step`, `sk-step-panel`
- Feedback: `sk-alert-stack`, `sk-error`, `sk-success`, `sk-callout-note`

Component-scoped CSS files (`LoginPage.css`, `PathwayPage.css`, 
`PinPad.css`) were trimmed of orphaned rules but kept for scoped 
token inheritance and local overrides.

### Phase 5 — Admin panel alignment
- `OnboardingEmptyState` converted from overlay-on-dashboard to 
  `sk-page-full` layout matching the auth flow
- `ConfirmModal`, `StaffPanel` modals converted to `sk-backdrop` + 
  `sk-modal` pattern
- Full modal kit built: `sk-modal-closing`, `sk-modal-eyebrow`, 
  `sk-modal-title`, `sk-modal-body`, `sk-modal-actions`, `sk-modal-form`,
  `sk-modal-wide`, `sk-modal--stack`, `sk-modal--panel`

### Phase 6a — Remaining modals
`AboutModal`, `ChangelogModal`, `HistoryPanel`, `SettingsPanel`, 
`FreeKioskMode` overlays all converted to `sk-backdrop` + `sk-modal`.
`FreeKioskMode` UpsellSheet uses `sk-backdrop` but keeps its own 
bottom-sheet surface pending a future `sk-sheet` implementation.

### Phase 6b — Data panel cleanup
`AnalyticsPanel`, `DropsPanel`, `AuditLogPanel` inline styles moved 
to `admin.css` classes. Hardcoded colors replaced with status tokens 
(`--status-success`, `--status-danger`, `--status-info`, 
`--status-warning`). SVG chart tints use `color-mix()` against tokens.

### Final sweep
- 431 lines removed from `styles.css` (dead modal, sheet, changelog, 
  landing selectors)
- `DESIGN-SYSTEM.md` synced to reflect actual `components.css` state
- Aspirational classes moved to Planned section

---

## Rules for new UI

**New pages** use `sk-page-full` + `sk-auth-container` + `sk-auth-card` 
for full-screen flows. Reference `DESIGN-SYSTEM.md` Auth & Layout section.

**New modals** use `sk-backdrop` > `sk-modal` > `sk-modal-title` + 
`sk-modal-body` + `sk-modal-actions`. Wide/panel variants via modifiers.
Never use `modal-backdrop`, `modal-card`, or `modal-btn` — those are gone.

**New buttons** use `sk-btn` + variant (`sk-btn-primary`, `sk-btn-danger`, 
`sk-btn-secondary`, `sk-btn-ghost`) + size (`sk-btn-lg`, `sk-btn-sm`).

**No inline styles.** If a layout need isn't covered by an `sk-` class, 
add it to `admin.css` (panel-specific) or `components.css` (reusable) 
with a token reference. Never hardcode hex or rgba.

**No new rules in `styles.css`.** That file is legacy/landing only.

**Colors via tokens only.** See `tokens.css` for the full token set. 
Status colors: `--status-success`, `--status-danger`, `--status-warning`, 
`--status-info`. Surface/text/border tokens in the semantic tables in 
`DESIGN-SYSTEM.md`.

---

## What's left (not blocking, future passes)

| Item | Notes |
|------|-------|
| `sk-sheet` | Bottom sheet pattern for UpsellSheet and future use |
| `SettingsPanel` buttons | Still on `settings-action admin-btn-sm`, not `sk-btn` |
| `styles.css` counter/cashier audit | `calc-*`, `save-drop-*`, `signal-label` unverified |
| Landing page styles | Out of scope — `landing-badge`, `landing-proof-pill` etc. untouched |
| SVG chart gradient stops | `Sparkline.jsx`, `HistoryPanel.jsx` still use rgba literals |
| Planned `sk-` classes | See DESIGN-SYSTEM.md Planned section |

---

## Files changed summary

| File | Status |
|------|--------|
| `src/styles/tokens.css` | Extended with auth/modal/status tokens |
| `src/styles/components.css` | Full `sk-` system built out |
| `src/styles/admin.css` | Data panel classes added, pin-dots selector fixed |
| `styles.css` | 431 lines removed (dead selectors) |
| `LoginPage.jsx/css` | Migrated, css trimmed |
| `PathwayPage.jsx/css` | Migrated, css trimmed |
| `PinPad.jsx/css` | Migrated, css trimmed |
| `OnboardingEmptyState.jsx/css` | Layout converted to auth pattern |
| `ConfirmModal.jsx` | Converted to sk-modal |
| `StaffPanel.jsx` | Modals converted to sk-modal |
| `AboutModal.jsx` | Converted to sk-modal |
| `ChangelogModal.jsx` | Converted to sk-modal |
| `HistoryPanel.jsx/css` | Converted to sk-modal--panel |
| `SettingsPanel.jsx` | Backdrop/closing converted; buttons deferred |
| `FreeKioskMode.jsx` | Backdrop converted; sheet surface deferred |
| `AnalyticsPanel.jsx` | Inline styles → admin.css classes |
| `DropsPanel.jsx` | Inline styles → admin.css classes |
| `AuditLogPanel.jsx` | Inline styles → admin.css classes |
| `DESIGN-SYSTEM.md` | Synced to reflect actual implementation |