# Cyberbullies — Forside & Stats redesign

Drop-in replacement for `frontend/src/pages/Home.jsx` and
`frontend/src/pages/Stats.jsx`. Uses the existing API contract
(`getStandings`, `getHistory`, `getSimulation`, `getProbabilityHistory`)
unchanged. No new dependencies required — `recharts` and `tailwindcss`
are already in your `package.json`.

## Install

Copy these files into your repo, preserving the folder layout:

```
production/src/components/Pitch.jsx           →  frontend/src/components/Pitch.jsx
production/src/components/Avatar.jsx          →  frontend/src/components/Avatar.jsx
production/src/components/SidePlayerCard.jsx  →  frontend/src/components/SidePlayerCard.jsx
production/src/lib/theme.js                   →  frontend/src/lib/theme.js
production/src/pages/Home.jsx                 →  frontend/src/pages/Home.jsx   (overwrite)
production/src/pages/Stats.jsx                →  frontend/src/pages/Stats.jsx  (overwrite)
```

`lib/` doesn't exist yet — make it.

## Optional tweaks for visual coherence

These aren't required (the pages set their own background via `<Pitch />`),
but if you want the rest of the app to match the new theme:

### Body background (`frontend/src/index.css`)
```css
body {
  margin: 0;
  background: #0a1610;          /* was #0f172a */
  color: #ecfdf5;               /* was #e2e8f0 */
  font-family: "Space Grotesk", system-ui, sans-serif;
}
```

### Add the Space Grotesk + JetBrains Mono Google Fonts (`frontend/index.html`)
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
```

### App wrapper (`frontend/src/App.jsx`)
The existing `bg-slate-950 text-slate-100` works fine — `<Pitch />` is
`fixed inset-0 -z-10` so it covers the app background. If you'd rather
not stack things, change the wrapper to `bg-[#0a1610] text-[#ecfdf5]`.

### Navbar (`frontend/src/components/Navbar.jsx`)
Optional: swap `bg-slate-900 border-slate-700` for `bg-[#152a1f]
border-[rgba(180,220,195,0.10)]` to match the elevated card colour.
The existing green-400 wordmark already harmonises.

## What's different from the original

**Home.jsx**
- Page title is now "Forside" (the `Cyberbullies` wordmark lives in the
  navbar already; the duplicate is gone).
- Ligatabell is the visual centerpiece (left column, ~1fr wide).
- Three vertical highlight cards stacked on the right
  (Leder · Rundemester · Sisteplass). The round-winner card is hidden if
  no round has been played yet.
- Table columns simplified: `# · Spiller · Runde N · Totalt`. No
  per-round breakdown or form sparkline — drop in if you fetch `history`
  alongside standings later.
- Leader row has a gold side rail; last row a rose rail; the
  round-winner gets an inline "RUNDEMESTER R{n}" pill.
- Round number is read from `getHistory()` (highest round key). If the
  fetch fails or returns empty, the UI gracefully drops the round chip.

**Stats.jsx**
- Two vertically stacked sections instead of a 2×2 grid (win / last).
- Each section: top-3 podium with avatars on the left, recharts line
  chart on the right (top 4 contenders, one line each), with the rest
  of the field listed below as compact bars. The chart uses the same
  `getProbabilityHistory` shape as before.
- Theme tokens (colors, fonts) come from `lib/theme.js` — single source
  of truth instead of inline hex codes scattered across the file.

**No API changes.** All endpoint shapes are exactly what they were.

## File reference

| File | Purpose |
|------|---------|
| `components/Pitch.jsx` | Fixed `-z-10` background: diagonal grass stripes + soft top-light wash + faint centre circle |
| `components/Avatar.jsx` | Initial-circle avatar with deterministic hue derived from username |
| `components/SidePlayerCard.jsx` | One of `kind="leader" \| "round" \| "last"` — vertical highlight card |
| `lib/theme.js` | Color constants (TH.accent, TH.gold, TH.warn, etc.) |
| `pages/Home.jsx` | Forside |
| `pages/Stats.jsx` | Stats |
