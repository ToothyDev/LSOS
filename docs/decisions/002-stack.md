# 002: Svelte 5 + TypeScript + Vite

2026-10-13, project bootstrap

## Decision

- **Svelte 5** (runes) for the UI, **TypeScript** in strict mode everywhere, **Vite** to build.
- **Vitest** for tests, **Prettier** (with the Svelte plugin) for formatting, `svelte-check` for types.
- No router library: tabs are driven by the location hash (`#/heists`), see `src/lib/tabs.ts`.
- No CSS framework: plain CSS with custom properties as design tokens.

## Why

- The app is many small, independently ticking widgets sharing one state. Svelte's fine-grained
  reactivity handles that with little boilerplate and a small bundle.
- Vite builds to static files that any host serves (decision 001).
- Hash routing works on every static host without rewrite rules.

## Rules that follow

- Game logic (production, cooldowns, clocks) is plain TypeScript in `src/lib/`, free of Svelte,
  so it can be unit-tested without a DOM. Components only display and edit state.
