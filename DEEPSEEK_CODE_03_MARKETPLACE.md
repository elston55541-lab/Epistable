# Epistable DeepSeek Code Bundle — Part 03: Marketplace
Snapshot: 31d78c0ee3bd70f7a934b44140549048a41e6a01


===== FILE: src/lib/supabase.js =====
```javascript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://gfmrzcfajuwxishfnbur.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_rymg6uYPUH3WMferT4UpNw_BaFSnSxS";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

```

===== FILE: src/lib/supabaseSafe.js =====
```javascript
export class DbError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "DbError";
    this.cause = cause;
  }
}

export function requireData(result, fallbackMessage = "Database request failed") {
  if (result.error) {
    throw new DbError(result.error.message || fallbackMessage, result.error);
  }
  return result.data;
}

export function rows(result, fallback = []) {
  return requireData(result) || fallback;
}

export function maybeOne(result) {
  return requireData(result) || null;
}

```

===== FILE: src/lib/tokens.js =====
```javascript
// Type scale - 5 steps
export const TYPE = {
  caption: { size: 11, lineHeight: 1.5, weight: 500, letterSpacing: 0.25 },
  label: { size: 12, lineHeight: 1.5, weight: 600, letterSpacing: 0.15 },
  body: { size: 14, lineHeight: 1.65, weight: 400, letterSpacing: 0 },
  heading: { size: 18, lineHeight: 1.4, weight: 700, letterSpacing: 0 },
  display: { size: 24, lineHeight: 1.3, weight: 700, letterSpacing: 0 },
};

// Weight scale - 3 levels
export const WEIGHT = { regular: 400, medium: 600, bold: 700 };

// Spacing - 8px base
export const SPACE = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32, section: 28 };

// Radius
export const RADIUS = { sm: 6, md: 10, lg: 14, pill: 999 };

// Shadow
export const SHADOW = {
  card: "0 1px 3px rgba(10, 37, 64, 0.06), 0 4px 12px rgba(10, 37, 64, 0.04)",
  raised: "0 4px 16px rgba(10, 37, 64, 0.10)",
  modal: "0 12px 48px rgba(10, 37, 64, 0.20)",
};

// Font stack
export const FONT_STACK =
  '"Inter", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

// Colors - original blue/teal Epistable palette
export const COLOR = {
  bg: "#f0f2f5",
  surface: "#f8f9fb",
  white: "#ffffff",
  border: "#e2e8f0",

  primary: "#0057a8",
  primaryMid: "#003f7a",
  primaryBg: "#e8f0fa",
  primaryBorder: "#b8d0f0",

  accent: "#0097a7",
  accentBg: "#e0f7fa",
  accentBorder: "#80deea",

  text: "#1a2533",
  textMid: "#4a5568",
  textDim: "#8896a4",

  green: "#2e7d32",
  greenBg: "#e8f5e9",
  greenBorder: "#a5d6a7",
  red: "#c62828",
  redBg: "#ffebee",
  redBorder: "#ef9a9a",
  amber: "#b45309",
  amberBg: "#fffbeb",
  amberBorder: "#fcd34d",
  blue: "#1565c0",
  blueBg: "#e3f2fd",
  blueBorder: "#90caf9",
  purple: "#6b21a8",
  purpleBg: "#f5f0ff",
  purpleBorder: "#d8b4fe",
};


```

