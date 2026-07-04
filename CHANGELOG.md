# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.1] - 2026-07-04

### Changed

- `sync-d1-from` now recreates the preview D1 fresh each run, lets migrations build the schema, then
  imports dev's **data** (`--no-schema`). Removes the fragile drop-tables reset (which hit
  `SQLITE_AUTH` on internal tables and dependency errors on triggers/views). Migrations run again.

## [1.1.0] - 2026-07-04

### Added

- **`sync-d1-from`**: clone a source (dev) D1 into the preview D1 (export → reset → import) so the
  preview mirrors dev's schema + data. Idempotent across pushes; skips migrations; retries with
  backoff around D1's one-export-at-a-time limit.
- **`sync-r2-from`** (+ `r2-endpoint-var` / `r2-access-key-id-var` / `r2-secret-access-key-var`):
  sync a source R2 bucket into the per-PR preview bucket over the S3 API. R2 S3 creds are read from
  the rendered config vars.
- Merge global (top-level) `wrangler.jsonc` vars into the rendered preview worker config, in
  addition to the `env.<config-env>` block. Env-block vars still win on key collisions.
- Publish CI/CD: pushing a `vX.Y.Z` tag verifies the build, creates the GitHub Release, and floats
  the major (`vX`) tag.
- Repo scaffolding: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, Biome, and lefthook
  git hooks.

### Changed

- wrangler runs non-interactively (`CI=1`) so it never blocks on an error-report prompt.

## [1.0.0] - 2026-07-03

### Added

- Initial release. Per-PR ephemeral Cloudflare preview: per-PR Worker + isolated D1/KV/R2, rendered
  from your existing `wrangler.jsonc`, deployed to a `workers.dev` URL and torn down automatically
  on PR close.
- Auto-detect deploy vs teardown from the `pull_request` event.
- `pre-deploy` / `post-deploy` / `pre-teardown` command hooks with the preview environment injected,
  plus automatic D1 migrations.
- Sticky PR comment with the preview URL.

[Unreleased]: https://github.com/BitByBit-B3/cf-pr-preview-action/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/BitByBit-B3/cf-pr-preview-action/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/BitByBit-B3/cf-pr-preview-action/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/BitByBit-B3/cf-pr-preview-action/releases/tag/v1.0.0
