# How it works

The mode is auto-detected from the `pull_request` event; override with `mode: deploy | teardown`.

## Deploy — on `opened` / `synchronize` / `reopened`

1. Resolve per-PR names: `<worker-prefix>-pr-<PR#>`, `<db-prefix>-pr-<PR#>`.
2. Resolve the account's `workers.dev` subdomain and build the preview URL.
3. Create the per-PR **D1** (idempotent), and — when isolation is on — per-PR **KV** namespaces and
   **R2** buckets.
4. Render `wrangler.preview.jsonc` from your `env.<config-env>` block, rebound to the per-PR
   resources and a `workers.dev` URL. Custom domains/routes are dropped, self-referencing service
   bindings are remapped, and `preview-url-vars` are set to the preview URL.
5. Run `pre-deploy-command`.
6. If `sync-d1-from` is set, clone the source D1; then apply D1 migrations.
7. If `sync-r2-from` is set, sync the source R2 bucket into the per-PR bucket.
8. `wrangler deploy`, then `post-deploy-command`.
9. Upsert a sticky PR comment with the preview URL.

## Teardown — on `closed`

1. Run `pre-teardown-command`.
2. Delete the Worker, D1, and per-PR KV/R2.
3. Update the sticky comment.

## Resource naming

Everything is keyed to the PR number, so resources are deterministic and collision-free:

| Resource | Name |
|---|---|
| Worker | `<worker-prefix>-pr-<PR#>` |
| D1 | `<db-prefix>-pr-<PR#>` |
| KV / R2 | derived from the worker name + binding (sanitized, ≤63 chars) |

Because creation is idempotent (list-first) and teardown tolerates already-deleted resources, reruns
and re-opened PRs are safe.
