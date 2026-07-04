# Inputs & outputs

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
| `sync-d1-from` | `` | Clone this source D1 (name) into the preview D1, then migrate |
| `sync-r2-from` | `` | Sync this source R2 bucket (name) into the per-PR bucket |
| `r2-endpoint-var` | `R2_ENDPOINT` | Env/config var holding the R2 S3 endpoint |
| `r2-access-key-id-var` | `R2_ACCESS_KEY_ID` | Env/config var holding the R2 S3 access key id |
| `r2-secret-access-key-var` | `R2_SECRET_ACCESS_KEY` | Env/config var holding the R2 S3 secret key |
| `isolate-kv` | `true` | Create per-PR KV namespaces |
| `isolate-r2` | `true` | Create per-PR R2 buckets |
| `preview-url-vars` | `BETTER_AUTH_URL` | Comma-separated vars set to the preview URL |
| `wrangler-command` | `bunx wrangler` | How to invoke wrangler |
| `pre-deploy-command` | `` | Hook before deploy |
| `post-deploy-command` | `` | Hook after deploy (migrations/seed/tests) |
| `pre-teardown-command` | `` | Hook before teardown |
| `shell` | `bash` | Shell for hooks |
| `comment` | `true` | Upsert sticky PR comment |
| `github-token` | <code v-pre>${{ github.token }}</code> | Token for the PR comment |
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

## Environment

| Variable | Used for |
|---|---|
| `CLOUDFLARE_API_TOKEN` | All Cloudflare/wrangler operations (masked in logs) |
| `CLOUDFLARE_ACCOUNT_ID` | Account for resource creation + subdomain resolution |
| `R2_ENDPOINT` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 S3 credentials for `sync-r2-from` (names configurable) |
