import { useEffect, useMemo, useState } from "react";
import { getSessionProfile, signInWithEmail, signOut, friendlyAuthError } from "./lib/auth";
import { marketplace, FOOD_CATEGORIES } from "./lib/marketplace";
import { C } from "./lib/domain";
import { Btn, Card, Inp, KpiGrid, Loader, Sel } from "./components/ui";
import { Icon } from "./components/Icon";
import { Pill } from "./components/Pill";
import { FONT_STACK, RADIUS, SHADOW, SPACE, TYPE, WEIGHT } from "./lib/tokens";
import { useBP } from "./hooks/useBP";

const PORTALS = {
  admin: {
    label: "Epistable Admin",
    subtitle: "Marketplace governance",
    nav: [
      ["overview", "Overview", "chart"], ["organizations", "Organizations", "building"],
      ["products", "Products", "package"], ["rfqs", "RFQs", "mail"],
      ["verification", "Verification", "verified"],
    ],
  },
  seller: {
    label: "Seller Portal",
    subtitle: "Export and buyer operations",
    nav: [
      ["overview", "Overview", "chart"], ["products", "Products", "package"],
      ["rfqs", "Buyer RFQs", "mail"], ["documents", "Documents", "file"],
      ["trade", "Trade Pipeline", "truck"],
    ],
  },
  buyer: {
    label: "Buyer Marketplace",
    subtitle: "Verified food sourcing",
    nav: [
      ["discover", "Discover", "search"], ["suppliers", "Suppliers", "building"],
      ["rfqs", "My RFQs", "mail"], ["quotes", "Quotes", "message"],
      ["saved", "Saved", "package"],
    ],
  },
};

function portalFor(profile) {
  if (profile?.role === "owner") return "admin";
  if (profile?.role === "admin" && !profile?.organization_id) return "admin";
  if (profile?.role === "buyer") return "buyer";
  return "seller";
}

function Login({ onDone }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (!email.trim() || !password) return;
    setBusy(true); setError("");
    try { const { profile } = await signInWithEmail(email, password); onDone(profile); }
    catch (e) { setError(friendlyAuthError(e)); setBusy(false); }
  }
  return <div style={{minHeight:"100vh",background:C.bg,display:"grid",placeItems:"center",padding:SPACE.xl,fontFamily:FONT_STACK}}>
    <Card style={{width:"100%",maxWidth:440,padding:SPACE.xxl,boxShadow:SHADOW.raised}}>
      <div style={{display:"flex",alignItems:"center",gap:SPACE.md,marginBottom:SPACE.xl}}>
        <div style={{width:44,height:44,borderRadius:RADIUS.md,background:C.primary,display:"grid",placeItems:"center"}}><Icon name="verified" size={22} color={C.white}/></div>
        <div><div style={{fontSize:TYPE.display.size,fontWeight:WEIGHT.bold,color:C.text}}>Epistable</div><div style={{fontSize:TYPE.label.size,color:C.textDim}}>Verified cross-border food trade</div></div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:SPACE.base}}>
        <Inp label="Email" value={email} onChange={setEmail} type="email" placeholder="name@company.com"/>
        <Inp label="Password" value={password} onChange={setPassword} type="password"/>
        {error && <div style={{padding:SPACE.md,borderRadius:RADIUS.md,background:C.redBg,border:`1px solid ${C.redBorder}`,color:C.red,fontSize:TYPE.label.size}}>{error}</div>}
        <Btn full onClick={submit} disabled={busy}>{busy?"Signing in...":"Sign in"}</Btn>
      </div>
    </Card>
  </div>;
}

