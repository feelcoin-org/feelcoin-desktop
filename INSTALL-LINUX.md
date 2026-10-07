# Feelcoin Desktop Wallet — Linux Alpha

**Release:** v0.1.0 Alpha
**Architecture:** x86_64 / AMD64
**Network:** Feelcoin Mainnet

> Alpha software. Always keep a secure offline backup of your wallet recovery seed.

## Download

Download the Linux release only from the official Feelcoin GitHub organization.

For most users, the recommended package is the **AppImage**.

A `.deb` package is also available for Debian/Ubuntu-based systems.

Feelcoin Desktop includes the Feelcoin daemon and wallet RPC components. You do not need to download Feelcoin Core separately.

## Verify the Download

Download `SHA256SUMS.txt` together with the wallet package.

Run:

    sha256sum -c SHA256SUMS.txt

The downloaded package should report `OK`.

## AppImage — Recommended

Make it executable:

    chmod +x Feelcoin*.AppImage

Launch it:

    ./Feelcoin*.AppImage

If normal AppImage mounting is unavailable:

    ./Feelcoin*.AppImage --appimage-extract-and-run

## Debian / Ubuntu

Install the `.deb` package:

    sudo apt install ./Feelcoin*.deb

Then open **Feelcoin Desktop Wallet** from your application menu.

## First Launch

Feelcoin Desktop automatically manages its bundled local Feelcoin services.

1. Create a new wallet or open an existing wallet.
2. Allow the daemon to synchronize with the Feelcoin network.
3. Wait for synchronization before relying on the displayed balance.
4. Store your recovery seed securely and offline.

Initial synchronization time depends on your Internet connection, CPU and storage.

## Receive FEEL

Open the **Receive** page.

Copy your Feelcoin address or display the QR code.

Always verify the address before sharing it.

## Send FEEL

Open the **Send** page.

1. Enter the recipient address.
2. Enter the amount.
3. Review the transaction carefully.
4. Confirm the transfer.

Blockchain transactions cannot normally be reversed.

## Security

Never give anyone:

- your recovery seed
- your private spend key
- your wallet password

Feelcoin developers and support personnel will never ask for these secrets.

## Updating

When a newer release becomes available:

1. Close Feelcoin Desktop.
2. Download the new official release.
3. Verify its SHA256 checksum.
4. Install or launch the new version.

Your wallet data is stored separately from the application package, but always maintain an independent recovery-seed backup.

## Alpha Status

The Linux Alpha has been manually tested for:

- wallet creation and opening
- daemon synchronization
- balance display
- receiving FEEL
- sending FEEL
- transaction history
- QR receive functionality
- local daemon and wallet RPC management

Additional Linux distribution and hardware testing will continue during Alpha.

Please report reproducible issues through the official Feelcoin project channels.

---

**In Feels We Trust.**
