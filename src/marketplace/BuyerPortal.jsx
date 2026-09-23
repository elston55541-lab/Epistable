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
    try{await api.downloadEvidence(document);}
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