function Shell({profile,mode,setMode,page,setPage,children,onLogout}) {
  const {isMobile}=useBP();
  const config=PORTALS[mode];
  return <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT_STACK,color:C.text}}>
    <aside style={{position:"fixed",inset:"0 auto 0 0",width:240,background:C.white,borderRight:`1px solid ${C.border}`,padding:SPACE.xl,display:isMobile?"none":"flex",flexDirection:"column",boxSizing:"border-box"}}>
      <div style={{marginBottom:SPACE.xl}}><div style={{fontSize:TYPE.heading.size,fontWeight:WEIGHT.bold,color:C.primary}}>Epistable</div><div style={{fontSize:TYPE.caption.size,color:C.textDim,marginTop:SPACE.xs}}>Food & Agri Trade</div></div>
      <div style={{fontSize:TYPE.label.size,fontWeight:WEIGHT.bold,marginBottom:SPACE.xs}}>{config.label}</div>
      <div style={{fontSize:TYPE.caption.size,color:C.textDim,marginBottom:SPACE.lg}}>{config.subtitle}</div>
      <div style={{display:"flex",flexDirection:"column",gap:SPACE.xs,flex:1}}>{config.nav.map(([id,label,icon])=><button key={id} onClick={()=>setPage(id)} style={{border:0,background:page===id?C.primaryBg:"transparent",color:page===id?C.primary:C.textMid,borderRadius:RADIUS.md,padding:`${SPACE.md}px ${SPACE.base}px`,display:"flex",alignItems:"center",gap:SPACE.md,cursor:"pointer",fontFamily:FONT_STACK,fontSize:TYPE.body.size,fontWeight:page===id?WEIGHT.medium:WEIGHT.regular,textAlign:"left"}}><Icon name={icon} size={16}/>{label}</button>)}</div>
      {(profile.role==="owner" || (profile.role==="admin"&&!profile.organization_id)) && <div style={{marginBottom:SPACE.base}}><div style={{fontSize:TYPE.caption.size,color:C.textDim,marginBottom:SPACE.sm}}>Preview portal</div><Sel value={mode} onChange={v=>{setMode(v);setPage(v==="buyer"?"discover":"overview");}} options={[{value:"admin",label:"Admin"},{value:"seller",label:"Seller"},{value:"buyer",label:"Buyer"}]}/></div>}
      <button onClick={onLogout} style={{border:`1px solid ${C.border}`,background:C.white,borderRadius:RADIUS.md,padding:SPACE.md,cursor:"pointer",fontFamily:FONT_STACK,color:C.textMid}}>Sign out</button>
    </aside>
    <main style={{marginLeft:isMobile?0:240,minHeight:"100vh"}}>
      <header style={{height:72,background:C.white,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:`0 ${SPACE.xl}px`,position:"sticky",top:0,zIndex:10}}>
        <div><div style={{fontSize:TYPE.label.size,fontWeight:WEIGHT.bold}}>{config.label}</div><div style={{fontSize:TYPE.caption.size,color:C.textDim}}>{profile.name} · {profile.email}</div></div>
        <Pill tone="primary">Processed Foods Launch</Pill>
      </header>
      <div style={{padding:SPACE.xl,maxWidth:1280,margin:"0 auto"}}>{children}</div>
    </main>
  </div>;
}

function Empty({icon,title,body}) { return <Card style={{padding:SPACE.xxl,textAlign:"center"}}><div style={{display:"flex",justifyContent:"center",marginBottom:SPACE.base}}><Icon name={icon} size={32} color={C.primary}/></div><div style={{fontSize:TYPE.heading.size,fontWeight:WEIGHT.bold,marginBottom:SPACE.sm}}>{title}</div><div style={{fontSize:TYPE.body.size,color:C.textDim,maxWidth:520,margin:"0 auto"}}>{body}</div></Card>; }

function ProductCards({products, buyer=false}) {
  if(!products.length) return <Empty icon="package" title="No products yet" body={buyer?"Verified seller products will appear here as the marketplace is onboarded.":"Add processed-food SKUs with MOQ, packaging, shelf life, certifications and export-market data."}/>;
  return <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:SPACE.base}}>{products.map(p=><Card key={p.id} style={{padding:SPACE.lg}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:SPACE.md,marginBottom:SPACE.md}}><Pill tone="neutral">{p.category}</Pill><Pill tone={p.verification_status==="verified"?"success":"warning"}>{p.verification_status}</Pill></div>
    <div style={{fontSize:TYPE.heading.size,fontWeight:WEIGHT.bold,marginBottom:SPACE.xs}}>{p.name}</div>
    <div style={{fontSize:TYPE.label.size,color:C.textDim,marginBottom:SPACE.base}}>{p.organizations?.name||"Seller"} · {p.country_of_origin||"Origin not set"}</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:SPACE.sm,fontSize:TYPE.label.size,color:C.textMid}}><div>MOQ: {p.moq||"—"} {p.moq_unit||""}</div><div>Lead: {p.lead_time_days?`${p.lead_time_days} days`:"—"}</div><div>Shelf life: {p.shelf_life||"—"}</div><div>Markets: {(p.export_markets||[]).length||0}</div></div>
    {buyer&&<Btn full style={{marginTop:SPACE.base}}>Request Quote</Btn>}
  </Card>)}</div>;
}

