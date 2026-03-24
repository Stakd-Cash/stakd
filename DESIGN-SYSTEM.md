# stakd Design System — SKILL Reference

> For AI sessions, collaborators, and future contributors.  
> Single source of truth for building UI in the stakd codebase.

---

## File Structure

| File | Purpose |
|------|---------|
| `src/styles/tokens.css` | All design tokens (colors, typography, spacing, radii, shadows, z-index, motion, layout). Dark + light themes. |
| `src/styles/components.css` | Reusable `sk-` kit: buttons, cards, modals (incl. panel/stack variants), auth & pathway layout, choice rows, steppers, form fields, PIN UI, inline alerts, empty & skeleton states, progress, tooltips, scene/footer placeholders. |
| `styles.css` | Cashier-specific styles (denomination rows, stepper buttons, footer, result page, history, settings). Consumes tokens. |
| `src/styles/admin.css` | Admin panel-specific styles (dashboard shell, panels, staff cards, audit log, analytics). Consumes tokens + components. |
| `critical.css` | Inline-critical skeleton CSS loaded blocking. Minimal — just skeleton shimmer + skip link + tooltip base. |

---

## Token Naming Convention

All tokens live as CSS custom properties on `:root`.

### Surfaces (`--s-*`)
| Token | Dark | Light | Use |
|-------|------|-------|-----|
| `--s-base` | `#1e1e1e` | `#f3f3f3` | Page background |
| `--s-raised` | `#252526` | `#ffffff` | Cards, panels |
| `--s-overlay` | `#2d2d2d` | `#ececec` | Headers, footers, menus |
| `--s-inset` | `#3c3c3c` | `#d4d4d4` | Inputs, wells, tracks |
| `--s-backdrop` | `rgba(0,0,0,0.55)` | `rgba(0,0,0,0.35)` | Modal scrim |

### Borders (`--b-*`)
| Token | Use |
|-------|-----|
| `--b-default` | Standard borders |
| `--b-subtle` | Barely visible dividers |
| `--b-strong` | Emphasized borders |
| `--b-focus` | Focus ring color |

### Text (`--t-*`)
| Token | Dark | Light | Use |
|-------|------|-------|-----|
| `--t-primary` | `#cccccc` | `#333333` | Body text, headings |
| `--t-secondary` | `#858585` | `#616161` | Labels, muted text |
| `--t-tertiary` | `#5a5a5a` | `#a0a0a0` | Captions, placeholders |
| `--t-inverse` | `#1e1e1e` | `#ffffff` | Text on accent backgrounds |
| `--t-link` | brand-500 | brand-700 | Links, interactive text |

### Brand / Accent (`--accent*`)
| Token | Use |
|-------|-----|
| `--accent` | Primary accent color (coral `#DE7356`) |
| `--accent-hover` | Hover state |
| `--accent-bg` | Tinted background |
| `--accent-bd` | Tinted border |
| `--accent-soft` | Focus ring glow |

### Semantic Status
Prefix: `--status-{danger|success|warning}`  
Each has: base color, `-bg`, `-bd` variants.

### Typography (`--font-*`, `--text-*`)
| Token | Value |
|-------|-------|
| `--font-sans` | System font stack |
| `--font-display` | Serif display (Iowan Old Style, Palatino, Georgia) |
| `--font-mono` | Monospace stack |
| `--text-xs` through `--text-5xl` | 11px → 46px scale |

### Spacing (`--sp-*`)
4px base unit: `--sp-1` = 4px, `--sp-2` = 8px, `--sp-4` = 16px, etc.

### Radii (`--r-*`)
`--r-xs` (4px) → `--r-full` (9999px)

### Shadows (`--sh-*`)
`--sh-xs` → `--sh-xl` — automatically swap for light theme.

### Z-index (`--z-*`)
`--z-base` (0) → `--z-tooltip` (1000)

### Motion (`--dur-*`, `--ease-*`)
| Token | Value |
|-------|-------|
| `--dur-fast` | 100ms |
| `--dur-normal` | 200ms |
| `--dur-slow` | 350ms |
| `--ease-default` | Standard ease |
| `--ease-out` | Decelerate |
| `--ease-bounce` | Overshoot |
| `--ease-spring` | Springy |

