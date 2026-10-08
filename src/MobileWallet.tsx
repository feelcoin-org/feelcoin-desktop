import { useEffect, useState, type FormEvent } from "react";
import {
  feelcoinCore, generateWallet, openWallet, recoverWallet, saveWallet, walletNames
} from "./mobileWallet";
import "./mobile-wallet.css";

type Mode = "open" | "create" | "recover";
type Opened = { name: string; address: string; restoreHeight: number };

export default function MobileWallet() {
  const [mode, setMode] = useState<Mode>("create");
  const [knownWallets, setKnownWallets] = useState<string[]>(() => walletNames());
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mnemonic, setMnemonic] = useState("");
  const [height, setHeight] = useState("0");
  const [backupWords, setBackupWords] = useState("");
  const [backedUp, setBackedUp] = useState(false);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [busy, setBusy] = useState(false);
  const [coreStatus, setCoreStatus] = useState("Preparing offline wallet engine…");
  const [coreErrorCode, setCoreErrorCode] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void feelcoinCore()
      .then(() => { if (active) { setCoreStatus("Local Feelcoin crypto engine ready"); setCoreErrorCode(""); } })
      .catch((error: unknown) => { if (active) { setCoreStatus("Local crypto initialization failed — report this screen"); const text = error instanceof Error ? error.message : String(error); setCoreErrorCode(/content security policy|unsafe-eval|eval|compileerror/i.test(text) ? "CSP_OR_WASM_COMPILE" : /fetch|network|404|failed to load|missing/i.test(text) ? "ENGINE_ASSET_LOAD" : /memory|allocation/i.test(text) ? "WASM_MEMORY" : "ENGINE_INIT_OTHER"); } });
    return () => { active = false; };
  }, []);

  function reset(modeNext: Mode) {
    setMode(modeNext);
    setName("");
    setPassword("");
    setConfirmPassword("");
    setMnemonic("");
    setHeight("0");
    setMessage("");
    setBackupWords("");
    setBackedUp(false);
    setOpened(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      const cleanName = name.trim();
      if (!cleanName) throw new Error("Enter a wallet name.");
      if (!password) throw new Error("Enter your local wallet password.");
      if (mode !== "open" && password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }
      if (mode === "open") {
        const wallet = await openWallet(cleanName, password);
        setOpened({ name: cleanName, address: wallet.address, restoreHeight: wallet.restoreHeight });
      } else {
        const wallet = mode === "create"
          ? await generateWallet()
          : await recoverWallet(mnemonic, Number(height));
        await saveWallet(cleanName, password, wallet);
        setKnownWallets(walletNames());
        if (mode === "create") {
          setBackupWords(wallet.mnemonic);
          setBackedUp(false);
        } else {
          setOpened({ name: cleanName, address: wallet.address, restoreHeight: wallet.restoreHeight });
        }
      }
      setPassword("");
      setConfirmPassword("");
      setMnemonic("");
    } catch (error) {
      const info = error instanceof Error ? error.message : "Wallet operation failed.";
      // Never display crypto-engine-provided details that might echo user seed material.
      setMessage(/engine|mnemonic|wasm/i.test(info) ? "Local wallet engine failed. Please report this error; seed and keys must never be shared." : info);
    } finally {
      setBusy(false);
    }
  }

  const chooseMode = (next: Mode) => { reset(next); };
  if (opened) return (
    <>
      <p className="fm-kicker">LOCAL WALLET • PRIVATE DEVICE TEST</p>
      <h1>Your <em>Wallet.</em></h1>
      <section className="fm-feature fm-wallet">
        <img src="/feelcoin-logo.png" alt="Feelcoin official gold coin" />
        <div className="fm-green">● Encrypted wallet unlocked locally</div>
        <h2>{opened.name}</h2>
        <small>YOUR FEEL RECEIVING ADDRESS</small>
        <p className="fm-address fm-wrap">{opened.address}</p>
        <button className="fm-outline-button" onClick={() => void navigator.clipboard.writeText(opened.address).then(() => setMessage("Public receiving address copied.")).catch(() => setMessage("Clipboard unavailable."))}>
          Copy receiving address
        </button>
      </section>
      <section className="fm-card fm-network">
        <div><span>Wallet storage</span><b>Local • password-encrypted</b></div>
        <div><span>Key generation</span><b>On device</b></div>
        <div><span>Restore height</span><b>{opened.restoreHeight.toLocaleString()}</b></div>
        <div><span>Current balance</span><b>Not synchronized</b></div>
      </section>
      <p className="fm-lead">Your local keys never leave the phone. Wallet balance scanning, sending and transaction signing are not active in this test APK. Do not fund this wallet for now.</p>
      <button className="fm-gold-button" onClick={() => reset("open")}>Lock wallet</button>
      {message && <p className="fm-wallet-message" role="status">{message}</p>}
    </>
  );

  if (backupWords) return (
    <>
      <p className="fm-kicker">IMPORTANT • WALLET BACKUP</p>
      <h1>Save your <em>Seed.</em></h1>
      <section className="fm-feature">
        <strong>Write down these words in order, privately.</strong>
        <p className="fm-wallet-warning">Never share your recovery phrase, photograph it, or paste it into an online website. Anyone with these words can spend your coins.</p>
        <div className="fm-recovery-phrase">{backupWords}</div>
        <label className="fm-wallet-check"><input type="checkbox" checked={backedUp} onChange={e => setBackedUp(e.target.checked)} /> I have securely backed up my recovery seed.</label>
        <button className="fm-gold-button" disabled={!backedUp} onClick={() => {
          setBackupWords(""); setBackedUp(false);
          setMessage("Wallet encrypted on device. Open it using your name and password.");
          setMode("open"); setName("");
        }}>I saved my seed — continue</button>
      </section>
    </>
  );

  return (
    <>
      <p className="fm-kicker">YOUR KEYS. YOUR DEVICE.</p>
      <h1>Your <em>Wallet.</em></h1>
      <p className="fm-lead">Create, open or restore a FEEL wallet within this app. No local daemon, no account registration, and no recovery seed sent to the server.</p>
      <div className="fm-wallet-modes">
        {(["create", "open", "recover"] as Mode[]).map(tab => (
          <button type="button" key={tab} onClick={() => chooseMode(tab)} className={mode === tab ? "active" : ""}>
            {tab === "create" ? "Create" : tab === "open" ? "Open" : "Recover"}
          </button>
        ))}
      </div>
      <section className="fm-card">
        <p className="fm-wallet-engine">◈ {coreStatus}{coreErrorCode ? ` (diagnostic: ${coreErrorCode})` : ""}</p>
        <form className="fm-wallet-form" onSubmit={event => void submit(event)} autoComplete="off">
          <label htmlFor="feel-wallet-name">Wallet name</label>
          {mode === "open" && knownWallets.length > 0 ? (
            <select id="feel-wallet-name" value={name} onChange={e => setName(e.target.value)} required>
              <option value="">Select saved wallet</option>
              {knownWallets.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          ) : (
            <input id="feel-wallet-name" value={name} onChange={e => setName(e.target.value)} maxLength={64} autoCapitalize="none" placeholder="my-feel-wallet" required />
          )}
          {mode === "recover" && (
            <>
              <label htmlFor="feel-seed">Recovery seed words</label>
              <textarea id="feel-seed" value={mnemonic} onChange={e => setMnemonic(e.target.value)} placeholder="Enter your Feelcoin recovery words in order" rows={4} spellCheck={false} autoComplete="off" required />
              <label htmlFor="feel-restore-height">Restore height (0 = full rescan later)</label>
              <input id="feel-restore-height" type="number" min="0" step="1" value={height} onChange={e => setHeight(e.target.value)} />
            </>
          )}
          <label htmlFor="feel-wallet-password">{mode === "open" ? "Wallet password" : "New wallet password (10+ characters)"}</label>
          <input id="feel-wallet-password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="off" required />
          {mode !== "open" && (
            <>
              <label htmlFor="feel-wallet-password2">Confirm password</label>
              <input id="feel-wallet-password2" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="off" required />
            </>
          )}
          <button type="submit" className="fm-gold-button" disabled={busy}>
            {busy ? "Working locally…" : mode === "create" ? "Create local wallet" : mode === "open" ? "Unlock wallet" : "Recover wallet locally"}
          </button>
        </form>
        {message && <p className="fm-wallet-message" role="alert">{message}</p>}
      </section>
      <section className="fm-card">
        <b>Private beta • local wallet test</b>
        <p>Passwords and private keys are stored only in a password-encrypted device vault. Android Keystore integration, balance scanning, sending and full device recovery testing are pending. Test with an empty wallet; do not use significant funds.</p>
      </section>
    </>
  );
}