function AdminPortal({page,data,reload}) {
  const {organizations,products,rfqs}=data;
  if(page==="overview") return <><div style={{marginBottom:SPACE.xl}}><div style={{fontSize:TYPE.display.size,fontWeight:WEIGHT.bold}}>Cross-border food marketplace</div><div style={{fontSize:TYPE.body.size,color:C.textDim,marginTop:SPACE.xs}}>Launch vertical: processed foods. Platform architecture remains ready for broader food & agri trade.</div></div><KpiGrid items={[{label:"Seller organizations",value:organizations.filter(o=>o.type==="seller").length.toLocaleString("en-IN"),icon:"building",color:C.primary},{label:"Buyer organizations",value:organizations.filter(o=>o.type==="buyer").length.toLocaleString("en-IN"),icon:"users",color:C.blue},{label:"Products",value:products.length.toLocaleString("en-IN"),icon:"package",color:C.green},{label:"Open RFQs",value:rfqs.filter(r=>["open","quoted","negotiating"].includes(r.status)).length.toLocaleString("en-IN"),icon:"mail",color:C.amber}]}/><Card style={{padding:SPACE.xl}}><div style={{fontSize:TYPE.heading.size,fontWeight:WEIGHT.bold,marginBottom:SPACE.md}}>Trade corridor strategy</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:SPACE.base}}>{[["1","India sellers","Launch verified processed-food exporters"],["2","BRICS buyers","Build buyer demand and RFQ liquidity"],["3","BRICS ↔ BRICS","Open multi-country seller participation"],["4","Emerging markets","Expand beyond the initial corridor"]].map(([n,t,b])=><div key={n} style={{padding:SPACE.base,border:`1px solid ${C.border}`,borderRadius:RADIUS.md,background:C.surface}}><div style={{fontSize:TYPE.caption.size,color:C.primary,fontWeight:WEIGHT.bold}}>PHASE {n}</div><div style={{fontSize:TYPE.body.size,fontWeight:WEIGHT.bold,marginTop:SPACE.xs}}>{t}</div><div style={{fontSize:TYPE.label.size,color:C.textDim,marginTop:SPACE.xs}}>{b}</div></div>)}</div></Card></>;
  if(page==="organizations") return organizations.length?<div style={{display:"flex",flexDirection:"column",gap:SPACE.md}}>{organizations.map(o=><Card key={o.id} style={{padding:SPACE.lg,display:"flex",justifyContent:"space-between",gap:SPACE.base,alignItems:"center"}}><div><div style={{fontSize:TYPE.body.size,fontWeight:WEIGHT.bold}}>{o.name}</div><div style={{fontSize:TYPE.label.size,color:C.textDim}}>{o.type} · {o.country||"Country not set"}</div></div><Pill tone={o.verification_status==="verified"?"success":"warning"}>{o.verification_status}</Pill></Card>)}</div>:<Empty icon="building" title="No organizations yet" body="Onboard the first seller and buyer organizations to start the marketplace."/>;
  if(page==="products") return <ProductCards products={products}/>;
  if(page==="rfqs") return rfqs.length?<div style={{display:"flex",flexDirection:"column",gap:SPACE.md}}>{rfqs.map(r=><Card key={r.id} style={{padding:SPACE.lg}}><div style={{display:"flex",justifyContent:"space-between",gap:SPACE.md}}><div><div style={{fontSize:TYPE.body.size,fontWeight:WEIGHT.bold}}>{r.products?.name||r.product_category||"Open food RFQ"}</div><div style={{fontSize:TYPE.label.size,color:C.textDim,marginTop:SPACE.xs}}>{r.quantity||"—"} {r.quantity_unit||""} · {r.destination_country||"Destination not set"}</div></div><Pill tone="primary">{r.status}</Pill></div></Card>)}</div>:<Empty icon="mail" title="No RFQs yet" body="Buyer requests will appear here once sourcing activity begins."/>;
  return <><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:SPACE.base}}><div style={{fontSize:TYPE.display.size,fontWeight:WEIGHT.bold}}>Verification queue</div><Btn variant="secondary" onClick={reload}><Icon name="refresh" size={14}/> Refresh</Btn></div><Empty icon="verified" title="Verification layer ready" body="Seller organizations, product records and trade documents are structured for Epistable verification without presenting Epistable as a regulatory certifier."/></>;
}