### Glass (`--glass-*`)
For translucent elevated surfaces (admin topbar, glass cards):
- `--glass-bg`, `--glass-bg-s` — translucent fills
- `--glass-border` — subtle border
- `--glass-blur` — backdrop-filter value

---

## Component Class Conventions

**Prefix:** `sk-` (stakd kit). Most auth/pathway rules are scoped under `.login-page` or `.pathway-page` in `components.css` so `--login-*` / `--pw-*` tokens apply.

### Buttons
| Class | Description |
|-------|-------------|
| `.sk-btn` | Base (required on all buttons) |
| `.sk-btn-primary` | Coral accent, white text |
| `.sk-btn-secondary` | Surface background, default text |
| `.sk-btn-ghost` | Transparent, hover reveals bg |
| `.sk-btn-danger` | Red background, white text |
| `.sk-btn-sm` | Smaller (36px height) |
| `.sk-btn-lg` | Larger (52px height) |
| `.sk-btn-icon` | Round icon button |
| `.sk-btn-icon-sq` | Square icon button (admin) |

**Usage:**
```html
<button class="sk-btn sk-btn-primary">Save</button>
<button class="sk-btn sk-btn-danger sk-btn-sm">Delete</button>
<button class="sk-btn sk-btn-icon"><i class="fa-solid fa-gear"></i></button>
```

### Cards
| Class | Description |
|-------|-------------|
| `.sk-card` | Standard card (raised surface) |
| `.sk-card-header` | Card header bar |
| `.sk-card-body` | Card content area |

### Auth & layout
| Class | Description |
|-------|-------------|
| `.sk-page-full` | Full-viewport shell for login/pathway: fixed inset, scrollable, uses `--z-auth`. |
| `.sk-auth-container` | Centered column (max ~420px) inside `.sk-page-full`; fade-in animation. |
| `.sk-auth-card` | Glassy card surface; use inside `.login-page` or `.pathway-page` for theme-specific gradient/border. |
| `.sk-auth-logo` | Logo + wordmark row at top of auth card. |
| `.sk-auth-card-header` | Centered block above heading (company label + title area). |
| `.sk-auth-heading` | Primary title on auth screens. |
| `.sk-auth-subtext` | Supporting paragraph under the heading. |
| `.sk-auth-form` | Vertical stack for labeled fields and submit (login). |
| `.sk-auth-footer` | Footer region with top border (links, secondary actions). |
| `.sk-company-label` | Small uppercase eyebrow above the main heading. |
| `.sk-back-btn` | Pill-style back control with chevron; self-start above the card. |
| `.sk-back-btn--fixed` | Pin `.sk-back-btn` to top-left (login pattern). |

### Forms
| Class | Description |
|-------|-------------|
| `.sk-field` | Label + control column (gap, typography). |
| `.sk-input` | Default single-line input (admin/generic); login overrides live under `.login-page .sk-field .sk-input`. |
| `.sk-field-hint` | Muted helper text under a field. |
| `.sk-field-error` | Per-field error line (danger color; login adds FA icon via `::before`). |
| `.sk-search-input` | Pathway search: wrapper with leading icon + full-width input (use under `.pathway-page`). |
| `.sk-text-btn` | Borderless secondary action (muted → primary on hover). |
| `.sk-text-link` | Inline text link / button using accent color and underline on hover. |
| `.sk-link-row` | Centered row for tertiary links (e.g. “Forgot password?”). |
| `.sk-callout-note` | Compact muted callout with optional icon (tips, policy notes). |
| `.sk-nav-actions` | Horizontal row of nav buttons (e.g. Back + Continue); login styles flex primary/full width. |

### Staff & PIN (pathway)
| Class | Description |
|-------|-------------|
| `.sk-staff-row` | Tappable staff list row (avatar + text + arrow). |
| `.sk-staff-row-body` | Name + role column. |
| `.sk-staff-row-name` | Primary name line. |
| `.sk-staff-row-role` | Secondary role line. |
| `.sk-staff-row-arrow` | Trailing chevron; animates on row hover. |
| `.sk-avatar` | Circular initials / image holder in a staff row. |
| `.sk-pin-dots` | Row of PIN entry dots; `.shake` class for error feedback. |
| `.sk-pin-dot` | Single PIN dot (filled/empty states). |
| `.sk-pin-grid` | Numeric keypad grid container. |
| `.sk-pin-key` | Keypad digit / key button. |
| `.sk-pin-key--action` | Wider secondary actions (clear, back) on the keypad. |

