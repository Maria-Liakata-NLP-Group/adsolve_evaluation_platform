# Brand Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the AdSoLve brand identity across the evaluation platform — slim dark header on interior pages, consistent typography and gold accent colours, and a redesigned landing page.

**Architecture:** A new `AppHeader` component renders on all routes except `/`. The home page gets a fully self-contained brand landing page. Interior pages (useCases, tasks, dashboard) adopt brand typography and gold accents via CSS custom properties defined in `index.css` and overrides in `style.scss`. No routing or data-fetching changes.

**Tech Stack:** React, Vite, Bulma (SCSS), Google Fonts (Poppins / Raleway / Open Sans)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `frontend/public/AdSoLve.svg` | Modify | Fix transparent counter holes in "d" and "e" |
| `frontend/src/index.css` | Modify | Google Fonts import, CSS custom properties, reset body defaults |
| `frontend/src/style.scss` | Modify | Remove old logo hack, add brand CSS overrides (header, cards, breadcrumbs, section labels) |
| `frontend/src/App.jsx` | Modify | Render `AppHeader` on interior routes; remove max-width wrapper for home route |
| `frontend/src/components/AppHeader.jsx` | Create | 40px dark brand header with inline SVG logo |
| `frontend/src/pages/home.jsx` | Rewrite | Full brand landing page (hero, pillars, features) |
| `frontend/src/pages/useCases.jsx` | Modify | Add section label, update page title typography |
| `frontend/src/pages/tasks.jsx` | Modify | Add section label, update page title typography |

---

## Task 1: Fix SVG logo counter transparency

**Files:**
- Modify: `frontend/public/AdSoLve.svg`

The "d" and "e" paths already contain both outer shape and counter subpath in a single `<path>` element. They just need `fill-rule="evenodd"` so the counter areas (enclosed twice) render as transparent holes.

- [ ] **Step 1: Add `fill-rule="evenodd"` to the "e" path**

In `frontend/public/AdSoLve.svg`, change the first `<path>` (the "e" — starts with `M1459.81`):

```svg
<path fill-rule="evenodd" d="M1459.81 203H1519.31C1509.86 224.7 1496.21 241.5 1479.76 252.7C1463.66 264.25 1444.41 270.2 1424.46 270.2C1368.81 270.2 1321.56 225.05 1321.56 167.3C1321.56 113.05 1364.26 63 1423.41 63C1482.56 63 1525.96 109.9 1525.96 169.05C1525.96 176.75 1525.26 179.9 1524.56 184.45H1378.96C1382.46 207.55 1401.71 221.2 1424.46 221.2C1442.31 221.2 1451.76 213.15 1459.81 203ZM1379.66 145.25H1467.86C1465.41 133.7 1453.86 112 1423.76 112C1393.66 112 1382.11 133.7 1379.66 145.25Z" fill="#B3B3B3"/>
```

- [ ] **Step 2: Add `fill-rule="evenodd"` to the "d" path**

Change the path that starts with `M485.384`:

```svg
<path fill-rule="evenodd" d="M485.384 4.9V263.9H430.084V242.9H429.384C424.484 250.95 410.484 270.2 371.284 270.2C312.484 270.2 273.984 224.7 273.984 166.25C273.984 100.45 320.884 63 370.234 63C404.534 63 420.984 79.8 427.284 86.1V4.9H485.384ZM332.084 165.9C332.084 196 353.434 215.95 380.734 215.95C417.134 215.95 430.434 186.2 430.434 165.9C430.434 142.45 413.634 117.25 381.434 117.25C347.834 117.25 332.084 143.5 332.084 165.9Z" fill="#B3B3B3"/>
```

- [ ] **Step 3: Verify in browser**

Open `frontend/public/AdSoLve.svg` directly in a browser. The counters inside "d" and "e" should be transparent (matching the "o" behaviour). The "o" path is already correct and should remain unchanged.

- [ ] **Step 4: Commit**

