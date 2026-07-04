# cf-pr-preview-action

<p align="center">
  <img src="https://github.com/user-attachments/assets/fcee3e8f-faab-4836-a4c2-23a3ec63adbe" alt="cf-pr-preview-action" width="100%">
</p>

> Give every pull request its own **isolated, ephemeral Cloudflare preview** — a per-PR Worker wired to a per-PR D1, KV, and R2 — and tear it all down automatically when the PR closes.

<p>
  <a href="https://github.com/BitByBit-B3/cf-pr-preview-action/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/BitByBit-B3/cf-pr-preview-action/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/marketplace/actions/cloudflare-pr-preview"><img alt="Marketplace" src="https://img.shields.io/badge/marketplace-cloudflare--pr--preview-2088FF?logo=github"></a>
  <a href="https://github.com/BitByBit-B3/cf-pr-preview-action/releases"><img alt="Release" src="https://img.shields.io/github/v/release/BitByBit-B3/cf-pr-preview-action?sort=semver"></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/github/license/BitByBit-B3/cf-pr-preview-action"></a>
</p>

It reads your existing `wrangler.jsonc` — no duplicated config — renames every resource to a
per-PR namespace, deploys to a `workers.dev` URL, and lets you **run whatever you want** against
the isolated environment (migrations, seed, smoke tests) through command hooks.

```
PR opened / pushed   ──▶  provision per-PR D1 + KV + R2  ──▶  deploy Worker  ──▶  💬 sticky comment w/ preview URL
PR closed / merged   ──▶  delete Worker + D1 + KV + R2   ──▶  💬 comment updated
```

## Features

- **Fully isolated per PR** — Worker **and** D1, KV, R2 are all cloned per PR (`<prefix>-pr-<PR#>`); PRs never touch each other's data or your production resources.
- **Auto teardown** — everything is deleted when the PR closes or merges. No orphaned resources, no bill creep.
- **Zero config duplication** — the preview `wrangler.jsonc` is rendered from your real one; custom domains/routes are stripped and swapped for a `workers.dev` URL.
- **Run anything on the preview** — migrations run automatically; `pre-deploy` / `post-deploy` / `pre-teardown` hooks let you seed, smoke-test, or run arbitrary commands against the isolated D1.
- **One action, both directions** — deploy vs teardown is auto-detected from the PR event.
- **Sticky PR comment** — a single comment is upserted with the live preview URL.
- **Package-manager agnostic** — `bunx` / `npx` / `pnpm dlx` wrangler, your call.

## Quick start

```yaml
name: Preview
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

concurrency:
  group: preview-pr-${{ github.event.pull_request.number }}
  cancel-in-progress: false

permissions:
  contents: read
  pull-requests: write

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: 1.3.14 }
      - run: bun install
      - uses: BitByBit-B3/cf-pr-preview-action@v1
        with:
          worker-prefix: myapp-preview
          db-prefix: myapp-preview
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

> **Install your deps before the action.** `wrangler deploy` runs your `build.command`, so the
> consuming repo must set up its runtime (bun/npm/pnpm) and `install` first. Point
> `wrangler-command` at your package manager if it isn't bun (`bunx wrangler` is the default).

### Cloudflare token scopes

Add `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` as repo/environment secrets. The token needs:

| Permission | Level |
|---|---|
| Workers Scripts | Edit |
| D1 | Edit |
| Workers KV Storage | Edit |
| Workers R2 Storage | Edit |
| Account → Workers Subdomain | Read |

## Running migrations / anything on the isolated preview

D1 migrations are applied automatically before deploy (`run-migrations: true`). For everything
else, use the command hooks — they run with the resolved preview environment injected as env vars:

| Env var | Meaning |
|---|---|
| `PREVIEW_WORKER` | preview worker name |
| `PREVIEW_DB` | preview D1 name |
| `PREVIEW_DB_ID` | preview D1 id *(deploy hooks)* |
| `PREVIEW_URL` | preview URL *(deploy hooks)* |
| `PREVIEW_CONFIG` | path to the rendered `wrangler.preview.jsonc` *(deploy hooks)* |
| `WRANGLER_COMMAND` | the configured wrangler invocation |

```yaml
      - uses: BitByBit-B3/cf-pr-preview-action@v1
        with:
          worker-prefix: myapp-preview
          post-deploy-command: |
            $WRANGLER_COMMAND d1 execute "$PREVIEW_DB" --config "$PREVIEW_CONFIG" --remote --file ./seed/preview.sql
            $WRANGLER_COMMAND d1 execute "$PREVIEW_DB" --config "$PREVIEW_CONFIG" --remote --command "INSERT INTO flags (k,v) VALUES ('preview',1)"
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

