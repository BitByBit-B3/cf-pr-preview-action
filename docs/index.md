---
layout: home
title: Per-PR Cloudflare preview environments
titleTemplate: cf-pr-preview-action

hero:
  name: cf-pr-preview-action
  text: A full Cloudflare preview for every PR
  tagline: An isolated Worker, D1, KV, and R2 per pull request — auto-deployed, dev data synced, migrations applied, and torn down on close.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: How it works
      link: /guide/how-it-works
    - theme: alt
      text: View on GitHub
      link: https://github.com/BitByBit-B3/cf-pr-preview-action

features:
  - icon: 🧬
    title: Fully isolated per PR
    details: Worker, D1, KV, and R2 are all cloned per PR as <code>&lt;prefix&gt;-pr-&lt;N&gt;</code>. PRs never touch each other's data or your production resources.
  - icon: 🧹
    title: Auto teardown
    details: Every resource is deleted when the PR closes or merges. No orphans, no bill creep — deploy vs teardown is auto-detected from the event.
  - icon: 🔁
    title: Sync dev data
    details: Clone your dev D1 (schema + data) and R2 bucket into each preview, then run migrations on top — so previews mirror production-like state.
  - icon: ⚙️
    title: Zero config duplication
    details: The preview wrangler config is rendered from your existing <code>wrangler.jsonc</code>. Custom domains are dropped for a workers.dev URL.
  - icon: 🪝
    title: Run anything
    details: pre-deploy / post-deploy / pre-teardown command hooks with the preview env injected — seed, smoke-test, or run any command against the isolated stack.
  - icon: 💬
    title: Sticky PR comment
    details: One upserted comment with the live preview URL, worker, and database — updated on every push and on teardown.
---
