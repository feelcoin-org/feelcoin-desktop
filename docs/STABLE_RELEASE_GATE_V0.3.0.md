# Feelcoin Desktop v0.3.0 — Stable Release Gate

This is a candidate, **not a published stable wallet release**.

Source baseline: `v0.2.0-beta.3` (`edb70112afe1ac64243e50d73386bec828810ea5`).
Do not build from the older `main` scaffold. The full wallet functionality is present in the Beta 3 release source.

## Candidate build
- Windows x64 NSIS installer built on a Windows GitHub runner.
- Linux amd64 DEB and AppImage built on a Linux GitHub runner.
- All packages use version `0.3.0`, without a Beta suffix in the application UI.
- Windows build compiles **only the Tauri wallet application**, never Feelcoin Core or a miner.
- Windows packaging includes **NO** `feelcoind`, `feelcoind.exe`, `feelcoin-wallet-rpc`, `feelcoin-wallet-rpc.exe`, Linux ELF binaries, `.so` libraries or a mining engine.
- Windows requires an independently installed, trusted local daemon at `127.0.0.1:35781` and wallet RPC at `127.0.0.1:35784`; it must never be described as self-contained.\n- Linux packaging includes the verified Linux-native daemon, wallet RPC and required Linux library, never Windows executables.
- The GitHub Actions workflow publishes **candidate artifacts only**, not a GitHub Release.

## Required validation before publishing
- [ ] Windows x64 installer: extracted payload checked to contain **no bundled Core binary or Linux shared library**.
- [ ] Windows 10/11 clean install and in-place upgrade tested with **separately running local Core services**; startup and recovery instructions confirmed.
- [ ] Ubuntu clean install and upgrade: DEB and AppImage open and run.
- [ ] Wallet creation and recovery using a disposable test wallet on each OS.
- [ ] Seed backup and restored receiving address match.
- [ ] Node synchronization, peers and wallet balance confirmed against Explorer.
- [ ] Small incoming and outgoing mainnet transfers tested on each OS.
- [ ] Wallet closes and reopens with local funds and keys intact.
- [ ] No wallet secrets in logs, artifacts, or release notes.
- [ ] Generated SHA256SUMS.txt verified against final uploaded packages.
- [ ] Official source tag points to exact candidate source commit.
- [ ] Malware detections (if any) triaged; users are **never** asked to disable antivirus.
- [ ] Release notes disclose unsigned Windows installer if still unsigned.

## Android separately
Android must be built from the **working local Ubuntu tree**, not the GitHub `main` scaffold.
Keep package identifier `org.feelcoin.wallet`, preserve the installed signing certificate,
and increase Android versionCode beyond Beta 3's 2002. Confirm QR camera-permission behavior,
device signing, local data preservation, synchronization, recovery, and transfers before releasing.
Never commit signing credentials or keystore files.

## Publication
Only publish a non-prerelease `v0.3.0` tag/release after all release gates above pass.
Retain previous Beta releases for reproducibility and rollback.