```bash
git add frontend/public/AdSoLve.svg
git commit -m "fix: apply fill-rule evenodd to SVG logo d and e paths"
```

---

## Task 2: CSS custom properties and font import

**Files:**
- Modify: `frontend/src/index.css`

Replace the entire file. The current file has dark-mode defaults and conflicting button/body styles that clash with Bulma and the brand theme.

- [ ] **Step 1: Replace `index.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&family=Raleway:wght@300;400;500;600;700&family=Poppins:wght@400;600;700;800&display=swap');

:root {
  --brand-dark: #151515;
  --brand-gold: #ffc451;
  --brand-gold-text: #9a6f00;
  --brand-body: #444444;
  --brand-muted: #888888;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  background: #ffffff;
  color: var(--brand-body);
  font-family: "Open Sans", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/index.css
git commit -m "style: add brand CSS custom properties and Google Fonts import"
```

---

## Task 3: Create AppHeader component

**Files:**
- Create: `frontend/src/components/AppHeader.jsx`

The header is 40px tall, dark background, with the AdSoLve inline SVG logo (white paths, yellow dot), a thin vertical separator, and the "Evaluation Platform" label. A 2px gold bottom border ties it to the brand.

- [ ] **Step 1: Create `AppHeader.jsx`**

```jsx
/** @format */

const AppHeader = () => (
  <header style={{
    background: "var(--brand-dark)",
    height: "40px",
    display: "flex",
    alignItems: "center",
    padding: "0 1.5rem",
    gap: "1rem",
    borderBottom: "2px solid var(--brand-gold)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  }}>
    <svg
      style={{ height: "16px", width: "auto", flexShrink: 0 }}
      viewBox="0 0 1526 271"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path fillRule="evenodd" fill="#ffffff" d="M1459.81 203H1519.31C1509.86 224.7 1496.21 241.5 1479.76 252.7C1463.66 264.25 1444.41 270.2 1424.46 270.2C1368.81 270.2 1321.56 225.05 1321.56 167.3C1321.56 113.05 1364.26 63 1423.41 63C1482.56 63 1525.96 109.9 1525.96 169.05C1525.96 176.75 1525.26 179.9 1524.56 184.45H1378.96C1382.46 207.55 1401.71 221.2 1424.46 221.2C1442.31 221.2 1451.76 213.15 1459.81 203ZM1379.66 145.25H1467.86C1465.41 133.7 1453.86 112 1423.76 112C1393.66 112 1382.11 133.7 1379.66 145.25Z"/>
      <path fill="#ffffff" d="M1312.02 69.65L1242.02 263.9H1186.37L1116.72 69.65H1176.92L1214.02 190.75H1214.72L1251.82 69.65H1312.02Z"/>
      <path fill="#ffffff" d="M965.409 263.9V4.9H1031.56V205.8H1108.21V263.9H965.409Z"/>
      <path fill="#ffffff" d="M719.004 166.6C719.004 119 752.954 63.35 823.654 63.35C894.354 63.35 928.304 119 928.304 166.6C928.304 214.2 894.354 269.85 823.654 269.85C752.954 269.85 719.004 214.2 719.004 166.6ZM777.104 166.6C777.104 196 798.454 215.6 823.654 215.6C848.854 215.6 870.204 194.95 870.204 166.6C870.204 138.25 848.854 117.6 823.654 117.6C798.454 117.6 777.104 138.25 777.104 166.6Z"/>
      <path fill="#ffffff" d="M696.869 80.5H631.419C630.019 71.75 627.919 55.3 607.619 55.3C596.069 55.3 584.869 63.35 584.869 75.6C584.869 91 591.869 94.15 638.419 115.15C686.719 136.85 698.969 159.25 698.969 189.35C698.969 227.15 677.269 268.8 608.669 268.8C533.769 268.8 515.219 219.8 515.219 186.55V178.15H581.019C581.019 208.25 599.569 213.5 607.969 213.5C623.719 213.5 633.169 200.55 633.169 188.65C633.169 171.5 622.319 167.3 582.419 150.5C564.219 143.15 519.069 124.95 519.069 76.3C519.069 27.65 566.319 0 609.719 0C635.269 0 662.919 9.44998 679.719 29.4C695.119 48.3 696.169 65.8 696.869 80.5Z"/>
      <path fillRule="evenodd" fill="#ffffff" d="M485.384 4.9V263.9H430.084V242.9H429.384C424.484 250.95 410.484 270.2 371.284 270.2C312.484 270.2 273.984 224.7 273.984 166.25C273.984 100.45 320.884 63 370.234 63C404.534 63 420.984 79.8 427.284 86.1V4.9H485.384ZM332.084 165.9C332.084 196 353.434 215.95 380.734 215.95C417.134 215.95 430.434 186.2 430.434 165.9C430.434 142.45 413.634 117.25 381.434 117.25C347.834 117.25 332.084 143.5 332.084 165.9Z"/>
      <circle cx="129.35" cy="227.4" r="40.5" fill="#ffc451"/>
      <path fill="#ffffff" d="M129.5 118.4L71.05 263.9H0L103.95 4.9H156.1L259 263.9H187.25L129.5 118.4Z"/>
    </svg>

    <div style={{ width: "1px", height: "16px", background: "rgba(255,255,255,0.2)", flexShrink: 0 }} />

    <span style={{
      fontFamily: '"Open Sans", sans-serif',
      fontSize: "0.6rem",
      fontWeight: 600,
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      color: "rgba(255,255,255,0.38)",
    }}>
      Evaluation Platform
    </span>
  </header>
);

export default AppHeader;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/AppHeader.jsx
git commit -m "feat: add AppHeader brand component"
```

