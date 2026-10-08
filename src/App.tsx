import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import QRCode from "qrcode";

type View = "overview" | "wallet" | "send" | "receive" | "transactions" | "node";

type NetworkDefaults = {
  p2p_port: number;
  daemon_rpc_port: number;
  zmq_port: number;
  wallet_rpc_port: number;
};

type DaemonInfo = {
  reachable: boolean;
  host: string;
  port: number;
  height: number | null;
  target_height: number | null;
  difficulty: number | null;
  target_seconds: number | null;
  incoming_connections: number | null;
  outgoing_connections: number | null;
  synchronized: boolean | null;
  status: string | null;
  version: string | null;
  error: string | null;
};

type WalletRpcStatus = {
  reachable: boolean;
  host: string;
  port: number;
  version: number | null;
  release: boolean | null;
  error: string | null;
};

type WalletSummary = {
  balance: number;
  unlocked_balance: number;
  address: string;
  height: number;
};

type TransferEntry = {
  amount?: number;
  fee?: number;
  height?: number;
  timestamp?: number;
  txid?: string;
  tx_hash?: string;
  address?: string;
  type?: string;
};

type TransferHistory = Record<string, TransferEntry[]>;

type WalletRecoveryInfo = {
  mnemonic: string;
  private_view_key: string;
  private_spend_key: string;
};

type WalletOperation = "create" | "open" | "restore" | null;

const FALLBACK_NETWORK: NetworkDefaults = {
  p2p_port: 35780,
  daemon_rpc_port: 35781,
  zmq_port: 35782,
  wallet_rpc_port: 35784,
};

const EMPTY_DAEMON: DaemonInfo = {
  reachable: false,
  host: "127.0.0.1",
  port: 35781,
  height: null,
  target_height: null,
  difficulty: null,
  target_seconds: null,
  incoming_connections: null,
  outgoing_connections: null,
  synchronized: null,
  status: null,
  version: null,
  error: null,
};

const EMPTY_WALLET_RPC: WalletRpcStatus = {
  reachable: false,
  host: "127.0.0.1",
  port: 35784,
  version: null,
  release: null,
  error: null,
};

function formatNumber(value: number | null | undefined) {
  return value == null ? "—" : new Intl.NumberFormat().format(value);
}

function formatFeel(atomic: number | null | undefined) {
  if (atomic == null) return "—";
  const raw = Math.trunc(atomic).toString().padStart(13, "0");
  const whole = raw.slice(0, -12) || "0";
  const fractional = raw.slice(-12).replace(/0+$/, "");
  return fractional ? `${whole}.${fractional} FEEL` : `${whole} FEEL`;
}

function feelToAtomicString(input: string): string {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{0,12})?$/.test(trimmed)) {
    throw new Error("Enter a valid FEEL amount with up to 12 decimal places.");
  }

  const [whole, fraction = ""] = trimmed.split(".");
  const atomic = BigInt(whole) * 1_000_000_000_000n + BigInt((fraction + "0".repeat(12)).slice(0, 12));

  if (atomic <= 0n || atomic > 18_446_744_073_709_551_615n) {
    throw new Error("Amount is outside the supported range.");
  }

  return atomic.toString();
}

