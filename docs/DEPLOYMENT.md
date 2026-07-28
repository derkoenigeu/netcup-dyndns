# Deployment

## Infrastructure Overview

- **Source**: GitHub repository, `main` is the release branch.
- **CI/registry**: GitHub Actions build the app and push container images to
  the GitHub Container Registry (GHCR) at `ghcr.io/<owner>/netcup-dyndns`.
- **Runtime**: any Docker host that can pull from GHCR (the container is a
  plain Node/Express HTTP service — see [README.md](../README.md) for usage).

## Build Process

The app has no separate build step — it's plain ESM Node.js. The Docker
image is built from the root `Dockerfile` (multi-arch: `linux/amd64` and
`linux/arm64`) and produces a single runnable image containing the app and
its production dependencies.

## Release & Deployment Flow

Releases are fully automatic — there is no manual tagging step. Everything
lives in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml):

1. **`test`** runs on every push and pull request (`npm ci && npm test`).
2. **`release`** runs only on a push to `main`, and only after `test`
   succeeds (`needs: test`). It:
   - Runs [semantic-release](https://semantic-release.gitbook.io/) against
     the commits since the last tag. semantic-release inspects
     [Conventional Commits](https://www.conventionalcommits.org/) messages
     (`fix:`, `feat:`, `BREAKING CHANGE:`, etc.) to decide whether a release
     is warranted and what the next version number is.
   - If a release is warranted, semantic-release: bumps `version` in
     `package.json`/`package-lock.json`, updates `CHANGELOG.md`, commits
     those changes back to `main` (`chore(release): x.y.z [skip ci]`),
     creates a git tag (format `x.y.z`, no `v` prefix — matches this repo's
     existing tags), and publishes a GitHub Release with generated notes.
   - The workflow detects whether a new tag was actually created (by
     diffing the latest tag before/after the semantic-release step). If —
     and only if — a new tag exists, it builds the Docker image and pushes
     it to GHCR tagged as `x.y.z`, `x.y`, `x`, and `latest`.
   - A commit that doesn't warrant a release (e.g. `docs:`, `chore:` without
     a fix/feature) runs semantic-release without effect — no tag, no image
     build.

So: **merging/pushing a `fix:` or `feat:` commit to `main` is the entire
deployment trigger.** No manual `workflow_dispatch`, no manual tag push.

To deploy a new version to a running host, pull the new tag (or `latest`)
and recreate the container — see the README's
[Docker Compose section](../README.md#docker-compose-recommended-for-production).

## Required Environment Variables / Secrets

| Name | Where configured | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | Provided automatically by GitHub Actions | Used by semantic-release to push the release commit/tag and create the GitHub Release, and to authenticate `docker/login-action` against GHCR. No PAT or extra secret is required. |

The `release` job requests `contents: write`, `issues: write`,
`pull-requests: write`, and `packages: write` permissions on the built-in
token — this is the minimum semantic-release + GHCR push need.

Runtime environment variables (Netcup API credentials, DNS record config,
etc.) are documented in the [README's Configuration section](../README.md#configuration)
and are supplied to the *container at runtime*, not to CI.

## Troubleshooting

- **No release was cut after merging to `main`**: check that at least one
  commit since the last tag follows Conventional Commits with a
  release-worthy type (`fix:`, `feat:`, or a `BREAKING CHANGE:` footer).
  `chore:`, `docs:`, `refactor:`, `test:`, `ci:` etc. do not trigger a
  release on their own.
- **Release job fails on the semantic-release step**: check the Actions log
  for the specific plugin error; a common cause is a force-pushed/rewritten
  `main` history that no longer contains the last release tag.
- **Image did not get pushed even though a tag was created**: verify the
  `release` job's `Check for new release` step — it compares tags before and
  after the semantic-release step, so any manual tag pushed outside CI
  between runs can throw this comparison off. Prefer letting semantic-release
  own all tagging.
- **Want to test the pipeline without cutting a real release**: run
  `npx semantic-release --dry-run` locally (uses your own `GITHUB_TOKEN`) to
  see what version/notes it *would* produce.