===== FILE: src/marketplace/BuyerPortal.jsx =====
```jsx
import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { Avi } from "../components/ui";
import { C } from "../lib/domain";
import { FONT_STACK } from "../lib/tokens";
import { useBP } from "../hooks/useBP";
import { FOOD_CATEGORIES } from "../lib/marketplace";
import { RfqForm } from "./TradeForms";

const buttonBase = {
  fontFamily: FONT_STACK,
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};

function BuyerWordmark({ compact = false }) {
  return (
    <div style={{display:"inline-flex",alignItems:"baseline",gap:compact?4:5,whiteSpace:"nowrap",lineHeight:1}}>
      <span style={{fontSize:compact?21:25,fontWeight:750,letterSpacing:-0.25,color:C.primaryD}}>Epistable</span>
      <span style={{fontSize:compact?21:25,fontWeight:750,letterSpacing:-0.25,color:C.primary}}>AI</span>
    </div>
  );
}

function Badge({children,tone="neutral"}) {
  const style=tone==="success"
    ? {color:C.green,bg:C.greenBg,border:C.greenBorder}
    : tone==="warning"
      ? {color:C.amber,bg:C.amberBg,border:C.amberBorder}
      : {color:C.textMid,bg:C.surface,border:C.border};
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 9px",borderRadius:999,border:"1px solid "+style.border,background:style.bg,color:style.color,fontSize:11,fontWeight:750,lineHeight:1.1}}>{children}</span>;
}

function productImage(product) {
  return product.cover_image_url || (Array.isArray(product.image_urls) ? product.image_urls[0] : "") || "";
}

function supplierName(product) {
  return product.organizations?.name || "Verified supplier";
}

function productSearchText(product) {
  return [
    product.name, product.category, product.description, product.ingredients, product.country_of_origin,
    supplierName(product), ...(product.packaging||[]), ...(product.certifications||[]),
    ...(product.export_markets||[]), ...(product.dietary_attributes||[])
  ].filter(Boolean).join(" ").toLowerCase();
}

function SellerTrust({product}) {
  const verified=product.organizations?.verification_status==="verified";
  return verified
    ? <Badge tone="success"><Icon name="verified" size={12}/> Verified supplier</Badge>
    : <Badge>Supplier listed</Badge>;
}

function ProductCard({product,evidenceCount,saved,onSave,onOpen,onQuote,isMobile}) {
  const image=productImage(product);
  return (
    <article className="buyer-product-card buyer-enter" style={{background:C.white,border:"1px solid "+C.border,borderRadius:isMobile?0:16,overflow:"hidden",minWidth:0,boxShadow:isMobile?"none":"0 10px 28px rgba(16,24,40,0.05)"}}>
      <div role="button" tabIndex={0} aria-label={"Open "+product.name} onClick={onOpen} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onOpen();}}} style={{display:"block",width:"100%",background:"#edf3fa",textAlign:"left",position:"relative",cursor:"pointer"}}>
        <div style={{height:isMobile?245:220,overflow:"hidden",background:"linear-gradient(135deg,#f7f9fc,#eaf0f8)"}}>
          {image
            ? <img className="buyer-image" src={image} alt={product.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
            : <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",color:"#8da0bf"}}><Icon name="package" size={42}/></div>}
        </div>
        <div style={{position:"absolute",top:12,left:12}}><SellerTrust product={product}/></div>
        <button type="button" aria-label={saved?"Remove from saved":"Save product"} onClick={e=>{e.stopPropagation();onSave();}} style={{...buttonBase,position:"absolute",right:12,top:12,width:38,height:38,borderRadius:999,border:"1px solid rgba(255,255,255,.8)",background:"rgba(255,255,255,.94)",display:"flex",alignItems:"center",justifyContent:"center",color:saved?C.primary:C.textMid,boxShadow:"0 5px 16px rgba(16,24,40,.12)"}}><Icon name="check" size={17}/></button>
      </div>
      <div style={{padding:isMobile?"20px 20px 22px":"18px 18px 20px"}}>
        <div style={{fontSize:11,fontWeight:800,letterSpacing:.45,textTransform:"uppercase",color:C.primary,marginBottom:8}}>{product.category}</div>
        <h2 style={{margin:0,fontSize:isMobile?22:19,lineHeight:1.25,fontWeight:760,letterSpacing:-.2,color:C.text}}>{product.name}</h2>
        <div style={{fontSize:13,color:C.textDim,marginTop:7}}>{supplierName(product)} · {product.country_of_origin||"Origin not specified"}</div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:14}}>
          {product.moq!=null&&<Badge>MOQ {product.moq} {product.moq_unit||""}</Badge>}
          {product.shelf_life&&<Badge>{product.shelf_life}</Badge>}
          {evidenceCount>0&&<Badge tone="success">{evidenceCount} verified document{evidenceCount===1?"":"s"}</Badge>}
        </div>
        {Array.isArray(product.certifications)&&product.certifications.length>0&&<div style={{fontSize:12,color:C.textMid,marginTop:13,lineHeight:1.55}}>Claims: {product.certifications.slice(0,3).join(" · ")}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginTop:18}}>
          <button className="buyer-button" onClick={onOpen} style={{...buttonBase,border:"1px solid "+C.border,background:C.white,borderRadius:10,padding:"12px 10px",color:C.textMid,fontWeight:700,fontSize:13}}>View details</button>
          <button className="buyer-button" onClick={onQuote} style={{...buttonBase,border:"1px solid "+C.primary,background:C.primary,borderRadius:10,padding:"12px 10px",color:C.white,fontWeight:750,fontSize:13}}>Request Quote</button>
        </div>
      </div>
    </article>
  );
}

function EvidenceAction({document,api}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  async function open(){
    setBusy(true);setError("");
    try{const url=await api.evidenceUrl(document);window.open(url,"_blank","noopener,noreferrer");}
    catch(e){setError(e.message||"Could not open evidence.");}
    finally{setBusy(false);}
  }
  if(!document.storage_path&&!document.file_url)return null;
  return <span style={{display:"inline-flex",alignItems:"center",gap:8}}><button className="buyer-button" onClick={open} disabled={busy} style={{...buttonBase,border:0,background:"transparent",padding:0,color:C.primary,fontSize:12,fontWeight:750}}>{busy?"Opening…":"Open evidence"}</button>{error&&<small style={{color:C.red}}>{error}</small>}</span>;
}

function ProductDetail({product,documents,api,onClose,onQuote,isMobile}) {
  const images=Array.isArray(product.image_urls)&&product.image_urls.length ? product.image_urls : productImage(product) ? [productImage(product)] : [];
  const evidence=documents.filter(d=>d.product_id===product.id&&d.verification_status==="verified");
  const rows=[
    ["Country of origin",product.country_of_origin],
    ["Minimum order",product.moq!=null?String(product.moq)+" "+(product.moq_unit||""):""],
    ["Monthly capacity",product.capacity!=null?String(product.capacity)+" "+(product.capacity_unit||""):""],
    ["Shelf life",product.shelf_life],
    ["Storage",product.storage_requirements],
    ["Lead time",product.lead_time_days!=null?String(product.lead_time_days)+" days":""],
    ["Packaging",Array.isArray(product.packaging)?product.packaging.join(", "):product.packaging],
    ["Ingredients",product.ingredients],
    ["Allergens",Array.isArray(product.allergens)?product.allergens.join(", "):product.allergens],
    ["Export markets",Array.isArray(product.export_markets)?product.export_markets.join(", "):product.export_markets],
  ].filter(([,value])=>value);
  return <div className="buyer-trade-overlay" style={{position:"fixed",inset:0,zIndex:300,background:"rgba(6,18,45,.52)",display:"flex",alignItems:isMobile?"stretch":"center",justifyContent:"center",padding:isMobile?0:24}} onClick={onClose}>
    <section className="buyer-sheet" onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:920,height:isMobile?"100%":"min(820px, calc(100dvh - 48px))",overflowY:"auto",background:C.white,borderRadius:isMobile?0:18,boxShadow:"0 28px 80px rgba(6,18,45,.28)"}}>
      <div style={{position:"sticky",top:0,zIndex:5,height:58,padding:"0 18px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(255,255,255,.96)",borderBottom:"1px solid "+C.border}}>
        <BuyerWordmark compact/>
        <button aria-label="Close product details" className="buyer-button" onClick={onClose} style={{...buttonBase,width:36,height:36,borderRadius:10,border:0,background:C.surface,color:C.textMid,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="close"/></button>
      </div>
      {images.length>0&&<div style={{display:"grid",gridTemplateColumns:images.length>1&&!isMobile?"2fr 1fr":"1fr",gap:4,background:"#edf3fa"}}>
        <img src={images[0]} alt={product.name} style={{width:"100%",height:isMobile?340:420,objectFit:"cover"}}/>
        {images.length>1&&!isMobile&&<div style={{display:"grid",gridTemplateRows:"1fr 1fr",gap:4}}>{images.slice(1,3).map((url,i)=><img key={url} src={url} alt={product.name+" image "+(i+2)} style={{width:"100%",height:"100%",objectFit:"cover",minHeight:0}}/>)}</div>}
      </div>}
      <div style={{padding:isMobile?"24px 20px 120px":"30px 34px 42px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><SellerTrust product={product}/><Badge>{product.category}</Badge></div>
        <h1 style={{fontSize:isMobile?31:38,lineHeight:1.12,letterSpacing:-.6,margin:"16px 0 6px",color:C.text}}>{product.name}</h1>
        <div style={{fontSize:15,color:C.textDim}}>{supplierName(product)} · {product.country_of_origin||"Origin not specified"}</div>
        {product.description&&<p style={{fontSize:15,lineHeight:1.72,color:C.textMid,maxWidth:760,marginTop:22}}>{product.description}</p>}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:0,borderTop:"1px solid "+C.border,marginTop:26}}>
          {rows.map(([label,value])=><div key={label} style={{display:"grid",gridTemplateColumns:"150px 1fr",gap:14,padding:"13px 0",borderBottom:"1px solid "+C.border,fontSize:13}}><strong style={{color:C.text}}>{label}</strong><span style={{color:C.textMid}}>{value}</span></div>)}
        </div>
        <div style={{marginTop:28}}>
          <h2 style={{fontSize:18,margin:"0 0 12px"}}>Certification & evidence</h2>
          {Array.isArray(product.certifications)&&product.certifications.length>0&&<div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:14}}>{product.certifications.map(c=><Badge key={c}>{c} · seller claim</Badge>)}</div>}
          {evidence.length?<div style={{display:"grid",gap:8}}>{evidence.map(d=><div key={d.id} style={{padding:"12px 14px",border:"1px solid "+C.greenBorder,background:C.greenBg,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}><span style={{fontSize:13,fontWeight:700,color:C.text}}>{d.title}<span style={{display:"block",marginTop:5}}><EvidenceAction document={d} api={api}/></span></span><Badge tone="success"><Icon name="verified" size={12}/> Verified</Badge></div>)}</div>:<p style={{fontSize:13,color:C.textDim}}>No product-specific documents have been independently verified yet.</p>}
        </div>
        <button className="buyer-button" onClick={onQuote} style={{...buttonBase,width:"100%",marginTop:28,background:C.primary,border:"1px solid "+C.primary,borderRadius:12,padding:"15px 16px",color:C.white,fontSize:15,fontWeight:750}}>Request Quote</button>
      </div>
    </section>
  </div>;
}

function TradeGPT({open,onClose,prompt,setPrompt,recommendations,onOpenProduct,onApply,isMobile}) {
  if(!open)return null;
  const examples=isMobile?[]:["Halal spice suppliers","Private-label sauces for UAE","FSSC 22000 snack manufacturers","Low MOQ ready-to-eat foods"];
  return <div className="buyer-trade-overlay" style={{position:"fixed",top:0,left:0,right:0,bottom:isMobile?"calc(92px + env(safe-area-inset-bottom))":0,background:isMobile?C.white:"rgba(246,248,252,.96)",zIndex:isMobile?120:260,display:"flex",alignItems:isMobile?"stretch":"center",justifyContent:"center",padding:isMobile?0:24}} onClick={onClose}>
    <div className="buyer-trade-sheet buyer-gpt-shell" style={{width:"100%",maxWidth:760,height:isMobile?"100%":"min(760px, calc(100dvh - 48px))",background:C.white,border:isMobile?"none":"1px solid "+C.border,borderRadius:isMobile?0:18,boxShadow:isMobile?"none":"0 22px 70px rgba(16,24,40,.12)",boxSizing:"border-box",display:"flex",flexDirection:"column",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
      <div style={{height:58,borderBottom:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,padding:isMobile?"0 14px":"0 18px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
          <div style={{width:30,height:30,borderRadius:9,background:"#f2f4f7",display:"flex",alignItems:"center",justifyContent:"center",color:C.textMid,flexShrink:0}}><Icon name="bot" size={16}/></div>
          <div style={{fontSize:15,fontWeight:700,color:C.text}}>Trade GPT</div>
        </div>
        <button className="buyer-button" onClick={onClose} aria-label="Close Trade GPT" style={{...buttonBase,width:34,height:34,borderRadius:10,border:0,background:"transparent",color:C.textMid,display:"inline-flex",alignItems:"center",justifyContent:"center"}}><Icon name="close" size={17}/></button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:isMobile?"34px 18px 18px":"30px 24px 22px"}}>
        <div style={{maxWidth:620,margin:"0 auto",display:"flex",flexDirection:"column",gap:18}}>
          <div style={{display:"flex",gap:12,alignItems:"flex-start",justifyContent:isMobile?"center":"flex-start",textAlign:isMobile?"center":"left"}}>
            {!isMobile&&<div style={{width:30,height:30,borderRadius:9,background:"#f2f4f7",display:"flex",alignItems:"center",justifyContent:"center",color:C.textMid,flexShrink:0}}><Icon name="bot" size={15}/></div>}
            <div style={{fontSize:isMobile?16:15,lineHeight:1.65,color:C.text,maxWidth:isMobile?320:540}}>
              {isMobile?"What are you looking for?":"Tell me the product, certification, market, packaging or supplier requirement you need. I can narrow the catalog for you."}
              {isMobile&&<div style={{fontSize:13,lineHeight:1.55,color:C.textDim,marginTop:8}}>Ask in plain language. I will filter the processed-food catalog.</div>}
            </div>
          </div>
          {examples.length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginLeft:42}}>{examples.map(example=><button key={example} className="buyer-chip" onClick={()=>setPrompt(example)} style={{...buttonBase,background:C.white,border:"1px solid "+C.border,borderRadius:14,padding:"12px 14px",fontSize:13,lineHeight:1.35,fontWeight:600,color:C.textMid,textAlign:"left"}}>{example}</button>)}</div>}
          {prompt.trim()&&<div style={{marginTop:4}}>
            <div style={{fontSize:12,fontWeight:800,color:C.textDim,textTransform:"uppercase",letterSpacing:.4,marginBottom:10}}>Best matches</div>
            {recommendations.length?<div style={{display:"grid",gap:9}}>{recommendations.map(({product,score})=><button key={product.id} onClick={()=>onOpenProduct(product)} style={{...buttonBase,width:"100%",padding:"13px 14px",border:"1px solid "+C.border,borderRadius:12,background:C.white,textAlign:"left",display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"center"}}><span><strong style={{display:"block",fontSize:14,color:C.text}}>{product.name}</strong><small style={{display:"block",marginTop:4,color:C.textDim}}>{supplierName(product)} · {product.category}</small></span><Badge tone={score>45?"success":"neutral"}>{score}% match</Badge></button>)}</div>:<p style={{fontSize:13,color:C.textDim}}>No strong matches yet. Try a product category, certification or destination market.</p>}
          </div>}
        </div>
      </div>
      <div style={{borderTop:"1px solid "+C.border,padding:isMobile?"12px 14px calc(14px + env(safe-area-inset-bottom))":"14px 18px 18px",background:C.white}}>
        <div style={{maxWidth:620,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr auto",gap:9}}>
          <input value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&prompt.trim())onApply();}} placeholder="e.g. Halal turmeric supplier for UAE" aria-label="Trade GPT request" style={{width:"100%",boxSizing:"border-box",border:"1px solid "+C.border,borderRadius:12,padding:"13px 14px",fontSize:14,fontFamily:FONT_STACK,outline:"none",color:C.text}}/>
          <button className="buyer-button" onClick={onApply} disabled={!prompt.trim()} style={{...buttonBase,border:"1px solid "+C.primary,background:prompt.trim()?C.primary:C.surface,color:prompt.trim()?C.white:C.textDim,borderRadius:12,padding:"0 16px",fontWeight:750}}>Search</button>
        </div>
      </div>
    </div>
  </div>;
}

function BuyerListView({title,subtitle,children,isMobile}) {
  return <section style={{padding:isMobile?"22px 18px 130px":"8px 0 80px"}}>
    <h1 style={{fontSize:isMobile?28:32,letterSpacing:-.5,margin:"0 0 5px",color:C.text}}>{title}</h1>
    {subtitle&&<p style={{fontSize:14,color:C.textDim,margin:"0 0 22px"}}>{subtitle}</p>}
    {children}
  </section>;
}

export function BuyerPortal({profile,access,data,api,onSaved,onLogout,signingOut}) {
  const {isMobile}=useBP();
  const [viewMode,setViewMode]=useState("all");
  const [search,setSearch]=useState("");
  const [category,setCategory]=useState("All");
  const [supplier,setSupplier]=useState("All");
  const [sortBy,setSortBy]=useState("newest");
  const [savedIds,setSavedIds]=useState([]);
  const [tradeOpen,setTradeOpen]=useState(false);
  const [tradePrompt,setTradePrompt]=useState("");
  const [tradeResultIds,setTradeResultIds]=useState([]);
  const [selectedProduct,setSelectedProduct]=useState(null);
  const [quoteProduct,setQuoteProduct]=useState(null);
  const [quoteBusy,setQuoteBusy]=useState(false);
  const [quoteError,setQuoteError]=useState("");
  const [quoteActionBusy,setQuoteActionBusy]=useState("");
  const [quoteActionError,setQuoteActionError]=useState("");

  const buyerOrg=data.organizations.find(o=>o.id===access.org);
  const products=(data.products||[]).filter(p=>p.status==="active");
  const documents=data.documents||[];
  const shortlistKey="epistable_food_shortlist_"+(profile.auth_user_id||access.org||"buyer");

  useEffect(()=>{
    try{setSavedIds(JSON.parse(localStorage.getItem(shortlistKey)||"[]"));}catch{setSavedIds([]);}
  },[shortlistKey]);

  const savedSet=useMemo(()=>new Set(savedIds),[savedIds]);
  const evidenceCount=product=>documents.filter(d=>d.product_id===product.id&&d.verification_status==="verified").length;
  const supplierOptions=useMemo(()=>["All",...Array.from(new Set(products.map(supplierName).filter(Boolean))).sort()],[products]);
  const categories=useMemo(()=>["All",...Array.from(new Set([...FOOD_CATEGORIES,...products.map(p=>p.category).filter(Boolean)]))],[products]);

  function toggleSaved(id) {
    setSavedIds(prev=>{
      const next=prev.includes(id)?prev.filter(x=>x!==id):[id,...prev];
      try{localStorage.setItem(shortlistKey,JSON.stringify(next));}catch{}
      return next;
    });
  }

  const visibleProducts=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return products.filter(p=>
      (viewMode!=="saved"||savedSet.has(p.id)) &&
      (viewMode!=="trade"||tradeResultIds.includes(p.id)) &&
      (category==="All"||p.category===category) &&
      (supplier==="All"||supplierName(p)===supplier) &&
      (!q||productSearchText(p).includes(q))
    ).sort((a,b)=>{
      if(sortBy==="moq")return Number(a.moq||Number.MAX_SAFE_INTEGER)-Number(b.moq||Number.MAX_SAFE_INTEGER);
      if(sortBy==="evidence")return evidenceCount(b)-evidenceCount(a);
      return Number(b.created_at||0)-Number(a.created_at||0);
    });
  },[products,viewMode,savedSet,tradeResultIds,category,supplier,search,sortBy,documents]);

  const featured=useMemo(()=>products.slice().sort((a,b)=>{
    const av=a.organizations?.verification_status==="verified"?1:0;
    const bv=b.organizations?.verification_status==="verified"?1:0;
    return bv-av || evidenceCount(b)-evidenceCount(a) || Number(b.created_at||0)-Number(a.created_at||0);
  }).slice(0,4),[products,documents]);

  const tradeRecommendations=useMemo(()=>{
    const text=tradePrompt.toLowerCase().trim();
    if(!text)return [];
    const words=text.split(/[^a-z0-9]+/).filter(w=>w.length>2);
    return products.map(product=>{
      const hay=productSearchText(product);
      let score=product.organizations?.verification_status==="verified"?18:0;
      score+=Math.min(20,evidenceCount(product)*8);
      words.forEach(w=>{if(hay.includes(w))score+=9;});
      if(/halal/.test(text)&&(product.certifications||[]).some(x=>String(x).toLowerCase().includes("halal")))score+=25;
      if(/organic/.test(text)&&(product.certifications||[]).some(x=>String(x).toLowerCase().includes("organic")))score+=25;
      if(/fssc/.test(text)&&(product.certifications||[]).some(x=>String(x).toLowerCase().includes("fssc")))score+=25;
      if(/brc/.test(text)&&(product.certifications||[]).some(x=>String(x).toLowerCase().includes("brc")))score+=25;
      if(/private label|private-label/.test(text)&&hay.includes("private"))score+=18;
      return {product,score:Math.min(99,score)};
    }).filter(x=>x.score>10).sort((a,b)=>b.score-a.score).slice(0,5);
  },[tradePrompt,products,documents]);

  function applyTradePrompt() {
    const ids=tradeRecommendations.map(x=>x.product.id);
    setTradeResultIds(ids);
    setViewMode("trade");
    setSearch("");
    setCategory("All");
    setSupplier("All");
    setTradeOpen(false);
  }

  async function saveRfq(values) {
    setQuoteBusy(true);setQuoteError("");
    try{
      await api.createRfq({...values,id:"RFQ_"+crypto.randomUUID(),buyer_org_id:access.org});
      setQuoteProduct(null);
      setViewMode("quotes");
      await onSaved();
    }catch(e){setQuoteError(e.message||"Could not send RFQ.");}
    finally{setQuoteBusy(false);}
  }

  async function decideQuote(quote,decision) {
    let message="";
    if(decision==="revision_requested"){
      message=window.prompt("What should the supplier revise?","")||"";
      if(!message.trim())return;
    } else if(decision==="rejected") {
      message=window.prompt("Optional reason for rejecting this quote:","")||"";
    }
    setQuoteActionBusy(quote.id);setQuoteActionError("");
    try{await api.decideQuote(quote.id,decision,message.trim());await onSaved();}
    catch(e){setQuoteActionError(e.message||"Could not update this quote.");}
    finally{setQuoteActionBusy("");}
  }

  const buyerInitials=(profile.name||profile.email||"Buyer").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
  const canSearch=["all","saved","trade"].includes(viewMode);
  const mobileNavItems=[
    {label:"Catalog",icon:"package",active:["all","trade"].includes(viewMode)&&!tradeOpen,action:()=>{setViewMode("all");setTradeOpen(false);}},
    {label:"GPT",icon:"bot",active:tradeOpen,action:()=>setTradeOpen(true)},
    {label:"Saved",icon:"check",active:viewMode==="saved"&&!tradeOpen,action:()=>{setViewMode("saved");setTradeOpen(false);}},
    {label:"Quotes",icon:"message",active:viewMode==="quotes"&&!tradeOpen,action:()=>{setViewMode("quotes");setTradeOpen(false);}},
  ];
  const activeMobileNavIndex=Math.max(0,mobileNavItems.findIndex(item=>item.active));
  const mobileNavIndicatorTransform=[
    "translateX(0)",
    "translateX(calc(100% + 7px))",
    "translateX(calc(200% + 14px))",
    "translateX(calc(300% + 21px))",
  ][activeMobileNavIndex]||"translateX(0)";

  const sidebarItems=[
    {label:"Trade GPT",icon:"bot",active:tradeOpen,action:()=>setTradeOpen(true)},
    {label:"Catalog",icon:"package",active:["all","saved","trade"].includes(viewMode)&&!tradeOpen,action:()=>{setViewMode("all");setTradeOpen(false);}},
    {label:"My Quotes",icon:"message",active:viewMode==="quotes"&&!tradeOpen,action:()=>{setViewMode("quotes");setTradeOpen(false);}},
    {label:"My Orders",icon:"truck",active:viewMode==="orders"&&!tradeOpen,action:()=>{setViewMode("orders");setTradeOpen(false);}},
    {label:"My Requirements",icon:"list",active:viewMode==="requirements"&&!tradeOpen,action:()=>{setViewMode("requirements");setTradeOpen(false);}},
    {label:"Profile",icon:"user",active:viewMode==="profile"&&!tradeOpen,action:()=>{setViewMode("profile");setTradeOpen(false);}},
  ];

  let body=null;
  if(["all","saved","trade"].includes(viewMode)) {
    const hero=featured[0];
    body=<div style={{padding:isMobile?"0 0 184px":"30px 30px 90px",maxWidth:1600,margin:"0 auto"}}>
      {isMobile&&viewMode==="all"&&hero&&<section className="buyer-featured-card buyer-enter" style={{marginBottom:28}}>
        <article className="buyer-featured-hero" style={{background:C.white,overflow:"hidden"}}>
          <button onClick={()=>setSelectedProduct(hero)} style={{...buttonBase,width:"100%",height:430,border:0,padding:0,background:"#edf3fa",position:"relative",overflow:"hidden",textAlign:"left"}}>
            {productImage(hero)?<img src={productImage(hero)} alt={hero.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>:<div style={{width:"100%",height:"100%",background:"linear-gradient(135deg,#dce7f4,#9fb4cb)"}}/>}
            <div style={{position:"absolute",inset:"auto 0 0",padding:"110px 26px 34px",background:"linear-gradient(180deg,rgba(6,18,45,0),rgba(6,18,45,.84))",color:C.white}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"rgba(255,255,255,.16)",border:"1px solid rgba(255,255,255,.34)",borderRadius:999,padding:"7px 14px",fontSize:12,fontWeight:800,marginBottom:14}}><Icon name="trend" size={14}/> Featured</div>
              <div style={{fontSize:40,lineHeight:1.04,fontWeight:850,letterSpacing:-.5,maxWidth:340}}>{hero.name}</div>
              <div style={{fontSize:16,lineHeight:1.45,fontWeight:600,color:"rgba(255,255,255,.88)",marginTop:14,maxWidth:350}}>{hero.category} · {supplierName(hero)}{hero.moq!=null?" · MOQ "+hero.moq+" "+(hero.moq_unit||""):""}</div>
            </div>
          </button>
        </article>
      </section>}
      {!isMobile&&viewMode==="all"&&<section className="buyer-hero buyer-enter" style={{borderRadius:20,padding:"38px 42px",minHeight:170,display:"grid",gridTemplateColumns:"1.4fr .8fr",gap:30,alignItems:"center",marginBottom:26,backgroundImage:"linear-gradient(120deg,#0b1930,#0057a8)"}}>
        <div style={{color:C.white}}>
          <Badge tone="success"><Icon name="verified" size={12}/> Verified food trade</Badge>
          <h1 style={{fontSize:38,lineHeight:1.08,letterSpacing:-.8,margin:"16px 0 10px",maxWidth:650}}>Source processed foods from verified suppliers.</h1>
          <p style={{fontSize:15,lineHeight:1.65,color:"rgba(255,255,255,.78)",maxWidth:620,margin:0}}>Search products, review supplier evidence and send RFQs from one buyer workspace.</p>
        </div>
        <button className="buyer-button" onClick={()=>setTradeOpen(true)} style={{...buttonBase,justifySelf:"end",minWidth:210,border:"1px solid rgba(255,255,255,.3)",background:"rgba(255,255,255,.12)",color:C.white,borderRadius:15,padding:"18px 20px",fontSize:15,fontWeight:750,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}><Icon name="bot"/> Ask Trade GPT</button>
      </section>}
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:16,padding:isMobile?"0 18px":"0",marginBottom:18}}>
        <div>
          <h1 style={{fontSize:isMobile?25:30,lineHeight:1.18,letterSpacing:-.45,margin:0,color:C.text}}>{viewMode==="saved"?"Saved products":viewMode==="trade"?"Trade GPT matches":"Catalog"}</h1>
          <p style={{fontSize:13,color:C.textDim,margin:"6px 0 0"}}>{visibleProducts.length} product{visibleProducts.length===1?"":"s"} available</p>
        </div>
        {viewMode!=="all"&&<button className="buyer-button" onClick={()=>setViewMode("all")} style={{...buttonBase,border:"1px solid "+C.border,background:C.white,borderRadius:10,padding:"9px 11px",fontSize:12,fontWeight:700,color:C.textMid}}>All products</button>}
      </div>
      <div className="buyer-filter-panel" style={{margin:isMobile?"0 18px 18px":"0 0 22px",padding:12,border:"1px solid "+C.border,borderRadius:14,background:C.white,display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1.4fr 1fr 1fr",gap:9}}>
        <select aria-label="Product category" value={category} onChange={e=>setCategory(e.target.value)} style={{border:"1px solid "+C.border,borderRadius:10,padding:"11px 12px",background:C.white,color:C.text,fontFamily:FONT_STACK}}>{categories.map(x=><option key={x}>{x}</option>)}</select>
        <select aria-label="Supplier" value={supplier} onChange={e=>setSupplier(e.target.value)} style={{border:"1px solid "+C.border,borderRadius:10,padding:"11px 12px",background:C.white,color:C.text,fontFamily:FONT_STACK}}>{supplierOptions.map(x=><option key={x}>{x}</option>)}</select>
        <select aria-label="Sort products" value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{gridColumn:isMobile?"1 / -1":"auto",border:"1px solid "+C.border,borderRadius:10,padding:"11px 12px",background:C.white,color:C.text,fontFamily:FONT_STACK}}>
          <option value="newest">Newest first</option><option value="evidence">Verified evidence first</option><option value="moq">Lowest MOQ first</option>
        </select>
      </div>
      {visibleProducts.length?<div className="buyer-results-grid" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(285px,1fr))",gap:isMobile?0:18,borderTop:isMobile?"1px solid "+C.border:"none"}}>{visibleProducts.map((p,i)=><div key={p.id} style={{"--i":i}}><ProductCard product={p} evidenceCount={evidenceCount(p)} saved={savedSet.has(p.id)} onSave={()=>toggleSaved(p.id)} onOpen={()=>setSelectedProduct(p)} onQuote={()=>setQuoteProduct(p)} isMobile={isMobile}/></div>)}</div>:<div style={{margin:isMobile?"20px 18px":"20px 0",padding:"38px 22px",border:"1px dashed "+C.border,borderRadius:16,textAlign:"center",color:C.textDim}}>No products match these filters.</div>}
    </div>;
  } else if(viewMode==="quotes"||viewMode==="requirements") {
    body=<BuyerListView isMobile={isMobile} title={viewMode==="quotes"?"My Quotes":"My Requirements"} subtitle={viewMode==="quotes"?"RFQs and supplier responses in one place.":"Your active and past sourcing requirements."}>
      {quoteActionError&&<div role="alert" style={{padding:"10px 12px",background:C.redBg,border:"1px solid "+C.redBorder,color:C.red,borderRadius:10,marginBottom:12}}>{quoteActionError}</div>}
      <div style={{display:"grid",gap:12}}>{(data.rfqs||[]).length?(data.rfqs||[]).map(r=>{
        const responses=(data.quotes||[]).filter(q=>q.rfq_id===r.id);
        return <article key={r.id} style={{padding:"18px",border:"1px solid "+C.border,borderRadius:14,background:C.white}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}><div><div style={{fontSize:11,fontWeight:800,textTransform:"uppercase",color:C.primary}}>{r.product_category||"Processed food"}</div><h2 style={{fontSize:18,margin:"5px 0"}}>{r.products?.name||r.product_category||"Sourcing request"}</h2><div style={{fontSize:13,color:C.textDim}}>{r.quantity} {r.quantity_unit} · {r.destination_country}</div></div><Badge tone={r.status==="open"?"success":"neutral"}>{r.status}</Badge></div>
          <div style={{fontSize:13,color:C.textMid,marginTop:14}}>{responses.length} supplier response{responses.length===1?"":"s"}</div>
          {viewMode==="quotes"&&responses.length>0&&<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fit,minmax(230px,1fr))",gap:10,marginTop:14}}>
            {responses.map(q=><div key={q.id} style={{border:"1px solid "+C.border,borderRadius:12,padding:14,background:"#fbfcfe"}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"flex-start"}}><strong style={{fontSize:14}}>{q.organizations?.name||"Supplier"}</strong><Badge tone={q.status==="accepted"?"success":"neutral"}>{q.status.replaceAll("_"," ")}</Badge></div>
              <div style={{fontSize:20,fontWeight:800,color:C.text,marginTop:12}}>{q.currency} {q.total_amount}</div>
              <div style={{fontSize:12,color:C.textDim,lineHeight:1.7,marginTop:7}}>{q.currency} {q.unit_price} / {q.quantity_unit}<br/>{q.quantity} {q.quantity_unit} · {q.incoterm||"Incoterm n/a"}<br/>{q.lead_time_days!=null?q.lead_time_days+" days lead time":"Lead time not specified"}{q.revision_number>1?<><br/>Revision {q.revision_number}</>:null}</div>
              {q.notes&&<div style={{fontSize:12,color:C.textMid,lineHeight:1.55,marginTop:9}}>{q.notes}</div>}
              {q.buyer_message&&<div style={{fontSize:12,color:C.textMid,lineHeight:1.55,marginTop:9}}>Buyer note: {q.buyer_message}</div>}
              {["sent","revised"].includes(q.status)&&<div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:13}}>
                <button className="buyer-button" disabled={quoteActionBusy===q.id} onClick={()=>decideQuote(q,"accepted")} style={{...buttonBase,border:"1px solid "+C.primary,background:C.primary,color:C.white,borderRadius:9,padding:"9px 11px",fontSize:12,fontWeight:750}}>Accept</button>
                <button className="buyer-button" disabled={quoteActionBusy===q.id} onClick={()=>decideQuote(q,"revision_requested")} style={{...buttonBase,border:"1px solid "+C.border,background:C.white,color:C.textMid,borderRadius:9,padding:"9px 11px",fontSize:12,fontWeight:700}}>Request changes</button>
                <button className="buyer-button" disabled={quoteActionBusy===q.id} onClick={()=>decideQuote(q,"rejected")} style={{...buttonBase,border:"1px solid "+C.redBorder,background:C.white,color:C.red,borderRadius:9,padding:"9px 11px",fontSize:12,fontWeight:700}}>Reject</button>
              </div>}
            </div>)}
          </div>}
        </article>;
      }):<div style={{padding:"36px",border:"1px dashed "+C.border,borderRadius:14,textAlign:"center",color:C.textDim}}>No sourcing requests yet.</div>}</div>
    </BuyerListView>;
  } else if(viewMode==="orders") {
    const orders=data.orders||[];
    body=<BuyerListView isMobile={isMobile} title="My Orders" subtitle="Accepted supplier quotes progress here as trade orders.">
      <div style={{display:"grid",gap:12}}>{orders.length?orders.map(order=><article key={order.id} style={{padding:"18px",border:"1px solid "+C.border,borderRadius:14,background:C.white}}><div style={{display:"flex",justifyContent:"space-between",gap:12}}><div><strong>{order.currency} {order.total_amount}</strong><div style={{fontSize:12,color:C.textDim,marginTop:4}}>{order.id}</div></div><Badge tone={["delivered","completed"].includes(order.status)?"success":"neutral"}>{order.status.replaceAll("_"," ")}</Badge></div><div style={{fontSize:13,color:C.textDim,marginTop:8}}>{order.quantity} {order.quantity_unit} · {order.incoterm||"Incoterm not specified"}</div>{order.status_note&&<div style={{fontSize:13,color:C.textMid,marginTop:8}}>{order.status_note}</div>}</article>):<div style={{padding:"36px",border:"1px dashed "+C.border,borderRadius:14,textAlign:"center",color:C.textDim}}>No accepted orders yet.</div>}</div>
    </BuyerListView>;
  } else if(viewMode==="profile") {
    body=<BuyerListView isMobile={isMobile} title="Profile" subtitle="Your buyer organisation details.">
      <article style={{padding:"22px",border:"1px solid "+C.border,borderRadius:16,background:C.white,maxWidth:720}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}><Avi initials={buyerInitials} size={46}/><div><h2 style={{margin:0,fontSize:20}}>{buyerOrg?.name||profile.name||"Buyer organisation"}</h2><div style={{fontSize:13,color:C.textDim,marginTop:4}}>{buyerOrg?.country||profile.email}</div></div></div>
        {buyerOrg?.description&&<p style={{fontSize:14,lineHeight:1.7,color:C.textMid,marginTop:20}}>{buyerOrg.description}</p>}
      </article>
    </BuyerListView>;
  }

  return <div className={"buyer-app"+(tradeOpen?" buyer-app-trade-open":"")} style={isMobile
    ? {position:"fixed",inset:0,width:"100%",height:"100dvh",minHeight:0,overflow:"hidden",fontFamily:FONT_STACK,color:C.text,display:"grid",gridTemplateColumns:"1fr"}
    : {minHeight:"100vh",fontFamily:FONT_STACK,color:C.text,display:"grid",gridTemplateColumns:"274px minmax(0,1fr)"}}>
    {!isMobile&&<aside className="buyer-sidebar" style={{position:"sticky",top:0,height:"100vh",padding:"28px 14px 16px",boxSizing:"border-box",display:"flex",flexDirection:"column",gap:24}}>
      <div style={{padding:"0 16px 2px"}}><BuyerWordmark/></div>
      <nav style={{display:"flex",flexDirection:"column",gap:8}}>
        {sidebarItems.map(item=><button key={item.label} className="buyer-button" onClick={item.action} style={{...buttonBase,display:"flex",alignItems:"center",gap:14,padding:"13px 16px",borderRadius:10,border:0,background:item.active?C.primaryBg:"transparent",color:item.active?C.primaryD:"#5c6678",fontSize:15,fontWeight:item.active?700:600,textAlign:"left"}}><Icon name={item.icon} size={18}/><span>{item.label}</span></button>)}
      </nav>
      <div style={{marginTop:"auto",borderTop:"1px solid "+C.border,paddingTop:18}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}><Avi initials={buyerInitials} size={38}/><div style={{minWidth:0}}><div style={{fontSize:13,fontWeight:800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{profile.name||"Buyer"}</div><div style={{fontSize:11,color:C.textDim,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{buyerOrg?.name||profile.email}</div></div></div>
        <button className="buyer-button" disabled={signingOut} onClick={onLogout} style={{...buttonBase,width:"100%",background:C.white,border:"1px solid "+C.redBorder,borderRadius:12,padding:"12px 14px",color:C.red,fontSize:14,fontWeight:700}}>{signingOut?"Logging out…":"Log out"}</button>
      </div>
    </aside>}
    <main style={isMobile
      ? {minWidth:0,minHeight:0,height:"100%",overflow:"hidden",display:"grid",gridTemplateRows:"auto minmax(0,1fr)"}
      : {minWidth:0}}>
      <div className="buyer-topbar" style={{position:isMobile?"relative":"sticky",top:0,zIndex:20,background:C.white,borderBottom:"1px solid "+C.border,boxShadow:isMobile?"0 8px 18px rgba(16,24,40,.04)":"none",padding:isMobile?"calc(14px + env(safe-area-inset-top)) 18px 14px":"15px 30px",display:"flex",alignItems:"center",gap:isMobile?10:18,flexShrink:0}}>
        {isMobile?<><div style={{flex:1,minWidth:0}}><BuyerWordmark compact/></div><button className="buyer-button" disabled={signingOut} onClick={onLogout} style={{...buttonBase,background:C.white,border:"1px solid "+C.redBorder,borderRadius:12,color:C.red,padding:"10px 14px",fontSize:13,fontWeight:700}}>{signingOut?"…":"Log out"}</button></>:<>
          <div style={{flex:"0 0 auto"}}><BuyerWordmark/></div><div style={{flex:1}}/>
          {canSearch&&<div style={{width:380,maxWidth:"48vw",position:"relative"}}><Icon name="search" size={18} color={C.textDim} style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)"}}/><input aria-label="Search catalog" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products, suppliers, certifications" style={{width:"100%",padding:"13px 14px 13px 42px",background:"#f9fbfe",border:"1px solid "+C.border,borderRadius:999,fontSize:15,outline:0,boxSizing:"border-box",fontFamily:FONT_STACK,color:C.text}}/></div>}
          {canSearch&&<button className="buyer-button" onClick={()=>{setSearch("");setCategory("All");setSupplier("All");setSortBy("newest");}} aria-label="Refresh catalog" style={{...buttonBase,width:50,height:50,background:C.white,border:"1px solid "+C.border,borderRadius:999,color:C.textMid,display:"inline-flex",alignItems:"center",justifyContent:"center"}}><Icon name="refresh" size={19}/></button>}
        </>}
      </div>
      {isMobile
        ? <div className="buyer-mobile-scroll" style={{minHeight:0,overflowY:"auto",overflowX:"hidden",overscrollBehavior:"contain",WebkitOverflowScrolling:"touch"}}>
            {canSearch&&<div style={{padding:"14px 18px 0"}}><div style={{position:"relative"}}><Icon name="search" size={17} color={C.textDim} style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)"}}/><input aria-label="Search catalog" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products or suppliers" style={{width:"100%",padding:"12px 12px 12px 39px",background:C.white,border:"1px solid "+C.border,borderRadius:13,fontSize:14,outline:0,boxSizing:"border-box",fontFamily:FONT_STACK}}/></div></div>}
            {body}
          </div>
        : body}
    </main>

    {isMobile&&<nav className="buyer-mobile-nav" aria-label="Buyer navigation" style={{position:"absolute",left:0,right:0,bottom:0,zIndex:140,background:C.white,borderTop:"1px solid "+C.border,borderLeft:0,borderRight:0,borderBottom:0,borderRadius:"18px 18px 0 0",boxShadow:"0 -10px 30px rgba(16,24,40,.14)",padding:"8px 8px calc(8px + env(safe-area-inset-bottom))",display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:7,overflow:"hidden"}}>
      <span className="buyer-mobile-nav-indicator" aria-hidden="true" style={{transform:mobileNavIndicatorTransform}}/>
      {mobileNavItems.map(item=><button key={item.label} className={"buyer-button buyer-mobile-nav-item"+(item.active?" is-active":"")} onClick={item.action} style={{...buttonBase,minHeight:52,background:item.active?"transparent":"#f9fbfe",border:"1px solid "+(item.active?"transparent":"#eef2f7"),borderRadius:item.active?999:12,color:item.active?C.white:"#5c6678",fontSize:11,fontWeight:700,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,padding:"6px 4px",transform:"none"}}><Icon name={item.icon} size={17}/><span>{item.label}</span></button>)}
    </nav>}

    <TradeGPT open={tradeOpen} onClose={()=>setTradeOpen(false)} prompt={tradePrompt} setPrompt={setTradePrompt} recommendations={tradeRecommendations} onOpenProduct={p=>{setTradeOpen(false);setSelectedProduct(p);}} onApply={applyTradePrompt} isMobile={isMobile}/>
    {selectedProduct&&<ProductDetail product={selectedProduct} documents={documents} api={api} onClose={()=>setSelectedProduct(null)} onQuote={()=>{setQuoteProduct(selectedProduct);setSelectedProduct(null);}} isMobile={isMobile}/>}
    {quoteProduct&&<div className="buyer-trade-overlay" style={{position:"fixed",inset:0,zIndex:320,background:"rgba(6,18,45,.52)",display:"flex",alignItems:isMobile?"stretch":"center",justifyContent:"center",padding:isMobile?0:24}} onClick={()=>!quoteBusy&&setQuoteProduct(null)}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:760,maxHeight:isMobile?"100%":"calc(100dvh - 48px)",overflowY:"auto",background:C.white,borderRadius:isMobile?0:18,padding:isMobile?"16px 16px 110px":"20px",boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"flex-end"}}><button className="buyer-button" aria-label="Close RFQ" onClick={()=>setQuoteProduct(null)} style={{...buttonBase,width:36,height:36,border:0,borderRadius:10,background:C.surface,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="close"/></button></div>
        {quoteError&&<div role="alert" style={{padding:"10px 12px",background:C.redBg,border:"1px solid "+C.redBorder,color:C.red,borderRadius:10,marginBottom:10}}>{quoteError}</div>}
        <RfqForm product={quoteProduct} onSave={saveRfq} onCancel={()=>setQuoteProduct(null)}/>
      </div>
    </div>}
  </div>;
}

```

