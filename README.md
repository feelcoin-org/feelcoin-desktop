# Feelcoin Desktop Wallet 🪙

**Official Feelcoin (FEEL) desktop wallet for Windows and Linux**

**Latest stable:** [v1.0.0](https://github.com/feelcoin-org/feelcoin-desktop/releases/tag/v1.0.0) · **Network:** Feelcoin Mainnet · **Architecture:** x86-64

> Keep your recovery seed offline. Back up existing wallet data before upgrading. Never share private keys, wallet passwords or seed words.

## Official v1.0.0 downloads

| Platform | Package | Download |
| --- | --- | --- |
| Windows 10/11 x64 | Installer | [Windows x64](https://github.com/feelcoin-org/feelcoin-desktop/releases/download/v1.0.0/Feelcoin.Desktop_1.0.0_x64-setup.exe) |
| Ubuntu 22.04 x64 | DEB / AppImage | [DEB](https://github.com/feelcoin-org/feelcoin-desktop/releases/download/v1.0.0/Feelcoin-v1.0.0-Ubuntu-22.04-x64.deb) · [AppImage](https://github.com/feelcoin-org/feelcoin-desktop/releases/download/v1.0.0/Feelcoin-v1.0.0-Ubuntu-22.04-x64.AppImage) |
| Ubuntu 24.04 x64 | DEB / AppImage | [DEB](https://github.com/feelcoin-org/feelcoin-desktop/releases/download/v1.0.0/Feelcoin-v1.0.0-Ubuntu-24.04-x64.deb) · [AppImage](https://github.com/feelcoin-org/feelcoin-desktop/releases/download/v1.0.0/Feelcoin-v1.0.0-Ubuntu-24.04-x64.AppImage) |
| Ubuntu 26.04 x64 | DEB / AppImage | [DEB](https://github.com/feelcoin-org/feelcoin-desktop/releases/download/v1.0.0/Feelcoin-v1.0.0-Ubuntu-26.04-x64.deb) · [AppImage](https://github.com/feelcoin-org/feelcoin-desktop/releases/download/v1.0.0/Feelcoin-v1.0.0-Ubuntu-26.04-x64.AppImage) |

[Release notes](https://github.com/feelcoin-org/feelcoin-desktop/releases/tag/v1.0.0) · [SHA-256 checksums](https://github.com/feelcoin-org/feelcoin-desktop/releases/download/v1.0.0/SHA256SUMS.txt)

## Mandatory v17 Core upgrade

Protocol v17 activates at mainnet block **21,205**. Desktop Wallet v1.0.0 bundles the upgraded Core daemon; please install this version before activation. Node operators, solo miners using their own daemon and pool operators must also upgrade. Official-pool miners do not need to change their miner software.

## Installation and verification

Close the previous wallet, back up your recovery seed and wallet data, then install the matching package. Normally you should preserve existing AppData; do not delete it or reset your blockchain.

Ubuntu 24.04 example (choose your Ubuntu version):

```bash
sudo apt install './Feelcoin-v1.0.0-Ubuntu-24.04-x64.deb'
```

AppImage example:

```bash
chmod +x './Feelcoin-v1.0.0-Ubuntu-24.04-x64.AppImage'
./Feelcoin-v1.0.0-Ubuntu-24.04-x64.AppImage
```

If FUSE is unavailable, use `APPIMAGE_EXTRACT_AND_RUN=1`.

Download `SHA256SUMS.txt` from the same release. On Linux, run `sha256sum -c SHA256SUMS.txt --ignore-missing`. On Windows PowerShell:

```powershell
Get-FileHash '.\Feelcoin.Desktop_1.0.0_x64-setup.exe' -Algorithm SHA256
```

Compare the result with the checksum file. Windows binaries are not code-signed.

## Features

- Locally bundled Feelcoin Core v1.0.0 daemon and wallet RPC
- Non-custodial wallet creation, opening, recovery and synchronization
- Send, receive, balances, transaction history and node information
- No bundled mining software

**Corrected desktop source (October 28, 2026):** [Download source ZIP](https://github.com/feelcoin-org/feelcoin-desktop/archive/f8438a7577c377fcfe38e529688967c5f62ad010.zip) · [Browse source at the correction commit](https://github.com/feelcoin-org/feelcoin-desktop/tree/f8438a7577c377fcfe38e529688967c5f62ad010). This snapshot restores the complete desktop wallet implementation and aligns its source metadata to v1.0.0. No Windows/Linux installers were changed. **Important:** GitHub's automatic “Source code (zip/tar.gz)” links on the original v1.0.0 release still follow the older October 15 tag (`b89c763`), which has 0.3.0 metadata; they have **not** been replaced. This corrected source snapshot is provided separately and is not a claim that previously published installers were built bit-for-bit from it.

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
- [Desktop v1.0.0 release](https://github.com/feelcoin-org/feelcoin-desktop/releases/tag/v1.0.0)
- [Report an issue](https://github.com/feelcoin-org/feelcoin-desktop/issues)

**License:** BSD 3-Clause — see [LICENSE](LICENSE).

---

**In Feels We Trust.**

---

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