function App() {
  const [view, setView] = useState<View>("overview");
  const [network, setNetwork] = useState<NetworkDefaults>(FALLBACK_NETWORK);
  const [daemon, setDaemon] = useState<DaemonInfo>(EMPTY_DAEMON);
  const [walletRpc, setWalletRpc] = useState<WalletRpcStatus>(EMPTY_WALLET_RPC);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [history, setHistory] = useState<TransferHistory>({});
  const [checking, setChecking] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [restartingServices, setRestartingServices] = useState(false);

  // Refs provide immediate locks. React state alone updates asynchronously,
  // which can allow two fast clicks or a poll to enter before re-render.
  const walletOperationLock = useRef(false);
  const refreshLock = useRef(false);
  const serviceRestartLock = useRef(false);
  const [walletMessage, setWalletMessage] = useState<string | null>(null);

  const [walletName, setWalletName] = useState("");
  const [walletPassword, setWalletPassword] = useState("");
  const [walletPasswordConfirm, setWalletPasswordConfirm] = useState("");
  const [seed, setSeed] = useState("");
  const [restoreHeight, setRestoreHeight] = useState("0");
  const [walletOperation, setWalletOperation] = useState<WalletOperation>(null);
  const [recoveryInfo, setRecoveryInfo] = useState<WalletRecoveryInfo | null>(null);
  const [backupConfirmed, setBackupConfirmed] = useState(false);

  const [sendAddress, setSendAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [addressCopied, setAddressCopied] = useState(false);
  const [receiveQr, setReceiveQr] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);
  const [serviceSuccess, setServiceSuccess] = useState<string | null>(null);

  const totalConnections = useMemo(
    () => (daemon.incoming_connections ?? 0) + (daemon.outgoing_connections ?? 0),
    [daemon.incoming_connections, daemon.outgoing_connections],
  );

  async function refreshServices(force = false) {
    if (refreshLock.current) return;
    if (!force && (walletOperationLock.current || serviceRestartLock.current)) return;

    refreshLock.current = true;
    setChecking(true);

    try {
      const [daemonResult, walletResult] = await Promise.all([
        invoke<DaemonInfo>("daemon_info"),
        invoke<WalletRpcStatus>("wallet_rpc_status"),
      ]);

      setDaemon(daemonResult);
      setWalletRpc(walletResult);

      if (walletResult.reachable) {
        try {
          const summary = await invoke<WalletSummary>("wallet_summary");
          setWallet(summary);
        } catch {
          setWallet(null);
        }
      } else {
        setWallet(null);
      }
    } finally {
      refreshLock.current = false;
      setChecking(false);
    }
  }

  async function startServices() {
    if (serviceRestartLock.current) return;

    serviceRestartLock.current = true;
    setServiceError(null);

    try {
      await invoke("start_local_services");
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
    } catch (error) {
      setServiceError(String(error));
    } finally {
      serviceRestartLock.current = false;
      await refreshServices(true);
    }
  }

  async function restartServices() {
    if (serviceRestartLock.current || walletOperationLock.current) return;

    serviceRestartLock.current = true;
    setRestartingServices(true);
    setServiceError(null);
    setServiceSuccess(null);
    setWalletMessage(null);

    // We are intentionally stopping wallet-rpc, so its current open-wallet
    // session is no longer valid.
    setWallet(null);
    setWalletRpc(EMPTY_WALLET_RPC);
    setDaemon(EMPTY_DAEMON);

    try {
      await invoke("restart_local_services");

      // Don't assume readiness after a fixed 1.6 seconds.
      // Poll health for up to ~15 seconds.
      let ready = false;

      for (let attempt = 0; attempt < 30; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 500));

        try {
          const [daemonResult, walletResult] = await Promise.all([
            invoke<DaemonInfo>("daemon_info"),
            invoke<WalletRpcStatus>("wallet_rpc_status"),
          ]);

          setDaemon(daemonResult);
          setWalletRpc(walletResult);

          if (daemonResult.reachable && walletResult.reachable) {
            ready = true;
            break;
          }
        } catch {
          // Services are still coming up. Keep checking.
        }
      }

      if (!ready) {
        throw new Error(
          "Feelcoin services were restarted but did not become ready within 15 seconds."
        );
      }

      setServiceError(null);
      setServiceSuccess("✓ Services restarted successfully");
      setWalletMessage(
        "Local services restarted successfully. Re-open your wallet to continue."
      );

      window.setTimeout(() => {
        setServiceSuccess(null);
      }, 2500);
    } catch (error) {
      setServiceError(String(error));
    } finally {
      serviceRestartLock.current = false;
      setRestartingServices(false);
      await refreshServices(true);
    }
  }

  async function loadHistory() {
    try {
      const result = await invoke<TransferHistory>("transaction_history");
      setHistory(result ?? {});
    } catch {
      setHistory({});
    }
  }

  useEffect(() => {
    invoke<NetworkDefaults>("network_defaults")
      .then(setNetwork)
      .catch(() => setNetwork(FALLBACK_NETWORK));

    startServices();

    const timer = window.setInterval(() => {
      refreshServices();
    }, 7000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (view === "transactions" && wallet) {
      loadHistory();
    }
  }, [view, wallet?.address]);

  useEffect(() => {
    let cancelled = false;

    if (!wallet?.address) {
      setReceiveQr(null);
      return;
    }

    QRCode.toDataURL(wallet.address, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 240,
    })
      .then((dataUrl) => {
        if (!cancelled) setReceiveQr(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setReceiveQr(null);
      });

    return () => {
      cancelled = true;
    };
  }, [wallet?.address]);

  async function handleWalletAction(action: "create" | "open" | "restore") {
    if (walletOperationLock.current || serviceRestartLock.current) return;

    // Validate before taking the RPC lock.
    setWalletMessage(null);

    const name = walletName.trim();

    try {
      if (!name) {
        throw new Error("Choose a wallet name.");
      }

      if (action !== "open" && walletPassword !== walletPasswordConfirm) {
        throw new Error("The wallet passwords do not match.");
      }

      walletOperationLock.current = true;
      setWalletOperation(action);

      if (action === "create") {
        const recovery = await invoke<WalletRecoveryInfo>("create_wallet", {
          filename: name,
          password: walletPassword,
        });

        setRecoveryInfo(recovery);
        setBackupConfirmed(false);
        setWalletPassword("");
        setWalletPasswordConfirm("");

        // Stay on the Wallet page so the recovery screen is shown.
        setView("wallet");
        return;
      }

      if (action === "open") {
        await invoke("open_wallet", {
          filename: name,
          password: walletPassword,
        });

        // Force the wallet to scan to the daemon's current height before
        // reading the balance. Without this, the first wallet_summary can
        // briefly report 0 FEEL after opening an existing wallet.
        await invoke("refresh_wallet");

        setWalletMessage("Wallet opened successfully.");
      } else {
        if (!seed.trim()) {
          throw new Error("Enter the recovery seed.");
        }

        const height = Number(restoreHeight || "0");

        if (!Number.isSafeInteger(height) || height < 0) {
          throw new Error("Enter a valid restore height.");
        }

        await invoke("restore_wallet", {
          filename: name,
          password: walletPassword,
          seed: seed.trim(),
          restoreHeight: height,
        });

        // Scan the restored wallet before showing its balance.
        await invoke("refresh_wallet");

        setSeed("");
        setWalletMessage("✓ Wallet restored successfully.");
      }

      setWalletPassword("");
      setWalletPasswordConfirm("");
      setView("overview");
    } catch (error) {
      const message = String(error);

      if (/already exists/i.test(message)) {
        setWalletMessage(
          `A wallet named "${name}" already exists on this device. Choose a different wallet name. Your existing wallet was not overwritten.`
        );
      } else if (/invalid password|wrong password|password.*invalid/i.test(message)) {
        setWalletMessage("Incorrect wallet password. Please try again.");
      } else if (/failed to open|does not exist|not found|no such file/i.test(message)) {
        setWalletMessage(
          `Wallet "${name}" was not found on this device. Check the wallet name or restore it from its recovery phrase.`
        );
      } else if (/seed|mnemonic/i.test(message)) {
        setWalletMessage(
          "The recovery phrase could not be accepted. Check every word and its order."
        );
      } else {
        setWalletMessage(message);
      }
    } finally {
      walletOperationLock.current = false;
      setWalletOperation(null);

      // Refresh only after the foreground wallet RPC command has completely ended.
      await refreshServices(true);
    }
  }

  function finishRecoveryBackup() {
    if (!backupConfirmed) return;

    setRecoveryInfo(null);
    setBackupConfirmed(false);
    setWalletMessage("Recovery information acknowledged. Keep your backup safe.");
    setView("overview");
  }

  async function copySecret(value: string, id: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedSecret(id);
      setWalletMessage(null);

      window.setTimeout(() => {
        setCopiedSecret((current) => current === id ? null : current);
      }, 1500);
    } catch {
      setWalletMessage("Unable to copy automatically. Select and copy it manually.");
    }
  }

  async function handleCloseWallet() {
    if (walletOperationLock.current || serviceRestartLock.current) return;

    walletOperationLock.current = true;
    setWalletMessage(null);

    try {
      await invoke("close_wallet");
      setWallet(null);
      setWalletMessage("Wallet closed safely.");
      setView("wallet");
    } catch (error) {
      setWalletMessage(String(error));
    } finally {
      walletOperationLock.current = false;
    }
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault();

    if (sending || walletOperationLock.current || serviceRestartLock.current) {
      return;
    }

    setSendResult(null);

    try {
      const amountAtomic = feelToAtomicString(sendAmount);
      const accepted = window.confirm(
        `Send ${sendAmount.trim()} FEEL to\n\n${sendAddress.trim()}\n\nThis will create a real Feelcoin transaction.`,
      );
      if (!accepted) return;

      setSending(true);

      const result = await invoke<{ tx_hash: string; fee: number; amount: number }>("send_feel", {
        address: sendAddress.trim(),
        amountAtomic,
      });

      setSendResult(`Transaction submitted: ${result.tx_hash || "hash pending"}`);
      setSendAddress("");
      setSendAmount("");
      await refreshServices();
      await loadHistory();
    } catch (error) {
      setSendResult(String(error));
    } finally {
      setSending(false);
    }
  }

  const transferRows = Object.entries(history).flatMap(([group, rows]) =>
    (rows || []).map((entry) => ({ ...entry, group })),
  );

  function navButton(target: View, label: string, disabled = false) {
    return (
      <button
        className={`nav-item ${view === target ? "active" : ""}`}
        disabled={disabled}
        onClick={() => setView(target)}
      >
        {label}
      </button>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="coin-mark" src="/feelcoin-logo.png" alt="Feelcoin logo" />
          <div>
            <strong>FEELCOIN</strong>
            <span>DESKTOP BETA</span>
          </div>
        </div>

        <nav>
          {navButton("overview", "Overview")}
          {navButton("wallet", "Wallet")}
          {navButton("send", "Send", !wallet)}
          {navButton("receive", "Receive", !wallet)}
          {navButton("transactions", "Transactions", !wallet)}
          {navButton("node", "Node")}
        </nav>

        <div className="sidebar-note">
          <span className="shield">✓</span>
          <div>
            <strong>No bundled miner</strong>
            <small>Only the official daemon and wallet RPC are included.</small>
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">OFFICIAL FEELCOIN WALLET · BETA</p>
            <h1>Feelcoin Desktop</h1>
            <p className="subtle">Self-contained local wallet for the Feelcoin community.</p>
          </div>

          <div className="status-stack">
            <div className={daemon.reachable ? "status online" : "status offline"}>
              <span />
              {daemon.reachable ? "Daemon online" : "Daemon starting"}
            </div>
            <div className={walletRpc.reachable ? "status online" : "status offline"}>
              <span />
              {walletRpc.reachable ? "Wallet RPC ready" : "Wallet RPC starting"}
            </div>
          </div>
        </header>

        {serviceSuccess && (
          <div className="banner success-banner">
            <strong>{serviceSuccess}</strong>
          </div>
        )}

        {serviceError && (
          <div className="banner error-banner">
            <strong>Local service startup issue</strong>
            <span>{serviceError}</span>
            <button
              onClick={restartServices}
              disabled={restartingServices || walletOperation !== null}
            >
              {restartingServices ? "Restarting…" : "Retry"}
            </button>
          </div>
        )}

        {view === "overview" && (
          <>
            <section className="hero-card">
              <div>
                <p className="eyebrow">FEELCOIN NETWORK</p>
                <h2>In Feels We Trust.</h2>
                <p>
                  One application, one local wallet experience. Feelcoin Desktop starts the
                  official Feelcoin node and wallet service automatically — no terminal required.
                </p>
              </div>
              <img className="hero-symbol" src="/feelcoin-logo.png" alt="Feelcoin" />
            </section>

            <section className="network-strip">
              <div>
                <span>BLOCK HEIGHT</span>
                <strong>{formatNumber(daemon.height)}</strong>
              </div>
              <div>
                <span>CONNECTIONS</span>
                <strong>{daemon.reachable ? formatNumber(totalConnections) : "—"}</strong>
              </div>
              <div>
                <span>NODE SYNC</span>
                <strong>
                  {daemon.synchronized == null ? "—" : daemon.synchronized ? "Synced" : "Syncing"}
                </strong>
              </div>
              <div>
                <span>WALLET</span>
                <strong>{wallet ? formatFeel(wallet.unlocked_balance) : "Closed"}</strong>
              </div>
            </section>

            <section className="grid">
              <article className="card">
                <div className="card-heading">
                  <div>
                    <p className="eyebrow">YOUR WALLET</p>
                    <h3>{wallet ? "Wallet ready" : "Create or open a wallet"}</h3>
                  </div>
                  <span className={wallet ? "dot online-dot" : "dot"} />
                </div>

                {wallet ? (
                  <>
                    <div className="balance-hero">{formatFeel(wallet.balance)}</div>
                    <div className="metric">
                      <span>Unlocked</span>
                      <strong>{formatFeel(wallet.unlocked_balance)}</strong>
                    </div>
                    <div className="metric">
                      <span>Wallet height</span>
                      <strong>{formatNumber(wallet.height)}</strong>
                    </div>
                    <div className="action-row">
                      <button className="primary" onClick={() => setView("send")}>Send</button>
                      <button className="secondary" onClick={() => setView("receive")}>Receive</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="service-note">
                      New here? Create a wallet. Already have one? Open or restore it locally.
                    </p>
                    <button className="primary" onClick={() => setView("wallet")}>
                      Set up wallet
                    </button>
                  </>
                )}
              </article>

              <article className="card">
                <p className="eyebrow">LOCAL NODE</p>
                <h3>Network status</h3>
                <div className="metric">
                  <span>Daemon RPC</span>
                  <strong>127.0.0.1:{network.daemon_rpc_port}</strong>
                </div>
                <div className="metric">
                  <span>Incoming peers</span>
                  <strong>{formatNumber(daemon.incoming_connections)}</strong>
                </div>
                <div className="metric">
                  <span>Outgoing peers</span>
                  <strong>{formatNumber(daemon.outgoing_connections)}</strong>
                </div>
                <div className="metric">
                  <span>Target block time</span>
                  <strong>{daemon.target_seconds == null ? "—" : `${daemon.target_seconds}s`}</strong>
                </div>
                <button className="secondary full" onClick={() => refreshServices()} disabled={checking}>
                  {checking ? "Refreshing…" : "Refresh"}
                </button>
              </article>

              <article className="card wide">
                <p className="eyebrow">BETA SECURITY MODEL</p>
                <h3>Visible processes. Explicit choices.</h3>
                <div className="principles">
                  <div><strong>No miner included</strong><span>The installer contains no mining engine.</span></div>
                  <div><strong>No AV bypasses</strong><span>No Defender exclusions or disable-security instructions.</span></div>
                  <div><strong>No packers</strong><span>No UPX or executable obfuscation in official builds.</span></div>
                  <div><strong>Local secrets</strong><span>Seeds and passwords are not written to application logs.</span></div>
                </div>
              </article>
            </section>
          </>
        )}

        {view === "wallet" && (
          <section className="page-card">
            {recoveryInfo ? (
              <div className="recovery-screen">
                <p className="eyebrow">WALLET RECOVERY BACKUP</p>
                <h2>Back up your new wallet</h2>

                <div className="recovery-warning">
                  <strong>Critical recovery information</strong>
                  <span>
                    Anyone with your recovery phrase or private spend key can control your FEEL.
                    Store this information offline in a safe place. Feelcoin cannot recover it for you.
                  </span>
                </div>

                <div className="secret-section">
                  <div className="secret-heading">
                    <div>
                      <span className="secret-label">RECOVERY PHRASE</span>
                      <strong>Write these words down in order</strong>
                    </div>
                    <button
                      className="secondary compact"
                      onClick={() => copySecret(recoveryInfo.mnemonic, "mnemonic")}
                    >
                      {copiedSecret === "mnemonic" ? "✓ Copied!" : "Copy"}
                    </button>
                  </div>
                  <div className="secret-box seed-box selectable">
                    {recoveryInfo.mnemonic}
                  </div>
                </div>

                <div className="recovery-key-grid">
                  <div className="secret-section">
                    <div className="secret-heading">
                      <div>
                        <span className="secret-label">PRIVATE VIEW KEY</span>
                        <strong>Private</strong>
                      </div>
                      <button
                        className="secondary compact"
                        onClick={() => copySecret(recoveryInfo.private_view_key, "view-key")}
                      >
                        {copiedSecret === "view-key" ? "✓ Copied!" : "Copy"}
                      </button>
                    </div>
                    <div className="secret-box selectable">
                      {recoveryInfo.private_view_key}
                    </div>
                  </div>

                  <div className="secret-section">
                    <div className="secret-heading">
                      <div>
                        <span className="secret-label">PRIVATE SPEND KEY</span>
                        <strong>Never share this key</strong>
                      </div>
                      <button
                        className="secondary compact"
                        onClick={() => copySecret(recoveryInfo.private_spend_key, "spend-key")}
                      >
                        {copiedSecret === "spend-key" ? "✓ Copied!" : "Copy"}
                      </button>
                    </div>
                    <div className="secret-box selectable">
                      {recoveryInfo.private_spend_key}
                    </div>
                  </div>
                </div>

                <label className="backup-confirm">
                  <input
                    type="checkbox"
                    checked={backupConfirmed}
                    onChange={(event) => setBackupConfirmed(event.target.checked)}
                  />
                  <span>
                    I have safely backed up my recovery phrase and understand that losing it may
                    permanently prevent recovery of this wallet.
                  </span>
                </label>

                <button
                  className="primary recovery-continue"
                  disabled={!backupConfirmed}
                  onClick={finishRecoveryBackup}
                >
                  Continue to wallet
                </button>

                {walletMessage && <div className="form-message">{walletMessage}</div>}
              </div>
            ) : (
              <>
                <p className="eyebrow">WALLET MANAGEMENT</p>
                <h2>{wallet ? "Wallet is open" : "Create, open or restore"}</h2>

                {wallet ? (
                  <>
                    <div className="balance-hero">{formatFeel(wallet.balance)}</div>
                    <div className="address-box">{wallet.address}</div>
                    <button
                      className="secondary danger"
                      onClick={handleCloseWallet}
                      disabled={walletOperation !== null}
                    >
                      Close wallet
                    </button>
                  </>
                ) : (
                  <div className="form-grid">
                    <label>
                      <span>Wallet name</span>
                      <input
                        value={walletName}
                        onChange={(event) => setWalletName(event.target.value)}
                        placeholder="my-feel-wallet"
                        autoComplete="off"
                        disabled={walletOperation !== null}
                      />
                    </label>

                    <label>
                      <span>Password</span>
                      <input
                        type="password"
                        value={walletPassword}
                        onChange={(event) => setWalletPassword(event.target.value)}
                        placeholder="Wallet password"
                        autoComplete="new-password"
                        disabled={walletOperation !== null}
                      />
                    </label>

                    <label>
                      <span>Confirm password — required for Create / Restore</span>
                      <input
                        type="password"
                        value={walletPasswordConfirm}
                        onChange={(event) => setWalletPasswordConfirm(event.target.value)}
                        placeholder="Repeat wallet password"
                        autoComplete="new-password"
                        disabled={walletOperation !== null}
                      />
                    </label>

                    <div className="wallet-actions">
                      <button
                        className="primary"
                        disabled={walletOperation !== null}
                        onClick={() => handleWalletAction("create")}
                      >
                        {walletOperation === "create" ? "Creating wallet…" : "Create new wallet"}
                      </button>

                      <button
                        className="secondary"
                        disabled={walletOperation !== null}
                        onClick={() => handleWalletAction("open")}
                      >
                        {walletOperation === "open" ? "Opening wallet…" : "Open existing wallet"}
                      </button>
                    </div>

                    <p className="service-note">
                      Open existing wallet uses a wallet already stored by Feelcoin Desktop on this device.
                    </p>

                    <div className="restore-panel">
                      <p className="eyebrow">RESTORE FROM RECOVERY SEED</p>

                      <label>
                        <span>Recovery seed</span>
                        <textarea
                          value={seed}
                          onChange={(event) => setSeed(event.target.value)}
                          placeholder="Enter your recovery seed locally"
                          rows={4}
                          spellCheck={false}
                          disabled={walletOperation !== null}
                        />
                      </label>

                      <label className="small-field">
                        <span>Restore height</span>
                        <input
                          inputMode="numeric"
                          value={restoreHeight}
                          onChange={(event) =>
                            setRestoreHeight(event.target.value.replace(/\D/g, ""))
                          }
                          disabled={walletOperation !== null}
                        />
                      </label>

                      <button
                        className="secondary"
                        disabled={walletOperation !== null}
                        onClick={() => handleWalletAction("restore")}
                      >
                        {walletOperation === "restore" ? "Restoring wallet…" : "Restore wallet"}
                      </button>
                    </div>
                  </div>
                )}

                {walletMessage && <div className="form-message">{walletMessage}</div>}
              </>
            )}
          </section>
        )}

        {view === "send" && wallet && (
          <section className="page-card">
            <p className="eyebrow">SEND FEEL</p>
            <h2>Create transaction</h2>
            <div className="balance-line">
              <span>Available</span>
              <strong>{formatFeel(wallet.unlocked_balance)}</strong>
            </div>
            <form className="send-form" onSubmit={handleSend}>
              <label>
                <span>Destination address</span>
                <textarea
                  value={sendAddress}
                  onChange={(event) => setSendAddress(event.target.value)}
                  placeholder="Feelcoin address"
                  rows={3}
                  spellCheck={false}
                  required
                />
              </label>
              <label>
                <span>Amount (FEEL)</span>
                <input
                  value={sendAmount}
                  onChange={(event) => setSendAmount(event.target.value)}
                  placeholder="0.000000000000"
                  inputMode="decimal"
                  required
                />
              </label>
              <button
                className="primary"
                type="submit"
                disabled={sending}
              >
                {sending ? "Sending…" : "Review & send"}
              </button>
            </form>
            {sendResult && <div className="form-message selectable">{sendResult}</div>}
          </section>
        )}

        {view === "receive" && wallet && (
          <section className="page-card">
            <p className="eyebrow">RECEIVE FEEL</p>
            <h2>Your primary address</h2>
            <p className="subtle">
              Scan the QR code or share your address to receive FEEL.
              Your private keys never leave this computer.
            </p>

            <div className="receive-panel">
              <div className="receive-qr-card">
                {receiveQr ? (
                  <img
                    className="receive-qr"
                    src={receiveQr}
                    alt="QR code for your Feelcoin address"
                  />
                ) : (
                  <div className="receive-qr-loading">Generating QR…</div>
                )}
              </div>

              <div className="receive-address-block">
                <span className="receive-address-label">YOUR FEELCOIN ADDRESS</span>
                <div className="receive-address selectable">{wallet.address}</div>

                <button
                  className="primary compact"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(wallet.address);
                      setAddressCopied(true);
                      setWalletMessage(null);

                      window.setTimeout(() => {
                        setAddressCopied(false);
                      }, 1500);
                    } catch {
                      setWalletMessage("Unable to copy the address automatically.");
                    }
                  }}
                >
                  {addressCopied ? "✓ Copied!" : "Copy address"}
                </button>
              </div>
            </div>
          </section>
        )}

        {view === "transactions" && wallet && (
          <section className="page-card">
            <div className="page-heading-row">
              <div>
                <p className="eyebrow">TRANSACTIONS</p>
                <h2>Wallet activity</h2>
              </div>
              <button className="secondary compact" onClick={loadHistory}>Refresh</button>
            </div>

            {transferRows.length === 0 ? (
              <div className="empty-state">No wallet transactions to show yet.</div>
            ) : (
              <div className="tx-list">
                {transferRows.slice(0, 100).map((entry, index) => (
                  <div className="tx-row" key={`${entry.txid ?? entry.tx_hash ?? index}-${index}`}>
                    <div>
                      <strong>{String(entry.group).toUpperCase()}</strong>
                      <span>{entry.txid ?? entry.tx_hash ?? "Transaction"}</span>
                    </div>
                    <div>
                      <strong>{formatFeel(entry.amount)}</strong>
                      <span>Height {formatNumber(entry.height)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {view === "node" && (
          <section className="page-card">
            <p className="eyebrow">LOCAL FULL NODE</p>
            <h2>Feelcoin node</h2>
            <div className="node-summary">
              <div><span>Status</span><strong>{daemon.reachable ? "Online" : "Starting"}</strong></div>
              <div><span>Block height</span><strong>{formatNumber(daemon.height)}</strong></div>
              <div><span>Target height</span><strong>{formatNumber(daemon.target_height)}</strong></div>
              <div><span>Difficulty</span><strong>{formatNumber(daemon.difficulty)}</strong></div>
              <div><span>Peers</span><strong>{daemon.reachable ? totalConnections : "—"}</strong></div>
              <div><span>P2P port</span><strong>{network.p2p_port}</strong></div>
              <div><span>Daemon RPC</span><strong>{network.daemon_rpc_port}</strong></div>
              <div><span>Wallet RPC</span><strong>{network.wallet_rpc_port}</strong></div>
            </div>
            <p className="service-note">
              Feelcoin Desktop uses the bundled official daemon, which discovers the Feelcoin network through the official bootstrap infrastructure and P2P peers.
            </p>
            <button
              className="secondary compact"
              onClick={restartServices}
              disabled={restartingServices || walletOperation !== null}
            >
              {restartingServices ? "Restarting services…" : "Restart services"}
            </button>
          </section>
        )}

        <footer>Feelcoin Desktop Beta · Windows + Linux · In Feels We Trust.</footer>
      </section>
    </main>
  );
}

export default App;
