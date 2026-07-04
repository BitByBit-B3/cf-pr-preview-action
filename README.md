# cf-pr-preview-action

<p align="center">
  <img src="https://github.com/user-attachments/assets/fcee3e8f-faab-4836-a4c2-23a3ec63adbe" alt="cf-pr-preview-action" width="100%">
</p>

> Give every pull request its own **isolated, ephemeral Cloudflare preview** — a per-PR Worker wired to a per-PR D1, KV, and R2 — auto-deployed, dev data synced, migrations applied, and torn down when the PR closes.

<p>
  <a href="https://github.com/BitByBit-B3/cf-pr-preview-action/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/BitByBit-B3/cf-pr-preview-action/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/marketplace/actions/cloudflare-pr-preview"><img alt="Marketplace" src="https://img.shields.io/badge/marketplace-cloudflare--pr--preview-2088FF?logo=github"></a>
  <a href="https://github.com/BitByBit-B3/cf-pr-preview-action/releases"><img alt="Release" src="https://img.shields.io/github/v/release/BitByBit-B3/cf-pr-preview-action?sort=semver"></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/github/license/BitByBit-B3/cf-pr-preview-action"></a>
</p>

## 📖 Documentation → [cf-pr-preview.bbyb.dev](https://cf-pr-preview.bbyb.dev)

Full guides, syncing, and the complete input/output reference live on the docs site.

## Quick start

```yaml
name: Preview
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]
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

Open a PR → get an isolated Worker + D1 + KV + R2 at a `workers.dev` URL, migrations applied, a
sticky comment with the link, and automatic teardown on close.

- **[Getting started](https://cf-pr-preview.bbyb.dev/guide/getting-started)** — token scopes + the workflow
- **[Syncing dev data](https://cf-pr-preview.bbyb.dev/guide/syncing)** — clone dev D1 + R2 into previews
- **[Inputs & outputs](https://cf-pr-preview.bbyb.dev/reference/config)** — every option

## Development

```bash
bun install
bun run typecheck
bun test
bun run build     # bundles src → dist/index.cjs (committed)
```

`dist/index.cjs` is the committed entrypoint the action runs; CI fails if it drifts from `src`.
Docs live in [`docs/`](./docs) (VitePress). See [CONTRIBUTING](./CONTRIBUTING.md).

## License

MIT © [BitByBit-B3](https://github.com/BitByBit-B3)
