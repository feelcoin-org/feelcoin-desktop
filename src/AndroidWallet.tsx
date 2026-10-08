import {useEffect,useState,type FormEvent} from "react";

type CoreWallet={
 address?:string; address_string?:string;
 mnemonic?:string; mnemonic_string?:string;
 seed?:string; seed_string?:string;
 sec_viewKey_string?:string; sec_spendKey_string?:string;
 pub_viewKey_string?:string; pub_spendKey_string?:string;
 privateViewKey?:string; privateSpendKey?:string;
 publicViewKey?:string; publicSpendKey?:string;
 err_msg?:string; error?:string;
};
type Wallet={address:string;mnemonic:string;privateViewKey:string;privateSpendKey:string;publicViewKey:string;publicSpendKey:string;restoreHeight:number};
type Core={
 newly_created_wallet:(locale:string,network:string)=>CoreWallet|string;
 seed_and_keys_from_mnemonic:(mnemonic:string,network:string)=>CoreWallet|string;
};
type CoreFactory=(options:{locateFile:(name:string)=>string})=>Promise<Core>;
type Vault={version:number;kdf:string;iterations:number;cipher:string;salt:string;iv:string;data:string};

const ENGINE="/wasm/MyMoneroCoreCpp_WASM.js";
const PREFIX="feelcoin.android.wallet.v1:";
const ITERATIONS=250000;
let corePromise:Promise<Core>|undefined;

