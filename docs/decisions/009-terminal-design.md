# 009: Terminal design: tokens, base components, browser-style tabs

2026-10-14, issue #3.

## Decision

- **Look:** modelled loosely on the GTA Online Master Control Terminal: slate panels, a title
  between two green bars, green for stock, blue for supplies, condensed capitals with wide
  letter spacing. No Rockstar logos, artwork or game screenshots anywhere in the repo.
- **Tokens** (colors, type scale, spacing) are CSS custom properties in `src/app.css`.
  Components use tokens only. Every text/background pair keeps WCAG AA contrast (4.5:1);
  keyboard focus is a yellow `--focus` outline on every focusable element.
- **Fonts:** Oswald (SIL Open Font License 1.1) for headings, labels and numbers, self-hosted
  through `@fontsource-variable/oswald`, so no request goes to a font CDN (decision 001: nothing
  is sent anywhere). Body text uses the system UI font, which reads better at small sizes.
- **Tabs look like browser tabs:** the active tab joins the window below it. On phones the
  tabs shrink to fit and the strip scrolls sideways when they still do not.
- **Base components** live in `src/components/ui/`: `Panel`, `Meter` (stock/supplies bar),
  `Countdown`, `TabBar`, `Button`, `NumberField`. Their logic (bar fill, parsing and clamping
  typed numbers) is in `src/lib/ui.ts` with tests. `Countdown` takes the remaining time as a
  prop; the caller computes it from its clock (decision 003).
- **Component preview:** `#/kit` shows the base components with sample numbers, only under
  `npm run dev`. It is not a tab and the module is left out of production builds.

## Why

The in-game look is what makes LSOS feel like part of the game, but the art belongs to
Rockstar, so only the layout and palette are borrowed. Self-hosting the font keeps the promise
that LSOS talks to no server. A shared set of tokens and components keeps later tabs consistent
without each one restyling buttons and bars.
