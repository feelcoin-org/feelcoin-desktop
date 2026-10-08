# Feelcoin Android Mining Watch — private alpha

This Android alpha reuses the existing official Feelcoin coin image in public/feelcoin-logo.png and app icon in src-tauri/icons/icon.png. No generated or substitute logos.

Features: read-only mining dashboard, official pool stats /stats, /workers, /miner-payments, public FEEL address stored locally, foreground refresh every 30 seconds, official web-wallet link and pool payout history.

Privacy and security: public monitoring address only; no seed, private keys, password, wallet RPC access, mining or faucet. The app sends the saved public address to pool.feelcoin.org through HTTPS. Pool balances are NOT on-chain wallet balances. No native transactional wallet functions have been completed in this alpha. Do not use this app to store funds.

Build: run the Build Android Alpha APK GitHub Actions workflow on feature/android-wallet. Download the build artifact and sideload the debug APK on a personal test device. Do NOT distribute publicly until signed release builds, Android device tests and wallet security review.

To follow up: native non-custodial wallet engine, Android Keystore, audited send/receive, exact atomic-unit conversions, pool endpoint robustness, notifications, formal release signing, manual device tests.
