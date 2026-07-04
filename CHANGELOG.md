# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Merge global (top-level) `wrangler.jsonc` vars into the rendered preview worker config, in
  addition to the `env.<config-env>` block. Wrangler does not inherit top-level vars into named
  envs, so the preview now sees the same vars a normal deploy would. Env-block vars still win on
  key collisions.
- Publish CI/CD: pushing a `vX.Y.Z` tag verifies the build, creates the GitHub Release, and floats
  the major (`vX`) tag.
- Repo scaffolding: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, Biome, and lefthook
  git hooks.

## [1.0.0] - 2026-07-03

### Added

- Initial release. Per-PR ephemeral Cloudflare preview: per-PR Worker + isolated D1/KV/R2, rendered
  from your existing `wrangler.jsonc`, deployed to a `workers.dev` URL and torn down automatically
  on PR close.
- Auto-detect deploy vs teardown from the `pull_request` event.
- `pre-deploy` / `post-deploy` / `pre-teardown` command hooks with the preview environment injected,
  plus automatic D1 migrations.
- Sticky PR comment with the preview URL.

[Unreleased]: https://github.com/BitByBit-B3/cf-pr-preview-action/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/BitByBit-B3/cf-pr-preview-action/releases/tag/v1.0.0
