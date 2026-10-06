import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type NetworkDefaults = {
  p2p_port: number;
  daemon_rpc_port: number;
  zmq_port: number;
  wallet_rpc_port: number;
};

type RpcStatus = {
  reachable: boolean;
  host: string;
  port: number;
};

const FALLBACK_NETWORK: NetworkDefaults = {
  p2p_port: 35780,
  daemon_rpc_port: 35781,
  zmq_port: 35782,
  wallet_rpc_port: 35784,
};

function App() {
  const [network, setNetwork] = useState<NetworkDefaults>(FALLBACK_NETWORK);
  const [rpc, setRpc] = useState<RpcStatus>({
    reachable: false,
    host: "127.0.0.1",
    port: FALLBACK_NETWORK.daemon_rpc_port,
  });
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    invoke<NetworkDefaults>("network_defaults")
      .then(setNetwork)
      .catch(() => setNetwork(FALLBACK_NETWORK));
  }, []);

  async function checkDaemon() {
    setChecking(true);
    try {
      const result = await invoke<RpcStatus>("check_daemon_rpc", {
        host: "127.0.0.1",
        port: network.daemon_rpc_port,
      });
      setRpc(result);
    } catch {
      setRpc({
        reachable: false,
        host: "127.0.0.1",
        port: network.daemon_rpc_port,
      });
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="coin-mark" src="/feelcoin-logo.png" alt="Feelcoin logo" />
          <div>
            <strong>FEELCOIN</strong>
            <span>DESKTOP</span>
          </div>
        </div>

        <nav>
          <button className="nav-item active">Overview</button>
          <button className="nav-item" disabled>Wallet</button>
          <button className="nav-item" disabled>Send</button>
          <button className="nav-item" disabled>Receive</button>
          <button className="nav-item" disabled>Transactions</button>
          <button className="nav-item" disabled>Node</button>
          <button className="nav-item" disabled>Settings</button>
        </nav>

        <div className="sidebar-note">
          <span className="shield">✓</span>
          <div>
            <strong>No bundled miner</strong>
            <small>Mining remains separate and opt-in.</small>
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">OFFICIAL FEELCOIN WALLET</p>
            <h1>Welcome to Feelcoin Desktop</h1>
            <p className="subtle">
              Local-first wallet control with transparent network status.
            </p>
          </div>

          <div className={rpc.reachable ? "status online" : "status offline"}>
            <span />
            {rpc.reachable ? "Local daemon online" : "Local daemon offline"}
          </div>
        </header>

        <section className="hero-card">
          <div>
            <p className="eyebrow">FEELCOIN NETWORK</p>
            <h2>In Feels We Trust.</h2>
            <p>
              This early desktop build focuses on a clean wallet experience,
              explicit local-node control, and a release design that avoids
              hidden processes or bundled mining software.
            </p>
          </div>
          <img className="hero-symbol" src="/feelcoin-logo.png" alt="Feelcoin" />
        </section>

        <section className="grid">
          <article className="card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">LOCAL NODE</p>
                <h3>Daemon connection</h3>
              </div>
              <span className={rpc.reachable ? "dot online-dot" : "dot"} />
            </div>

            <div className="metric">
              <span>RPC endpoint</span>
              <strong>{rpc.host}:{network.daemon_rpc_port}</strong>
            </div>

            <div className="metric">
              <span>Status</span>
              <strong>{rpc.reachable ? "Reachable" : "Not detected"}</strong>
            </div>

            <button className="primary" onClick={checkDaemon} disabled={checking}>
              {checking ? "Checking…" : "Check local daemon"}
            </button>
          </article>

          <article className="card">
            <p className="eyebrow">NETWORK DEFAULTS</p>
            <h3>Feelcoin ports</h3>
            <div className="ports">
              <div><span>P2P</span><strong>{network.p2p_port}</strong></div>
              <div><span>Daemon RPC</span><strong>{network.daemon_rpc_port}</strong></div>
              <div><span>ZMQ</span><strong>{network.zmq_port}</strong></div>
              <div><span>Wallet RPC</span><strong>{network.wallet_rpc_port}</strong></div>
            </div>
          </article>

          <article className="card wide">
            <p className="eyebrow">SECURITY MODEL</p>
            <h3>Visible processes. Explicit choices.</h3>
            <div className="principles">
              <div>
                <strong>No silent mining</strong>
                <span>The desktop wallet does not contain or launch a miner.</span>
              </div>
              <div>
                <strong>No antivirus bypasses</strong>
                <span>We do not ask users to disable Defender or add broad exclusions.</span>
              </div>
              <div>
                <strong>No packers or obfuscation</strong>
                <span>Official builds remain reviewable and straightforward.</span>
              </div>
              <div>
                <strong>Release verification</strong>
                <span>Official releases will publish SHA-256 checksums.</span>
              </div>
            </div>
          </article>
        </section>

        <footer>
          Feelcoin Desktop v0.1 development scaffold · Community-first · Open source
        </footer>
      </section>
    </main>
  );
}

export default App;