===== FILE: src/marketplace/LegacyWorkspaceNotice.jsx =====
```jsx
import { COLOR, FONT_STACK, SPACE, TYPE, WEIGHT } from '../lib/tokens';

export function LegacyWorkspaceNotice() {
  return <aside aria-label="Legacy factory workspace" style={{background:COLOR.primaryBg,color:COLOR.text,fontFamily:FONT_STACK,fontSize:TYPE.body.size,lineHeight:TYPE.body.lineHeight,padding:SPACE.base,display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:SPACE.md}}>
    <div><strong style={{fontWeight:WEIGHT.bold}}>Legacy factory workspace</strong><div>Existing factory operations and stone records.</div></div>
    <a href="/" style={{color:COLOR.primaryMid,fontWeight:WEIGHT.medium,padding:SPACE.sm}}>Open Food &amp; Agri marketplace</a>
  </aside>;
}

```

===== FILE: src/marketplace/Login.jsx =====
```jsx
import { useState } from "react";
import { signInWithEmail, friendlyAuthError } from "../lib/auth";
import { C } from "../lib/domain";
import { Btn } from "../components/ui";
import { Icon } from "../components/Icon";
import { FONT_STACK, TYPE } from "../lib/tokens";
import { useBP } from "../hooks/useBP";

// Layout restored from main before 12 September 2026 (0a0afb2, 2 August).
// Keep marketplace authentication and Food & Agri copy independent of the legacy role router.
export function Login({onSignedIn}) {
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [showP,setShowP]=useState(false);
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const [focus,setFocus]=useState("");
  const {isDesktop}=useBP();

  async function submit(e) {
    e.preventDefault();
    const cleanEmail=email.trim().toLowerCase();
    if(!cleanEmail||!pass){setErr("Please enter email and password.");return;}
    setLoading(true);setErr("");
    try { await signInWithEmail(cleanEmail,pass);await onSignedIn(); }
    catch(e){setErr(friendlyAuthError(e,"login"));}
    finally{setLoading(false);}
  }

  const fieldStyle=name=>({
    width:"100%",padding:isDesktop?"15px 16px":"13px 14px",background:C.white,border:`1px solid ${C.border}`,
    borderRadius:6,color:C.text,fontSize:isDesktop?16:15,outline:"none",boxSizing:"border-box",fontFamily:FONT_STACK,
    boxShadow:focus===name?"0 0 0 3px rgba(0, 87, 168, 0.12)":"none"
  });
  const loginFields=(
    <form onSubmit={submit} aria-label="Sign in">
      <div style={{display:"flex",flexDirection:"column",gap:15,marginBottom:20}}>
        <div>
          <label htmlFor="epistable-login-email" style={{display:"block",fontSize:13,fontWeight:600,color:C.text,marginBottom:7}}>Email</label>
          <input id="epistable-login-email" aria-label="Email" required disabled={loading} type="email" value={email} onChange={e=>{setEmail(e.target.value);if(err)setErr("");}} onFocus={()=>setFocus("email")} onBlur={()=>setFocus("")} autoComplete="email" placeholder="you@example.com" style={fieldStyle("email")}/>
        </div>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
            <label htmlFor="epistable-login-password" style={{fontSize:13,fontWeight:600,color:C.text}}>Password</label>
            <button type="button" onClick={()=>setShowP(p=>!p)} style={{background:"none",border:"none",padding:0,color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>{showP?"Hide":"Show"}</button>
          </div>
          <input id="epistable-login-password" aria-label="Password" required disabled={loading} type={showP?"text":"password"} value={pass} onChange={e=>{setPass(e.target.value);if(err)setErr("");}} onFocus={()=>setFocus("password")} onBlur={()=>setFocus("")} autoComplete="current-password" placeholder="Enter password" style={fieldStyle("password")}/>
        </div>
      </div>
      <Btn full size="lg" disabled={loading} style={{borderRadius:6,padding:isDesktop?"15px 20px":"13px 20px",fontWeight:700,fontSize:isDesktop?15:14}}>{loading?"Signing in...":"Log In"}</Btn>
      <div style={{textAlign:"center",marginTop:16}}><a href="/forgot-password" style={{color:C.primary,fontSize:TYPE.label.size}}>Forgot password?</a></div>
    </form>
  );
  if(isDesktop)return (
    <div style={{minHeight:"100vh",background:C.bg,display:"grid",gridTemplateColumns:"minmax(360px,40%) minmax(0,1fr)",fontFamily:FONT_STACK,lineHeight:1.5}}>
      <div style={{background:`linear-gradient(160deg,${C.primary},${C.primaryD} 60%,#001f3d)`,padding:"0 56px",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",minHeight:"100vh",boxSizing:"border-box",textAlign:"center"}}>
        <div style={{marginBottom:58,width:"100%",maxWidth:360}}>
          <div style={{fontSize:34,fontWeight:700,color:C.white,lineHeight:1.1,marginBottom:14}}>Epistable <span style={{color:"#7ec8f0"}}>AI</span></div>
          <div style={{fontSize:18,fontWeight:500,color:"rgba(255,255,255,0.95)",letterSpacing:"1px",fontFamily:FONT_STACK,marginBottom:18}}>Quality, quantified</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14}}>
            <div style={{height:1,width:30,background:"rgba(255,255,255,0.25)",borderRadius:1}}/>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.85)"}}>Verified partners · Food & Agri trade</div>
          </div>
        </div>
        {["Verified seller profiles","Processed-food catalogue","Compliance evidence","Buyer discovery and RFQs","Seller quote responses","Epistable verification"].map(text=>(
          <div key={text} style={{display:"flex",alignItems:"center",gap:14,marginTop:17,width:"100%",maxWidth:290,textAlign:"left"}}>
            <div style={{width:36,height:36,borderRadius:9,background:"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.82)",flexShrink:0}}><Icon name="check" size={16}/></div>
            <span style={{fontSize:14,color:"rgba(255,255,255,0.85)",fontWeight:400}}>{text}</span>
          </div>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"40px"}}>
        <div style={{width:"100%",maxWidth:460}}>
          <div style={{marginBottom:30,textAlign:"center"}}><div style={{fontSize:30,fontWeight:600,color:C.text,marginBottom:8}}>Welcome back</div><div style={{fontSize:15,color:C.textDim}}>Sign in with your assigned credentials</div></div>
          {err&&<div role="alert" style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"11px 14px",fontSize:13,color:C.red,marginBottom:16,fontWeight:500}}>{err}</div>}
          {loginFields}
          <div style={{marginTop:16,textAlign:"center",fontSize:12,color:C.textDim}}>Contact your administrator for credentials</div>
        </div>
      </div>
    </div>
  );
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT_STACK,lineHeight:1.5,color:C.text,display:"flex",flexDirection:"column",boxSizing:"border-box"}}>
      <div style={{background:`linear-gradient(160deg,${C.primary},${C.primaryD} 62%,#001f3d)`,padding:"58px 24px 40px",color:C.white}}>
        <div style={{maxWidth:390,margin:"0 auto",textAlign:"center"}}>
          <div style={{fontSize:26,fontWeight:700,lineHeight:1.15,marginBottom:14}}>Epistable <span style={{color:"#7ec8f0"}}>AI</span></div>
          <div style={{fontSize:15,fontWeight:500,color:"rgba(255,255,255,0.95)",letterSpacing:"1px",fontFamily:FONT_STACK,marginBottom:16}}>Quality, quantified</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14}}>
            <div style={{height:1,width:24,background:"rgba(255,255,255,0.25)",borderRadius:1}}/>
            <div style={{fontSize:12,lineHeight:1.65,color:"rgba(255,255,255,0.85)"}}>Verified partners · Food & Agri trade</div>
          </div>
        </div>
      </div>

      <div style={{width:"100%",maxWidth:390,margin:"0 auto",padding:"24px 20px 28px",boxSizing:"border-box",flex:1}}>
        <div style={{marginBottom:18,textAlign:"center"}}>
          <div style={{fontSize:24,fontWeight:600,color:C.text,marginBottom:5}}>Welcome back</div>
          <div style={{fontSize:14,color:C.textDim}}>Sign in with your assigned credentials</div>
        </div>
        <div style={{width:"100%",background:C.white,border:`1px solid ${C.border}`,borderRadius:8,boxShadow:"0 8px 24px rgba(26,37,51,0.08)",padding:22,boxSizing:"border-box"}}>
          {err&&<div role="alert" style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:6,padding:"13px 14px",fontSize:13,color:C.red,marginBottom:16,fontWeight:500}}>{err}</div>}
          {loginFields}
        </div>

        <div style={{width:"100%",marginTop:18,textAlign:"center"}}>
          <div style={{fontSize:12,color:C.textDim,marginBottom:18}}>Need access? Contact your administrator.</div>
          <div style={{fontSize:TYPE.caption.size,lineHeight:TYPE.caption.lineHeight,letterSpacing:TYPE.caption.letterSpacing,color:C.textDim}}>Built for cross-border Food & Agri trade</div>
        </div>
      </div>
    </div>
  );
}