---

## Task 4: Update App.jsx layout

**Files:**
- Modify: `frontend/src/App.jsx`

Show `AppHeader` on all routes except `/`. The home page manages its own full-width layout. Interior pages get a constrained max-width wrapper.

- [ ] **Step 1: Rewrite `App.jsx`**

```jsx
/** @format */

import { Routes, Route, useLocation } from "react-router-dom";
import AppHeader from "./components/AppHeader";
import Home from "./pages/home";
import Dashboard from "./pages/dashboard";
import UseCases from "./pages/useCases";
import Tasks from "./pages/tasks";
import IntrinsicMetrics from "./pages/intrinsicMetrics";
import CreateNew from "./pages/createNew";
import "./style.scss";

const App = () => {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <>
      {!isHome && <AppHeader />}
      <div style={!isHome ? { maxWidth: "1400px", margin: "0 auto", width: "100%", padding: "0 2rem" } : {}}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/intrinsic-metrics" element={<IntrinsicMetrics />} />
          <Route path="/use-cases" element={<UseCases />} />
          <Route path="/use-cases/:useCaseId" element={<Tasks />} />
          <Route path="/use-cases/:useCaseId/:pathId" element={<Dashboard />} />
          <Route path="/evaluation-script-builder" element={<CreateNew />} />
        </Routes>
      </div>
    </>
  );
};

export default App;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: add AppHeader to interior routes, fix layout wrapper"
```

---

## Task 5: Update style.scss brand overrides

**Files:**
- Modify: `frontend/src/style.scss`

Remove the old logo hack (`body::after`), remove the `body { padding: 2rem }` (now handled by App.jsx wrapper), and add brand CSS overrides for cards, breadcrumbs, and section labels.

- [ ] **Step 1: Replace `style.scss`**

