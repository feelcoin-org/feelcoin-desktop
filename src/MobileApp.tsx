import {useCallback,useEffect,useState} from "react";
import {invoke} from "@tauri-apps/api/core";
import "./mobile.css";
type Tab="wallet"|"mining"|"activity"|"settings";
type Stats={pool_hashrate?:number;network_hashrate?:number;network_height?:number;connected_miners?:number;pool_fee?:number;miner_hashrate?:number;miner_balance?:number;miner_total_paid?:number;worker_count?:number};
type Worker={name?:string;worker?:string;id?:string;hashrate?:number;hash_rate?:number;last_share?:number;last_seen?:number};
type Payment={amount?:number;timestamp?:number;time?:number;txid?:string;tx_hash?:string;hash?:string};
const STORAGE="feelcoin.android.mining.address.v1";
const walletURL="https://wallet.feelcoin.org";
const poolURL="https://pool.feelcoin.org";
function fmtHash(n?:number){if(!Number.isFinite(n))return "—";const v=n as number;const x=v>=1e9?[1e9,"GH/s"]:v>=1e6?[1e6,"MH/s"]:v>=1e3?[1e3,"KH/s"]:[1,"H/s"];return (v/(x[0] as number)).toLocaleString("en-US",{maximumFractionDigits:2})+" "+x[1];}
function fmtFeel(n?:number){return Number.isFinite(n)?(n as number).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:8})+" FEEL":"—";}
function fmtAtomic(n?:number){if(typeof n!=="number"||!Number.isSafeInteger(n)||n<0)return "—";const v=BigInt(n);const whole=(v/1000000000000n).toString();const fraction=(v%1000000000000n).toString().padStart(12,"0").replace(/0+$/,"");return whole+(fraction?"."+fraction:"")+" FEEL";}
function ago(t?:number){if(!t)return "Unknown";const ms=t>1e12?t:t*1000;const d=Math.max(0,Date.now()-ms);return d<6e4?"Just now":d<36e5?Math.floor(d/6e4)+"m ago":d<864e5?Math.floor(d/36e5)+"h ago":Math.floor(d/864e5)+"d ago";}
const isPublicAddress=(a:string)=>a.length>=90&&a.length<=110&&/^[1-9A-HJ-NP-Za-km-z]+$/.test(a);
const ICONS:Record<Tab,string>={wallet:"◈",mining:"⛏",activity:"↗",settings:"⚙"};
export default function MobileApp(){
 const [tab,setTab]=useState<Tab>("mining");
 const [address,setAddress]=useState(()=>localStorage.getItem(STORAGE)||"");
 const [draft,setDraft]=useState(address);
 const [editing,setEditing]=useState(!address);
 const [auto,setAuto]=useState(true);
 const [stats,setStats]=useState<Stats|null>(null);
 const [workers,setWorkers]=useState<Worker[]>([]);
 const [payments,setPayments]=useState<Payment[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [updated,setUpdated]=useState<number|null>(null);
 const refresh=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const a=isPublicAddress(address)?address:null;
   const out=await Promise.allSettled([
    invoke<Stats>("mobile_pool_stats",{walletAddress:a}),
    a?invoke<Worker[]>("mobile_pool_workers",{walletAddress:a}):Promise.resolve([]),
    a?invoke<Payment[]>("mobile_pool_payments",{walletAddress:a}):Promise.resolve([])
   ]);
   if(out[0].status==="fulfilled"){setStats(out[0].value);setUpdated(Date.now());}else{setStats(null);setError("Could not reach official Feelcoin Pool. Please try again.");}
   if(out[1].status==="fulfilled"&&Array.isArray(out[1].value)){
    const raw=out[1].value as unknown[];
    // Pool /workers reports an alternating [rig_name, hashrate, ...] array.
    const mapped:Worker[]=raw.length&&typeof raw[0]==="string"?Array.from({length:Math.floor(raw.length/2)},(_,i)=>({name:String(raw[i*2]),hashrate:Number(raw[i*2+1])})):raw as Worker[];
    setWorkers(mapped);
   }else setWorkers([]);
   setPayments(out[2].status==="fulfilled"&&Array.isArray(out[2].value)?out[2].value:[]);
  }finally{setLoading(false);}
 },[address]);
 useEffect(()=>{void refresh();},[refresh]);
 useEffect(()=>{if(!auto)return;const t=window.setInterval(()=>void refresh(),30000);return()=>clearInterval(t);},[refresh,auto]);
 function save(){const a=draft.trim();if(a&&!isPublicAddress(a)){setError("Invalid public FEEL address format.");return;}if(a)localStorage.setItem(STORAGE,a);else localStorage.removeItem(STORAGE);setAddress(a);setEditing(false);setError("");}
 function open(url:string){void invoke("mobile_open_link",{url}).catch(()=>setError("Could not open this link."));}
 const hasMiner=!!address&&!!stats;
 return <div className="fm">
  <header className="fm-header"><div className="fm-brand"><img alt="Official Feelcoin logo" src="/feelcoin-logo.png"/><div><b>FEELCOIN</b><small>ANDROID ALPHA</small></div></div><span className="fm-pill"><i/>MINING WATCH</span></header>
  <main className="fm-main">
   {tab==="mining"&&<>
    <p className="fm-kicker">YOUR MINERS. YOUR FEEL. ANYWHERE.</p><h1>Mining <em>Watch.</em></h1><p className="fm-lead">Real pool statistics. No phone mining, and no recovery seed required.</p>
    <section className="fm-card"><div className="fm-row"><div><small>TRACKED PUBLIC ADDRESS</small><strong className="fm-address">{address?address.slice(0,10)+"…"+address.slice(-7):"Not linked"}</strong></div><button className="fm-small" onClick={()=>{setDraft(address);setEditing(x=>!x);}}>Edit</button></div>{editing&&<div className="fm-edit"><label htmlFor="fm-address">Public FEEL receiving address</label><textarea id="fm-address" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Paste the address used by your miners" spellCheck={false}/><button className="fm-gold-button" onClick={save}>Save address</button><p>We only need your public mining address. Never enter a seed or private key.</p></div>}</section>
    <section className="fm-feature"><div className="fm-row"><small>YOUR CURRENT HASHRATE</small><span className="fm-green">● {hasMiner?"POOL DATA":"NOT LINKED"}</span></div><div className="fm-big">{fmtHash(hasMiner?stats?.miner_hashrate:undefined)}</div><div className="fm-row fm-foot"><span>Read-only pool data</span><span>{updated?"Updated "+ago(updated):"Not updated"}</span></div></section>
    <div className="fm-grid"><section className="fm-card"><small>UNPAID POOL BALANCE</small><strong>{fmtFeel(hasMiner?stats?.miner_balance:undefined)}</strong><span>Not wallet balance</span></section><section className="fm-card"><small>REPORTED WORKERS</small><strong>{hasMiner?(stats?.worker_count??workers.length):"—"}</strong><span>Pool worker count</span></section><section className="fm-card"><small>POOL PAID TOTAL</small><strong>{fmtFeel(hasMiner?stats?.miner_total_paid:undefined)}</strong><span>Historical payouts</span></section><section className="fm-card"><small>POOL FEE</small><strong>{stats?.pool_fee===undefined?"—":(stats.pool_fee*100).toFixed(2)+"%"}</strong><span>Current pool setting</span></section></div>
    <div className="fm-heading"><h2>Mining workers</h2><span>{workers.length} listed</span></div><section className="fm-card fm-list">{workers.length?workers.slice(0,20).map((w,i)=><div className="fm-worker" key={i}><div className="fm-worker-mark">▣</div><div className="fm-expand"><b>{w.name||w.worker||w.id||"Worker "+(i+1)}</b><small>Last share: {ago(w.last_share??w.last_seen)}</small></div><b className="fm-gold">{fmtHash(w.hashrate??w.hash_rate)}</b></div>):<div className="fm-empty">No worker information yet. Enter the same FEEL public address used by your miners.</div>}</section>
    <div className="fm-heading"><h2>Network snapshot</h2><span>Official pool</span></div><section className="fm-card fm-network"><div><span>Pool hashrate</span><b>{fmtHash(stats?.pool_hashrate)}</b></div><div><span>Network hashrate</span><b>{fmtHash(stats?.network_hashrate)}</b></div><div><span>Block height</span><b>{stats?.network_height?.toLocaleString()??"—"}</b></div><div><span>Connected miners</span><b>{stats?.connected_miners?.toLocaleString()??"—"}</b></div></section>
    <button className="fm-outline-button" disabled={loading} onClick={()=>void refresh()}>{loading?"Refreshing…":"↻ Refresh mining statistics"}</button><button className="fm-link" onClick={()=>open(poolURL)}>Official mining pool ↗</button>
   </>}
   {tab==="wallet"&&<><p className="fm-kicker">YOUR KEYS. YOUR CONTROL.</p><h1>Your <em>Wallet.</em></h1><section className="fm-feature fm-wallet"><img src="/feelcoin-logo.png" alt="Official FEEL coin"/><h2>Welcome to Feelcoin.</h2><p>Native Android wallet signing and storage are still under development. For now, securely access our existing non-custodial web wallet in your browser.</p><button className="fm-gold-button" onClick={()=>open(walletURL)}>Open official web wallet ↗</button></section><section className="fm-card"><b>Secure by design</b><p>This mining companion never asks for wallet passwords, private keys or seed phrases. Your monitoring address is public, and it cannot spend coins.</p></section></>}
   {tab==="activity"&&<><p className="fm-kicker">POOL PAYMENT HISTORY</p><h1>Mining <em>Payouts.</em></h1><p className="fm-lead">Pool records are different from confirmed funds in your wallet.</p><section className="fm-card fm-list">{address?payments.length?payments.slice(0,25).map((p,i)=><div className="fm-worker" key={i}><div className="fm-worker-mark">↗</div><div className="fm-expand"><b>{fmtAtomic(p.amount)}</b><small>{ago(p.timestamp??p.time)}</small></div></div>):<div className="fm-empty">No recent payouts reported for this address.</div>:<div className="fm-empty">Add your public mining address first.</div>}</section><button className="fm-outline-button" onClick={()=>void refresh()}>↻ Refresh payouts</button></>}
   {tab==="settings"&&<><p className="fm-kicker">YOUR APP</p><h1>Mining <em>Settings.</em></h1><section className="fm-card fm-row"><div><b>Foreground auto-refresh</b><p>Update pool data every 30 seconds while the app is open.</p></div><input aria-label="Automatic refresh" type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/></section><section className="fm-card"><b>Saved monitoring address</b><p className="fm-address fm-wrap">{address||"None"}</p><button className="fm-outline-button" onClick={()=>{localStorage.removeItem(STORAGE);setAddress("");setDraft("");setEditing(true);setTab("mining");}}>Forget public address</button></section><section className="fm-card"><b>Alpha limitations</b><p>Read-only monitoring only. No local mining, no faucet, no native transaction signing, no background notifications. Use the official browser wallet for wallet operations. Some pool data may be temporarily unavailable.</p></section><button className="fm-link" onClick={()=>open("https://feelcoin.org")}>Visit official website ↗</button><button className="fm-link" onClick={()=>open("https://github.com/feelcoin-org/feelcoin-desktop")}>View source on GitHub ↗</button></>}
   {error&&<p className="fm-error" role="status">{error}</p>}
  </main><nav className="fm-tabs" aria-label="App navigation">{(["wallet","mining","activity","settings"] as Tab[]).map(x=><button key={x} className={tab===x?"active":""} aria-current={tab===x?"page":undefined} onClick={()=>setTab(x)}><span>{ICONS[x]}</span><small>{x==="activity"?"Payouts":x.charAt(0).toUpperCase()+x.slice(1)}</small></button>)}</nav>
 </div>;
}
