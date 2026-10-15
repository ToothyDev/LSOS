# 030: Accessibility pass: what is fixed, what is a setting

2026-10-15, issue #55. Builds on decisions 009 (theme) and 029 (shared UI).

## Audit

Checked: contrast of every token pair in use, motion, keyboard and screen reader use of the
custom controls (bars, card handles, editable values), colour-only signals, and every tab at
360 px wide on a touch screen, with everything owned.

Already fine and left as is: text contrast (all pairs at least 4.5:1, WCAG AA); bars are
`role="slider"`/`"meter"` with values in words, card moves work by arrow keys and are
announced; focus ring on everything; colour is never the only signal (stock, supplies, heat,
ready/bad items all carry a label or word); text sizes in `rem`, zoom not blocked.

## Decision

- **Fixed for everyone:**
  - Supplies blue (`--supplies`) lighter, `#4b7fd1`: 3.2:1 on the empty bar track (was 2.5:1;
    WCAG wants 3:1 for graphics). Only the bar fill uses it.
  - Phones: the tab bar shows three tabs a row instead of scrolling with no hint (the active
    tab is marked by its green top edge, as it cannot join the window under two rows);
    Settings property rows put their buttons under the name when the row is narrow (the
    Running and Owned buttons left the name 9 px); Overview names wrap instead of being cut to
    a few letters, and on Ready now the action word sits above the name.
  - Bar drag handles easier to see: larger (10 by 22 px) with a 2 px dark ring, so they stand
    apart from the fill and the empty track (at least 5:1 on both; the 1 px edge before was
    lost against the fill). Still shown only over the card or on focus (decision 029).
  - Reduced motion now covers everything that moves: CSS animations (the pop-up slide-in), not
    only transitions, plus the motion made in script (card glides in `ui/CardGrid`, the scroll
    to a linked card, the boot screen).
- **Settings (an Accessibility panel in Settings):**
  - Motion: "As set on this device" (default, `prefers-reduced-motion`), Reduced, Full.
  - Scan lines over the screen: on by default.
  - Saved in `accessibility` (state version 15), so a backup carries them.
  - Applied as `data-reduce-motion` / `data-no-scanlines` on `<html>` by
    `lib/accessibility.svelte.ts`; script reads `motionReduced()`.
- **Not done:** no all-caps toggle, no high-contrast mode (text already passes AA), no text
  size setting (browser zoom works).

## Alternatives

- Supplies contrast only under a high-contrast toggle: a fix everyone benefits from, at almost
  no change to the look.
- A scrolling tab bar with a fade at the edge: still hides tabs on phones.
