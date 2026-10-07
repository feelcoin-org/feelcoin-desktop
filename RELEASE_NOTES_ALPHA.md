# Feelcoin Desktop Wallet — Windows & Linux Alpha

**v0.1.0 Alpha** · **Feelcoin Mainnet** · **x86-64 / AMD64**

> **Alpha software.** Back up your wallet recovery seed securely and offline. Test with small amounts. Never share your seed, private keys or password.

## Download

| Platform | Package |
| --- | --- |
| Windows 10/11 x64 | [Windows installer (.exe)](https://github.com/feelcoin-org/feelcoin-desktop/releases/download/v0.1.0-alpha/Feelcoin-Desktop-v0.1.0-alpha-windows-x64-setup.exe) |
| Linux x86-64 | [AppImage](https://github.com/feelcoin-org/feelcoin-desktop/releases/download/v0.1.0-alpha/Feelcoin-Desktop-v0.1.0-alpha-linux-x86_64.AppImage) |
| Debian / Ubuntu x86-64 | [DEB package](https://github.com/feelcoin-org/feelcoin-desktop/releases/download/v0.1.0-alpha/Feelcoin-Desktop-v0.1.0-alpha-linux-amd64.deb) |

The desktop wallet bundles Feelcoin daemon and wallet RPC components.

## Install

**Windows:** Download and verify the Windows installer, then run it and open **Feelcoin Desktop**. The Alpha installer is not advertised as digitally signed; do not disable antivirus protection to install it.

**Linux AppImage:**

```bash
chmod +x Feelcoin-Desktop-v0.1.0-alpha-linux-x86_64.AppImage
./Feelcoin-Desktop-v0.1.0-alpha-linux-x86_64.AppImage
```

**Debian / Ubuntu:**

```bash
sudo apt install ./Feelcoin-Desktop-v0.1.0-alpha-linux-amd64.deb
```

## Verify downloads

Download [SHA256SUMS.txt](https://github.com/feelcoin-org/feelcoin-desktop/releases/download/v0.1.0-alpha/SHA256SUMS.txt) beside the package.

Linux:

```bash
sha256sum -c SHA256SUMS.txt --ignore-missing
```

Windows PowerShell:

```powershell
Get-FileHash .\Feelcoin-Desktop-v0.1.0-alpha-windows-x64-setup.exe -Algorithm SHA256
```

Match the Windows hash with its checksum entry.

## First launch and testing

1. Open a test wallet or create a new one.
2. Allow the bundled daemon to synchronize with Feelcoin Mainnet.
3. Verify network status, wallet balance, receiving address and transaction history.
4. After confirming synchronization, test sending a small amount.
5. Report reproducible issues without ever sharing seeds, keys or passwords.

Windows and Linux build pipelines passed. Windows desktop launch and local-daemon connectivity have been observed, but end-to-end transaction testing and broader platform verification remain in progress. A displayed target height of zero alone does not prove full synchronization.

## Security and support

Open source, no bundled miner, no silent mining, and SHA-256 release checksums.

[Source](https://github.com/feelcoin-org/feelcoin-desktop) · [Report an issue](https://github.com/feelcoin-org/feelcoin-desktop/issues) · [Official website](https://feelcoin.org)

**In Feels We Trust.**
