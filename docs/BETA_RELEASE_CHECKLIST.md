# Feelcoin v0.2.0-beta.1 — Beta candidate checklist

This branch builds **private review candidates** for Windows and Linux. CI artifact success does not approve a public wallet release.

## Desktop release checks (Windows / Linux)
- [ ] Install and start on a clean Windows 10/11 machine and an Ubuntu/Debian machine.
- [ ] Verify the gold Feelcoin brand icon in installer, taskbar, and application window.
- [ ] Verify disabled controls have the normal arrow cursor and cannot submit commands.
- [ ] Confirm bundled official Feelcoin Core daemon and wallet RPC versions.
- [ ] Create a new wallet, show and **independently verify backup** of the seed, and close it.
- [ ] Open the wallet again after restart and confirm address, balance, and transaction history.
- [ ] Recover the wallet from seed and match the original FEEL address.
- [ ] Check network synchronization, offline errors and restart recovery.
- [ ] Test send/receive with **small disposable funds**, confirm transaction details and fees.
- [ ] Validate installer checksums, software provenance, dependency licensing, and signing status.
- [ ] Do not distribute an unsigned Windows build without clearly describing signing/SmartScreen limitations.

## Android release checks
The separate `feature/android-wallet` branch **does not yet implement native wallet create/open/restore, secure device key storage, synchronization, or signing**.
- [ ] Implement and test the native wallet engine before calling it an Android wallet beta.
- [ ] Verify local seed generation/restore/address compatibility against the official desktop wallet.
- [ ] Verify encrypted local vault survives app restart and Android process death.
- [ ] Verify remote-node TLS synchronization and local-only signing/transaction tests.
- [ ] Confirm node/Explorer read-only APIs and real blocks/transactions on device.
- [ ] Create signed Android release artifact, test clean install and update behavior.
- [ ] Keep current APK labeled **read-only companion / private test**, not a secure mobile wallet.

## Release gate
Publish an official v0.2.0-beta.1 prerelease only after the corresponding platform's functional and security tests pass. Record tested OS versions and SHA-256 hashes. Use `https://feelcoin.org` and official gold logo. Never include miner, faucet, seeds or private keys in releases.