function loadCore():Promise<Core>{
 if(corePromise)return corePromise;
 corePromise=new Promise<Core>((resolve,reject)=>{
  const win=window as typeof window&{MyMoneroClient?:CoreFactory};
  const start=()=>{
   if(!win.MyMoneroClient){reject(new Error("Feelcoin cryptographic engine is unavailable."));return;}
   win.MyMoneroClient({locateFile:(name:string)=>"/wasm/"+name}).then(resolve,reject);
  };
  if(win.MyMoneroClient){start();return;}
  const script=document.createElement("script");
  script.src=ENGINE;
  script.async=true;
  script.onload=start;
  script.onerror=()=>reject(new Error("Bundled Feelcoin WASM library could not be loaded."));
  document.head.appendChild(script);
 }).catch(error=>{corePromise=undefined;throw error;});
 return corePromise;
}
function decoded(input:CoreWallet|string):Wallet{
 const w=(typeof input==="string"?JSON.parse(input):input) as CoreWallet;
 if(!w||w.err_msg||w.error)throw new Error(String(w?.err_msg||w?.error||"Invalid wallet engine response."));
 const address=w.address||w.address_string||"";
 const mnemonic=w.mnemonic||w.mnemonic_string||w.seed||w.seed_string||"";
 if(!/^[1-9A-HJ-NP-Za-km-z]{90,110}$/.test(address))throw new Error("The wallet engine returned an invalid FEEL address.");
 return {
  address,mnemonic,
  privateViewKey:w.privateViewKey||w.sec_viewKey_string||"",
  privateSpendKey:w.privateSpendKey||w.sec_spendKey_string||"",
  publicViewKey:w.publicViewKey||w.pub_viewKey_string||"",
  publicSpendKey:w.publicSpendKey||w.pub_spendKey_string||"",
  restoreHeight:0
 };
}
function cleanName(value:string){
 const v=value.trim();
 if(!/^[A-Za-z0-9._-]{1,64}$/.test(v))throw new Error("Wallet name: 1–64 letters, numbers, dots, dashes or underscores.");
 return v;
}
function validPassword(p:string){
 if(p.length<8)throw new Error("Choose a password of at least 8 characters.");
 return p;
}
function base64(bytes:Uint8Array):string{
 let str="";for(const c of bytes)str+=String.fromCharCode(c);return btoa(str);
}
function unbase64(value:string):Uint8Array{
 const str=atob(value);return Uint8Array.from(str,character=>character.charCodeAt(0));
}
async function keyFrom(password:string,salt:Uint8Array):Promise<CryptoKey>{
 const raw=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"]);
 return crypto.subtle.deriveKey({name:"PBKDF2",salt:new Uint8Array(salt),iterations:ITERATIONS,hash:"SHA-256"},
  raw,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
async function seal(wallet:Wallet,password:string):Promise<Vault>{
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await keyFrom(password,salt);
 const plain=new TextEncoder().encode(JSON.stringify(wallet));
 const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,plain);
 plain.fill(0);
 return {version:1,kdf:"PBKDF2-SHA256",iterations:ITERATIONS,cipher:"AES-256-GCM",
  salt:base64(salt),iv:base64(iv),data:base64(new Uint8Array(cipher))};
}
async function unseal(raw:string,password:string):Promise<Wallet>{
 try{
  const vault=JSON.parse(raw) as Vault;
  if(vault.version!==1||vault.cipher!=="AES-256-GCM"||vault.kdf!=="PBKDF2-SHA256"||
     vault.iterations!==ITERATIONS)throw new Error("Unsupported wallet format.");
  const key=await keyFrom(password,unbase64(vault.salt));
  const bytes=await crypto.subtle.decrypt({name:"AES-GCM",iv:unbase64(vault.iv)},key,unbase64(vault.data));
  const wallet=JSON.parse(new TextDecoder().decode(bytes)) as Wallet;
  if(!wallet.address||!/^[1-9A-HJ-NP-Za-km-z]{90,110}$/.test(wallet.address))throw new Error("Invalid wallet.");
  return wallet;
 }catch{throw new Error("Wrong password or damaged wallet data.");}
}
function storedNames(){
 const names:string[]=[];
 for(let i=0;i<localStorage.length;i++){
  const k=localStorage.key(i);
  if(k?.startsWith(PREFIX))names.push(k.slice(PREFIX.length));
 }
 return names.sort();
}
async function writeVault(name:string,password:string,wallet:Wallet){
 if(localStorage.getItem(PREFIX+name)!==null)throw new Error("This wallet name already exists. Choose another name.");
 const encrypted=await seal(wallet,password);
 localStorage.setItem(PREFIX+name,JSON.stringify(encrypted));
}
type Mode="open"|"create"|"recover";
export default function AndroidWallet(){
 const [engine,setEngine]=useState<"loading"|"ready"|"error">("loading");
 const [engineError,setEngineError]=useState("");
 const [mode,setMode]=useState<Mode>("open");
 const [names,setNames]=useState<string[]>(()=>storedNames());
 const [name,setName]=useState("");
 const [password,setPassword]=useState("");
 const [confirm,setConfirm]=useState("");
 const [seed,setSeed]=useState("");
 const [restoreHeight,setRestoreHeight]=useState("0");
 const [current,setCurrent]=useState<{name:string;address:string}|null>(null);
 const [backupSeed,setBackupSeed]=useState("");
 const [backupConfirmed,setBackupConfirmed]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 useEffect(()=>{
  let active=true;
  loadCore().then(()=>{if(active)setEngine("ready");}).catch((err:unknown)=>{
   if(active){setEngine("error");setEngineError(String(err));}
  });
  return()=>{active=false;};
 },[]);
 function changeMode(next:Mode){setMode(next);setPassword("");setConfirm("");setSeed("");setError("");setMessage("");}
 function lock(){setCurrent(null);setBackupSeed("");setSeed("");setPassword("");setConfirm("");setBackupConfirmed(false);setMessage("Wallet locked.");}
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError("");setMessage("");
  try{
   const walletName=cleanName(name);
   const pass=validPassword(password);
   if(mode==="open"){
    const vault=localStorage.getItem(PREFIX+walletName);
    if(!vault)throw new Error("No local wallet with that name. You can recover it from its seed.");
    const opened=await unseal(vault,pass);
    setCurrent({name:walletName,address:opened.address});
    setBackupSeed("");
    setMessage("Local encrypted wallet opened successfully. Blockchain synchronization is not yet available.");
   }else{
    if(pass!==confirm)throw new Error("Passwords do not match.");
    if(localStorage.getItem(PREFIX+walletName)!==null)throw new Error("This wallet name already exists.");
    const core=await loadCore();
    let wallet:Wallet;
    if(mode==="create"){
     wallet=decoded(core.newly_created_wallet("en-US","MAINNET"));
     if(!wallet.mnemonic)throw new Error("Engine did not return a recovery seed. Wallet not saved.");
     const verify=decoded(core.seed_and_keys_from_mnemonic(wallet.mnemonic,"MAINNET"));
     if(verify.address!==wallet.address)throw new Error("Seed verification failed. Wallet not saved.");
    }else{
     const normalized=seed.trim().replace(/\\s+/g," ");
     if(!normalized)throw new Error("Enter your FEEL recovery seed.");
     wallet=decoded(core.seed_and_keys_from_mnemonic(normalized,"MAINNET"));
     wallet.mnemonic=normalized;
     const height=Number(restoreHeight);
     if(!Number.isSafeInteger(height)||height<0)throw new Error("Restore height must be a positive integer.");
     wallet.restoreHeight=height;
    }
    await writeVault(walletName,pass,wallet);
    setNames(storedNames());
    setCurrent({name:walletName,address:wallet.address});
    setBackupSeed(mode==="create"?wallet.mnemonic:"");
    setBackupConfirmed(false);
    setMessage(mode==="create"?"New FEEL address generated and encrypted locally. Save your seed before leaving this screen.":"Wallet recovered and encrypted locally. Balance scanning is pending.");
   }
   setPassword("");setConfirm("");setSeed("");
  }catch(err){setError(err instanceof Error?err.message:String(err));}
  finally{setBusy(false);}
 }
 return <div className="fm-wallet-native">
  <p className="fm-kicker">ON-DEVICE FEELCOIN KEY CONTROL</p>
  <h1>Your <em>Wallet.</em></h1>
  <p className="fm-lead">Create, unlock and recover your FEEL keys directly in this APK. Cryptography runs on your phone; no local daemon or seed upload.</p>
  <section className="fm-card">
   <div className="fm-row"><b>Local wallet engine</b><span className={engine==="ready"?"fm-node-online":"fm-node-offline"}>● {engine==="ready"?"Ready":engine==="loading"?"Loading…":"Unavailable"}</span></div>
   <p>Private test build. No balance sync or transaction signing yet. Use a disposable wallet only.</p>
   {engineError&&<p className="fm-muted-error">{engineError}</p>}
  </section>
  {current?<>
   <section className="fm-feature">
    <small>UNLOCKED LOCAL WALLET</small>
    <h2 style={{margin:"10px 0",fontSize:23}}>{current.name}</h2>
    <small>PUBLIC FEELCOIN ADDRESS</small>
    <p className="fm-address fm-wrap">{current.address}</p>
    <button className="fm-outline-button" onClick={()=>{void navigator.clipboard.writeText(current.address).then(()=>setMessage("Public address copied.")).catch(()=>setError("Clipboard unavailable."));}}>Copy public address</button>
    <div className="fm-network" style={{marginTop:15}}><div><span>Wallet balance</span><b>Not synchronized</b></div><div><span>Sending</span><b>Not enabled</b></div></div>
   </section>
   {!!backupSeed&&!backupConfirmed&&<section className="fm-card fm-backup">
    <h2>Back up your recovery seed</h2>
    <p>Write these words down offline in order. Anyone with this phrase can spend your FEEL. Do not screenshot or share it.</p>
    <div className="fm-seed">{backupSeed}</div>
    <label className="fm-check"><input type="checkbox" checked={backupConfirmed} onChange={e=>setBackupConfirmed(e.target.checked)}/> I have written down my recovery seed securely.</label>
   </section>}
   {!!backupSeed&&backupConfirmed&&<p className="fm-lead">Seed backup acknowledged. Lock the wallet to clear it from this view.</p>}
   <button className="fm-gold-button" onClick={lock}>Lock wallet</button>
  </>:<>
   <div className="fm-auth-tabs">
    {(["open","create","recover"] as Mode[]).map(m=><button type="button" key={m} className={mode===m?"selected":""} onClick={()=>changeMode(m)}>{m==="open"?"Open":m==="create"?"Create":"Recover"}</button>)}
   </div>
   <section className="fm-card">
    {mode==="open"&&<><b>Open encrypted wallet</b><p>Choose a wallet previously created on this device.</p></>}
    {mode==="create"&&<><b>Create a Feelcoin wallet</b><p>Generate a new mainnet address and save an encrypted vault on your phone.</p></>}
    {mode==="recover"&&<><b>Recover from seed</b><p>Restore the exact same FEEL address using your offline recovery words.</p></>}
    <form onSubmit={event=>{void submit(event);}} className="fm-wallet-form">
     <label htmlFor="fm-wallet-name">Wallet name</label>
     {mode==="open"&&names.length>0?<select id="fm-wallet-name" required value={name} onChange={e=>setName(e.target.value)}><option value="">Choose a wallet</option>{names.map(n=><option key={n} value={n}>{n}</option>)}</select>:
     <input id="fm-wallet-name" required placeholder="my-wallet" autoComplete="off" value={name} onChange={e=>setName(e.target.value)}/>}
     <label htmlFor="fm-wallet-password">Wallet password</label>
     <input id="fm-wallet-password" type="password" required minLength={8} autoComplete="off" placeholder="At least 8 characters" value={password} onChange={e=>setPassword(e.target.value)}/>
     {mode!=="open"&&<><label htmlFor="fm-wallet-confirm">Confirm password</label><input id="fm-wallet-confirm" type="password" required minLength={8} autoComplete="off" value={confirm} onChange={e=>setConfirm(e.target.value)}/></>}
     {mode==="recover"&&<>
      <label htmlFor="fm-wallet-seed">FEEL recovery phrase</label>
      <textarea id="fm-wallet-seed" required autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Enter all recovery words in order" value={seed} onChange={e=>setSeed(e.target.value)}/>
      <label htmlFor="fm-wallet-height">Restore block height</label>
      <input id="fm-wallet-height" type="number" min={0} step={1} value={restoreHeight} onChange={e=>setRestoreHeight(e.target.value)}/>
     </>}
     <button className="fm-gold-button" type="submit" disabled={busy||engine!=="ready"}>{busy?"Processing on device…":mode==="open"?"Open wallet":mode==="create"?"Create wallet":"Recover wallet"}</button>
    </form>
   </section>
  </>}
  {!!error&&<p className="fm-error" role="alert">{error}</p>}
  {!!message&&<p className="fm-lead" role="status">{message}</p>}
  <p className="fm-lead">Passwords, private keys and recovery phrases must never be entered into the mining pool. This is an unaudited private-device prototype; do not deposit real funds.</p>
 </div>;
}
