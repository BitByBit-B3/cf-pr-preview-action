# Syncing dev data into previews

By default a preview starts empty (schema from your migrations). To make each preview **mirror your
dev environment**, clone your dev D1 and R2 into the isolated per-PR copies.

```yaml
      - uses: BitByBit-B3/cf-pr-preview-action@v1
        with:
          worker-prefix: myapp-preview
          db-prefix: myapp-preview
          sync-d1-from: myapp-dev-db        # source D1 name
          sync-r2-from: myapp-dev-bucket    # source R2 bucket name
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          # R2 S3 credentials (see below)
          R2_ENDPOINT: ${{ secrets.R2_ENDPOINT }}
          R2_ACCESS_KEY_ID: ${{ secrets.R2_DEV_ACCESS_KEY_ID }}
          R2_SECRET_ACCESS_KEY: ${{ secrets.R2_DEV_SECRET_ACCESS_KEY }}
```

## How D1 sync works

1. **Full export** of the source (dev) D1 — schema **and** data.
2. **Drop** the preview D1's existing tables (foreign keys off).
3. **Import** the dev dump into the preview D1.
4. **Apply migrations** on top — so any schema changes this PR adds land over the dev snapshot.

A full clone (not data-only) is used on purpose: a dev database frequently drifts ahead of a
branch's migration files, and copying rows into a mismatched schema fails. Cloning dev's real
schema, then migrating, always works.

D1 allows only one export per database at a time, so the export retries with backoff if a previous
export is still in flight.

## How R2 sync works

R2 is synced with **rclone** (Cloudflare S3 provider) from the source bucket into the per-PR bucket.

::: warning R2 credentials
The R2 access key and secret must be real **R2 S3 API credentials** — not the app-runtime values
you might keep in `wrangler.jsonc` vars. Provide them as env/secrets. By default the action reads
`R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` from the environment (falling back to
config vars). Override the names with the [`r2-*-var` inputs](../reference/config).
:::

Large buckets take time to copy on every push — scope `sync-r2-from` to a bucket whose size is
reasonable for per-PR cloning, or omit it and seed R2 in a hook instead.