```scss
@use "bulma/sass/utilities/mixins";
@use "bulma/sass/utilities/initial-variables" as iv;
@import "bulma/bulma";

html, body {
  max-width: 100vw;
  overflow-x: hidden;
}

/* ── Brand: section labels ──────────────────────────────────── */
.section-label {
  font-family: "Raleway", sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--brand-gold-text);
  margin-bottom: 1.25rem;
  padding-left: 0.75rem;
  border-left: 3px solid var(--brand-gold);
}

/* ── Brand: breadcrumb active item ──────────────────────────── */
.breadcrumb li.is-active a {
  color: var(--brand-gold-text) !important;
  font-weight: 600;
}

/* ── Brand: card hover (ContentSquare) ──────────────────────── */
.box.has-border {
  border-width: 1px;
  border-style: solid;
  border-color: #e8e8e8;
  border-radius: 6px;
  position: relative;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:hover {
    cursor: pointer;
    border-color: var(--brand-gold) !important;
    box-shadow: 0 2px 12px rgba(255, 196, 81, 0.2) !important;
    transform: none;
  }
}

/* ── Utility ────────────────────────────────────────────────── */
.is-square {
  width: 100%;
  aspect-ratio: 1 / 1;
}

.block {
  width: 100%;
  margin-bottom: 2rem;
}

.block:first-of-type {
  margin-top: 2rem;
}

.tag {
  white-space: wrap;
  height: auto;
  padding: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;

  &:hover {
    cursor: pointer;
  }

  &.is-loading {
    position: relative;
    pointer-events: none;

    &:after {
      @include mixins.loader;
      position: absolute;
      top: calc(50% - 0.5rem);
      left: calc(50% - 0.5rem);
      width: 1rem;
      height: 1rem;
      border-width: 0.25em;
    }
  }
}

.timeline-dot {
  position: absolute;
  width: var(--bulma-size-large);
  height: var(--bulma-size-large);
  border-radius: 50%;
  border: 1px solid black;
}

.timeline-dot:hover {
  cursor: pointer;
}

.tooltip {
  position: relative;
  display: inline-block;
  font-weight: bold;
  border-radius: 50%;
  border: 1px solid black;
  text-align: center;
  width: 2rem;
  height: 2rem;
  user-select: none;
}

.tooltiptext {
  visibility: hidden;
  width: 200px;
  background-color: black;
  color: #fff;
  text-align: center;
  border-radius: 6px;
  padding: 0.5rem;
  position: absolute;
  z-index: 1;
}

.tooltip:hover .tooltiptext {
  visibility: visible;
}
```

- [ ] **Step 2: Start the dev server and verify no Sass errors**

```bash
cd frontend && npm run dev
```

Expected: Server starts on http://localhost:5173 with no Sass compilation errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/style.scss
git commit -m "style: apply brand overrides, remove old logo hack"
```

---

## Task 6: Rewrite landing page (home.jsx)

**Files:**
- Modify: `frontend/src/pages/home.jsx`

Replace the Bulma-based landing page with the brand design from `landing-brand-v6.html`. The hero, pillars, and features sections are self-contained with inline styles so they work independently of Bulma.

- [ ] **Step 1: Rewrite `home.jsx`**

```jsx
/** @format */

