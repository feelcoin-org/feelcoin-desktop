# Feelcoin Desktop Wallet 🪙

**Official Feelcoin (FEEL) desktop wallet for Windows and Linux**

**Latest stable:** [v0.3.0](https://github.com/feelcoin-org/feelcoin-desktop/releases/tag/v0.3.0) · **Network:** Feelcoin Mainnet · **Architecture:** x86-64

> **Wallet safety:** Store your recovery seed offline. Never share seed words, private keys, or wallet passwords. The v0.3.0 designation reflects platform/device testing; it does **not** indicate an independent external security audit.

## Official v0.3.0 downloads

| Platform | Package | Download |
| --- | --- | --- |
| Windows 10/11 x64 | NSIS installer (.exe) | [Feelcoin Desktop v0.3.0 Windows](https://github.com/feelcoin-org/feelcoin-desktop/releases/download/v0.3.0/Feelcoin.Desktop_0.3.0_x64-setup.exe) |
| Debian / Ubuntu x86-64 | DEB package | [Feelcoin Desktop v0.3.0 DEB](https://github.com/feelcoin-org/feelcoin-desktop/releases/download/v0.3.0/Feelcoin.Desktop_0.3.0_amd64.deb) |
| Linux x86-64 | AppImage | [Feelcoin Desktop v0.3.0 AppImage](https://github.com/feelcoin-org/feelcoin-desktop/releases/download/v0.3.0/Feelcoin.Desktop_0.3.0_amd64.AppImage) |

[Official release notes](https://github.com/feelcoin-org/feelcoin-desktop/releases/tag/v0.3.0) · [SHA-256 checksums](https://github.com/feelcoin-org/feelcoin-desktop/releases/download/v0.3.0/SHA256SUMS.txt)

### Installation

**Windows:** Verify the downloaded .exe checksum against SHA256SUMS.txt, close any running older wallet, and run the installer. The installer may not have an OS publisher signature; never disable antivirus or bypass security warnings to install it.

**Ubuntu / Debian:**

```bash
sudo apt install './Feelcoin Desktop_0.3.0_amd64.deb'
```

**Linux portable:**

```bash
chmod +x './Feelcoin Desktop_0.3.0_amd64.AppImage'
'./Feelcoin Desktop_0.3.0_amd64.AppImage'
```

Use `APPIMAGE_EXTRACT_AND_RUN=1` if FUSE is unavailable.

### Verify your download

Download the checksum file alongside the package. On Linux:

```bash
sha256sum -c SHA256SUMS.txt --ignore-missing
```

On Windows PowerShell:

```powershell
Get-FileHash '.\Feelcoin Desktop_0.3.0_x64-setup.exe' -Algorithm SHA256
```

Compare the output with SHA256SUMS.txt from the same release.

## Stable v0.3.0 features

- Bundled **platform-native** local Feelcoin daemon and wallet RPC, on both Windows and Linux.
- Wallet creation, opening, recovery, balances, send and receive, and synchronization.
- Network information, node connectivity, transaction history and wallet status.
- No miner or standalone Windows Core installer included.
- Windows installer and Linux DEB/AppImage were built and tested for v0.3.0.

**Upgrading:** Close your current wallet, back up its recovery seed offline, and install the new package. Do not uninstall and delete wallet application data. Never run two versions against the same wallet simultaneously.

**Source provenance:** The verified v0.3.0 desktop installers were built from the [stable-candidate source revision](https://github.com/feelcoin-org/feelcoin-desktop/tree/b89c7630a4fd530217716e060cd47a9631f8a8d6). The default `main` branch may contain development changes.

## Security

- **Self-custody:** Keep your recovery seed and wallet keys under your control.
- **No bundled miner:** This wallet does not package mining software or silently mine.
- **No antivirus bypass:** Do not turn off security protections to install it.
- **Open source:** Inspect the code and submit reproducible bug reports.

**Never** post a recovery seed, private view/spend key, or wallet password in an issue, email, or chat.

## Network defaults

| Service | Port |
| --- | --- |
| P2P | `35780` |
| Daemon RPC | `35781` |
| ZMQ | `35782` |
| Wallet RPC | `35784` |

## Development

Node.js, stable Rust, and the prerequisites for Tauri 2 are required.

```bash
npm install
npm run tauri dev
```

## Official links

- [Feelcoin website](https://feelcoin.org)
- [Feelcoin Core](https://github.com/feelcoin-org/feelcoin)
- [Desktop Beta release](https://github.com/feelcoin-org/feelcoin-desktop/releases/tag/v0.2.0-beta.1)
- [Report an issue](https://github.com/feelcoin-org/feelcoin-desktop/issues)

**License:** BSD 3-Clause — see [LICENSE](LICENSE).

---

**In Feels We Trust.**

---

## In Feels We Trust

## Contact

Official Feelcoin support and project contact:

[**support@feelcoin.org**](mailto:support@feelcoin.org)

---

## Support Feelcoin Development

Feelcoin is an open-source project.

If you would like to support ongoing development, infrastructure, documentation, testing, and community services, voluntary donations are welcome.

### FEEL

```text
FBx9yk7huEF9PjR33zABbUj915wFVw3LeXfHSX4F7eXMgvyrkaV7tEW4gDwZ9rnQdnRQ4RmZsfPyNezu2jFoLewZLCuS8iM
```

### Bitcoin

Bitcoin mainnet:

```text
bc1q78zv45v3tfek730x8es88vjavj0qej2n766h2f
```

### Ethereum

Ethereum mainnet:

```text
0x7eFC0c47ab555041c79a7269a37f46A835EB466f
```

Donations are entirely voluntary and do not provide ownership, governance rights, guaranteed returns, or preferential treatment.

These voluntary donation addresses are separate from the consensus-enforced Feelcoin development treasury.