function SellerPortal({page,data,profile}) {
  const mine=data.products.filter(p=>!profile.organization_id||p.seller_org_id===profile.organization_id);
  const myRfqs=data.rfqs.filter(r=>!profile.organization_id||r.seller_org_id===profile.organization_id);
  if(page==="overview") return <><div style={{fontSize:TYPE.display.size,fontWeight:WEIGHT.bold,marginBottom:SPACE.xs}}>Seller command center</div><div style={{fontSize:TYPE.body.size,color:C.textDim,marginBottom:SPACE.xl}}>Manage products, compliance evidence and buyer demand from one export workspace.</div><KpiGrid items={[{label:"Products",value:mine.length.toLocaleString("en-IN"),icon:"package",color:C.primary},{label:"Buyer RFQs",value:myRfqs.length.toLocaleString("en-IN"),icon:"mail",color:C.amber},{label:"Verified products",value:mine.filter(p=>p.verification_status==="verified").length.toLocaleString("en-IN"),icon:"verified",color:C.green},{label:"Markets",value:new Set(mine.flatMap(p=>p.export_markets||[])).size.toLocaleString("en-IN"),icon:"location",color:C.blue}]}/><Card style={{padding:SPACE.xl}}><div style={{fontSize:TYPE.heading.size,fontWeight:WEIGHT.bold,marginBottom:SPACE.md}}>Buyer-ready profile checklist</div>{["Company and factory profile","Product catalogue","MOQ, packaging and shelf life","Certifications and trade documents","Export markets and lead time"].map((x,i)=><div key={x} style={{display:"flex",alignItems:"center",gap:SPACE.md,padding:`${SPACE.md}px 0`,borderBottom:i<4?`1px solid ${C.border}`:"none"}}><Icon name="check" size={16} color={C.green}/><span style={{fontSize:TYPE.body.size}}>{x}</span></div>)}</Card></>;
  if(page==="products") return <ProductCards products={mine}/>;
  if(page==="rfqs") return myRfqs.length?<div style={{display:"flex",flexDirection:"column",gap:SPACE.md}}>{myRfqs.map(r=><Card key={r.id} style={{padding:SPACE.lg}}><div style={{fontSize:TYPE.body.size,fontWeight:WEIGHT.bold}}>{r.products?.name||r.product_category}</div><div style={{fontSize:TYPE.label.size,color:C.textDim,marginTop:SPACE.xs}}>{r.quantity} {r.quantity_unit} · Ship to {r.destination_country||"—"}</div><div style={{marginTop:SPACE.md}}><Pill tone="primary">{r.status}</Pill></div></Card>)}</div>:<Empty icon="mail" title="No buyer RFQs yet" body="Relevant sourcing requests will appear here as buyer activity grows."/>;
  if(page==="documents") return <Empty icon="file" title="Trade document workspace" body="Upload certifications, lab reports, COAs and supporting export documents against your organization or products."/>;
  return <Empty icon="truck" title="Trade pipeline" body="Accepted quotes will progress from negotiation to order, fulfilment and transaction history here."/>;
}

