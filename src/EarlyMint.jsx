import React,{useCallback,useEffect,useState} from "react";
import {ethers} from "ethers";
import "./early-mint.css";

const EXPLORER = "https://liteforge.explorer.caldera.xyz/address/";

export default function EarlyMint({contract,account}) {
  const [stats,setStats]=useState({minted:0,limit:250,active:false,eligible:false,claimed:false,maxSupply:0});
  const [isOwner,setIsOwner]=useState(false);
  const [uri,setUri]=useState("");
  const [wallets,setWallets]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("Connect your wallet to check Early Supporter eligibility.");

  const refresh=useCallback(async()=>{
    if(!contract||!account){setMessage("Connect your wallet on LitVM LiteForge.");return;}
    try{
      const [owner,limit,minted,active,eligible,claimed,maxSupply]=await Promise.all([
        contract.owner(),contract.GENESIS_LIMIT(),contract.genesisMinted(),
        contract.genesisSaleActive(),contract.genesisEligible(account),
        contract.hasMintedGenesis(account),contract.maxSupply()
      ]);
      setIsOwner(owner.toLowerCase()===account.toLowerCase());
      setStats({minted:Number(minted),limit:Number(limit),active,eligible,claimed,maxSupply:Number(maxSupply)});
      setMessage("Contract data loaded from LitVM LiteForge.");
    }catch(e){setMessage("Could not read this contract. Confirm the address and ABI match the deployed contract. "+(e.shortMessage||e.message||""));}
  },[contract,account]);

  useEffect(()=>{refresh();},[refresh]);

  async function claim(){
    if(!uri.trim()){setMessage("Enter the IPFS metadata URI before minting.");return;}
    setBusy(true);
    try{const tx=await contract.genesisMint(uri.trim());setMessage("Mint transaction submitted: "+tx.hash);await tx.wait();setMessage("Genesis NFT minted successfully!");await refresh();}
    catch(e){setMessage(e.shortMessage||e.reason||e.message||"Mint failed.");}
    finally{setBusy(false);}
  }
  async function updateAllowlist(){
    const list=[...new Set(wallets.split(/[\\s,;]+/).map(x=>x.trim()).filter(Boolean))];
    if(!list.length){setMessage("Paste at least one wallet address.");return;}
    if(list.length>250){setMessage("Maximum 250 addresses per batch.");return;}
    if(list.some(x=>!ethers.isAddress(x))){setMessage("One or more wallet addresses are invalid.");return;}
    setBusy(true);
    try{const tx=await contract.setGenesisEligibilityBatch(list,true);setMessage("Allowlist transaction submitted: "+tx.hash);await tx.wait();setMessage(list.length+" wallet(s) added to the Genesis allowlist.");setWallets("");await refresh();}
    catch(e){setMessage(e.shortMessage||e.reason||e.message||"Allowlist update failed.");}
    finally{setBusy(false);}
  }
  async function toggleSale(){
    setBusy(true);
    try{const tx=await contract.setGenesisSaleActive(!stats.active);setMessage("Sale control transaction submitted: "+tx.hash);await tx.wait();setMessage("Genesis mint is now "+(!stats.active?"ACTIVE":"PAUSED")+".");await refresh();}
    catch(e){setMessage(e.shortMessage||e.reason||e.message||"Could not change sale status.");}
    finally{setBusy(false);}
  }

  return <section className="early-mint">
    <div className="early-mint-head"><span className="early-kicker">LITVERSE GENESIS COLLECTION</span><h2>Early Supporter NFT</h2><p>Claim your free Genesis NFT on LitVM LiteForge. One claim per eligible wallet, first 250 claims only.</p></div>
    <div className="early-mint-stats"><div><b>{stats.minted} / {stats.limit}</b><span>Genesis NFTs minted</span></div><div><b>0 zkLTC</b><span>Mint price</span></div><div><b>{stats.active?"LIVE":"NOT LIVE"}</b><span>Mint status</span></div></div>
    {!contract||!account?<div className="early-message">Connect your wallet first. Make sure MetaMask is on LitVM LiteForge (Chain ID 4441).</div>:<div className="early-claim-card">
      <div className="early-status">{stats.eligible?"Your wallet is allowlisted": "Your wallet is not allowlisted"} · {stats.claimed?"Already claimed":"Not claimed"}</div>
      <label>IPFS metadata URI</label><input value={uri} onChange={e=>setUri(e.target.value)} placeholder="ipfs://... (required)"/>
      <button className="lv-primary wide" disabled={busy||!stats.active||!stats.eligible||stats.claimed||stats.minted>=stats.limit} onClick={claim}>{busy?"Please wait…":"Mint Free Genesis NFT"}</button>
      <p className="early-small">Mint price is 0 zkLTC, but your wallet still pays the network transaction gas. The metadata URI must already be uploaded and accessible.</p>
    </div>}
    <div className="early-message" role="status">{message}</div>
    <button className="lv-secondary" onClick={refresh} disabled={busy}>Refresh eligibility</button>
    {isOwner&&<div className="early-admin">
      <span className="early-kicker">OWNER CONTROLS</span><h3>Genesis launch controls</h3>
      <label>Eligible wallet addresses (comma, space or new line separated)</label>
      <textarea rows="6" value={wallets} onChange={e=>setWallets(e.target.value)} placeholder="0x..."/>
      <button className="lv-secondary" disabled={busy} onClick={updateAllowlist}>Add wallets to allowlist</button>
      <button className="lv-primary" disabled={busy} onClick={toggleSale}>{stats.active?"Pause Genesis Mint":"Activate Genesis Mint"}</button>
      <p className="early-small">Owner transactions require gas. Batch size is capped at 250 addresses. This interface only adds eligibility; it does not revoke it.</p>
    </div>}
    <p className="early-explorer"><a href={EXPLORER+ (contract?.target||"")} target="_blank" rel="noreferrer">View contract on LiteForge Explorer ↗</a></p>
  </section>;
}
