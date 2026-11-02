import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ethers} from 'ethers';
import {Home,ImagePlus,Store,GalleryVerticalEnd,Activity,Wallet,Plus,ArrowUpRight,RefreshCw,Compass,Flame,Menu,X,ExternalLink,ShieldCheck,Sparkles} from 'lucide-react';
import './style.css';

const CHAIN={chainId:'0x1159',chainName:'LitVM LiteForge',nativeCurrency:{name:'zkLTC',symbol:'zkLTC',decimals:18},rpcUrls:['https://liteforge.rpc.caldera.xyz/http'],blockExplorerUrls:['https://liteforge.explorer.caldera.xyz']};
const CONTRACT_ADDRESS=import.meta.env.VITE_LITVERSE_NFT_CONTRACT_ADDRESS||'';
const short=a=>a?`${a.slice(0,6)}...${a.slice(-4)}`:'';
const tabs=[['Home',Home],['NFT Studio',ImagePlus],['Marketplace',Store],['My NFTs',GalleryVerticalEnd],['Collection',Compass],['Activity',Activity]];
function App(){
 const [account,setAccount]=useState(''),[provider,setProvider]=useState(null),[contract,setContract]=useState(null);
 const [tab,setTab]=useState('Home'),[mobileMenu,setMobileMenu]=useState(false);
 const [nfts,setNfts]=useState([]),[listings,setListings]=useState([]);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState('Connect your wallet to explore LitVerse on LitVM LiteForge Testnet.');
 const [name,setName]=useState(''),[description,setDescription]=useState(''),[imageUrl,setImageUrl]=useState(''),[preview,setPreview]=useState('');
 const [supply,setSupply]=useState('100'),[price,setPrice]=useState('0.1'),[start,setStart]=useState(''),[end,setEnd]=useState('');
 const [localFile,setLocalFile]=useState(null),[listingPrices,setListingPrices]=useState({});
 const [likes,setLikes]=useState({});
 async function connect(){
  try{
   if(!window.ethereum){setNotice('MetaMask not found. Please install MetaMask.');return;}
   const p=new ethers.BrowserProvider(window.ethereum);await p.send('eth_requestAccounts',[]);
   try{await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:CHAIN.chainId}]})}
   catch(e){if(e.code===4902)await window.ethereum.request({method:'wallet_addEthereumChain',params:[CHAIN]});else throw e;}
   const signer=await p.getSigner(),a=await signer.getAddress();setProvider(p);setAccount(a);
   if(CONTRACT_ADDRESS) setNotice('Wallet connected. Contract integration will activate after the new LitVerse contract is deployed and configured.');
   else setNotice('Wallet connected to LitVM Testnet. Contract address will be added after deployment.');
  }catch(e){setNotice(e.shortMessage||e.message||'Wallet connection failed');}
 }
 function chooseImage(e){
  const f=e.target.files?.[0];if(!f)return;
  if(!f.type.startsWith('image/')){setNotice('Please select an image file.');return;}
  setLocalFile(f);const reader=new FileReader();reader.onload=()=>setPreview(String(reader.result));reader.readAsDataURL(f);
 }
 async function load(){/* New LitVerse contract ABI will be connected after deployment. */}
 useEffect(()=>{load()},[]);
 const mock=[{id:'01',name:'Cosmic Voyager',creator:'LitVerse Artist',price:'0.25',image:'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=700&q=80',likes:238},{id:'02',name:'Neon Dreamer',creator:'Digital Soul',price:'0.18',image:'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=700&q=80',likes:194},{id:'03',name:'Pixel Genesis',creator:'0x8d...a12f',price:'0.32',image:'https://images.unsplash.com/photo-1634986666676-ec8fd927c23d?auto=format&fit=crop&w=700&q=80',likes:167},{id:'04',name:'Ethereal Bloom',creator:'Art by Mira',price:'0.15',image:'https://images.unsplash.com/photo-1577083552431-6e5fd01aa6f0?auto=format&fit=crop&w=700&q=80',likes:132}];
 const mint=()=>setNotice('NFT minting will be enabled after the new LitVerse ERC-721 contract is deployed and connected. Your image preview is ready.');
 const shown=tab==='My NFTs'?nfts:tab==='Marketplace'?listings:mock;
 return <div className="lv-app">
  <header className="lv-header">
   <button className="lv-brand" onClick={()=>setTab('Home')}><span className="lv-logo"><Sparkles/></span><span><b>LitVerse</b><small>CREATE · MINT · TRADE</small></span></button>
   <button className="lv-menu" onClick={()=>setMobileMenu(!mobileMenu)}>{mobileMenu?<X/>:<Menu/>}</button>
   <nav className={mobileMenu?'lv-nav open':'lv-nav'}>{tabs.map(([t,Icon])=><button key={t} className={tab===t?'selected':''} onClick={()=>{setTab(t);setMobileMenu(false)}}><Icon size={16}/>{t}</button>)}</nav>
   <div className="lv-header-right"><span className="network"><i/> LiteForge Testnet</span><button className="lv-wallet" onClick={connect}><Wallet size={16}/>{account?short(account):'Connect Wallet'}</button></div>
  </header>
  {tab==='Home'&&<section className="lv-hero">
   <div className="hero-copy"><div className="lv-pill"><i/> NEXT-GEN NFT ECOSYSTEM</div><h1>Your universe of<br/><em>digital assets.</em></h1><p>Create, mint, collect and trade unique digital art in the LitVM ecosystem. A new world of creativity starts here.</p><div className="hero-ctas"><button className="lv-primary" onClick={()=>setTab('Marketplace')}>Explore marketplace <ArrowUpRight size={17}/></button><button className="lv-secondary" onClick={()=>setTab('NFT Studio')}><Plus size={16}/> Create NFT</button></div><div className="hero-trust"><span><ShieldCheck size={15}/> Built on LitVM</span><span><Sparkles size={15}/> Creator-first</span></div></div>
   <div className="hero-art"><div className="art-glow"/><img src="https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=900&q=85" alt="Featured digital collectible"/><div className="art-float top">✦ <span>GENESIS COLLECTION</span></div><div className="art-float bottom"><span className="mini-avatar">◈</span><div><b>Cosmic Voyager</b><small>Featured collectible</small></div><strong>0.25 zkLTC</strong></div></div>
   <div className="lv-stats"><div><b>{nfts.length||'12.5K+'}</b><span>Total NFTs</span></div><div><b>{'3.2K+'}</b><span>Collectors</span></div><div><b>{'85.7K'}</b><span>Volume (zkLTC)</span></div><div><b>{listings.length||'2.5K+'}</b><span>Total sales</span></div></div>
  </section>}
  <div className="lv-notice">{notice}</div>
  <main className="lv-main">
   <div className="lv-section-heading"><div><span className="lv-overline">{tab==='Home'?'DISCOVER THE UNIVERSE':'LITVERSE ECOSYSTEM'}</span><h2>{tab==='Home'?'Trending NFTs':tab}</h2><p>{tab==='Home'?'Explore hand-picked digital collectibles from creators.':'Discover, create and collect on LitVerse.'}</p></div><button className="lv-refresh" onClick={load}><RefreshCw size={15}/> Refresh</button></div>
   {tab==='NFT Studio'&&<section className="mint-layout"><div className="mint-form"><div className="form-heading"><span className="form-icon"><ImagePlus/></span><div><b>Create your collectible</b><small>Bring your imagination on-chain</small></div><span className="test-badge">TESTNET</span></div>
    <label>NFT Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. LitVerse Genesis #001"/>
    <label>Description</label><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Tell the story behind your NFT"/>
    <label>Artwork</label><div className="upload-zone">{preview?<img src={preview} alt="NFT preview"/>:<div className="upload-empty"><ImagePlus/><b>Upload your artwork</b><small>PNG, JPG, GIF, WEBP</small></div>}<input type="file" accept="image/*" onChange={chooseImage}/><span className="upload-hint">{localFile?localFile.name:'Click to browse files from your device'}</span></div>
    <label>Image / Metadata URI (IPFS)</label><input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="ipfs://... (required for on-chain mint)"/>
    <div className="two-fields"><div><label>Maximum Supply</label><input type="number" min="1" value={supply} onChange={e=>setSupply(e.target.value)}/></div><div><label>Mint Price (zkLTC)</label><input type="number" min="0" step="0.001" value={price} onChange={e=>setPrice(e.target.value)}/></div></div>
    <div className="two-fields"><div><label>Mint Start</label><input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)}/></div><div><label>Mint End</label><input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)}/></div></div>
    <div className="mint-note">⚡ This is a UI preview. On-chain minting activates after the LitVerse contract is deployed.</div><button className="lv-primary wide" onClick={mint} disabled={busy}>Preview Mint Setup <ArrowUpRight size={16}/></button>
   </div><aside className="mint-preview"><span className="lv-overline">LIVE PREVIEW</span><div className="preview-art">{preview?<img src={preview} alt="Preview"/>:<Sparkles/>}<span>#{String(supply||'001').padStart(3,'0')}</span></div><h3>{name||'Your NFT Name'}</h3><p>{description||'Your collectible description will appear here.'}</p><div className="preview-meta"><span>Maximum supply</span><b>{supply||'—'}</b></div><div className="preview-meta"><span>Mint price</span><b>{price||'0'} zkLTC</b></div><div className="preview-meta"><span>Royalty</span><b>5%</b></div><div className="preview-meta"><span>Network</span><b>LitVM Testnet</b></div></aside></section>}
   {(tab==='Home'||tab==='Marketplace'||tab==='Collection'||tab==='My NFTs')&&<div className="lv-nft-grid">{shown.map((n,i)=><article className="lv-nft-card" key={n.id||i}><div className="nft-image"><img src={n.image||n.uri||'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=700&q=80'} alt={n.name||'LitVerse NFT'}/><span className="nft-number">#{n.id||String(i+1).padStart(3,'0')}</span><button className="like-btn" onClick={()=>setLikes({...likes,[n.id||i]:!likes[n.id||i]})}>{likes[n.id||i]?'♥':'♡'} <small>{n.likes||'128'}</small></button></div><div className="nft-card-info"><div><h3>{n.name||'Collectible'}</h3><small>by {n.creator||short(n.creator)}</small></div><div className="nft-price"><small>PRICE</small><b>{n.price||'0.25'} <span>zkLTC</span></b></div></div><div className="nft-card-bottom"><span><i className="coin">L</i> LitVerse</span><button onClick={()=>setTab('Marketplace')}>Explore <ArrowUpRight size={14}/></button></div></article>)}</div>}
   {tab==='Activity'&&<div className="empty-state"><Activity/><h3>Activity feed</h3><p>Mint, listing and sale events will appear here once the new contract is connected.</p></div>}
  </main>
  <footer className="lv-footer"><div className="footer-brand"><span className="lv-logo"><Sparkles/></span><b>LitVerse</b></div><span>Experimental NFT ecosystem · LitVM LiteForge Testnet</span><a href="https://liteforge.explorer.caldera.xyz" target="_blank" rel="noreferrer">Explorer <ExternalLink size={13}/></a></footer>
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);
