# Feelcoin Desktop v1.0.0 — reconstructed release source snapshot

**Status:** Source-only reconstruction for audit and transparency. **Not** a new public binary release, not a replacement for the public `v1.0.0` tag, and not a claim of bit-for-bit reproducible installers.

## Why this branch exists

The Desktop Wallet `v1.0.0` installers were publicly uploaded on 2026-10-26, but GitHub's auto-generated “Source code” links use tag `v1.0.0` at `b89c7630a4fd530217716e060cd47a9631f8a8d6`, a 2026-10-15 GUI commit whose `package.json`, Tauri configuration and Cargo metadata read **0.3.0**. The actual v1.0.0 CI scripts cloned that GUI commit and changed versions **during packaging**, not in a new Desktop Git commit.

This branch starts **exactly** at GUI source commit `b89c7630a4fd530217716e060cd47a9631f8a8d6`, and applies the known version-metadata changes used for the official v1.0.0 packages:
- `package.json` → `1.0.0`
- `package-lock.json` and lockfile root package → `1.0.0`
- `src-tauri/tauri.conf.json` → `1.0.0`
- `src-tauri/Cargo.toml` → `1.0.0`

**Platform-specific resource/bundle settings are still applied at build time**, so this branch alone is not the full immutable built working tree for any particular OS.

## Historical build provenance

- Base GUI source: `feelcoin-org/feelcoin-desktop@b89c7630a4fd530217716e060cd47a9631f8a8d6`.
- Bundled Feelcoin Core source: `feelcoin-org/feelcoin@6b1a1f08f82fb1ce33343ee512f852872553f824`, reporting `Feelcoin 1.0.0-6b1a1f08f`.
- Core v1.0.0 public release tag `15beef0ef9f54865007008c732036c429c60a173` differs from bundled Core commit only in QA scripts, workflows and docs (no consensus source changes).
- Historical build workflows live in the **Core repository**, not Desktop:
  - `.github/workflows/v1-desktop-windows-qa.yml` — run `40083129764`
  - `.github/workflows/v1-desktop-linux-qa.yml` — run `40092195491`
- QA output artifacts originally came from those workflows and were subsequently copied/renamed into the public release with hashes checked. Additional Ubuntu 24.04/26.04 packaging/build history should be independently attached before claiming full artifact-to-source reproducibility.

## Independent validation performed October 27, 2026

Official Windows installer and Ubuntu 24.04 DEB were downloaded and verified by SHA256, their included `feelcoind` binaries executed in disposable GitHub-hosted machines with loopback-only RPC and isolated temporary data directories.

Both reported version `v1.0.0-6b1a1f08f` and answered JSON-RPC `hard_fork_info` version 17 with `earliest_height: 21205`, `status: OK`. This verifies the bundled daemons are configured for the intended V17 activation **but does not test post-fork mainnet consensus behavior or the complete wallet UI**.

Audit runs:
- https://github.com/feelcoin-org/feelcoin-desktop/actions/runs/40464927953
- https://github.com/feelcoin-org/feelcoin-desktop/actions/runs/40463486162

## Next release gate

For any new immutable tag (e.g. `v1.0.1`), commit **all** version changes and platform build instructions **before tagging**, build installers from that exact commit, attest the included Core source hash, test each target platform and post-fork compatibility as relevant, and publish SHA256 manifests alongside immutable assets.

See issue https://github.com/feelcoin-org/feelcoin-desktop/issues/8. Do not silently force-move the historic public `v1.0.0` tag.