### Navigation & choice
| Class | Description |
|-------|-------------|
| `.sk-choice-row` | Full-width button row: icon + title/sub + arrow (pathway-style options). |
| `.sk-choice-row-icon` | Leading icon tile. |
| `.sk-choice-row-body` | Title + subtitle stack. |
| `.sk-choice-row-title` | Primary label. |
| `.sk-choice-row-sub` | Secondary description. |
| `.sk-choice-row-arrow` | Trailing chevron. |
| `.sk-choice-row--primary` | Accent emphasis variant (stronger border/fill). |

### Steppers & onboarding
| Class | Description |
|-------|-------------|
| `.sk-stepper` | Horizontal step indicator (`is-active` / `is-complete` on steps). |
| `.sk-stepper-step` | One step column with connector line to the next. |
| `.sk-stepper-dot` | Numbered or check circle for the step state. |
| `.sk-stepper-label` | Caption under each dot. |
| `.sk-step-panel` | One wizard pane; use `.is-active` on the visible panel. |

### Modals
| Class | Description |
|-------|-------------|
| `.sk-backdrop` | Full-screen scrim; defines modal `--modal-*` tokens; wraps `.sk-modal`. |
| `.sk-modal-closing` | Apply on `.sk-backdrop` with `useModalClose` for exit animation (backdrop + card). |
| `.sk-modal` | Centered modal card (~420px). |
| `.sk-modal-wide` | Wider card (~480px) for dense forms. |
| `.sk-modal-eyebrow` | Uppercase label above the title. |
| `.sk-modal-title` | Main title block; special-case when containing `.changelog-header`. |
| `.sk-modal-body` | Body copy; centered; nested `.admin-error` gets spacing. |
| `.sk-modal-actions` | Vertical stack of full-width `.sk-btn` children. |
| `.sk-modal-form` | Form layout inside a wide modal (fields + `.sk-modal-actions`). |
| `.sk-modal--stack` | Column flex + scrollable body (e.g. long changelog content). |
| `.sk-modal--panel` | Panel pattern: header band + body (settings/history-style sheets as modal). |
| `.sk-modal--panel-scroll` | Adds max-height / overflow for scrollable panel modals. |
| `.sk-modal-panel-hd` | Panel header row (title area + actions). |
| `.sk-modal-panel-title` | Panel title treatment. |
| `.sk-modal-panel-body` | Scrollable panel main region. |
| `.sk-modal-title--start` | Left-align modal title (vs default centered). |
| `.sk-modal-title--about-inline` | Title variant when nested inside `.sk-modal-body` (about/changelog layout). |

### Alerts & feedback
Use **`.sk-alert-stack`** as a vertical wrapper when showing one or more messages; put **`.sk-error`** and/or **`.sk-success`** inside it (stack removes extra bottom margin on children).

| Class | Description |
|-------|-------------|
| `.sk-alert-stack` | Flex column gap for multiple inline alerts. |
| `.sk-error` | Danger inline alert (icon + copy, semantic danger colors, pop-in). |
| `.sk-success` | Success inline alert (same pattern, success tokens). |

There are **no** `sk-alert-info` / `sk-alert-warning` / etc. classes in `components.css`—use `.sk-error` or `.sk-success`, or compose with tokens.

### Empty & loading
| Class | Description |
|-------|-------------|
| `.sk-empty` | Centered empty-state container. |
| `.sk-empty-icon` | Icon scale/color for empty state. |
| `.sk-empty-title` | Empty state heading. |
| `.sk-empty-text` | Empty state description. |
| `.sk-skeleton` | Shimmer block placeholder. |
| `.sk-skeleton-row` | Row of skeleton blocks. |
| `.sk-skeleton-row--horizontal` | Horizontal arrangement of skeleton cells. |
| `.sk-skeleton-row--stagger` | Offsets shimmer timing per child for a wave effect. |

### Progress
| Class | Description |
|-------|-------------|
| `.sk-progress` | Track + fill progress bar. |

### Tooltips
Use **`[data-tooltip]`** on any element; optional **`data-tooltip-pos="left"`** or **`right`**. Styled in `components.css`; hovers only when `html.is-pointer` (fine pointer).

