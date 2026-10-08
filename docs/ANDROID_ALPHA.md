# Feelcoin Android — private alpha

The Android application uses the existing official Feelcoin logo from `public/feelcoin-logo.png`. The launcher icon is generated from that image in CI. Its installed name is **Feelcoin**.

## Current features

Five tabs: Wallet, Mining, Explorer, Network and Settings. Pool payouts are shown within Mining. The official web wallet is opened in the device browser for opening, creating or restoring wallets. Explorer opens the official block explorer. Network shows available read-only pool-reported network statistics.

The application has **no Android daemon, no local mining, and no native wallet engine**. The existing desktop code still includes localhost daemon and wallet-RPC functions for desktop use; those are not the Android wallet implementation.

## Remote-node wallet architecture (planned; NOT implemented)

The future Android wallet must connect to a remote Feelcoin daemon over TLS for synchronization and broadcasting. A remote daemon is not a custodial wallet service. Wallet secrets must be generated, encrypted, stored and used for signing locally on the device; never send a recovery phrase, private spend key, or wallet password to a remote daemon or pool. Implement audited native wallet logic and secure Android key storage before enabling create/restore/send in the native UI.

Do not mistake a remote daemon's `get_info` response for wallet synchronization or spend capability. A public remote node can see the connecting IP and may learn wallet-related query metadata. Verify the selected endpoint, certificate validation and blockchain/network identity before trusting it.

## Testing and release

Build using the `Build Android Alpha APK` workflow on `feature/android-wallet`. Download its debug APK artifact for private device testing only. **No public release** until the wallet engine, security review, device tests, signing and recovery tests are complete. Never use this alpha to store funds.

Read-only pool queries use HTTPS and a public FEEL monitoring address; pool balances are not wallet balances. Some metrics may be unavailable. Wallet access currently launches `https://wallet.feelcoin.org` in the browser.
