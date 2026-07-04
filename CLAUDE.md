See [AGENTS.md](./AGENTS.md) for repo guidance.

Quick reminders for Claude Code:

- After editing `src/`, run `bun run build` and commit `dist/index.cjs` — CI fails on drift.
- Core render logic lives in `src/config.ts` and is unit-tested in `__tests__/config.test.ts`.
- Style: single quotes, no semicolons, 2-space indent (Biome-enforced).
- Never commit real secrets.
