# Brand Theme Design

**Date:** 2026-05-21
**Status:** Approved

## Overview

Apply the AdSoLve brand identity consistently across the evaluation platform. The approach is a **brand shell**: a compact dark header on every page, consistent typography and accent colours in white content areas. The landing page keeps its full dark-hero treatment; interior pages (Use Cases, Tasks, Dashboard) get the slim header only.

## Design Decisions

### Header

A 40px dark strip pinned to the top of every page.

| Property | Value |
|---|---|
| Background | `#151515` |
| Height | `40px` |
| Bottom border | `2px solid #ffc451` |
| Logo | `AdSoLve.svg` inline SVG, white paths, `height: 16px` |
| Separator | `1px` vertical rule, `rgba(255,255,255,0.2)`, `16px` tall |
| Label | "Evaluation Platform" — Open Sans, `0.6rem`, weight 600, `letter-spacing: 0.2em`, uppercase, `rgba(255,255,255,0.38)` |
| Padding | `0 1.5rem` horizontal |

No navigation links — breadcrumbs handle in-app navigation.

### Colour Palette

| Role | Colour | Notes |
|---|---|---|
| Page background | `#fff` | Content areas |
| Heading text | `#151515` | Page titles, card titles |
| Body text | `#444` | Paragraphs, descriptions |
| Muted text | `#888` / `#aaa` | Subtitles, breadcrumb base |
| Accent — decorative | `#ffc451` | Borders, button fills, tag backgrounds, header border |
| Accent — text on white | `#9a6f00` | Section labels, breadcrumb active item, card tags (passes WCAG AA ~5.8:1) |
| Dark hero background | `#151515` | Landing page only |

### Typography

| Use | Font | Size | Weight |
|---|---|---|---|
| Page titles | Poppins | `1.6rem` | 700 |
| Hero headline | Poppins | `2.9rem` | 700 |
| Section labels | Raleway | `0.68rem` | 700, uppercase, `letter-spacing: 0.18em` |
| Card titles | Raleway | `0.95rem` | 700 |
| Buttons | Raleway | `0.92rem` | 700 |
| Body / descriptions | Open Sans | `0.82–0.88rem` | 400 |
| Breadcrumbs | Open Sans | `0.75rem` | 400 / 600 active |

### Section Labels

Used in content areas to introduce groups of content.

```css
font-family: Raleway; font-size: 0.68rem; font-weight: 700;
letter-spacing: 0.18em; text-transform: uppercase;
color: #9a6f00; padding-left: 0.75rem; border-left: 3px solid #ffc451;
```

### Cards

Used on Use Cases and Tasks pages.

- Border: `1px solid #e8e8e8`, border-radius `6px`
- Hover: `border-color: #ffc451`, `box-shadow: 0 2px 12px rgba(255,196,81,0.15)`
- Tag: `background: rgba(255,196,81,0.12)`, text `#9a6f00`

### Breadcrumbs

- Base colour: `#bbb`
- Active/current item: `#9a6f00`, weight 600
- Separator: ` / `

### Landing Page

Keeps the full dark-hero layout from `landing-brand-v6.html`:

- Full-width `#151515` hero with radial gold glow, centred logo, headline, subtitle, two CTA buttons
- Four pillar cards below hero (still dark background)
- White body section with "Why AdSoLve" features list

## SVG Logo Fix

The `AdSoLve.svg` source file needs `fill-rule="evenodd"` applied to the `d` and `e` paths so their counter areas (enclosed white space) are transparent rather than filled. The `o` already works correctly.

**`e` path** — combine outer shape + counter subpath in one element:
```svg
<path fill-rule="evenodd" d="
  M1459.81 203 … 1459.81 203Z
  M1379.66 145.25H1467.86C1465.41 133.7 1453.86 112 1423.76 112C1393.66 112 1382.11 133.7 1379.66 145.25Z
"/>
```

**`d` path** — combine outer shape + counter subpath in one element:
```svg
<path fill-rule="evenodd" d="
  M485.384 4.9 … 485.384Z
  M332.084 165.9 … 332.084 165.9Z
"/>
```

## Components to Create / Update

| Component / File | Change |
|---|---|
| `src/components/AppHeader.jsx` | New — slim 40px dark header with inline SVG logo |
| `src/App.jsx` (or root layout) | Render `<AppHeader>` above all routes |
| `src/pages/home.jsx` | Implement landing page from `landing-brand-v6.html` |
| `src/index.css` (or global styles) | Add Google Fonts import; define CSS custom properties for brand colours |
| `public/AdSoLve.svg` | Apply `fill-rule="evenodd"` fix to `d` and `e` paths |
| Existing pages (useCases, tasks, dashboard) | Update section labels, breadcrumb colours, card hover styles to match palette |

## Out of Scope

- Dark mode for interior pages
- Responsive / mobile layout changes
- Changes to chart or table components beyond colour tokens
