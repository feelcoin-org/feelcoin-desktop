# Feelcoin Desktop Roadmap

## v0.1 — Foundation

- [x] Tauri + Rust + React/TypeScript application scaffold
- [x] Feelcoin visual shell
- [x] Official Feelcoin logo
- [x] Local daemon reachability check
- [x] Feelcoin network defaults
- [x] Antivirus / false-positive policy
- [ ] Local daemon lifecycle management
- [ ] Wallet RPC lifecycle management
- [ ] Create / open / restore wallet
- [ ] Wallet lock / unlock flow
- [ ] Sync height and network height
- [ ] Balance display
- [ ] Receive address + QR code
- [ ] Send transaction flow
- [ ] Transaction history
- [ ] Settings and remote-node mode

## v0.2 — Release quality

- [ ] Windows installer
- [ ] Linux packages
- [ ] SHA-256 release checksums
- [ ] Signed Windows binaries
- [ ] Reproducible/repeatable build documentation
- [ ] Automatic update metadata with signature verification
- [ ] Crash-safe daemon shutdown
- [ ] Structured application logs with secret redaction

## Mining policy

Mining is intentionally **not** part of Feelcoin Desktop.

The official miner remains a separate, explicitly installed application. This keeps wallet behavior clear and reduces avoidable antivirus false positives.

## Long-term

- Hardware wallet research
- Address book
- Multiple wallet profiles
- Node advanced controls
- Community node mode
- Payment request URIs
- Optional Tor/I2P research where compatible with the Feelcoin network
