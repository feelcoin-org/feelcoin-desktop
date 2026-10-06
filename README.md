# Feelcoin Desktop

Official cross-platform desktop wallet for **Feelcoin (FEEL)**.

> **Status:** early development / v0.1 scaffold

Feelcoin Desktop is being built as a clean, transparent desktop wallet with local-node support, wallet management, network status, send/receive tools, and a security-first release process.

## Design principles

- **Local-first:** use a local Feelcoin daemon when desired.
- **Transparent:** open source, reviewable configuration, no hidden services.
- **No bundled miner:** mining software is intentionally kept separate from the wallet.
- **No silent mining:** Feelcoin Desktop never mines in the background.
- **AV-friendly release design:** no executable packers, no obfuscation, no Defender exclusions, and published release hashes.
- **Community-first:** the application should make it easier to use and strengthen the Feelcoin network.

## Architecture

The desktop application uses **Tauri + Rust + React/TypeScript**.

The first development milestone focuses on:

1. local/remote daemon connectivity;
2. synchronization and network health;
3. secure local wallet RPC integration;
4. send / receive / transaction history;
5. reproducible Windows and Linux builds.

### Antivirus / false-positive policy

The main wallet does **not** contain a cryptocurrency miner.

The daemon and wallet components are treated as explicit, visible dependencies. We do not use UPX or executable obfuscation, we do not silently download or execute mining software, and we do not instruct users to disable antivirus protection.

Future official releases will publish SHA-256 checksums and should be code-signed when signing infrastructure is available.

## Feelcoin network defaults

- P2P: `35780`
- Daemon RPC: `35781`
- ZMQ: `35782`
- Wallet RPC: `35784`

## Development

Prerequisites:

- Node.js 20+
- Rust stable
- Tauri platform prerequisites

```bash
npm install
npm run tauri dev
```

## Repository

Core protocol: https://github.com/feelcoin-org/feelcoin

Official website: https://feelcoin.online

## License

BSD 3-Clause. See [LICENSE](LICENSE).

---

**In Feels We Trust.**
