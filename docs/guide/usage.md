# Usage

## Running migrations & anything on the preview

D1 migrations are applied automatically before deploy (`run-migrations: true`). For everything else,
use the command hooks — they run with the resolved preview environment injected as env vars:

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

There are three hooks: `pre-deploy-command`, `post-deploy-command`, and `pre-teardown-command`.

## Using the outputs

Prefer your own steps? Skip the hooks and consume the [outputs](../reference/config#outputs):

```yaml
      - uses: BitByBit-B3/cf-pr-preview-action@v1
        id: preview
        with:
          worker-prefix: myapp-preview
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      - run: echo "Preview at ${{ steps.preview.outputs.url }}"
```

## Package managers

`wrangler-command` defaults to `bunx wrangler`. For npm/pnpm:

```yaml
        with:
          worker-prefix: myapp-preview
          wrangler-command: npx wrangler   # or: pnpm dlx wrangler
```

## Choosing the config env

If your `wrangler.jsonc` uses named environments, `config-env` (default `main`) selects which
`env.<name>` block to base the preview on. Global (top-level) vars are merged in too; the env
block wins on key collisions.
