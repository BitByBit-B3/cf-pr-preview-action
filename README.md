# cf-pr-preview-action

GitHub Action that gives every pull request its own **isolated, ephemeral Cloudflare preview**:
a per-PR Worker bound to a per-PR **D1**, **KV**, and **R2**, deployed to a `workers.dev` URL,
and **torn down automatically when the PR closes or merges**.

It derives the preview from your existing `wrangler.jsonc` — no duplicated config — and lets you
**run whatever you want** against the isolated environment (migrations, seed, smoke tests) via
command hooks.

## How it works

On `pull_request`:

- **opened / synchronize / reopened → deploy**
  1. Resolve per-PR names: `<worker-prefix>-pr-<PR#>`, `<db-prefix>-pr-<PR#>`.
  2. Create the per-PR D1 (idempotent), and — when isolation is on — per-PR KV namespaces and R2 buckets.
  3. Render `wrangler.preview.jsonc` from your `env.main` block, rebound to the per-PR resources and a `workers.dev` URL (custom domains/routes are dropped).
  4. Run `pre-deploy-command` → apply D1 migrations → `wrangler deploy` → `post-deploy-command`.
  5. Upsert a sticky PR comment with the preview URL.
- **closed → teardown**
  1. Run `pre-teardown-command`.
  2. Delete the Worker, D1, and per-PR KV/R2.
  3. Update the sticky comment.

Mode is auto-detected from the event; override with `mode: deploy|teardown`.

## Usage

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
    environment: main
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

> The consuming repo sets up its own runtime (bun/npm/pnpm) and `install` **before** the action,
> because `wrangler deploy` runs your `build.command`. Point `wrangler-command` at your package
> manager (`bunx wrangler` default, or `npx wrangler`, `pnpm dlx wrangler`).

### Cloudflare token scopes

Add `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` as secrets. The token needs:
Workers Scripts **edit**, D1 **edit**, KV **edit**, R2 **edit**, Workers subdomain **read**.

## Running migrations / anything on the isolated preview

Migrations run automatically before deploy (`run-migrations: true`). For anything else, use the
command hooks — they run with the preview environment injected as env vars:

| Env var | Meaning |
|---|---|
| `PREVIEW_WORKER` | preview worker name |
| `PREVIEW_DB` | preview D1 name |
| `PREVIEW_DB_ID` | preview D1 id *(deploy hooks)* |
| `PREVIEW_URL` | preview URL *(deploy hooks)* |
| `PREVIEW_CONFIG` | path to rendered `wrangler.preview.jsonc` *(deploy hooks)* |
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

You can also skip the hooks and add your own workflow steps using the [outputs](#outputs)
(`url`, `worker`, `db`, `db-id`, `config`).

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
| `run-migrations` | `true` | Apply D1 migrations before deploy |
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
| `config` | Path to rendered preview config (deploy) |

## Development

```bash
bun install
bun run typecheck
bun test
bun run build     # bundles src → dist/index.cjs (committed)
```

`dist/index.cjs` is the committed, bundled entrypoint the action runs. CI fails if it drifts from
`src` — rebuild and commit after changes.

## License

MIT © BitByBit-B3
