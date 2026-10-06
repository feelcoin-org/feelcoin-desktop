import { FormEvent, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

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
  const [walletMessage, setWalletMessage] = useState<string | null>(null);

  const [walletName, setWalletName] = useState("");
  const [walletPassword, setWalletPassword] = useState("");
  const [seed, setSeed] = useState("");
  const [restoreHeight, setRestoreHeight] = useState("0");

  const [sendAddress, setSendAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendResult, setSendResult] = useState<string | null>(null);

  const totalConnections = useMemo(
    () => (daemon.incoming_connections ?? 0) + (daemon.outgoing_connections ?? 0),
    [daemon.incoming_connections, daemon.outgoing_connections],
  );

  async function refreshServices() {
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
      setChecking(false);
    }
  }

  async function startServices() {
    setServiceError(null);
    try {
      await invoke("start_local_services");
      await new Promise((resolve) => window.setTimeout(resolve, 1600));
      await refreshServices();
    } catch (error) {
      setServiceError(String(error));
      await refreshServices();
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

  async function handleWalletAction(action: "create" | "open" | "restore") {
    setWalletMessage(null);

    try {
      if (!walletName.trim()) throw new Error("Choose a wallet name.");

      if (action === "create") {
        await invoke("create_wallet", {
          filename: walletName.trim(),
          password: walletPassword,
        });
        setWalletMessage("Wallet created successfully.");
      } else if (action === "open") {
        await invoke("open_wallet", {
          filename: walletName.trim(),
          password: walletPassword,
        });
        setWalletMessage("Wallet opened.");
      } else {
        if (!seed.trim()) throw new Error("Enter the recovery seed.");
        await invoke("restore_wallet", {
          filename: walletName.trim(),
          password: walletPassword,
          seed: seed.trim(),
          restoreHeight: Number(restoreHeight || "0"),
        });
        setWalletMessage("Wallet restored. Synchronization may take a while.");
        setSeed("");
      }

      setWalletPassword("");
      await refreshServices();
      setView("overview");
    } catch (error) {
      setWalletMessage(String(error));
    }
  }

  async function handleCloseWallet() {
    try {
      await invoke("close_wallet");
      setWallet(null);
      setWalletMessage("Wallet closed safely.");
      setView("wallet");
    } catch (error) {
      setWalletMessage(String(error));
    }
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    setSendResult(null);

    try {
      const amountAtomic = feelToAtomicString(sendAmount);
      const accepted = window.confirm(
        `Send ${sendAmount.trim()} FEEL to\n\n${sendAddress.trim()}\n\nThis will create a real Feelcoin transaction.`,
      );
      if (!accepted) return;

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
            <span>DESKTOP ALPHA</span>
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
            <p className="eyebrow">OFFICIAL FEELCOIN WALLET · ALPHA</p>
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

        {serviceError && (
          <div className="banner error-banner">
            <strong>Local service startup issue</strong>
            <span>{serviceError}</span>
            <button onClick={startServices}>Retry</button>
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
                <button className="secondary full" onClick={refreshServices} disabled={checking}>
                  {checking ? "Refreshing…" : "Refresh"}
                </button>
              </article>

              <article className="card wide">
                <p className="eyebrow">ALPHA SECURITY MODEL</p>
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
            <p className="eyebrow">WALLET MANAGEMENT</p>
            <h2>{wallet ? "Wallet is open" : "Create, open or restore"}</h2>

            {wallet ? (
              <>
                <div className="balance-hero">{formatFeel(wallet.balance)}</div>
                <div className="address-box">{wallet.address}</div>
                <button className="secondary danger" onClick={handleCloseWallet}>Close wallet</button>
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
                  />
                </label>

                <div className="wallet-actions">
                  <button className="primary" onClick={() => handleWalletAction("create")}>
                    Create new wallet
                  </button>
                  <button className="secondary" onClick={() => handleWalletAction("open")}>
                    Open existing wallet
                  </button>
                </div>

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
                    />
                  </label>
                  <label className="small-field">
                    <span>Restore height</span>
                    <input
                      inputMode="numeric"
                      value={restoreHeight}
                      onChange={(event) => setRestoreHeight(event.target.value.replace(/\D/g, ""))}
                    />
                  </label>
                  <button className="secondary" onClick={() => handleWalletAction("restore")}>
                    Restore wallet
                  </button>
                </div>
              </div>
            )}

            {walletMessage && <div className="form-message">{walletMessage}</div>}
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
              <button className="primary" type="submit">Review & send</button>
            </form>
            {sendResult && <div className="form-message selectable">{sendResult}</div>}
          </section>
        )}

        {view === "receive" && wallet && (
          <section className="page-card">
            <p className="eyebrow">RECEIVE FEEL</p>
            <h2>Your primary address</h2>
            <p className="subtle">Share this address to receive FEEL. Your private keys never leave this computer.</p>
            <div className="receive-address selectable">{wallet.address}</div>
            <button
              className="primary compact"
              onClick={() => navigator.clipboard.writeText(wallet.address)}
            >
              Copy address
            </button>
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
            <button className="secondary compact" onClick={startServices}>Restart / retry services</button>
          </section>
        )}

        <footer>Feelcoin Desktop Alpha · Windows + Linux · In Feels We Trust.</footer>
      </section>
    </main>
  );
}

export default App;