Prefer your own steps? Skip the hooks and consume the [outputs](#outputs) instead
(`url`, `worker`, `db`, `db-id`, `config`).

## Seeding the preview from dev

To make each preview mirror your dev environment instead of starting empty, clone dev's D1 and R2
into the isolated per-PR copies:

```yaml
      - uses: BitByBit-B3/cf-pr-preview-action@v1
        with:
          worker-prefix: myapp-preview
          sync-d1-from: myapp-dev-db        # export dev D1 -> reset -> import into preview D1
          sync-r2-from: myapp-dev-bucket    # aws s3 sync dev bucket -> preview bucket
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

`sync-d1-from` skips migrations (the dev dump carries the schema) and is idempotent — the preview
D1 is reset before each import, so pushes re-sync cleanly. `sync-r2-from` reads the R2 S3 endpoint
and keys from the rendered config vars (`R2_ENDPOINT` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`
by default; override with the `r2-*-var` inputs).

## How it works

**On `opened` / `synchronize` / `reopened` → deploy**

1. Resolve per-PR names: `<worker-prefix>-pr-<PR#>`, `<db-prefix>-pr-<PR#>`.
2. Create the per-PR D1 (idempotent), and — when isolation is on — per-PR KV namespaces and R2 buckets.
3. Render `wrangler.preview.jsonc` from your `env.<config-env>` block, rebound to the per-PR resources and a `workers.dev` URL (custom domains/routes are dropped, self-referencing service bindings are remapped, `preview-url-vars` are set to the preview URL).
4. `pre-deploy-command` → apply D1 migrations → `wrangler deploy` → `post-deploy-command`.
5. Upsert a sticky PR comment with the preview URL.

**On `closed` → teardown**

1. `pre-teardown-command`.
2. Delete the Worker, D1, and per-PR KV/R2.
3. Update the sticky comment.

Mode is auto-detected from the event; override with `mode: deploy | teardown`.

## Inputs

| Input | Default | Description |
|---|---|---|
| `worker-prefix` | *(required)* | Preview worker name prefix → `<prefix>-pr-<PR#>` |
| `db-prefix` | `worker-prefix` | Preview D1 name prefix → `<prefix>-pr-<PR#>` |
| `mode` | `auto` | `deploy` \| `teardown` \| `auto` |
| `source-config` | `wrangler.jsonc` | Source wrangler config |
| `out-config` | `wrangler.preview.jsonc` | Rendered preview config path |
| `config-env` | `main` | `env.<name>` block to base the preview on |
| `d1-location` | `apac` | Location hint for created D1 |
| `migrations-dir` | *(from config)* | Migrations directory |
| `run-migrations` | `true` | Apply D1 migrations before deploy (ignored when `sync-d1-from` is set) |
| `sync-d1-from` | `` | Clone this source D1 (name) into the preview D1 (schema+data); skips migrations |
| `sync-r2-from` | `` | Sync this source R2 bucket (name) into the per-PR preview bucket (S3 API) |
| `r2-endpoint-var` | `R2_ENDPOINT` | Config var holding the R2 S3 endpoint (for `sync-r2-from`) |
| `r2-access-key-id-var` | `R2_ACCESS_KEY_ID` | Config var holding the R2 S3 access key id |
| `r2-secret-access-key-var` | `R2_SECRET_ACCESS_KEY` | Config var holding the R2 S3 secret key |
| `isolate-kv` | `true` | Create per-PR KV namespaces |
| `isolate-r2` | `true` | Create per-PR R2 buckets |
| `preview-url-vars` | `BETTER_AUTH_URL` | Comma-separated vars set to the preview URL |
| `wrangler-command` | `bunx wrangler` | How to invoke wrangler |
| `pre-deploy-command` | `` | Hook before deploy |
| `post-deploy-command` | `` | Hook after deploy (migrations/seed/tests) |
| `pre-teardown-command` | `` | Hook before teardown |
| `shell` | `bash` | Shell for hooks |
| `comment` | `true` | Upsert sticky PR comment |
| `github-token` | `${{ github.token }}` | Token for the PR comment |
| `cloudflare-account-id` | `` | Prefer `CLOUDFLARE_ACCOUNT_ID` env |
| `cloudflare-api-token` | `` | Prefer `CLOUDFLARE_API_TOKEN` env |

## Outputs

| Output | Description |
|---|---|
| `url` | Preview `workers.dev` URL (deploy) |
| `worker` | Resolved preview worker name |
| `db` | Resolved preview D1 name |
| `db-id` | Preview D1 id (deploy) |
| `config` | Path to the rendered preview config (deploy) |

## Development

```bash
bun install
bun run typecheck
bun test
bun run build     # bundles src → dist/index.cjs (committed)
```

`dist/index.cjs` is the committed, bundled entrypoint the action runs. **CI fails if it drifts from
`src`** — rebuild and commit after changing anything under `src/`.

## License

MIT © [BitByBit-B3](https://github.com/BitByBit-B3)