```

===== FILE: src/marketplace/MarketplaceOnboarding.jsx =====
```jsx
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Button, Field, Notice } from "./ui";

export function MarketplaceOnboarding() {
  const [values,setValues]=useState({type:"seller",name:"",organization_name:"",country:"",city:"",website:"",description:"",email:"",password:""});
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[submitted,setSubmitted]=useState(false);
  const change=key=>e=>setValues(v=>({...v,[key]:e.target.value}));
  async function submit(e){
    e.preventDefault();setBusy(true);setError("");
    try{
      const email=values.email.trim().toLowerCase();
      if(!email||values.password.length<8)throw new Error("Enter a valid email and a password of at least 8 characters.");
      if(!values.name.trim()||!values.organization_name.trim()||!values.country.trim())throw new Error("Name, organisation and country are required.");
      const {data,error:signupError}=await supabase.auth.signUp({
        email,
        password:values.password,
        options:{data:{
          marketplace_onboarding:"true",
          marketplace_type:values.type,
          name:values.name.trim(),
          organization_name:values.organization_name.trim(),
          country:values.country.trim(),
          city:values.city.trim(),
          website:values.website.trim(),
          description:values.description.trim()
        }}
      });
      if(signupError)throw signupError;
      setSubmitted(true);
      if(data.session)window.setTimeout(()=>window.location.assign("/"),700);
    }catch(err){setError(err.message||"Could not submit your Epistable application.");}
    finally{setBusy(false);}
  }
  if(submitted)return <div className="mp-login"><section className="mp-card" style={{maxWidth:680}}>
    <h1>Application submitted</h1>
    <p>Your organisation is now pending Epistable verification. If email confirmation is enabled, confirm your email first. Workspace access is granted automatically after the organisation is approved.</p>
    <div className="mp-actions"><Button onClick={()=>window.location.assign("/")}>Go to sign in</Button></div>
  </section></div>;

  return <div className="mp-login"><form className="mp-card mp-form" style={{maxWidth:760}} onSubmit={submit}>
    <fieldset disabled={busy}>
      <legend>Join Epistable</legend>
      <p>Create a Buyer or Seller organisation. Epistable verifies the organisation before marketplace access is activated.</p>
      <div className="mp-form-grid">
        <Field label="Account type" options={[{value:"seller",label:"Supplier / Seller"},{value:"buyer",label:"Buyer / Procurement"}]} value={values.type} onChange={change("type")}/>
        <Field label="Your name" required value={values.name} onChange={change("name")}/>
        <Field label="Organisation name" required value={values.organization_name} onChange={change("organization_name")}/>
        <Field label="Country" required value={values.country} onChange={change("country")}/>
        <Field label="City" value={values.city} onChange={change("city")}/>
        <Field label="Website" type="url" placeholder="https://…" value={values.website} onChange={change("website")}/>
        <Field label="Email" required type="email" autoComplete="email" value={values.email} onChange={change("email")}/>
        <Field label="Password" required type="password" minLength={8} autoComplete="new-password" value={values.password} onChange={change("password")}/>
      </div>
      <Field label="Organisation overview" multiline maxLength={2000} hint="Briefly describe what you manufacture, source or distribute." value={values.description} onChange={change("description")}/>
      {error&&<Notice error>{error}</Notice>}
      <div className="mp-actions"><Button type="submit" disabled={busy}>{busy?"Submitting…":"Submit for verification"}</Button><Button variant="secondary" onClick={()=>window.location.assign("/")}>Back to sign in</Button></div>
    </fieldset>
  </form></div>;
}

