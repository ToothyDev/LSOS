# LSOS: Los Santos Operating System

> **Vibe coded:** this whole project is written by AI
> ([Claude Code](https://claude.com/claude-code)).

A GTA Online companion that runs in your browser. Keep it open while you play, and it tracks your
businesses, safes and cooldowns, so you know when stock is full or a safe needs
emptying.

> **Status:** early development. Not usable yet; see the [issues](https://github.com/ToothyDev/LSOS/issues) for what's planned.

## How it works

- **Static site, no account.** Everything you enter stays in your browser (`localStorage`).
  Nothing is sent anywhere. Export/import lets you back up or move your data.
- **Time-based estimates.** LSOS can't see the game. Business production runs while LSOS is
  open and tracking ("play time"). LSOS opens paused: press Start once you have loaded into a
  session, or turn on tracking on open in Settings. Real-world cooldowns such as the Lucky Wheel
  run on the wall clock even when LSOS is closed.
- **Sourced game data.** Rates and values come from sources such as gta.wiki. Where none exists
  for your upgrades, LSOS uses a best estimate and labels those numbers "(est.)".
- **Resync anytime.** When an estimate drifts from what the game shows, click the value and type
  the real one.
- **Weekly events** (bonuses, discounts) come from a data file in this repo that's updated weekly.

Targets the current-gen edition (PC Enhanced, PS5, Xbox Series X|S).

## Development

Requires Node 22+.

```sh
npm install
npm run dev      # local dev server
npm run verify   # typecheck, format check, tests, build (what CI runs)
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow and [docs/decisions](docs/decisions/README.md)
for the design decisions behind the code.

## License

[MIT](LICENSE). Game data in `src/data/` cites its sources; facts about the game
belong to no one, but please keep the source links when reusing it.

## Disclaimer

LSOS is a fan-made tool, not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.
Grand Theft Auto and GTA Online are trademarks of Take-Two Interactive.
