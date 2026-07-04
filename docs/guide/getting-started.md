# Getting started

## Prerequisites

- A Cloudflare Workers project with a `wrangler.jsonc` (or `wrangler.toml`).
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository or environment **secrets**.

### Cloudflare token scopes

The API token needs:

| Permission | Level |
|---|---|
| Workers Scripts | Edit |
| D1 | Edit |
| Workers KV Storage | Edit |
| Workers R2 Storage | Edit |
| Account → Workers Subdomain | Read |

## Add the workflow

Create `.github/workflows/preview.yml`:

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

That's it. Open a PR and the action:

1. Creates `myapp-preview-pr-<N>` Worker + D1 + KV + R2.
2. Applies your D1 migrations.
3. Deploys to a `workers.dev` URL and posts a sticky PR comment.
4. Deletes everything when the PR closes.

::: tip Install your deps first
`wrangler deploy` runs your project's `build.command`, so set up your runtime (bun/npm/pnpm) and
install **before** the action. Point [`wrangler-command`](../reference/config) at your package
manager if it isn't bun.
:::

## Next

- [Sync your dev D1 + R2 into previews](./syncing)
- [Full input reference](../reference/config)