### Scene placeholder (loading)
| Class | Description |
|-------|-------------|
| `.sk-scene` | Minimal shell around `.sk-card` placeholders during initial load. |
| `.sk-footer-ph` | Footer-height placeholder bar paired with the scene. |

Initial HTML may use **`.sk-row-inline`** skeleton bars; those live in **`critical.css`**, not `components.css`.

---

## Planned / Not Yet Implemented

These names are **not** defined in `components.css` today. Kept for roadmap / search; do not assume they exist when building UI.

- **Badges:** `sk-badge`, `sk-badge-default`, `sk-badge-accent`, `sk-badge-success`, `sk-badge-danger`, `sk-badge-warning`
- **Cards / metrics:** `sk-card-glass`, `sk-stat`, `sk-stat-row`
- **Forms (extra):** `sk-input-glass`, `sk-input-sm`, `sk-input-lg`, `sk-select`, `sk-textarea`, `sk-toggle`, `sk-toggle-thumb`, `sk-checkbox`
- **Layout / admin shell:** `sk-page`, `sk-dash`, `sk-dash-topbar`, `sk-dash-nav`, `sk-dash-content`, `sk-panel`, `sk-section`
- **Tables & lists:** `sk-table-wrap`, `sk-table`, `sk-row`
- **Overlays:** `sk-sheet` (bottom drawer)
- **Chrome:** `sk-toast`, `sk-spinner`, `sk-divider`, `sk-dot`, `sk-skip`
- **Alerts (legacy names):** `sk-alert-info`, `sk-alert-success`, `sk-alert-warning`, `sk-alert-danger`
- **Buttons:** `sk-btn-pill`

---


## Theme Switching

The system uses `html[data-theme='light']` attribute selector.

**How it works:**
1. `tokens.css` defines `:root` (dark) and `html[data-theme='light']` overrides.
2. Components reference tokens — they never hardcode colors.
3. Theme toggle calls `document.documentElement.setAttribute('data-theme', theme)`.
4. Adding class `thm` to `<html>` briefly enables CSS transitions for a smooth crossfade.

**Light theme test:** Every new component MUST look correct in both themes. If you add a surface, border, or text color — verify it uses a token.

---

## Do / Don't Rules

### DO
- ✅ Reference tokens for ALL colors, spacing, radii, shadows
- ✅ Use `sk-` prefix for all new component classes
- ✅ Use semantic tokens (`--s-raised`, `--t-primary`) not primitives (`--c-gray-800`)
- ✅ Support both themes — use tokens and verify in light mode
- ✅ Use `var(--size-touch)` (44px) as minimum touch target
- ✅ Use `var(--ease-bounce)` for interactive micro-animations
- ✅ Use `font-variant-numeric: tabular-nums` for monetary values
- ✅ Add `touch-action: manipulation` on buttons
- ✅ Test at 320px, 768px, and 1200px widths

### DON'T
- ❌ Hardcode hex colors in component styles
- ❌ Write one-off styles — if it exists once, it should be a component
- ❌ Use Tailwind or utility-class frameworks
- ❌ Use `!important` (exceptions: reduced-motion, theme transitions)
- ❌ Use `px` for spacing outside of token definitions
- ❌ Create light theme overrides with `html[data-theme='light'] .my-thing` — instead use tokens that already adapt
- ❌ Delete the backward-compat aliases in tokens.css until full migration is complete
- ❌ Use `z-index` values directly — always reference `--z-*` tokens
- ❌ Mix `rem` and `px` — the system uses `px` throughout for precision

---

## Backward Compatibility

`tokens.css` includes a backward-compat alias block that maps old token names to new ones:

```css
--bg0: var(--s-base);
--bg1: var(--s-raised);
--bd:  var(--b-default);
--t0:  var(--t-primary);
--brand: var(--accent);
/* etc. */
```

This allows incremental migration. Old styles keep working. Remove aliases once all files are migrated.

---

## Adding a New Component

1. Define it in `src/styles/components.css` under the appropriate section
2. Use only token references for visual properties
3. Prefix class with `sk-`
4. Add both dark and light states (should be automatic if using tokens)
5. Add hover / active / disabled / focus states
6. Document it in this file
7. Test in browser preview at mobile + desktop widths, both themes
