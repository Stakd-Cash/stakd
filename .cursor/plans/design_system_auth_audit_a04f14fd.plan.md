---
name: Design system auth audit
overview: Read-only audit of [DESIGN-SYSTEM.md](c:/Users/asdae/Documents/stakd/DESIGN-SYSTEM.md) against [tokens.css](c:/Users/asdae/Documents/stakd/src/styles/tokens.css) and [components.css](c:/Users/asdae/Documents/stakd/src/styles/components.css), plus auth component class mapping. Plan mode blocks applying edits; after you approve, implementation is limited to `tokens.css` and `components.css` only.
todos: []
isProject: false
---

# Design system audit (tokens, sk- classes, auth patterns)

## 1. Token reconciliation (`DESIGN-SYSTEM.md` vs `[src/styles/tokens.css](c:/Users/asdae/Documents/stakd/src/styles/tokens.css)`)

All tokens named in the doc’s **semantic tables and lists** are **defined** in `tokens.css` on `:root` (dark) with `html[data-theme='light']` overrides where applicable: `--s-*`, `--b-*`, `--t-*`, `--accent*`, `--status-*`, `--font-*`, `--text-xs`…`--text-5xl`, `--sp-*`, `--r-*`, `--sh-*`, `--z-*`, `--dur-*`, `--ease-*`, `--glass-*`, `--size-touch`, and backward-compat aliases (`--bg0`, etc.).


| Token / area                                                         | Status                    | Notes                                                           |
| -------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------- |
| `--s-base`, `--s-raised`, `--s-overlay`, `--s-backdrop`              | **EXISTS, matches doc**   | Dark/light values match doc tables.                             |
| `--s-inset`                                                          | **EXISTS, value differs** | Doc dark `#3c3c3c`; file `#2e2e2e`. Light `#d4d4d4` matches.    |
| `--b-*`, `--t-*`, `--accent*`, `--status-*`                          | **EXISTS, matches doc**   | `--t-link` resolves to brand primitives as described.           |
| Typography scale, spacing, radii, shadows, z-index, motion           | **EXISTS, matches doc**   | e.g. `--text-5xl` = 46px, `--r-xs` = 4px, `--z-tooltip` = 1000. |
| Glass `--glass-bg`, `--glass-bg-s`, `--glass-border`, `--glass-blur` | **EXISTS**                | Matches doc.                                                    |
| Doc rule `--size-touch`                                              | **EXISTS**                | 44px in tokens.                                                 |


**MISSING (doc names a token that is not defined):** **none** for the main semantic scale.

**Auth-specific bridges already in tokens (not in the short doc tables but used by auth CSS):** `--login-*` (`.login-page`), `--pw-*` (`:root`), `--ad-*`, `--kiosk-*`, `.modal-backdrop` vars — all present in `[tokens.css](c:/Users/asdae/Documents/stakd/src/styles/tokens.css)` (lines ~216–384). Login/Pathway/PinPad already `@import` tokens and use these.

**Optional token work after approval (only if you want sk-auth to avoid literals):** Introduce 1–2 **scoped or semantic** variables for repeated auth literals from `[LoginPage.css](c:/Users/asdae/Documents/stakd/src/components/admin/LoginPage.css)` / `[PathwayPage.css](c:/Users/asdae/Documents/stakd/src/components/admin/PathwayPage.css)` / `[PinPad.css](c:/Users/asdae/Documents/stakd/src/components/admin/PinPad.css)` (e.g. field fill `rgba(255,255,255,0.04)`, card shadow `0 8px 24px rgba(0,0,0,0.12)`), **or** express those via existing tokens (`--sh-md`, `--b-subtle`, `color-mix`) where visually equivalent. Strict doc reconciliation does **not** require new names; your prompt’s “clearly needed” line is satisfied by existing `--login-*` / `--pw-*` for theme-correct auth surfaces.

**Screenshots:** Not available in-repo; values should be taken from the existing `login-*` / `pathway-*` / `pinpad-*` CSS (cited above), not invented.

---

## 2. `sk-` classes in doc vs `[src/styles/components.css](c:/Users/asdae/Documents/stakd/src/styles/components.css)`

`components.css` today only defines a **small subset** of documented kit: scene/footer placeholders, button variants (except `**.sk-btn-pill`**), `**.sk-card` / header / body**, `**.sk-backdrop` / `.sk-modal` / `.sk-modal-wide`**, `**.sk-input`**, tooltip `[data-tooltip]`, `**.sk-progress**`, `**.sk-empty**` (+ icon/title/text). It also defines `**.sk-scene**`, `**.sk-footer-ph**`, `**.sk-row-inline**` (referenced in skeleton/light overrides) — **not** listed in `DESIGN-SYSTEM.md`.

