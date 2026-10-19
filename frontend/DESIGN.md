# SpectraSource design system: "Signal on Ink"

Tokens live in `src/theme.css` (Tailwind v4, `@theme inline`). Light is the default; `.dark` on `<html>` switches every token.
Contrast was checked with a WCAG 2.x script (85 text and UI pairs per theme, all passing; it lives outside the repo at `/tmp/claude-0/designer/contrast.mjs`).

## Palette rationale
- **Ink navy** (`ink`, dark `canvas`): a night-shift SOC console and the Ashoka Chakra navy. It carries authority without the harshness of black.
- **Petrol-teal signal** (`brand`): the "live / all-clear" colour of operations dashboards. It is clearly not SaaS purple, and it sits apart from LinkedIn blue (255°) and status green (153°) at OKLCH 205°.
- **Saffron** (`accent`): a restrained national highlight, used once per view (the logo stroke, a featured mark, the active-scene ring). With green `ok` on white surfaces it nods to the tricolour without turning into a flag.
- **Cool blue-grey neutrals** (hue around 250°): surfaces read as paper in light mode and as console glass in dark mode.
- **Status follows TLP habits**: red `bad`, amber `warn`, green `ok`. `warn` (78°) is yellower than `accent` (57°), so the two never read as the same colour.
- **Format hues** are spread around the wheel and skip 265–315° (indigo and violet) on purpose.
- **Signature canvas**: a fixed 32px survey grid at about 5% ink, with a faint teal glow at the top that fades down the page (`body::before`). Keep the React root transparent: putting `bg-canvas` on a full-page wrapper hides the grid. Use `bg-grid` for preview stages.

## Tokens and contrast (worst case over the listed backgrounds)
| Token | Light | Dark | Measured on | Light | Dark |
|---|---|---|---|---|---|
| `canvas` | `#F3F6F9` | `#0A111D` | ink on it | 15.98 | 16.05 |
| `surface` | `#FFFFFF` | `#101A2A` | ink on it | 17.33 | 14.82 |
| `surface-2` | `#EDF1F5` | `#162235` | ink on it | 15.27 | 13.57 |
| `surface-3` | `#E1E7EE` | `#1D2B41` | ink on it | 13.92 | 12.10 |
| `line` | `#D8DFE7` | `#24324A` | surface (decorative hairline) | 1.34 | 1.35 |
| `line-strong` | `#7E8B9C` | `#5D6E88` | canvas, surface, surface-2 (≥3) | 3.05 | 3.08 |
| `ink` | `#0C1B2E` | `#E7EDF5` | every surface | 13.92 | 12.10 |
| `ink-muted` | `#3E4C5E` | `#A8B5C6` | every surface, brand-soft | 7.03 | 6.82 |
| `ink-subtle` | `#5B687A` | `#8796AA` | canvas (incl. grid line), surface, surface-2 | 4.73 | 5.31 |
| `brand` | `#007480` | `#2BC4CE` | surface, canvas (UI ≥3) | 5.08 | 8.22 |
| `on-brand` | `#FFFFFF` | `#04161C` | brand | 5.51 | 8.70 |
| `brand-strong` | `#005C66` | `#5DD6DD` | on-brand on it | 7.71 | 10.67 |
| `brand-soft` | `#E2F3F4` | `#0C2F38` | brand-ink on it | 5.86 | 7.99 |
| `brand-ink` | `#006670` | `#5FD3DB` | surfaces, brand-soft | 5.86 | 7.99 |
| `accent` | `#CF700B` | `#F5974A` | surface, accent-soft (graphic ≥3) | 3.13 | 6.70 |
| `accent-soft` / `accent-ink` | `#FDF0DE` / `#9C4A00` | `#36230F` / `#F8B27A` | ink on surface and soft | 5.51 | 8.29 |
| `on-accent` | `#0C1B2E` | `#0A111D` | accent and warn fills | 4.65 | 8.47 |
| `ok` / `ok-soft` / `ok-ink` | `#1A7F45` / `#E3F4E9` / `#166B39` | `#3DBE77` / `#0F2C1E` / `#5ED394` | solid (icon) · ink (text) | 4.41 · 5.75 | 6.31 · 8.02 |
| `warn` / `warn-soft` / `warn-ink` | `#B07A00` / `#FBF1D6` / `#7A5600` | `#EDB03C` / `#33280C` / `#F3C766` | solid (icon) · ink (text) | 3.31 · 5.91 | 7.50 · 9.09 |
| `bad` / `bad-soft` / `bad-ink` | `#C9302C` / `#FCE9E8` / `#A61F1B` | `#DA3633` / `#3A1518` / `#FF8A85` | solid (icon) · ink (text) | 4.56 · 6.34 | 3.50 · 7.10 |
| white text on `bad` | | | critical badge | 5.33 | 4.61 |
| `focus` | `#0A7480` | `#5CE1E6` | canvas, surface, surface-2 (≥3) | 4.84 | 10.17 |
| `::selection` | `#BDE6E9` | `#1B4B55` | ink on it | 12.92 | 8.16 |
| `fmt-video` / -soft / -ink | `#C52A38` / `#FCE9EB` / `#A81E2C` | `#F06A78` / `#3A1820` / `#FF8D98` | solid · ink | 4.61 · 6.23 | 5.02 · 7.15 |
| `fmt-linkedin` | `#0A66C2` / `#E5F0FB` / `#0A5CAE` | `#4C9BEA` / `#12294A` / `#7DB8F2` | solid · ink | 4.79 · 5.77 | 4.98 · 6.94 |
| `fmt-twitter` | `#3B4656` / `#EBEEF2` / `#2F3947` | `#9AA8BA` / `#1F2938` / `#C3CDDA` | solid · ink | 7.86 · 10.04 | 5.89 · 9.12 |
| `fmt-advisory` | `#A45404` / `#FCEFE2` / `#8C4600` | `#F29A3E` / `#3A2410` / `#F7B26B` | solid · ink | 4.60 · 6.21 | 6.50 · 8.01 |
| `fmt-infographic` | `#157A26` / `#E6F4E2` / `#0F6A20` | `#5BC46A` / `#11301A` / `#86D88F` | solid · ink | 4.62 · 5.93 | 6.46 · 8.37 |
| `fmt-executive_summary` | `#826705` / `#F7F1DA` / `#6B5500` | `#DCC254` / `#302A0C` / `#E8D27A` | solid · ink | 4.60 · 6.34 | 7.81 · 9.53 |
| `fmt-presentation` | `#BB2E7B` / `#FBE7F1` / `#A0226A` | `#EE6AAE` / `#3A1730` / `#F590C3` | solid · ink | 4.62 · 6.07 | 5.16 · 7.18 |

