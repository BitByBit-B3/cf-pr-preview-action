# AGENTS.md

Guidance for AI coding agents working in this repo.

## What this is

A **JavaScript GitHub Action** (TypeScript source, Bun toolchain) that gives each PR an isolated,
ephemeral Cloudflare preview (per-PR Worker + D1/KV/R2), torn down on PR close. `action.yml` runs
the committed bundle `dist/index.cjs`.

## Layout

| Path | Role |
|---|---|
| `action.yml` | Action metadata, inputs, outputs. `runs: node20 → dist/index.cjs`. |
| `src/main.ts` | Entry: read inputs, set env, dispatch deploy/teardown. |
| `src/inputs.ts` | Parse inputs, resolve per-PR names, auto-detect mode. |
| `src/config.ts` | JSONC parse + render `wrangler.preview.jsonc` (pure, unit-tested). |
| `src/cloudflare.ts` | CF API + wrangler resource create/delete (D1/KV/R2, subdomain). |
| `src/wrangler.ts` | Wrangler exec wrapper. |
| `src/deploy.ts` / `src/teardown.ts` | The two flows. |
| `src/hook.ts` | Run consumer command hooks with preview env injected. |
| `src/comment.ts` | Sticky PR comment. |
| `dist/index.cjs` | **Committed** bundle the action runs. |

## Golden rules

1. **Rebuild the bundle after any `src/` change:** `bun run build` then commit `dist/index.cjs`.
   CI and the pre-push hook fail on drift.
2. **Keep `src/config.ts` pure and tested** — it's the core logic with no I/O; add tests in
   `__tests__/config.test.ts`.
3. **Never hardcode secrets.** The action re-emits consumer config on the consumer's runner only;
   the CF API token is masked via `core.setSecret`.
4. Match the existing style: single quotes, no semicolons, 2-space indent (enforced by Biome).

## Commands

```bash
bun install       # deps + git hooks
bun run typecheck
bun test
bun run lint      # biome check
bun run build     # → dist/index.cjs
```

## Releasing

Push a semver tag (`vX.Y.Z`); the `Release` workflow verifies, creates the Release, and floats the
major `vX` tag.