Everything else in the doc’s component tables is **MISSING** from `components.css`, including: `**.sk-page`, `.sk-dash*`, `.sk-page-full`, `.sk-panel`, `.sk-section`**, all form kit beyond `.sk-input`, modal title/body/actions/`**.sk-sheet`**, all **badges**, **tables**, `**.sk-row`, `.sk-toast`, `.sk-alert-*`, `.sk-skeleton`, `.sk-spinner`, `.sk-divider`, `.sk-avatar`, `.sk-dot`, `.sk-skip`**, `**.sk-card-glass`, `.sk-stat`, `.sk-stat-row`**, `**.sk-btn-pill**`.

`tokens.css` references `**.sk-surface`, `.sk-topbar`, `.sk-footer`, `.sk-heading`, `.sk-label`, `.sk-text**` in the theme transition block — those classes are **not** defined in `components.css` (gap).

### Hardcoded colors in **existing** `sk-` rules (swap to tokens after approval)


| Location                                                   | Current                     | Suggested replacement (preserve look)                                                                                                                                     |
| ---------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.sk-btn-secondary:hover`                                  | `rgba(120, 120, 128, 0.12)` | Add semantic token e.g. `--control-hover-bg` in `tokens.css` (same RGBA) and use `var(--control-hover-bg)` — satisfies “no raw rgba in components” without visual change. |
| `.sk-btn-ghost:hover`                                      | same                        | same                                                                                                                                                                      |
| `.sk-btn-danger`                                           | `#fff`                      | `var(--c-white)` or new `--t-on-strong` if you want to avoid primitives per doc                                                                                           |
| `html[data-theme='light'] .sk-scene .sk-row-inline::after` | `rgba(0, 0, 0, 0.04)`       | Optional: `--skeleton-shimmer-mid` on `:root` / light, or `color-mix(in srgb, var(--t-primary) 4%, transparent)` — verify contrast                                        |
| `html[data-theme='light'] .sk-footer-ph .sk::after`        | same                        | same                                                                                                                                                                      |


Note: `[data-tooltip]::after` already uses tokens.

---

## 3. Auth screen patterns (JSX classnames → intended `sk-` kit)


| Component                                                                                    | Current classes / inline styles                                                                                                                                                                                                                                                           | Should map toward (per doc + your priority list)                                                                                                                                                                                                                                                                                                                                               | `components.css` today                                                                       |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `**[LoginPage.jsx](c:/Users/asdae/Documents/stakd/src/components/admin/LoginPage.jsx)`**     | Root `login-page stakd-pattern-bg`; **fixed** back `login-back-btn`; `login-container`; `login-brand` / `login-brand-name` (logo); `login-card`; `login-card-header`; `login-eyebrow`, `login-title`, `login-subtitle`; form/fields `login-field`, inputs unclassed; `login-submit`, etc. | `**sk-page-full`** (or page shell) + `**sk-auth-card`** + `**sk-auth-logo**` + `**sk-company-label**` (signup eyebrow differs — may stay step label) + `**sk-auth-heading**` / `**sk-auth-subtext**` + `**sk-back-btn**` (login positions fixed — modifier or wrapper); inputs → `**sk-input**` / `**sk-search-input**` where applicable; primary CTA → `**sk-btn sk-btn-primary sk-btn-lg**`. | Missing: all priority auth classes; partial: buttons/inputs exist but not composed for auth. |
| `**[PathwayPage.jsx](c:/Users/asdae/Documents/stakd/src/components/admin/PathwayPage.jsx)**` | `pathway-page stakd-pattern-bg`; `pathway-container`; `pathway-brand`; `pathway-card`; `pathway-card-header`; `pathway-eyebrow`, `pathway-title`, `pathway-subtitle`; `pathway-option*` (not staff row); `pathway-submit`; `pathway-back-btn` N/A on main pathway                         | Same layout kit as login: `**sk-page-full**`, `**sk-auth-card**`, `**sk-auth-logo**`, `**sk-company-label**` (eyebrow = company name), `**sk-auth-heading**`, `**sk-auth-subtext**`. Options are **not** covered by your priority list — keep pathway-option* or add `**sk-choice-row`** later.                                                                                                | Same gaps.                                                                                   |
| `**[PinPad.jsx](c:/Users/asdae/Documents/stakd/src/components/admin/PinPad.jsx)`**           | `pathway-page` variants; `pathway-back-btn`; `pinpad-search` + raw `<input>`; `pinpad-staff-btn`, `pinpad-staff-avatar`, etc.; `pin-dots` / `pin-dot`; `pinpad-key`; inline `style={{ gap: '10px' }}` on skeleton                                                                         | `**sk-back-btn**`, `**sk-search-input**`, `**sk-staff-row**` (+ inner `**sk-avatar**`), `**sk-pin-dots**` / `**sk-pin-dot**` (or wrapper + child), `**sk-pin-key**`; skeleton could use `**sk-skeleton**` (missing globally).                                                                                                                                                                  | All priority PIN/staff/search classes **missing**.                                           |
| `**[KioskBanner.jsx](c:/Users/asdae/Documents/stakd/src/components/admin/KioskBanner.jsx)`** | `kiosk-banner`, `kiosk-banner-left`, `kiosk-banner-name`, `kiosk-banner-timer`, `kiosk-banner-btn`                                                                                                                                                                                        | Not in your priority list; styles live in `[src/styles/admin.css](c:/Users/asdae/Documents/stakd/src/styles/admin.css)` (~1897+). No `sk-` migration required for “auth screens” unless you extend scope.                                                                                                                                                                                      | N/A for `components.css` auth kit.                                                           |


