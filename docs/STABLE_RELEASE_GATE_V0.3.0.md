# Feelcoin Desktop v0.3.0 — Stable Release Gate

This is a candidate, **not a published stable wallet release**.

Source baseline: `v0.2.0-beta.3` (`edb70112afe1ac64243e50d73386bec828810ea5`).
Do not build from the older `main` scaffold. The full wallet functionality is present in the Beta 3 release source.

## Candidate build
- Windows x64 NSIS installer built on a Windows GitHub runner.
- Linux amd64 DEB and AppImage built on a Linux GitHub runner.
- All wallet packages use version `0.3.0`, without a Beta suffix in the app interface.
- **Standalone Feelcoin Core is not being released for Windows.** This workflow produces a *desktop wallet*, not standalone Windows Core downloads.
- For the Windows wallet, use the same Beta 3 native approach: build Windows-native `feelcoind.exe` and `feelcoin-wallet-rpc.exe` as internal dependencies, then bundle only those native components.
- Explicitly remove and reject Linux ELF executables and `.so` shared libraries from Windows bundle inputs and audit the resulting NSIS installer.
- Linux packages bundle Linux-native daemon and wallet RPC and required Linux library; never Windows executables.
- Do not bundle any mining executable.
- CI publishes **candidate artifacts only**, not a public GitHub Stable Release.

## Required validation before publishing
- [ ] Windows x64 installer: verify that Windows-native daemon and wallet RPC are present and that no Linux ELF binary or `.so` library is bundled.
- [ ] Windows 10/11 clean install and in-place upgrade tested with the wallet's own bundled Windows-native local services; verify startup, shutdown and recovery.
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