import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: '"Open Sans", sans-serif', color: "#444", background: "#fff" }}>

      {/* Hero */}
      <div style={{
        background: "#151515",
        padding: "4rem 2rem 3.5rem",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 65% 40%, rgba(255,196,81,0.07) 0%, transparent 60%)",
          pointerEvents: "none",
        }} />

        <svg
          style={{ display: "block", margin: "0 auto 1.75rem", width: "260px", height: "auto" }}
          viewBox="0 0 1526 271"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path fillRule="evenodd" fill="#ffffff" d="M1459.81 203H1519.31C1509.86 224.7 1496.21 241.5 1479.76 252.7C1463.66 264.25 1444.41 270.2 1424.46 270.2C1368.81 270.2 1321.56 225.05 1321.56 167.3C1321.56 113.05 1364.26 63 1423.41 63C1482.56 63 1525.96 109.9 1525.96 169.05C1525.96 176.75 1525.26 179.9 1524.56 184.45H1378.96C1382.46 207.55 1401.71 221.2 1424.46 221.2C1442.31 221.2 1451.76 213.15 1459.81 203ZM1379.66 145.25H1467.86C1465.41 133.7 1453.86 112 1423.76 112C1393.66 112 1382.11 133.7 1379.66 145.25Z"/>
          <path fill="#ffffff" d="M1312.02 69.65L1242.02 263.9H1186.37L1116.72 69.65H1176.92L1214.02 190.75H1214.72L1251.82 69.65H1312.02Z"/>
          <path fill="#ffffff" d="M965.409 263.9V4.9H1031.56V205.8H1108.21V263.9H965.409Z"/>
          <path fill="#ffffff" d="M719.004 166.6C719.004 119 752.954 63.35 823.654 63.35C894.354 63.35 928.304 119 928.304 166.6C928.304 214.2 894.354 269.85 823.654 269.85C752.954 269.85 719.004 214.2 719.004 166.6ZM777.104 166.6C777.104 196 798.454 215.6 823.654 215.6C848.854 215.6 870.204 194.95 870.204 166.6C870.204 138.25 848.854 117.6 823.654 117.6C798.454 117.6 777.104 138.25 777.104 166.6Z"/>
          <path fill="#ffffff" d="M696.869 80.5H631.419C630.019 71.75 627.919 55.3 607.619 55.3C596.069 55.3 584.869 63.35 584.869 75.6C584.869 91 591.869 94.15 638.419 115.15C686.719 136.85 698.969 159.25 698.969 189.35C698.969 227.15 677.269 268.8 608.669 268.8C533.769 268.8 515.219 219.8 515.219 186.55V178.15H581.019C581.019 208.25 599.569 213.5 607.969 213.5C623.719 213.5 633.169 200.55 633.169 188.65C633.169 171.5 622.319 167.3 582.419 150.5C564.219 143.15 519.069 124.95 519.069 76.3C519.069 27.65 566.319 0 609.719 0C635.269 0 662.919 9.44998 679.719 29.4C695.119 48.3 696.169 65.8 696.869 80.5Z"/>
          <path fillRule="evenodd" fill="#ffffff" d="M485.384 4.9V263.9H430.084V242.9H429.384C424.484 250.95 410.484 270.2 371.284 270.2C312.484 270.2 273.984 224.7 273.984 166.25C273.984 100.45 320.884 63 370.234 63C404.534 63 420.984 79.8 427.284 86.1V4.9H485.384ZM332.084 165.9C332.084 196 353.434 215.95 380.734 215.95C417.134 215.95 430.434 186.2 430.434 165.9C430.434 142.45 413.634 117.25 381.434 117.25C347.834 117.25 332.084 143.5 332.084 165.9Z"/>
          <circle cx="129.35" cy="227.4" r="40.5" fill="#ffc451"/>
          <path fill="#ffffff" d="M129.5 118.4L71.05 263.9H0L103.95 4.9H156.1L259 263.9H187.25L129.5 118.4Z"/>
        </svg>

        <div style={{
          fontFamily: '"Open Sans", sans-serif',
          fontSize: "0.7rem", fontWeight: 600,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.38)", marginBottom: "1.25rem",
        }}>
          Evaluation Platform
        </div>

        <h1 style={{
          fontFamily: '"Poppins", sans-serif',
          fontSize: "2.9rem", fontWeight: 700, lineHeight: 1.15,
          color: "#fff", marginBottom: "1rem",
        }}>
          Trust the models you deploy<br />
          in <span style={{ color: "#ffc451" }}>high-stakes</span> domains
        </h1>

        <p style={{
          fontFamily: '"Raleway", sans-serif',
          fontSize: "1.05rem", fontWeight: 400,
          color: "rgba(255,255,255,0.72)",
          maxWidth: "560px", margin: "0 auto 2.5rem", lineHeight: 1.7,
        }}>
          The evidence you need to trust that the models you use are safe,
          reliable and fit for purpose in the real world.
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/use-cases")}
            style={{
              background: "#ffc451", color: "#151515", border: "none",
              padding: "0.8rem 2rem", borderRadius: "4px",
              fontFamily: '"Raleway", sans-serif', fontSize: "0.92rem", fontWeight: 700,
              cursor: "pointer", letterSpacing: "0.03em",
            }}
          >
            Explore Use Cases
          </button>
          <button
            onClick={() => navigate("/evaluation-script-builder")}
            style={{
              background: "transparent", color: "#fff", border: "2px solid #ffc451",
              padding: "0.8rem 2rem", borderRadius: "4px",
              fontFamily: '"Raleway", sans-serif', fontSize: "0.92rem", fontWeight: 700,
              cursor: "pointer", letterSpacing: "0.03em",
            }}
          >
            Evaluation Builder
          </button>
        </div>
      </div>

      {/* Pillars */}
      <div style={{
        background: "#151515",
        padding: "0 2rem 3rem",
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "1.25rem",
        maxWidth: "960px",
        margin: "0 auto",
      }}>
        {[
          { icon: "🎯", title: "Use-case specific", desc: "Evaluations tailored to your real-world context" },
          { icon: "🛡️", title: "Safety & reliability", desc: "Rigorous assessment of model performance" },
          { icon: "📊", title: "Transparent metrics", desc: "Clear, measurable criteria for decision-making" },
          { icon: "🔬", title: "Technical rigour", desc: "Built on innovative evaluation frameworks" },
        ].map(({ icon, title, desc }) => (
          <div key={title} style={{
            border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px",
            padding: "1.5rem 1.25rem", textAlign: "center",
          }}>
            <div style={{ fontSize: "1.6rem", marginBottom: "0.6rem" }}>{icon}</div>
            <h3 style={{
              fontFamily: '"Raleway", sans-serif', fontSize: "0.85rem", fontWeight: 700,
              color: "#fff", marginBottom: "0.3rem",
            }}>{title}</h3>
            <p style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* Why AdSoLve */}
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "4rem 2rem" }}>
        <div className="section-label">Why AdSoLve</div>
        {[
          {
            icon: "🏥",
            title: "Domain focus",
            desc: "Purpose-built for healthcare and legal domains, where generic benchmarks don't capture what matters for real-world use cases.",
          },
          {
            icon: "🤝",
            title: "Co-created with stakeholders",
            desc: "Developed through collaboration with people with lived experience, clinicians, lawyers, legal advice seekers, regulators, academics and industry partners.",
          },
          {
            icon: "⚖️",
            title: "Complements human evaluation",
            desc: "Technical evaluation designed to work alongside human, clinical, legal, and organisational evaluation processes.",
          },
        ].map(({ icon, title, desc }) => (
          <div key={title} style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", marginBottom: "2rem" }}>
            <div style={{
              width: "36px", height: "36px", background: "#ffc451", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, fontSize: "1rem",
            }}>{icon}</div>
            <div>
              <h4 style={{
                fontFamily: '"Raleway", sans-serif', fontSize: "0.8rem", fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase",
                color: "#151515", marginBottom: "0.35rem",
              }}>{title}</h4>
              <p style={{ fontSize: "0.88rem", color: "#666", lineHeight: 1.65 }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default Home;
```

- [ ] **Step 2: Open http://localhost:5173 and verify**

Check:
- Full-width dark hero with logo, headline, subtitle, two buttons
- Four pillar cards below the hero (still dark background)
- "Why AdSoLve" section with gold section label on white background
- No AppHeader on this page
- Clicking "Explore Use Cases" navigates to `/use-cases`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/home.jsx
git commit -m "feat: rewrite landing page with brand design"
```

---

## Task 7: Update Use Cases page

**Files:**
- Modify: `frontend/src/pages/useCases.jsx`

Add a section label and update the page title typography to match the brand.

- [ ] **Step 1: Update `useCases.jsx`**

```jsx
/** @format */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumbs from "../components/breadcrumbs";
import ContentSquare from "../components/contentSquare";
import { getUseCases } from "../api/config";

const UseCases = () => {
  const navigate = useNavigate();
  const [useCases, setUseCases] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    getUseCases()
      .then(setUseCases)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <Breadcrumbs />
      <h1 style={{ fontFamily: '"Poppins", sans-serif', fontSize: "1.6rem", fontWeight: 700, color: "#151515", margin: "1.5rem 0 0.25rem" }}>
        Use Cases
      </h1>
      <p style={{ fontFamily: '"Raleway", sans-serif', fontSize: "0.9rem", color: "#888", marginBottom: "1.75rem" }}>
        Select a use case to explore evaluations
      </p>
      <div className="section-label">Available use cases</div>
      <div className="fixed-grid has-4-cols has-2-cols-mobile">
        <div className="grid">
          {useCases.map((useCase) => (
            <ContentSquare
              key={useCase.id}
              content={
                <h1 className="title has-text-centered is-capitalized">
                  {useCase.label}
                </h1>
              }
              onClick={() => navigate(`/use-cases/${useCase.id}`, { state: { useCaseLabel: useCase.label } })}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default UseCases;
```

- [ ] **Step 2: Open http://localhost:5173/use-cases and verify**

Check:
- Slim dark AppHeader with logo at top
- Breadcrumb shows "Home / Use Cases" with "Use Cases" in gold (`#9a6f00`)
- Poppins page title "Use Cases"
- Gold section label "Available use cases"
- Card hover shows gold border (not the old lift-and-shadow)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/useCases.jsx
git commit -m "style: apply brand typography and section label to Use Cases page"
```

---

## Task 8: Update Tasks page

**Files:**
- Modify: `frontend/src/pages/tasks.jsx`

Same pattern as Use Cases — add section label and brand page title.

- [ ] **Step 1: Update `tasks.jsx`**

Replace the title and add section label. Keep all existing logic (useCaseLabel state, breadcrumbs, run mapping) unchanged:

```jsx
/** @format */

import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Breadcrumbs from "../components/breadcrumbs";
import ContentSquare from "../components/contentSquare";
import { getRuns } from "../api/runs";

const createCardContent = (title, description, taskLabel) => (
  <div>
    <h3 className="subtitle is-capitalized has-text-weight-semibold">{title}</h3>
    <p className="tag is-info is-light mb-2">{taskLabel}</p>
    {description && <p className="mt-2"><i>{description}</i></p>}
  </div>
);

const Tasks = () => {
  const { useCaseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [runs, setRuns] = useState([]);
  const [error, setError] = useState(null);
  const [useCaseLabel, setUseCaseLabel] = useState(location.state?.useCaseLabel ?? null);

  useEffect(() => {
    if (!useCaseId) return;
    getRuns(useCaseId)
      .then((data) => {
        setRuns(data);
        if (data[0]?.use_case_label) setUseCaseLabel(data[0].use_case_label);
      })
      .catch((err) => setError(err.message));
  }, [useCaseId]);

  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <Breadcrumbs labels={useCaseLabel ? { [useCaseId]: useCaseLabel } : {}} />
      <h1 style={{ fontFamily: '"Poppins", sans-serif', fontSize: "1.6rem", fontWeight: 700, color: "#151515", margin: "1.5rem 0 0.25rem" }}>
        {useCaseLabel ?? "Tasks"}
      </h1>
      <p style={{ fontFamily: '"Raleway", sans-serif', fontSize: "0.9rem", color: "#888", marginBottom: "1.75rem" }}>
        Select a task to view evaluation results
      </p>
      <div className="section-label">Available tasks</div>
      <div className="fixed-grid has-4-cols has-2-cols-mobile">
        <div className="grid">
          {runs.map((run) => (
            <ContentSquare
              key={run.path_id}
              content={createCardContent(run.title, run.description, run.task_label)}
              onClick={() => navigate(`/use-cases/${useCaseId}/${run.path_id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Tasks;
```

- [ ] **Step 2: Navigate to a use case and verify the tasks page**

Check:
- AppHeader visible at top
- Breadcrumb active item in gold
- Page title shows the use case label (e.g. "Multi-modal Medical Diagnostics")
- Section label "Available tasks" with gold left border
- Card hover gold border

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/tasks.jsx
git commit -m "style: apply brand typography and section label to Tasks page"
```
