# Feelcoin Desktop Wallet 🪙

**Official Feelcoin (FEEL) desktop wallet — Windows & Linux**

**Current release:** [v0.2.0 Beta](https://github.com/feelcoin-org/feelcoin-desktop/releases/tag/v0.2.0-beta.1) · **Network:** Feelcoin Mainnet · **Architecture:** x86-64 / AMD64

> **Beta software:** Community testing is ongoing. Back up your recovery seed securely and offline. Start with small amounts and never share your seed, private keys, or wallet password.

## Download

| Platform | Package | Download |
| --- | --- | --- |
| Windows 10/11 x64 | Installer (`.exe`) | [Download for Windows](https://github.com/feelcoin-org/feelcoin-desktop/releases/download/v0.2.0-beta.1/Feelcoin.Desktop_0.2.0-beta.1_x64-setup.exe) |
| Debian / Ubuntu x86-64 | DEB (`.deb`) | [Download Linux DEB](https://github.com/feelcoin-org/feelcoin-desktop/releases/download/v0.2.0-beta.1/Feelcoin.Desktop_0.2.0-beta.1_amd64.deb) |
| Linux x86-64 | Portable AppImage | [Download Linux AppImage](https://github.com/feelcoin-org/feelcoin-desktop/releases/download/v0.2.0-beta.1/Feelcoin.Desktop_0.2.0-beta.1_amd64.AppImage) |

[Release notes and all packages](https://github.com/feelcoin-org/feelcoin-desktop/releases/tag/v0.2.0-beta.1) · [Report an issue](https://github.com/feelcoin-org/feelcoin-desktop/issues)

### Install on Windows

1. Download the Windows installer from the official release page.
2. Run the installer and launch **Feelcoin Desktop**.
3. Create or recover a wallet, securely store its recovery seed, and allow synchronization.

The Beta installer is not advertised as code-signed. Do not disable antivirus or endpoint protections to install it. Please report any warnings or installation problems.

### Install on Linux

**Debian / Ubuntu:**

Download the `.deb` package and install it from its download directory:

```bash
sudo apt install ./Feelcoin.Desktop_0.2.0-beta.1_amd64.deb
```

**Portable AppImage:**

```bash
chmod +x Feelcoin.Desktop_0.2.0-beta.1_amd64.AppImage
./Feelcoin.Desktop_0.2.0-beta.1_amd64.AppImage
```

On Linux systems without working FUSE/AppImage support, `--appimage-extract-and-run` may help.

### Verify downloads

The build artifacts were SHA-256 verified before publishing. To inspect the hash of a downloaded package yourself:

```bash
sha256sum Feelcoin.Desktop_0.2.0-beta.1_amd64.deb
```

On Windows PowerShell:

```powershell
Get-FileHash '.\Feelcoin.Desktop_0.2.0-beta.1_x64-setup.exe' -Algorithm SHA256
```

A combined public checksum manifest is not yet attached to this Beta release; do not treat a locally calculated hash alone as independent verification.

## Beta features

- Local Feelcoin daemon and wallet RPC components bundled with the application.
- Wallet creation and recovery, balance refresh, and send/receive tools.
- Transaction history and status tracking.
- Network status, block height, peer count, and daemon health information.
- Open-source desktop application built with **Tauri, Rust, React, and TypeScript**.
- Windows installer and Linux AppImage/DEB packages.

### Beta testing notes

This is a public Beta, not a final audited release. Successful builds and initial device tests do not establish that every wallet operation is validated on every system. Please test synchronization, balance accuracy, wallet recovery, and transfers with small amounts, and report reproducible issues.

Do not use Beta software to safeguard substantial funds. Keep independent offline backups of recovery material.

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
