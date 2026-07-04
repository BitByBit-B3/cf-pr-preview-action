# What is cf-pr-preview-action?

`cf-pr-preview-action` is a GitHub Action that gives **every pull request its own isolated,
ephemeral Cloudflare preview**: a per-PR Worker wired to a per-PR **D1**, **KV**, and **R2**,
deployed to a `workers.dev` URL and **torn down automatically when the PR closes or merges**.

It derives the preview from your existing `wrangler.jsonc` — no duplicated config — renames every
resource to a per-PR namespace, and lets you **run whatever you want** against the isolated
environment (migrations, seed, smoke tests) via command hooks.

```
PR opened / pushed   ──▶  provision per-PR D1 + KV + R2  ──▶  deploy Worker  ──▶  💬 comment w/ URL
PR closed / merged   ──▶  delete Worker + D1 + KV + R2   ──▶  💬 comment updated
```

## Why

Testing a Cloudflare Workers app that uses D1/KV/R2 usually means sharing one staging environment —
PRs stomp on each other's data, and there's no clean "throwaway" stack per change. This action
gives each PR a **complete, isolated copy** of your stack that behaves like production, then deletes
it when you're done.

## What makes it different

Plenty of actions deploy a Worker preview per PR. This one isolates the **stateful** layer too:

- Per-PR **D1** database (with migrations applied)
- Per-PR **KV** namespaces
- Per-PR **R2** buckets
- Optional **sync of your dev D1 + R2** into each preview, so it starts with realistic data
- Automatic teardown of all of it on PR close

## Next steps

- [Getting started](./getting-started) — add it to your repo in one workflow file
- [Syncing dev data](./syncing) — mirror your dev D1 + R2 into previews
- [How it works](./how-it-works) — the deploy and teardown pipelines
- [Inputs & outputs](../reference/config) — every option
