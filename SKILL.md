# stakd Design System — SKILL Reference

> For AI sessions, collaborators, and future contributors.  
> Single source of truth for building UI in the stakd codebase.

---

## File Structure

| File | Purpose |
|------|---------|
| `src/styles/tokens.css` | All design tokens (colors, typography, spacing, radii, shadows, z-index, motion, layout). Dark + light themes. |
| `src/styles/components.css` | All reusable component classes. Reset, typography, buttons, cards, modals, forms, badges, tables, layouts, skeletons, tooltips. |
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

**Prefix:** `sk-` (stakd kit)

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
| `.sk-btn-pill` | Pill-shaped filter button |

**Usage:**
```html
<button class="sk-btn sk-btn-primary">Save</button>
<button class="sk-btn sk-btn-danger sk-btn-sm">Delete</button>
<button class="sk-btn sk-btn-icon"><i class="fa-solid fa-gear"></i></button>
<button class="sk-btn-pill active">Today</button>
```

### Cards
| Class | Description |
|-------|-------------|
| `.sk-card` | Standard card (raised surface) |
| `.sk-card-header` | Card header bar |
| `.sk-card-body` | Card content area |
| `.sk-card-glass` | Translucent glass card |
| `.sk-stat` | Stat metric card |
| `.sk-stat-row` | Grid of stat cards |

### Forms
| Class | Description |
|-------|-------------|
| `.sk-input` | Standard text input |
| `.sk-input-glass` | Translucent input |
| `.sk-input-sm` / `.sk-input-lg` | Size variants |
| `.sk-select` | Native select with custom chevron |
| `.sk-textarea` | Multi-line input |
| `.sk-field` | Field wrapper (label + input) |
| `.sk-toggle` + `.sk-toggle-thumb` | Toggle switch |
| `.sk-checkbox` | Styled checkbox |

### Modals
| Class | Description |
|-------|-------------|
| `.sk-backdrop` | Full-screen overlay |
| `.sk-modal` | Modal card |
| `.sk-modal-title` | Heading |
| `.sk-modal-body` | Description text |
| `.sk-modal-actions` | Button stack |
| `.sk-sheet` | Bottom drawer |

### Layout
| Class | Description |
|-------|-------------|
| `.sk-page` | Cashier content area (centered, max 640px) |
| `.sk-dash` | Dashboard wrapper (full viewport) |
| `.sk-dash-topbar` | Full-width sticky header |
| `.sk-dash-nav` | Full-width tab bar |
| `.sk-dash-content` | Centered content (max 1120px) |
| `.sk-page-full` | Full-viewport centered page (login, pathway) |
| `.sk-panel` | Sub-panel with header/actions |
| `.sk-section` | Collapsible section |

### Badges
| Class | Description |
|-------|-------------|
| `.sk-badge` | Base |
| `.sk-badge-default` | Neutral |
| `.sk-badge-accent` | Coral |
| `.sk-badge-success` | Green |
| `.sk-badge-danger` | Red |
| `.sk-badge-warning` | Yellow |

### Tables
| Class | Description |
|-------|-------------|
| `.sk-table-wrap` | Container with glass bg |
| `.sk-table` | The table element |
| Standard `th` / `td` | Auto-styled |

### Other
| Class | Description |
|-------|-------------|
| `.sk-row` | List row |
| `.sk-toast` | Toast notification |
| `.sk-alert-{info,success,warning,danger}` | Inline alert |
| `.sk-skeleton` | Loading placeholder |
| `.sk-spinner` | Loading spinner |
| `.sk-divider` | Horizontal rule |
| `.sk-avatar` | User avatar |
| `.sk-progress` | Progress bar |
| `.sk-empty` | Empty state |
| `.sk-dot` | Status dot |
| `.sk-skip` | Skip-to-content link |

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