```

===== FILE: src/marketplace/Organisations.jsx =====
```jsx
import { useEffect, useState } from "react";
import { Button, Empty, Field, Heading, Notice, Status } from "./ui";

const blank={name:"",type:"seller",country:"",city:"",website:"",description:""};
export function OrganisationForm({initial=blank,onSave,onCancel}) {
  const [form,setForm]=useState({...blank,...initial});
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const change=key=>e=>setForm(f=>({...f,[key]:e.target.value}));
  async function submit(e){
    e.preventDefault();setError("");setBusy(true);
    try {
      const values=Object.fromEntries(Object.keys(blank).map(k=>[k,String(form[k]||"").trim()]));
      if(!values.name||!values.country)throw new Error("Organisation name and country are required.");
      if(values.website){const url=new URL(values.website);if(!["https:","http:"].includes(url.protocol))throw new Error("Use an http or https website address.");}
      await onSave(values);
    }catch(err){setError(err.message||"Could not save the organisation.");}
    finally{setBusy(false);}
  }
  return <form className="mp-card mp-form" onSubmit={submit} aria-label="Organisation details">
    <fieldset disabled={busy}><legend>Organisation details</legend>
      <div className="mp-form-grid">
        <Field label="Organisation name" required maxLength={200} value={form.name} onChange={change("name")}/>
        <Field label="Organisation type" options={[{value:"seller",label:"Seller organisation"},{value:"buyer",label:"Buyer organisation"}]} disabled={!!initial.id} value={form.type} onChange={change("type")}/>
        <Field label="Country" required maxLength={100} placeholder="e.g. India" value={form.country} onChange={change("country")}/>
        <Field label="City" maxLength={100} value={form.city} onChange={change("city")}/>
        <Field label="Website" type="url" placeholder="https://company.com" maxLength={500} value={form.website} onChange={change("website")}/>
      </div>
      <Field label="About your organisation" multiline maxLength={3000} value={form.description} onChange={change("description")} hint={form.type==="seller"?"Describe your food manufacturing or export business, processed-food categories, production capability, markets served and relevant food-safety certifications.":"Describe your sourcing business, markets served, processed-food categories purchased and key compliance requirements."}/>
      {initial.verification_status==="verified"&&<Notice>Saving profile changes returns this organisation to review. Its products will be hidden from buyers until the organisation is verified again.</Notice>}
      {error&&<Notice error>{error}</Notice>}
      <div className="mp-actions"><Button type="submit">{busy?"Saving…":"Save organisation"}</Button>{onCancel&&<Button variant="secondary" onClick={onCancel}>Cancel</Button>}</div>
    </fieldset>
  </form>;
}
export function Organisations({organizations,api,onSaved}) {
  const [creating,setCreating]=useState(false);
  async function save(values){await api.createOrganization(values);setCreating(false);await onSaved();}
  return <><Heading title="Trade organisations" description="Manage processed-food manufacturers, exporters, importers, distributors and institutional buyers participating in Epistable." action={!creating&&<Button icon="add" onClick={()=>setCreating(true)}>Add organisation</Button>}/>
    {creating?<OrganisationForm onSave={save} onCancel={()=>setCreating(false)}/>:!organizations.length?
      <Empty title="Start with your first organisation" icon="building">Add a seller or buyer, then assign an existing account from Team access.</Empty>:
      <div className="mp-grid">{organizations.map(o=><article key={o.id} className="mp-card"><div className="mp-row"><span className="mp-eyebrow">{o.type}</span><Status value={o.verification_status}/></div><h2>{o.name}</h2><p>{[o.city,o.country].filter(Boolean).join(", ")||"Location not provided"}</p><p>{o.description||"Profile details have not been added yet."}</p></article>)}</div>}
  </>;
}
export function OwnOrganisation({access,organizations,api,onSaved}) {
  const org=organizations.find(o=>o.id===access.org);
  const [saved,setSaved]=useState(false);
  if(!org)return <Empty title="Organisation unavailable" icon="building">Your organisation could not be loaded. Contact an Epistable administrator.</Empty>;
  const admin=access.role.endsWith("_admin");
  return <><Heading title="Company & trade profile" description={org.type==="seller"?"Present your food business, export capability and verification status to buyers.":"Keep your sourcing organisation and market details accurate for verified suppliers."}/>
    {saved&&<Notice>Organisation saved and submitted for review.</Notice>}
    {admin?<OrganisationForm key={org.id} initial={org} onSave={async values=>{await api.updateOrganization(org.id,{...values,verification_status:"pending"});setSaved(true);await onSaved();}}/>:
      <article className="mp-card"><Status value={org.verification_status}/><h2>{org.name}</h2><p>{org.country}</p><p>{org.description}</p><Notice>Your organisation administrator can update this profile.</Notice></article>}
  </>;
}
export function AccessManagement({organizations,api,onSaved}) {
  const [accounts,setAccounts]=useState(null),[error,setError]=useState(""),[message,setMessage]=useState("");
  const [target,setTarget]=useState(""),[org,setOrg]=useState(""),[role,setRole]=useState("member"),[busy,setBusy]=useState(false);
  const selected=organizations.find(o=>o.id===org);
  async function load(){setError("");try{setAccounts(await api.accounts());}catch(e){setError(e.message);}}
  useEffect(()=>{let live=true;api.accounts().then(a=>{if(live)setAccounts(a);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[api]);
  async function submit(e){e.preventDefault();setBusy(true);setError("");setMessage("");try{
    if(!selected||!target)throw new Error("Choose an account and an organisation.");
    await api.assignAccess(target,org,selected.type+"_"+role);await load();await onSaved();
    setMessage("Marketplace access saved. The user can refresh their workspace to load the assignment.");
  }catch(e){setError(e.message||"Could not assign access.");}finally{setBusy(false);}}
  return <><Heading title="Team access" description="Assign an active existing account to a buyer or seller organisation."/>
    {error&&<Notice error>{error} <Button variant="secondary" onClick={load}>Retry</Button></Notice>}{message&&<Notice>{message}</Notice>}
    {!organizations.length?<Empty title="Add an organisation first" icon="building">Create a buyer or seller organisation before assigning access.</Empty>:
    <form className="mp-card mp-form" onSubmit={submit}><fieldset disabled={busy||!accounts}><legend>Assign organisation access</legend>
      <Field label="Account" required value={target} onChange={e=>{setTarget(e.target.value);setMessage("");}} options={[{value:"",label:"Choose an active account"},...(accounts||[]).filter(a=>a.status==="active"&&a.access_role!=="platform_admin").map(a=>({value:a.id,label:a.name+" · "+a.email}))]}/>
      <Field label="Organisation" required value={org} onChange={e=>setOrg(e.target.value)} options={[{value:"",label:"Choose an organisation"},...organizations.map(o=>({value:o.id,label:o.name+" · "+o.type}))]}/>
      <Field label="Access level" value={role} onChange={e=>setRole(e.target.value)} options={[{value:"member",label:"Team member"},{value:"admin",label:"Organisation administrator"}]}/>
      <p>Assigning a different organisation replaces this account’s previous marketplace assignment. Existing login credentials stay the same.</p>
      <Button type="submit">{busy?"Saving…":"Save access"}</Button>
    </fieldset></form>}
    <h2>Linked accounts</h2>{accounts?<div className="mp-list">{accounts.map(a=><article className="mp-card mp-row" key={a.id}><div><strong>{a.name}</strong><p>{a.email}</p><small>{organizations.find(o=>o.id===a.organization_id)?.name||"No organisation"}</small></div><div><Status value={a.status}/><p>{a.access_role?.replaceAll("_"," ")||"Not assigned"}</p></div></article>)}</div>:!error&&<p role="status">Loading accounts…</p>}
  </>;
}

```

===== FILE: src/marketplace/PasswordRecovery.jsx =====
```jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button, Field, Notice, theme } from './ui';
import './marketplace.css';

export function PasswordRecovery({ reset=false, auth=supabase.auth }) {
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
  useEffect(()=>{
    if(!reset)return;
    let active=true;
    auth.getUser().then(({data,error})=>{
      if(!active)return;
      if(error||!data.user)setError('This reset link is invalid or expired. Request a new link below.');
      else setReady(true);
    }).catch(()=>{if(active)setError('Could not verify your reset link. Request a new link below.');});
    return()=>{active=false;};
  },[auth,reset]);
  async function submit(e){
    e.preventDefault();setError('');
    if(reset&&password!==confirm){setError('Passwords do not match.');return;}
    setBusy(true);
    try{
      const result=reset?await auth.updateUser({password}):await auth.resetPasswordForEmail(email.trim().toLowerCase(),{redirectTo:window.location.origin+'/reset-password'});
      if(result.error)throw result.error;
      setPassword('');setConfirm('');setDone(true);
    }catch(e){setError(e.message||'Unable to complete the request. Please try again.');}
    finally{setBusy(false);}
  }
  return <div className="mp-root" style={theme}><div className="mp-login"><section className="mp-card">
    <h1>{reset?'Choose a new password':'Reset your password'}</h1>
    {error&&<Notice error>{error}</Notice>}
    {done?<Notice>{reset?'Your password has been updated. You can open Epistable.':'If this email has an account, a password-reset link has been sent. Check your inbox and spam folder.'}</Notice>:
      reset&&!ready?<p>Open the latest password-reset email to continue.</p>:
      <form className="mp-form" onSubmit={submit}><fieldset disabled={busy}>
        <legend>{reset?'Set your Epistable password':'Receive a secure recovery link'}</legend>
        {reset?<><Field label="New password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} hint="Use at least 8 characters."/><Field label="Confirm password" type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)}/></>:
          <Field label="Email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/>}
        <Button type="submit">{busy?'Please wait…':reset?'Save new password':'Send reset link'}</Button>
      </fieldset></form>}
    {reset&&!done&&<p><a href="/forgot-password">Request a new reset link</a></p>}
    <p><a href="/">{reset&&done?'Open Epistable':'Back to Epistable'}</a></p>
  </section></div></div>;
}

```

===== FILE: src/marketplace/Shell.jsx =====
```jsx
import { useEffect, useRef, useState } from "react";
import { useBP } from "../hooks/useBP";
import { Icon } from "../components/Icon";
import { Button } from "./ui";

export const portals = {
  admin:{title:"Epistable Admin",nav:[["overview","Marketplace overview","chart"],["organizations","Trade organisations","building"],["access","Team access","users"],["products","Processed-food products","package"],["rfqs","Sourcing RFQs","mail"],["verification","Verification queue","verified"]]},
  seller:{title:"Processed Food Seller",nav:[["overview","Seller overview","chart"],["organization","Company & export profile","building"],["products","Processed-food catalogue","package"],["documents","Certifications & documents","file"],["rfqs","Buyer sourcing RFQs","mail"],["quotes","Supplier quotes","message"]]},
  buyer:{title:"Food Trade Buyer",nav:[["discover","Discover processed foods","search"],["suppliers","Verified food suppliers","building"],["organization","Buyer profile","user"],["rfqs","Sourcing RFQs","mail"],["quotes","Supplier quotes","message"]]},
};
export function portalFor(access) {
  if(access?.role==="platform_admin")return "admin";
  if(["seller_admin","seller_member"].includes(access?.role))return "seller";
  if(["buyer_admin","buyer_member"].includes(access?.role))return "buyer";
  return null;
}
export function pageFromHash(mode) {
  const [prefix,portal,page]=window.location.hash.split("/");
  return prefix==="#"&&portal===mode&&portals[mode].nav.some(n=>n[0]===page)?page:portals[mode].nav[0][0];
}
export function Shell({profile,mode,page,onNavigate,onLogout,signingOut,children}) {
  const {isMobile}=useBP();
  const [open,setOpen]=useState(false);
  const menu=useRef(null);
  useEffect(()=>{
    function escape(e){if(e.key==="Escape"){setOpen(false);menu.current?.focus();}}
    window.addEventListener("keydown",escape);
    return ()=>window.removeEventListener("keydown",escape);
  },[]);
  const config=portals[mode];
  function navigate(id){onNavigate(id);setOpen(false);requestAnimationFrame(()=>document.getElementById("marketplace-title")?.focus());}
  return <div className={"mp-shell"+(isMobile?" mp-mobile":"")}>
    <a href="#marketplace-content" className="mp-skip" onClick={e=>{e.preventDefault();document.getElementById("marketplace-content")?.focus();}}>Skip to content</a>
    <header className="mp-header">
      <div className="mp-brand"><Icon name="verified" size={24}/><strong>Epistable</strong><span>{config.title}</span></div>
      <div className="mp-header-right"><span className="mp-account" title={profile.email}>{profile.name==="Epistable Owner"&&mode==="admin"?"Epistable Admin":profile.name||profile.email}</span>
        <Button variant="secondary" disabled={signingOut} onClick={onLogout}>{signingOut?"Logging out…":"Log out"}</Button>
        {isMobile&&<button type="button" className="mp-button mp-button-secondary" ref={menu} aria-expanded={open} aria-controls="marketplace-nav" onClick={()=>setOpen(!open)}><Icon name={open?"close":"list"}/>{open?"Close menu":"Menu"}</button>}
      </div>
    </header>
    {(!isMobile||open)&&<aside className="mp-sidebar"><p className="mp-eyebrow">{config.title}</p><nav id="marketplace-nav" aria-label={config.title}>
      {config.nav.map(([id,label,icon])=><a key={id} href={"#/"+mode+"/"+id} aria-current={id===page?"page":undefined} onClick={e=>{e.preventDefault();navigate(id);}}><Icon name={icon}/>{label}</a>)}
    </nav><div className="mp-nav-logout"><Button variant="secondary" aria-label="Log out from navigation" disabled={signingOut} onClick={onLogout}>{signingOut?"Logging out…":"Log out"}</Button></div><div className="mp-sidebar-note"><Icon name="verified"/><p>Processed Foods<br/><small>Verified cross-border trade</small></p></div></aside>}
    <main id="marketplace-content" tabIndex={-1} className="mp-content">{children}</main>
  </div>;
}

```

===== FILE: src/marketplace/TradeForms.jsx =====
```jsx
import { useEffect, useState } from 'react';
import { FOOD_CATEGORIES, FOOD_CERTIFICATIONS, TRADE_DOCUMENT_TYPES, productRequiresReview } from '../lib/marketplace';
import { Button, Field, Notice } from './ui';
import { days, futureDate, INCOTERMS, list, positive, quoteTotal, UNITS } from './validation';

function useForm(initial) {
  const [values,setValues]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const change=key=>e=>setValues(v=>({...v,[key]:e.target.value}));
  const run=action=>async e=>{e.preventDefault();setBusy(true);setError('');try{await action(e);}catch(err){setError(err.message||'Could not save. Please try again.');}finally{setBusy(false);}};
  return {values,change,busy,error,run};
}
function Actions({busy,onCancel,draft,label}) {
  return <div className="mp-actions">{draft&&<Button type="submit" name="intent" value="draft" formNoValidate variant="secondary">Save draft</Button>}<Button type="submit" name="intent" value="submit">{busy?'Saving…':label}</Button><Button variant="secondary" onClick={onCancel}>Cancel</Button></div>;
}

const productBlank={name:'',category:FOOD_CATEGORIES[0],description:'',ingredients:'',country_of_origin:'',moq:'',moq_unit:'kg',capacity:'',capacity_unit:'kg',packaging:'',shelf_life:'',storage_requirements:'',lead_time_days:'',export_markets:'',certifications:'',allergens:'',dietary_attributes:''};
const arrayFields=['packaging','export_markets','certifications','allergens','dietary_attributes'];
export function ProductForm({initial,onSave,onCancel}) {
  const start={...productBlank,...initial};for(const key of arrayFields)if(Array.isArray(start[key]))start[key]=start[key].join(', ');
  const {values:v,change,busy,error,run}=useForm(start);
  const originalImages=Array.isArray(initial?.image_urls)?initial.image_urls:[];
  const [existingImages,setExistingImages]=useState(originalImages);
  const [newImages,setNewImages]=useState([]);
  const [imageError,setImageError]=useState('');
  useEffect(()=>()=>newImages.forEach(item=>item.preview&&URL.revokeObjectURL?.(item.preview)),[newImages]);
  const risk=productRequiresReview({...v,certifications:list(v.certifications),dietary_attributes:list(v.dietary_attributes)});
  const totalImages=existingImages.length+newImages.length;

  function addImages(e) {
    const files=[...(e.target.files||[])];setImageError('');
    if(totalImages+files.length>6){setImageError('Add up to 6 product images.');e.target.value='';return;}
    const invalid=files.find(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024);
    if(invalid){setImageError('Use JPG, PNG or WebP images up to 5 MB each.');e.target.value='';return;}
    setNewImages(items=>[...items,...files.map(file=>({file,preview:URL.createObjectURL?.(file)||file.name}))]);e.target.value='';
  }
  function removeNew(index){setNewImages(items=>{if(items[index].preview)URL.revokeObjectURL?.(items[index].preview);return items.filter((_,i)=>i!==index);});}
  const submit=run(async e=>{
    const publish=e.nativeEvent.submitter?.value!=='draft';
    const data=Object.fromEntries(Object.keys(productBlank).map(k=>[k,String(v[k]??'').trim()]));
    if(!data.name||!data.category)throw new Error('Product name and category are required.');
    for(const key of arrayFields)data[key]=list(v[key]);
    data.moq=v.moq?positive(v.moq,'Minimum order'):null;data.capacity=v.capacity?positive(v.capacity,'Capacity'):null;data.lead_time_days=days(v.lead_time_days);
    if(publish&&(!data.country_of_origin||!data.moq||!data.packaging.length||!data.shelf_life||!data.storage_requirements))throw new Error('Complete origin, minimum order, packaging, shelf life and storage before publishing.');
    if(publish&&totalImages===0)throw new Error('Add at least one product image before publishing.');
    const requiresReview=publish&&productRequiresReview(data);
    await onSave({
      ...data,
      status:publish&&!requiresReview?'active':'draft',
      verification_status:requiresReview?'pending':'unverified',
      risk_status:requiresReview?'review_required':'clear',
      risk_reason:requiresReview?'Health or regulated claim requires manual review before publication':null,
      __existingImages:existingImages,
      __newImages:newImages.map(item=>item.file),
      __removedImages:originalImages.filter(url=>!existingImages.includes(url))
    });
  });
  return <form className="mp-card mp-form" onSubmit={submit}><fieldset disabled={busy}><legend>{initial?'Edit processed-food product':'Create processed-food product'}</legend>
    <Notice>Product details are seller provided. Verified seller status and verified certification documents are shown separately to buyers.</Notice>
    {risk&&<Notice>One or more health or regulated claims need Epistable review before this listing can go live. You can still save a draft and submit it for review.</Notice>}
    <div className="mp-product-images">
      <div className="mp-row"><div><strong>Product images</strong><p>Add up to 6 clear product or packaging images. The first image is used as the cover.</p></div><small>{totalImages}/6 images</small></div>
      <input aria-label="Product images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addImages}/>
      {(existingImages.length>0||newImages.length>0)&&<div className="mp-image-grid">
        {existingImages.map((url,index)=><figure className="mp-image-item" key={url}><img src={url} alt={`${v.name||'Product'} image ${index+1}`}/><figcaption>{index===0?'Cover image':'Product image'} <button type="button" onClick={()=>setExistingImages(images=>images.filter(item=>item!==url))}>Remove</button></figcaption></figure>)}
        {newImages.map((item,index)=><figure className="mp-image-item" key={item.preview}><img src={item.preview} alt={item.file.name}/><figcaption>{existingImages.length===0&&index===0?'Cover image':'New image'} <button type="button" onClick={()=>removeNew(index)}>Remove</button></figcaption></figure>)}
      </div>}
      {imageError&&<Notice error>{imageError}</Notice>}
    </div>
    <div className="mp-form-grid"><Field label="Product name" required maxLength={200} placeholder="e.g. Ground turmeric powder" value={v.name} onChange={change('name')}/><Field label="Processed-food category" options={[...new Set([...FOOD_CATEGORIES,v.category])]} value={v.category} onChange={change('category')}/><Field label="Country of origin" required value={v.country_of_origin} onChange={change('country_of_origin')}/><Field label="Minimum order quantity (MOQ)" type="number" min="0.000001" step="any" required value={v.moq??''} onChange={change('moq')}/><Field label="MOQ unit" options={UNITS} value={v.moq_unit} onChange={change('moq_unit')}/><Field label="Monthly supply capacity" type="number" min="0.000001" step="any" value={v.capacity??''} onChange={change('capacity')}/><Field label="Capacity unit" options={UNITS} value={v.capacity_unit} onChange={change('capacity_unit')}/><Field label="Production / dispatch lead time (days)" type="number" min="0" max="3650" step="1" value={v.lead_time_days??''} onChange={change('lead_time_days')}/><Field label="Packaging formats" required hint="Separate formats with commas, e.g. 500 g pouch, 5 kg food-service pack, 25 kg export carton." value={v.packaging} onChange={change('packaging')}/><Field label="Shelf life" required placeholder="e.g. 18 months from manufacture" value={v.shelf_life} onChange={change('shelf_life')}/></div>
    <Field label="Storage requirements" required placeholder="e.g. Store below 25°C in a cool, dry place" value={v.storage_requirements} onChange={change('storage_requirements')}/><Field label="Product description" multiline maxLength={5000} hint="Include format, processing method, grade, intended use and private-label capability where relevant." value={v.description} onChange={change('description')}/><Field label="Ingredients / composition" multiline hint="List ingredients in descending order and note additives or preservatives where applicable." value={v.ingredients} onChange={change('ingredients')}/>
    <div className="mp-form-grid"><Field label="Allergens" hint="Comma-separated. Examples: milk, soy, peanuts, tree nuts, gluten, sesame. Use 'None declared' only when supported." value={v.allergens} onChange={change('allergens')}/><Field label="Dietary / product attributes" hint="Examples: vegan, vegetarian, gluten-free, non-GMO, no added sugar." value={v.dietary_attributes} onChange={change('dietary_attributes')}/><Field label="Food safety & market certifications" hint={'Comma-separated. Claims are seller provided until supporting evidence is verified. Common examples: '+FOOD_CERTIFICATIONS.join(', ')+'.'} value={v.certifications} onChange={change('certifications')}/><Field label="Current / target export markets" hint="Comma-separated countries or regions where the product is already sold or prepared for export." value={v.export_markets} onChange={change('export_markets')}/></div>
    {error&&<Notice error>{error}</Notice>}<Actions busy={busy} onCancel={onCancel} draft label={risk?'Send for review':'Publish product'}/>
  </fieldset></form>;
}
export function RfqForm({product,initial,onSave,onCancel}) {
  const {values:v,change,busy,error,run}=useForm({product_category:product?.category||FOOD_CATEGORIES[0],quantity:'',quantity_unit:product?.moq_unit||'kg',destination_country:'',destination_city:'',requirements:'',...initial,required_by:initial?.required_by?new Date(initial.required_by).toISOString().slice(0,10):''});
  const submit=run(async e=>{
    const open=e.nativeEvent.submitter?.value!=='draft';
    const quantity=v.quantity?positive(v.quantity,'Quantity'):null;
    if(open&&(!quantity||!v.destination_country.trim()))throw new Error('Quantity and destination country are required.');
    await onSave({product_id:product?.id||initial?.product_id||null,seller_org_id:product?.seller_org_id||initial?.seller_org_id||null,product_category:v.product_category,quantity,quantity_unit:v.quantity_unit,destination_country:v.destination_country.trim(),destination_city:v.destination_city.trim(),required_by:v.required_by?futureDate(v.required_by,'Required date'):null,requirements:v.requirements.trim(),status:open?'open':'draft'});
  });
  return <form className="mp-card mp-form" onSubmit={submit}><fieldset disabled={busy}><legend>{product?'Request a quote for '+product.name:'Create a processed-food sourcing RFQ'}</legend><p>{product?'This request goes to the verified supplier for this product.':'Open requests are visible to participating food suppliers. Include enough technical and commercial detail to receive comparable quotes.'}</p><div className="mp-form-grid"><Field label="Processed-food category" options={[...new Set([...FOOD_CATEGORIES,v.product_category])]} value={v.product_category} onChange={change('product_category')}/><Field label="Required quantity" type="number" min="0.000001" step="any" required value={v.quantity??''} onChange={change('quantity')}/><Field label="Quantity unit" options={[...new Set([...UNITS,v.quantity_unit])]} value={v.quantity_unit} onChange={change('quantity_unit')}/><Field label="Destination country" required value={v.destination_country} onChange={change('destination_country')}/><Field label="Destination city / port" value={v.destination_city} onChange={change('destination_city')}/><Field label="Required by" type="date" value={v.required_by} onChange={change('required_by')}/></div><Field label="Product, compliance & commercial requirements" multiline maxLength={5000} hint="Specify formulation or grade, pack size, private label, shelf life, allergen limits, certifications, test reports, labelling, Incoterm and any market-specific requirements." value={v.requirements} onChange={change('requirements')}/>{error&&<Notice error>{error}</Notice>}<Actions busy={busy} onCancel={onCancel} draft label="Send RFQ"/></fieldset></form>;
}
export function QuoteForm({rfq,initial,onSave,onCancel}) {
  const {values:v,change,busy,error,run}=useForm({currency:'USD',unit_price:'',quantity:String(rfq.quantity||''),quantity_unit:rfq.quantity_unit||'kg',incoterm:'FOB',lead_time_days:'',notes:'',...initial,validity_ts:initial?.validity_ts?new Date(initial.validity_ts).toISOString().slice(0,10):''});
  let total='—';try{total=quoteTotal(v.unit_price,v.quantity);}catch{}
  const submit=run(async e=>{
    const sent=e.nativeEvent.submitter?.value!=='draft';
    const price=v.unit_price?positive(v.unit_price,'Unit price'):null,quantity=v.quantity?positive(v.quantity,'Quantity'):null;
    if(sent&&(!price||!quantity||!v.validity_ts))throw new Error('Price, quantity and validity date are required.');
    if(!/^[A-Z]{3}$/.test(v.currency))throw new Error('Enter a three-letter currency code.');
    await onSave({rfq_id:rfq.id,currency:v.currency,unit_price:price,quantity,quantity_unit:v.quantity_unit,total_amount:price&&quantity?quoteTotal(price,quantity):null,incoterm:v.incoterm,lead_time_days:days(v.lead_time_days),validity_ts:v.validity_ts?futureDate(v.validity_ts,'Quote validity'):null,notes:v.notes.trim(),status:sent?'sent':'draft'});
  });
  return <form className="mp-card mp-form" onSubmit={submit}><fieldset disabled={busy}><legend>Supplier quote response</legend><p>{rfq.products?.name||rfq.product_category} · {rfq.quantity} {rfq.quantity_unit} to {rfq.destination_country}</p><div className="mp-form-grid"><Field label="Currency" required maxLength={3} pattern="[A-Z]{3}" value={v.currency} onChange={change('currency')}/><Field label="Unit price" type="number" min="0.000001" step="any" required value={v.unit_price??''} onChange={change('unit_price')}/><Field label="Quoted quantity" type="number" min="0.000001" step="any" required value={v.quantity??''} onChange={change('quantity')}/><Field label="Quoted unit" options={[...new Set([...UNITS,v.quantity_unit])]} value={v.quantity_unit} onChange={change('quantity_unit')}/><Field label="Incoterm" options={INCOTERMS} value={v.incoterm} onChange={change('incoterm')}/><Field label="Production / dispatch lead time (days)" type="number" min="0" max="3650" value={v.lead_time_days??''} onChange={change('lead_time_days')}/><Field label="Valid through" type="date" required value={v.validity_ts} onChange={change('validity_ts')}/></div><p><strong>Total: {v.currency} {total}</strong></p><Field label="Commercial terms & food-trade notes" multiline maxLength={5000} hint="Include named Incoterm place or port, pack format, minimum production run, payment terms, inspection/testing conditions and any certification assumptions." value={v.notes} onChange={change('notes')}/>{error&&<Notice error>{error}</Notice>}<Actions busy={busy} onCancel={onCancel} draft label="Send quote"/></fieldset></form>;
}
export function DocumentForm({products,initial,onSave,onCancel}) {
  const [file,setFile]=useState(null);
  const {values:v,change,busy,error,run}=useForm({title:'',document_type:'certificate_of_analysis',product_id:'',issuer:'',reference_number:'',file_url:'',visibility:'private',...initial,issued_at:initial?.issued_at?new Date(initial.issued_at).toISOString().slice(0,10):'',expires_at:initial?.expires_at?new Date(initial.expires_at).toISOString().slice(0,10):''});
  const submit=run(async()=>{
    let url=null;
    if(v.file_url?.trim()){url=new URL(v.file_url.trim());if(url.protocol!=='https:')throw new Error('Use an HTTPS evidence source.');}
    if(!file&&!initial?.storage_path&&!url)throw new Error('Upload a certificate/evidence file or provide an HTTPS source.');
    const issued=v.issued_at?Date.parse(v.issued_at+'T00:00:00Z'):null,expires=v.expires_at?futureDate(v.expires_at,'Document expiry'):null;
    if(issued&&expires&&expires<=issued)throw new Error('Expiry must follow issue date.');
    await onSave({document_type:v.document_type,issuer:v.issuer.trim(),reference_number:v.reference_number.trim(),visibility:v.visibility,title:v.title.trim(),product_id:v.product_id||null,issued_at:issued,expires_at:expires,file_url:url?.href||null,verification_status:'pending',__file:file});
  });
  const fileHint=initial?.storage_path?'Current file: '+(initial.file_name||'uploaded evidence')+'. Choose a file only to replace it.':'PDF, JPG, PNG or WebP up to 10 MB.';
  return <form className="mp-card mp-form" onSubmit={submit}><fieldset disabled={busy}><legend>Add certification or trade evidence</legend><p>Upload or link evidence that helps buyers assess food safety, product quality and export readiness.</p><Field label="Document title" required placeholder="e.g. FSSC 22000 Certificate - 2026" value={v.title} onChange={change('title')}/><div className="mp-form-grid"><Field label="Evidence type" options={TRADE_DOCUMENT_TYPES} value={v.document_type} onChange={change('document_type')}/><Field label="Related processed-food product" options={[{value:'',label:'Organisation-level evidence'},...products.map(p=>({value:p.id,label:p.name}))]} value={v.product_id} onChange={change('product_id')}/><Field label="Issuing body / laboratory" value={v.issuer} onChange={change('issuer')}/><Field label="Certificate / report reference" value={v.reference_number} onChange={change('reference_number')}/><Field label="Issue date" type="date" value={v.issued_at} onChange={change('issued_at')}/><Field label="Expiry date" type="date" value={v.expires_at} onChange={change('expires_at')}/></div><Field label={initial?.storage_path?"Replace uploaded evidence (optional)":"Evidence file"} type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} hint={fileHint}/><Field label="External evidence source (optional)" type="url" placeholder="https://…" value={v.file_url||''} onChange={change('file_url')} hint="Use this only when the evidence is hosted by the certification body, laboratory or another trusted source."/><Field label="Buyer visibility" options={[{value:'private',label:'Your organisation and Epistable only'},{value:'buyers',label:'Verified buyers after Epistable verification'},{value:'public',label:'Visible in signed-in buyer discovery after verification'}]} value={v.visibility} onChange={change('visibility')}/>{error&&<Notice error>{error}</Notice>}<Actions busy={busy} onCancel={onCancel} label="Submit evidence for verification"/></fieldset></form>;
}

export function OrderStatusForm({order,onSave,onCancel}) {
  const {values:v,change,busy,error,run}=useForm({status:order.status||'confirmed',note:order.status_note||''});
  const submit=run(async()=>onSave({status:v.status,note:v.note.trim()}));
  const options=[
    {value:'confirmed',label:'Confirmed'},
    {value:'production',label:'In production'},
    {value:'inspection',label:'Inspection / quality checks'},
    {value:'ready_to_dispatch',label:'Ready to dispatch'},
    {value:'dispatched',label:'Dispatched'},
    {value:'delivered',label:'Delivered'},
    {value:'completed',label:'Completed'},
    {value:'cancelled',label:'Cancelled'}
  ];
  return <form className="mp-card mp-form" onSubmit={submit}><fieldset disabled={busy}><legend>Update order status</legend><p>{order.id} · {order.quantity} {order.quantity_unit} · {order.currency} {order.total_amount}</p><Field label="Order status" options={options} value={v.status} onChange={change('status')}/><Field label="Status note" multiline maxLength={4000} value={v.note} onChange={change('note')} hint="Optional operational note visible to the trading parties." />{error&&<Notice error>{error}</Notice>}<Actions busy={busy} onCancel={onCancel} label="Update order"/></fieldset></form>;
}

```

===== FILE: src/marketplace/Workflows.jsx =====
```jsx
import { useState } from 'react';
import { FOOD_CATEGORIES } from '../lib/marketplace';
import { Button, Empty, Field, Heading, Notice, Status } from './ui';
import { DocumentForm, OrderStatusForm, ProductForm, QuoteForm, RfqForm } from './TradeForms';

const labels={description:'Product description',ingredients:'Ingredients / composition',country_of_origin:'Country of origin',moq:'Minimum order quantity',moq_unit:'MOQ unit',capacity:'Monthly supply capacity',capacity_unit:'Capacity unit',packaging:'Packaging formats',shelf_life:'Shelf life',storage_requirements:'Storage requirements',lead_time_days:'Production / dispatch lead time (days)',export_markets:'Export markets',certifications:'Food safety & market certifications',allergens:'Allergens',dietary_attributes:'Dietary / product attributes',country:'Country',city:'City',issuer:'Issuing body / laboratory',reference_number:'Certificate / report reference',requirements:'Product, compliance & commercial requirements',destination_country:'Destination country',destination_city:'Destination city / port',quantity:'Quantity',quantity_unit:'Unit',currency:'Currency',unit_price:'Unit price',total_amount:'Total',incoterm:'Incoterm',notes:'Commercial terms',review_note:'Review reason'};
export function Details({record}) {
  return <dl className="mp-details">{Object.entries(labels).filter(([key])=>record[key]!=null&&record[key]!==''&&(!Array.isArray(record[key])||record[key].length)).map(([key,label])=><div key={key}><dt>{label}</dt><dd>{Array.isArray(record[key])?record[key].join(', '):String(record[key])}</dd></div>)}{[['required_by','Required by'],['validity_ts','Valid through'],['issued_at','Issued'],['expires_at','Expires']].filter(([key])=>record[key]).map(([key,label])=><div key={key}><dt>{label}</dt><dd>{new Date(record[key]).toLocaleDateString(undefined,{timeZone:'UTC'})}</dd></div>)}</dl>;
}
function Source({record,api}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  if(!record.storage_path&&!record.file_url?.startsWith('https://'))return null;
  if(!record.storage_path)return <p><a href={record.file_url} target="_blank" rel="noopener noreferrer">Open evidence source</a></p>;
  async function openEvidence(){
    setBusy(true);setError('');
    try{const url=await api.evidenceUrl(record);window.open(url,'_blank','noopener,noreferrer');}
    catch(e){setError(e.message||'Could not open evidence.');}
    finally{setBusy(false);}
  }
  return <p><Button variant="secondary" onClick={openEvidence} disabled={busy}>{busy?'Opening…':'Open evidence file'}</Button>{error&&<small className="mp-error">{error}</small>}</p>;
}
export function Verification({data,api,onSaved}) {
  const [selected,setSelected]=useState(null),[reason,setReason]=useState(''),[decision,setDecision]=useState('verified'),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const queue=[...data.organizations.filter(o=>['pending','unverified'].includes(o.verification_status)).map(o=>({kind:'organization',record:o})),...data.products.filter(p=>p.verification_status==='pending').map(p=>({kind:'product',record:p})),...data.documents.filter(d=>d.verification_status==='pending').map(d=>({kind:'document',record:d}))];
  async function submit(e){e.preventDefault();setBusy(true);setError('');try{await api.review(selected.kind,selected.record.id,decision,reason.trim());setSelected(null);await onSaved();}catch(e){setError(e.message||'Could not save review.');}finally{setBusy(false);}}
  const supporting=selected?data.documents.filter(d=>selected.kind==='product'?d.product_id===selected.record.id:selected.kind==='organization'?d.organization_id===selected.record.id:false):[];
  return <><Heading title="Epistable verification" description="Verify organisations and supporting evidence. Products enter this queue only when a higher-risk claim requires manual review."/>{selected?<><article className="mp-card"><p className="mp-eyebrow">{selected.kind}</p><h2>{selected.record.name||selected.record.title}</h2><Details record={selected.record}/><Source record={selected.record} api={api}/>{supporting.length>0&&<><h2>Supporting evidence</h2>{supporting.map(d=><div key={d.id}><strong>{d.title}</strong> <Status value={d.verification_status}/><Source record={d} api={api}/><Details record={d}/></div>)}</>}</article><form onSubmit={submit} className="mp-card mp-form"><fieldset disabled={busy}><legend>Record decision</legend><Field label="Decision" options={[{value:'verified',label:'Approve verification'},{value:'rejected',label:'Reject and request changes'}]} value={decision} onChange={e=>setDecision(e.target.value)}/><Field label="Review reason" multiline required maxLength={4000} value={reason} onChange={e=>setReason(e.target.value)} hint="Record what you checked and any required corrections. This decision is kept in review history."/>{error&&<Notice error>{error}</Notice>}<div className="mp-actions"><Button type="submit">{busy?'Saving…':'Save decision'}</Button><Button variant="secondary" onClick={()=>setSelected(null)}>Cancel</Button></div></fieldset></form></>:!queue.length?<Empty title="No reviews waiting" icon="verified">New organisation profiles, higher-risk product claims and submitted evidence will appear here.</Empty>:<div className="mp-grid">{queue.map(({kind,record})=><article className="mp-card" key={kind+record.id}><div className="mp-row"><span className="mp-eyebrow">{kind}</span><Status value={record.verification_status}/></div><h2>{record.name||record.title}</h2><p>{record.country||record.country_of_origin||record.issuer}</p><Button onClick={()=>{setSelected({kind,record});setReason('');setDecision('verified');setError('');}}>Review</Button></article>)}</div>}<h2>Review history</h2>{!data.reviews.length?<p>No decisions recorded yet.</p>:<div className="mp-list">{data.reviews.map(r=><article key={r.id} className="mp-card"><div className="mp-row"><strong>{r.snapshot?.name||r.snapshot?.title||r.target_id}</strong><Status value={r.decision}/></div><p>{r.reason||'Submitted or updated by the organisation.'}</p><small>{new Date(r.created_at).toLocaleString()} · {r.target_kind}</small></article>)}</div>}</>;
}
export function Workflows({page,mode,access,data,api,onSaved}) {
  const [selected,setSelected]=useState(null),[search,setSearch]=useState(''),[category,setCategory]=useState('');
  const names={products:'Processed-food catalogue',discover:'Discover processed foods',rfqs:mode==='seller'?'Buyer sourcing RFQs':'Your sourcing RFQs',quotes:mode==='buyer'?'Supplier quotes':'Your supplier quotes',documents:'Certifications & documents',suppliers:'Verified food suppliers'};
  const title=names[page];
  function open(type,record,extra={}){setSelected({type,record,id:crypto.randomUUID(),...extra});}
  async function saved(){setSelected(null);await onSaved();}
  if(selected?.type==='product')return <><Heading title={selected.record?'Edit product':'Add a product'} description="Verified sellers can publish complete product listings immediately. Only higher-risk claims are held for Epistable review."/><ProductForm initial={selected.record} onCancel={()=>setSelected(null)} onSave={async values=>{
    const {__existingImages=[],__newImages=[],__removedImages=[],...productValues}=values;
    const productId=selected.record?.id||'PRD_'+selected.id;
    let uploaded=[];
    try {
      if(!selected.record)await api.createProduct({...productValues,id:productId,seller_org_id:access.org,status:'draft',verification_status:productValues.verification_status==='pending'?'pending':'unverified',image_urls:[],cover_image_url:null});
      if(__newImages.length)uploaded=await api.uploadProductImages(access.org,productId,__newImages);
      const image_urls=[...__existingImages,...uploaded].slice(0,6);
      await api.updateProduct(productId,{...productValues,image_urls,cover_image_url:image_urls[0]||null});
      if(__removedImages.length)await api.removeProductImages(__removedImages);
      await saved();
    } catch(error) {
      if(uploaded.length)try{await api.removeProductImages(uploaded);}catch{}
      throw error;
    }
  }}/></>;
  if(selected?.type==='rfq')return <><Heading title="Processed-food sourcing request"/><RfqForm product={selected.product} initial={selected.record} onCancel={()=>setSelected(null)} onSave={async values=>{if(selected.record)await api.updateRfq(selected.record.id,values);else await api.createRfq({...values,id:'RFQ_'+selected.id,buyer_org_id:access.org});await saved();}}/></>;
  if(selected?.type==='quote')return <><Heading title={selected.revision?"Revise supplier quote":"Respond to buyer RFQ"}/><QuoteForm rfq={selected.rfq} initial={selected.record} onCancel={()=>setSelected(null)} onSave={async values=>{if(selected.revision)await api.reviseQuote(selected.record.id,values);else if(selected.record)await api.updateQuote(selected.record.id,values);else await api.createQuote({...values,id:'TQ_'+selected.id,seller_org_id:access.org});await saved();}}/></>;
  if(selected?.type==='order')return <><Heading title="Update trade order"/><OrderStatusForm order={selected.order} onCancel={()=>setSelected(null)} onSave={async values=>{await api.updateOrderStatus(selected.order.id,values.status,values.note);await saved();}}/></>;
  if(selected?.type==='document')return <><Heading title="Add certification or trade evidence"/><DocumentForm initial={selected.record} products={data.products} onCancel={()=>setSelected(null)} onSave={async values=>{
    const {__file,...documentValues}=values;
    const documentId=selected.record?.id||'DOC_'+selected.id;
    let uploaded=null;
    try{
      if(__file)uploaded=await api.uploadTradeEvidence(access.org,documentId,__file);
      const payload={...documentValues,...(uploaded||{})};
      if(selected.record)await api.updateDocument(documentId,payload);
      else await api.addDocument({...payload,id:documentId,organization_id:access.org});
      if(uploaded&&selected.record?.storage_path&&selected.record.storage_path!==uploaded.storage_path)try{await api.removeTradeEvidence(selected.record.storage_path);}catch{}
      await saved();
    }catch(error){
      if(uploaded?.storage_path)try{await api.removeTradeEvidence(uploaded.storage_path);}catch{}
      throw error;
    }
  }}/></>;
  if(selected?.type==='detail'){
    const isProduct=page==='discover'||page==='products';
    if(mode==='buyer'&&page==='discover')return <><Heading title={selected.record.name||selected.record.title||selected.record.products?.name||selected.record.id} action={<Button variant="secondary" onClick={()=>setSelected(null)}>Back to {title.toLowerCase()}</Button>}/><article className="mp-card"><Status value={selected.record.organizations?.verification_status==='verified'?'verified':selected.record.status}/><Details record={selected.record}/><Source record={selected.record} api={api}/><Button onClick={()=>open('rfq',null,{product:selected.record})}>Request a quote</Button></article></>;
    const verifiedEvidence=isProduct?data.documents.filter(d=>d.product_id===selected.record.id&&d.verification_status==='verified'):[];
    return <><Heading title={selected.record.name||selected.record.title||selected.record.products?.name||selected.record.id} action={<Button variant="secondary" onClick={()=>setSelected(null)}>Back to {title.toLowerCase()}</Button>}/><article className="mp-card">
      {isProduct&&Array.isArray(selected.record.image_urls)&&selected.record.image_urls.length>0&&<div className="mp-detail-images">{selected.record.image_urls.map((url,index)=><img key={url} src={url} alt={(selected.record.name||'Product')+' image '+(index+1)}/>)}</div>}
      {isProduct?<><div className="mp-row"><Status value={selected.record.risk_status==='review_required'?'pending':selected.record.status}/>{selected.record.organizations?.verification_status==='verified'&&<span><Status value="verified"/> <small>seller</small></span>}</div><Notice>Product specifications and certification claims are provided by the seller. Epistable verification applies only where a verified seller or verified document badge is shown.</Notice></>:<Status value={selected.record.verification_status||selected.record.status}/>}
      <Details record={selected.record}/><Source record={selected.record} api={api}/>
      {isProduct&&<><h2>Verified evidence</h2>{verifiedEvidence.length?<div className="mp-list">{verifiedEvidence.map(d=><div key={d.id} className="mp-row"><span>{d.title}</span><Status value="verified"/></div>)}</div>:<p>No product-specific documents have been verified yet.</p>}</>}
      {page==='discover'&&<Button onClick={()=>open('rfq',null,{product:selected.record})}>Request a quote</Button>}
    </article></>;
  }
  const products=page==='products'||page==='discover';
  const items=products?data.products:page==='suppliers'?data.organizations.filter(o=>o.type==='seller'):data[page]||[];
  const visible=items.filter(item=>(!category||item.category===category)&&[item.name,item.title,item.id,item.category,item.country_of_origin,item.country,item.product_category,item.destination_country].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase()));
  const action=page==='products'&&mode==='seller'?<Button icon="add" onClick={()=>open('product')}>Add product</Button>:page==='rfqs'&&mode==='buyer'?<Button icon="add" onClick={()=>open('rfq')}>Create RFQ</Button>:page==='documents'&&mode==='seller'?<Button icon="add" onClick={()=>open('document')}>Add evidence</Button>:null;
  return <><Heading title={title} description={page==='discover'?'Source processed-food products from verified suppliers and review product, packaging, shelf-life and certification details.':page==='products'?'Publish complete processed-food listings with images, ingredients, packaging, shelf life, allergens, export markets and certification claims.':page==='documents'?'Submit food-safety certificates, COAs, lab reports, product specifications and export evidence for verification.':page==='suppliers'?'Browse seller organisations participating in verified cross-border food trade.':page==='rfqs'?'Manage sourcing requests with quantity, destination, compliance, packaging and delivery requirements.':page==='quotes'?'Review commercial terms, Incoterms, quantities and lead times shared between buyers and food suppliers.':undefined} action={action}/><div className="mp-form-grid"><Field label={'Search '+title.toLowerCase()} type="search" value={search} onChange={e=>setSearch(e.target.value)}/>{products&&<Field label="Category filter" options={[{value:'',label:'All categories'},...new Set([...FOOD_CATEGORIES,...items.map(p=>p.category)])]} value={category} onChange={e=>setCategory(e.target.value)}/>}</div>{!visible.length?<Empty title={search||category?'No matching records':'No records yet'}>{search||category?'Try another category, country or search term.':page==='discover'?'Processed-food products from verified suppliers appear here after they are published.':'Use the available action above to get started. Shared records appear when another trade participant submits them.'}</Empty>:<div className="mp-grid">{visible.map(item=>{
    const existingQuote=page==='rfqs'?data.quotes.find(q=>q.rfq_id===item.id&&q.seller_org_id===access.org):null;
    const quoteRfq=page==='quotes'?data.rfqs.find(r=>r.id===item.rfq_id):null;
    const quoteOrder=page==='quotes'?data.orders?.find(o=>o.quote_id===item.id):null;
    const isProductCard=page==='products'||page==='discover';
    if(mode==='buyer'&&page==='discover')return <article className="mp-card" key={item.id}><div className="mp-row"><span className="mp-eyebrow">{item.category||item.id}</span><Status value={item.organizations?.verification_status==='verified'?'verified':item.status}/></div><h2>{item.name||item.id}</h2><p>{item.country_of_origin}</p>{item.organizations?.name&&<p>{item.organizations.name}</p>}{item.moq!=null&&<p>Minimum order: {item.moq} {item.moq_unit}</p>}<div className="mp-actions"><Button variant="secondary" onClick={()=>open('detail',item)}>View details</Button><Button onClick={()=>open('rfq',null,{product:item})}>Request a quote</Button></div></article>;
    const verifiedEvidence=isProductCard?data.documents.filter(d=>d.product_id===item.id&&d.verification_status==='verified').length:0;
    return <article className="mp-card" key={item.id}>{isProductCard&&item.cover_image_url&&<img className="mp-product-cover" src={item.cover_image_url} alt={item.name}/>}<div className="mp-row"><span className="mp-eyebrow">{item.category||item.product_category||item.document_type||item.type||item.id}</span>{isProductCard?<Status value={item.risk_status==='review_required'?'pending':item.status}/>:<Status value={page==='quotes'&&item.validity_ts&&item.validity_ts<Date.now()&&['sent','revised'].includes(item.status)?'expired':item.verification_status||item.status}/>}</div><h2>{item.name||item.title||item.products?.name||item.id}</h2><p>{item.country_of_origin||item.country||item.destination_country}</p>{item.organizations?.name&&<p>{item.organizations.name} {item.organizations?.verification_status==='verified'&&<><Status value="verified"/> <small>seller</small></>}</p>}{isProductCard&&<small>Product details seller provided{verifiedEvidence?' · '+verifiedEvidence+' verified evidence item'+(verifiedEvidence===1?'':'s'):''}</small>}{item.moq!=null&&<p>Minimum order: {item.moq} {item.moq_unit}</p>}{item.quantity!=null&&<p>{item.quantity} {item.quantity_unit}</p>}{item.total_amount!=null&&<p>{item.currency} {item.total_amount}</p>}{!isProductCard&&item.status&&item.verification_status&&<Status value={item.status}/>}<div className="mp-actions"><Button variant="secondary" onClick={()=>open('detail',item)}>View details</Button>{page==='discover'&&<Button onClick={()=>open('rfq',null,{product:item})}>Request a quote</Button>}{page==='documents'&&mode==='seller'&&<Button onClick={()=>open('document',item)}>Edit evidence</Button>}{page==='products'&&mode==='seller'&&<Button onClick={()=>open('product',item)}>Edit product</Button>}{page==='rfqs'&&mode==='buyer'&&item.status==='draft'&&<Button onClick={()=>open('rfq',item)}>Continue draft</Button>}{page==='rfqs'&&mode==='seller'&&item.status==='open'&&!existingQuote&&<Button onClick={()=>open('quote',null,{rfq:item})}>Respond with quote</Button>}{existingQuote&&<small>Quote {existingQuote.status.replaceAll('_',' ')}</small>}{page==='quotes'&&mode==='seller'&&item.status==='draft'&&quoteRfq?.status==='open'&&<Button onClick={()=>open('quote',item,{rfq:quoteRfq})}>Continue quote</Button>}{page==='quotes'&&mode==='seller'&&item.status==='revision_requested'&&quoteRfq&&<Button onClick={()=>open('quote',item,{rfq:quoteRfq,revision:true})}>Revise quote</Button>}{page==='quotes'&&mode==='seller'&&quoteOrder&&<><small>Order {quoteOrder.status.replaceAll('_',' ')}</small><Button variant="secondary" onClick={()=>open('order',null,{order:quoteOrder})}>Update order</Button></>}</div></article>;
  })}</div>}</>;
}

```

===== FILE: src/marketplace/ui.jsx =====
```jsx
import { useId } from "react";
import { Icon } from "../components/Icon";
import { Pill } from "../components/Pill";
import { COLOR, FONT_STACK, TYPE, SPACE, RADIUS, SHADOW, WEIGHT } from "../lib/tokens";

export const theme = {
  "--mp-font": FONT_STACK,
  ...Object.fromEntries(Object.entries(COLOR).map(([key,value])=>["--mp-"+key,value])),
  ...Object.fromEntries(Object.entries(SPACE).map(([key,value])=>["--mp-space-"+key,value+"px"])),
  ...Object.fromEntries(Object.entries(TYPE).map(([key,value])=>["--mp-type-"+key,value.size+"px"])),
  ...Object.fromEntries(Object.entries(RADIUS).map(([key,value])=>["--mp-radius-"+key,value+"px"])),
  "--mp-shadow": SHADOW.card, "--mp-medium": WEIGHT.medium, "--mp-bold": WEIGHT.bold,
};
export function Button({ children, variant="primary", icon, type="button", ...props }) {
  return <button type={type} className={"mp-button mp-button-"+variant} {...props}>{icon&&<Icon name={icon}/>}<span>{children}</span></button>;
}
export function Field({ label, hint, options, multiline, ...props }) {
  const id=useId();
  const common={id,...props,"aria-describedby":hint?id+"-hint":undefined};
  return <div className="mp-field"><label htmlFor={id}>{label}{props.required?" *":""}</label>
    {options?<select {...common}>{options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}</select>:
      multiline?<textarea rows={4} {...common}/>:<input {...common}/>}
    {hint&&<small id={id+"-hint"}>{hint}</small>}</div>;
}
export function Notice({children,error=false}) { return <div className={"mp-notice"+(error?" mp-error":"")} role={error?"alert":"status"}>{children}</div>; }
export function Empty({title,children,action,icon="package"}) {
  return <section className="mp-card mp-empty"><Icon name={icon} size={32}/><h2>{title}</h2><p>{children}</p>{action}</section>;
}
export function Heading({title,description,action}) {
  return <div className="mp-heading"><div><h1 tabIndex={-1} id="marketplace-title">{title}</h1>{description&&<p>{description}</p>}</div>{action}</div>;
}
export function Status({value}) {
  return <Pill tone={value==="verified"||value==="accepted"?"success":value==="rejected"?"danger":value==="pending"?"warning":"neutral"}>{String(value||"unverified").replaceAll("_"," ")}</Pill>;
}

```