Each format solid is measured as text on `surface`, on `-soft` and on its own `/12` tint. Each `-ink` is measured on `surface` and `-soft`.

**Rules for text on fills.** On `brand`, use `on-brand`. On `accent` or `warn`, use `on-accent`. On `bad`, use `text-white`. An `ok` fill is for dots and icons only. The status solids are for icons, dots, bars and borders; status text uses `*-ink`, ideally on `*-soft`. `text-fmt-X` is safe on surface, `-soft` and `bg-fmt-X/12`. On `surface-2` or darker, use `text-fmt-X-ink`. For overlays use `bg-scrim`, never `bg-ink/40`, because ink turns light in dark mode. Hard-coded hexes belong only inside media frames that are always dark (video and slide stages). Do not use Tailwind's raw palette (`slate-*`, `indigo-*`).

**Contextual format colour.** Put `data-fmt={artifact.output_type}` on an element, then use `bg-fmt-soft`, `text-fmt-ink`, `border-fmt` and `bg-fmt/12` inside it. Without `data-fmt` these fall back to brand.

## Type
IBM Plex Sans Variable (wght 100–700, wdth 75–100), IBM Plex Mono 400/500, and IBM Plex Sans Devanagari 400/500/600, which covers Hindi and Marathi output. All are self-hosted through Fontsource and imported at the top of `theme.css`. `font-display` is Plex Sans at width 87.5 (semi-condensed): use it with `font-semibold` for h1–h3, slide titles and big numbers. Use `font-mono` for hashes, job IDs, timestamps, durations, character counts and code. Use `tabular-nums` for figures set in sans.

| Class | Size / line-height | Tracking | Use |
|---|---|---|---|
| `text-2xs` | 11 / 16 | +0.06em | uppercase overline and meta labels only |
| `text-xs` | 12 / 18 | +0.01em | captions, badges, timestamps |
| `text-sm` | 14 / 20 | 0 | default UI text (body default), inputs, buttons |
| `text-base` | 16 / 24 | 0 | reading text in previews |
| `text-lg` / `text-xl` | 18 / 28, 20 / 28 | −0.005em / −0.01em | card and panel titles |
| `text-2xl` / `text-3xl` | 24 / 32, 30 / 36 | −0.015em / −0.02em | section heading, page title |
| `text-4xl` / `text-5xl` | 36 / 40, 48 / 1.05 | −0.025em / −0.03em | hero, slide title |