function BuyerPortal({page,data}) {
  const verified=data.products.filter(p=>p.verification_status==="verified"&&p.status==="active");
  const [category,setCategory]=useState("all");
  const visible=category==="all"?verified:verified.filter(p=>p.category===category);
  if(page==="discover") return <><div style={{marginBottom:SPACE.xl}}><div style={{fontSize:TYPE.display.size,fontWeight:WEIGHT.bold}}>Source verified food suppliers</div><div style={{fontSize:TYPE.body.size,color:C.textDim,marginTop:SPACE.xs}}>Start with processed foods across the India–BRICS trade corridor.</div></div><Card style={{padding:SPACE.base,marginBottom:SPACE.xl}}><Sel label="Category" value={category} onChange={setCategory} options={[{value:"all",label:"All processed foods"},...FOOD_CATEGORIES.map(x=>({value:x,label:x}))]}/></Card><ProductCards products={visible} buyer/></>;
  if(page==="suppliers") { const sellers=data.organizations.filter(o=>o.type==="seller"&&o.verification_status==="verified"); return sellers.length?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:SPACE.base}}>{sellers.map(s=><Card key={s.id} style={{padding:SPACE.lg}}><Pill tone="success">Verified seller</Pill><div style={{fontSize:TYPE.heading.size,fontWeight:WEIGHT.bold,marginTop:SPACE.md}}>{s.name}</div><div style={{fontSize:TYPE.label.size,color:C.textDim,marginTop:SPACE.xs}}>{s.city?`${s.city}, `:""}{s.country||""}</div><div style={{fontSize:TYPE.body.size,color:C.textMid,marginTop:SPACE.md}}>{s.description||"Verified processed-food supplier on Epistable."}</div></Card>)}</div>:<Empty icon="building" title="No verified sellers yet" body="Verified seller organizations will appear here as onboarding begins."/>; }
  if(page==="rfqs") return <Empty icon="mail" title="Your RFQs" body="Create sourcing requests by product, quantity, destination and required date, then compare seller responses."/>;
  if(page==="quotes") return <Empty icon="message" title="Quote comparison" body="Seller quotations will be compared here by price, lead time, Incoterm and verification evidence."/>;
  return <Empty icon="package" title="Saved products" body="Shortlisted suppliers and products will appear here for procurement review."/>;
}

export default function MarketplaceApp() {
  const [profile,setProfile]=useState(null); const [loading,setLoading]=useState(true);
  const [mode,setMode]=useState("admin"); const [page,setPage]=useState("overview");
  const [data,setData]=useState({organizations:[],products:[],rfqs:[]}); const [loadError,setLoadError]=useState("");
  async function reload(){ setLoadError(""); try{ const [organizations,products,rfqs]=await Promise.all([marketplace.organizations(),marketplace.products(),marketplace.rfqs()]); setData({organizations,products,rfqs}); }catch(e){ setLoadError(e?.message||"Could not load marketplace data."); } }
  useEffect(()=>{ let live=true; getSessionProfile().then(p=>{if(live){setProfile(p); if(p){const m=portalFor(p);setMode(m);setPage(m==="buyer"?"discover":"overview");} setLoading(false);}}).catch(()=>{if(live)setLoading(false);}); return()=>{live=false;};},[]);
  useEffect(()=>{if(profile)reload();},[profile]);
  const content=useMemo(()=>{if(mode==="admin")return <AdminPortal page={page} data={data} reload={reload}/>; if(mode==="seller")return <SellerPortal page={page} data={data} profile={profile}/>; return <BuyerPortal page={page} data={data}/>;},[mode,page,data,profile]);
  if(loading)return <Loader/>; if(!profile)return <Login onDone={p=>{setProfile(p);const m=portalFor(p);setMode(m);setPage(m==="buyer"?"discover":"overview");}}/>;
  return <Shell profile={profile} mode={mode} setMode={setMode} page={page} setPage={setPage} onLogout={async()=>{await signOut();setProfile(null);}}>{loadError&&<div style={{padding:SPACE.md,marginBottom:SPACE.base,borderRadius:RADIUS.md,background:C.amberBg,border:`1px solid ${C.amberBorder}`,color:C.amber,fontSize:TYPE.label.size}}>{loadError}</div>}{content}</Shell>;
}
