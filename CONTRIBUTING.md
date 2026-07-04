# Contributing

Thanks for contributing to `cf-pr-preview-action`.

## Setup

```bash
bun install        # installs deps + git hooks (lefthook)
```

## Workflow

```bash
bun run typecheck  # tsc --noEmit
bun test           # bun test
bun run lint       # biome check
bun run format     # biome check --write
bun run build      # bundle src → dist/index.cjs
```

This is a **JavaScript GitHub Action**: `action.yml` runs the committed bundle at
`dist/index.cjs`. After changing anything under `src/`, you **must** rebuild and commit the bundle:

```bash
bun run build
git add dist/index.cjs
```

CI (and the pre-push hook) fail if `dist/index.cjs` drifts from `src/`.

## Pull requests

- Keep the diff focused; one logical change per PR.
- Add/adjust tests under `__tests__/` for behavior changes.
- Make sure `bun run typecheck`, `bun test`, and `bun run build` are clean.
- Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages
  (`feat:`, `fix:`, `docs:`, `chore:`…) — the release notes are generated from them.

## Releasing

Maintainers publish by pushing a semver tag:

```bash
git tag v1.2.3
git push origin v1.2.3
```

The `Release` workflow verifies the build, creates the GitHub Release, and floats the `v1` major
tag. See [CHANGELOG.md](./CHANGELOG.md).

## Code of Conduct

This project follows the [Code of Conduct](./CODE_OF_CONDUCT.md).