Weights: 400 for body, 500 for labels and buttons, 600 for headings. Use 700 only for slide titles.

## Spacing rhythm (4px base)
- **Gaps:** `gap-1` icon to label in chips · `gap-1.5` in buttons · `gap-2` related controls · `gap-3` inside a card section · `gap-6` between cards and columns · `gap-8` or `py-8` between page sections.
- **Padding:** `p-4` cards on mobile · `p-5` cards on desktop · `px-3` controls and `px-4` primary buttons.
- **Heights:** `h-8` small controls, `h-9` default, `h-10` for inputs and the primary CTA.
- Stay on the scale: no arbitrary px values, and no 7, 9 or 11 steps for padding.

## Radius and elevation
- **Radius:** `rounded-xs` 3px (kbd, inline code) · `rounded-sm` 4px (badges, checkboxes) · `rounded-md` 6px (buttons, inputs) · `rounded-lg` 10px (cards, format tiles) · `rounded-xl` 14px (panels, dialogs, popovers) · `rounded-2xl` 20px (preview stages) · `rounded-full` (pills, dots). A nested radius equals the outer radius minus the padding.
- **Flat:** `border border-line` with no shadow. This is the default inside cards.
- **`shadow-card`** with `border-line`: cards on the canvas.
- **`shadow-pop`**: menus, popovers, dialogs, sticky bars.
- **`shadow-glow`**: only the primary CTA on hover, the selected format tile or an active drop zone, and at most one glowing element per view.
- In dark mode, show raised layers by stepping surfaces (`surface` → `surface-2` → `surface-3`) rather than with heavier shadows.

## Motion
- **Durations:** 120ms micro (hover, press, colour, toggles; this is the default for `transition`) · 200ms standard (`duration-200`: popovers, tab indicator, accordion, theme switch) · 320ms entrance (`duration-320` or `animate-rise-in`: results and cards appearing). Exits take about two thirds of the entrance time with `ease-exit`.
- **Easing:** `ease-out-quint` everywhere. `ease-spring` only for small confirmations (copy tick, toggle thumb), never for layout or large surfaces.
- **What animates:** only opacity, transform, colour and box-shadow. Never animate width, height, top or left, generated text, or font size, and never hijack scroll.
- **Looping:** `animate-scan` (beam on a progress track), `animate-signal` (ring behind a running dot) and `skeleton` are the only infinite animations, and only while a job runs. Stagger lists by 40ms or less per item, for at most 6 items.
- **Utilities:** `animate-fade-in`, `animate-rise-in`, `animate-scale-in`, `animate-scan`, `animate-signal`, `animate-shimmer`, `skeleton`. For a smooth theme toggle, add `theme-switching` to `<html>` for about 250ms.
- **Reduced motion:** CSS cuts every animation and transition to about 0ms. Wrap the app in `<MotionConfig reducedMotion="user">` for the `motion` library. Hide decorative beams with `motion-reduce:hidden`.

## Iconography
lucide-react stroke icons at `strokeWidth={1.75}`. The default size is 20px (`size-5`); use 16px (`size-4`) in dense rows and small buttons, 14px (`size-3.5`) next to `text-xs`, and 24px for empty states. Icons inherit `currentColor` from a `text-*` token. Mark decorative icons `aria-hidden`; icon-only buttons need an `aria-label` and a hit area of at least 32px. Do not use filled icons, emoji or brand logos (lucide v1 ships no brand glyphs).

## Output formats
| Format | Tokens | Hue (OKLCH) | Icon (lucide-react) |
|---|---|---|---|
| Video package | `fmt-video` | crimson 22° | `Clapperboard` (alt `MonitorPlay`) |
| LinkedIn post | `fmt-linkedin` | LinkedIn blue 255° | `BriefcaseBusiness` |
| Twitter/X thread | `fmt-twitter` | graphite (X is monochrome) | `MessagesSquare` (alt `AtSign`) |
| Advisory | `fmt-advisory` | burnt saffron 55°, accent family (flagship) | `ShieldAlert` |
| Infographic | `fmt-infographic` | India green 145° | `ChartPie` (alt `ChartColumnBig`) |
| Executive summary | `fmt-executive_summary` | brass 90° | `FileText` (alt `Landmark`) |
| Presentation | `fmt-presentation` | berry 352° | `Presentation` |

Use `bg-fmt-X/12 text-fmt-X` or `bg-fmt-X-soft text-fmt-X-ink` for chips, `bg-fmt-X` for bars and stripes, and `ring-fmt-X/40` for selection. Infographic green sits near `ok` green; the icon and label carry the meaning.