**Inline styles:** PinPad skeleton only — should disappear when JSX is migrated (out of scope for this pass).

---

## 4. New `sk-` classes to add (grounded in existing auth CSS)

Implement **after approval**, in `[components.css](c:/Users/asdae/Documents/stakd/src/styles/components.css)`, using **tokens + `var(--login-*)` / `var(--pw-*)` / `var(--accent*)`** as appropriate so paths/login/pinpad can each adopt the same class names with **scope classes** on ancestors (`.login-page` vs `.pathway-page`) already setting `--login-*` vs `--pw-*`.

Suggested definitions (mirror values from the CSS files above):

- `**sk-page-full`**: `position: fixed; inset: 0; min-height: 100dvh;` flex centering, padding `24px 16px`, `z-index` → `**var(--z-header)`** or new `--z-auth-page` if you want a crisp rule (current login/pathway use `50` — doc says avoid raw z-index; add `**--z-auth: 50**` in `tokens.css` if needed).
- `**sk-auth-card**`: width 100%, max-width 420px, gradient + border + `**var(--r-2xl)**` (24px), padding ~`36–44px`/`32–40px`, shadow matching` 0 8px 24px rgba(0,0,0,0.12)`(tokenize via`--sh-*`or new`--sh-auth-card` if no match).
- `**sk-auth-logo` / `sk-auth-heading` / `sk-auth-subtext` / `sk-company-label**`: match `.login-brand-name`, `.login-eyebrow`, `.login-title`, `.login-subtitle` (use `--font-display`, `--tracking-caps`, `clamp` sizes, `var(--login-copy)` / `var(--pw-copy)` via inheritance or explicit vars).
- `**sk-back-btn**`: match `.pathway-back-btn` (pill-ish rectangle `**var(--r-md)**`); add modifier `**sk-back-btn--fixed**` for login’s top-left if needed.
- `**sk-staff-row**`: flex row, min-height ~64px, borders like `.pinpad-staff-btn`.
- `**sk-avatar**`: 40px square, `**var(--r-md)**`, `background: var(--accent-soft)`, `color: var(--accent)` (or pw/login scoped vars).
- `**sk-pin-key**`: aspect-ratio and states from `.pinpad-key` + `.pinpad-key-action`.
- `**sk-pin-dots` / `sk-pin-dot**`: from `.pin-dots` / `.pin-dot` (keep shake as `.sk-pin-dots.shake` or data-attr).
- `**sk-search-input**`: wrapper + icon + input rules from `.pinpad-search`.

Light-theme overrides should mirror the blocks in **PathwayPage.css** / **PinPad.css** (`html[data-theme='light']` …).

---

## 5. Summary tables (post-implementation checklist)

After you allow edits, the **final message** you asked for should read like this (filled in with actual diffs):


| Category              | Content                                                                                                                                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tokens added**      | e.g. `--control-hover-bg`, optional `--z-auth`, optional `--sh-auth-card`, optional `--s-inset` alignment **or** doc-only fix for `--s-inset`                                                                   |
| `**sk-` added/fixed** | New: `sk-page-full`, `sk-auth-`*, `sk-back-btn`, `sk-staff-row`, `sk-avatar`, `sk-pin-`*, `sk-search-input`; fixed: hover rgba + danger `#fff` in existing buttons                                              |
| **Ready to convert**  | None until JSX imports `components.css` and swaps class names; after classes exist, **PathwayPage** (simplest), then **LoginPage** (more variants), then **PinPad** (depends on staff + PIN classes + skeleton) |
| **Not ready**         | **PinPad** until `sk-skeleton` / staff row / pin / search exist and optional inline gap removed; **LoginPage** until signup/progress/plan rows have kit or keep legacy classes; **KioskBanner** out of scope    |


---

## Constraint recap

- **Do not** touch `[styles.css](c:/Users/asdae/Documents/stakd/styles.css)`, `[app.jsx](c:/Users/asdae/Documents/stakd/app.jsx)`, landing, or **any component files** in this pass.
- **Only** `[src/styles/tokens.css](c:/Users/asdae/Documents/stakd/src/styles/tokens.css)` and `[src/styles/components.css](c:/Users/asdae/Documents/stakd/src/styles/components.css)` once you exit plan mode and confirm.

```mermaid
flowchart LR
  subgraph doc [DESIGN_SYSTEM.md]
    T[Tokens tables]
    S[sk- tables]
  end
  subgraph files [Current files]
    tokens[tokens.css]
    comp[components.css]
    loginCSS[LoginPage.css]
    pathCSS[PathwayPage.css]
    pinCSS[PinPad.css]
  end
  T --> tokens
  S --> comp
  comp -.->|large 
```



