import { useState, useEffect, useRef } from "react";

const C = {
  bg:"#f0f2f5", white:"#ffffff", surface:"#f8f9fb",
  primary:"#0057a8", primaryD:"#003f7a",
  primaryBg:"#e8f0fa", primaryBorder:"#b8d0f0",
  teal:"#0097a7",
  text:"#1a2533", textMid:"#4a5568", textDim:"#8896a4",
  border:"#e2e8f0",
  green:"#2e7d32", greenBg:"#e8f5e9", greenBorder:"#a5d6a7",
  red:"#c62828", redBg:"#ffebee", redBorder:"#ef9a9a",
  amber:"#b45309", amberBg:"#fffbeb", amberBorder:"#fcd34d",
  blue2:"#1565c0", blue2Bg:"#e3f2fd", blue2Border:"#90caf9",
  purple:"#6b21a8", purpleBg:"#f5f0ff", purpleBorder:"#d8b4fe",
  shadow:"0 1px 4px rgba(0,0,0,0.08)",
};

const OWNER = { email:"owner@silak.ai", password:"owner2026" };
const STONES = [
  {id:"makrana",label:"Makrana White"},{id:"black",label:"Black Granite"},
  {id:"green",label:"Rainforest Green"},{id:"yellow",label:"Jaisalmer Yellow"},
  {id:"pink",label:"Udaipur Pink"},{id:"kota",label:"Kota Brown"},
  {id:"carrara",label:"Carrara White"},{id:"red",label:"Indian Red Granite"},
];
const DEFECTS = [
  {id:"crack",label:"Crack",color:C.red},
  {id:"stain",label:"Stain",color:C.amber},{id:"pit",label:"Pitting",color:C.red},
  {id:"chip",label:"Edge Chip",color:C.amber},{id:"vein",label:"Vein Issue",color:C.blue2},
  {id:"polish",label:"Polish Issue",color:C.amber},{id:"thin",label:"Thin Spot",color:C.purple},
];
const GRADES = [
  {id:"Premium",label:"PREMIUM",color:C.green,bg:C.greenBg,border:C.greenBorder,emoji:"🏆",price:850},
  {id:"Standard",label:"STANDARD",color:C.amber,bg:C.amberBg,border:C.amberBorder,emoji:"✅",price:480},
  {id:"Commercial",label:"COMMERCIAL",color:C.blue2,bg:C.blue2Bg,border:C.blue2Border,emoji:"🏢",price:320},
  {id:"Rejected",label:"REJECT",color:C.red,bg:C.redBg,border:C.redBorder,emoji:"❌",price:0},
];
const PLANS = {
  Starter:{label:"Starter",scansIncluded:100,pricePerScan:5,monthlyFee:299},
  Pro:{label:"Pro",scansIncluded:500,pricePerScan:3,monthlyFee:999},
  Enterprise:{label:"Enterprise",scansIncluded:2000,pricePerScan:1.5,monthlyFee:2999},
};

const genId = p => p+"-"+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,5).toUpperCase();
const fmtT = ts => new Date(ts).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
const fmtD = ts => new Date(ts).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
const curMon = () => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; };
const calcBill = (plan,scans) => {
  const p=PLANS[plan]||PLANS.Starter;
  const ov=Math.max(0,scans-p.scansIncluded);
  return {monthlyFee:p.monthlyFee,includedScans:p.scansIncluded,overageScans:ov,overageCharge:Math.round(ov*p.pricePerScan),pricePerScan:p.pricePerScan,total:p.monthlyFee+Math.round(ov*p.pricePerScan)};
};
const gradeConf = g => GRADES.find(x=>x.id===g)||GRADES[1];
// QR code URL for a slab
const slabQrUrl = (slabId) => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent("silak://slab/"+slabId)}`;

function useBP() {
  const [w,setW]=useState(window.innerWidth);
  useEffect(()=>{const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  return {isMobile:w<640,isDesktop:w>=1024};
}

// ── STORAGE ──
const S = {
  set(k,v){try{localStorage.setItem("silak_"+k,typeof v==="string"?v:JSON.stringify(v));return true;}catch(e){throw new Error("Storage: "+e.message);}},
  get(k){try{return localStorage.getItem("silak_"+k);}catch{return null;}},
  getJ(k){const v=S.get(k);if(!v)return null;try{return JSON.parse(v);}catch{return null;}},
  list(pfx){try{const r=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith("silak_"+pfx))r.push(k.replace("silak_",""));}return r;}catch{return[];}},
};

// ── DB ──
const DB = {
  createFac(d){const id=genId("FAC");const f={id,...d,createdAt:Date.now(),status:"active",scansTotal:0,billingStatus:"paid",currentMonthScans:0,currentMonth:curMon()};S.set("fac:"+id,f);const idx=S.getJ("fac_idx")||[];idx.push(id);S.set("fac_idx",idx);return f;},
  getFac(id){return S.getJ("fac:"+id);},
  updFac(id,u){const f=DB.getFac(id);if(!f)return null;const n={...f,...u};S.set("fac:"+id,n);return n;},
  allFacs(){return(S.getJ("fac_idx")||[]).map(id=>DB.getFac(id)).filter(Boolean);},
  createUser(d){const id=genId("USR");const u={id,...d,createdAt:Date.now(),status:"active",scansTotal:0,lastActive:null};S.set("usr:"+id,u);S.set("uemail:"+d.email.toLowerCase(),id);const idx=S.getJ("fusr:"+d.factoryId)||[];idx.push(id);S.set("fusr:"+d.factoryId,idx);return u;},
  getUser(id){return S.getJ("usr:"+id);},
  getUserByEmail(em){const id=S.get("uemail:"+em.toLowerCase());return id?DB.getUser(id):null;},
  updUser(id,u){const usr=DB.getUser(id);if(!usr)return null;const n={...usr,...u};S.set("usr:"+id,n);return n;},
  facUsers(fid){return(S.getJ("fusr:"+fid)||[]).map(id=>DB.getUser(id)).filter(Boolean);},
  allUsers(){return S.list("usr:").map(k=>S.getJ(k)).filter(u=>u&&u.id);},
  createBuyer(d){const id=genId("BUY");const b={id,...d,createdAt:Date.now(),status:"active",type:"buyer"};S.set("buyer:"+id,b);S.set("buyeremail:"+d.email.toLowerCase(),id);const idx=S.getJ("fbuyers:"+d.factoryId)||[];idx.push(id);S.set("fbuyers:"+d.factoryId,idx);return b;},
  getBuyer(id){return S.getJ("buyer:"+id);},
  getBuyerByEmail(em){const id=S.get("buyeremail:"+em.toLowerCase());return id?DB.getBuyer(id):null;},
  updBuyer(id,u){const b=DB.getBuyer(id);if(!b)return null;const n={...b,...u};S.set("buyer:"+id,n);return n;},
  facBuyers(fid){return(S.getJ("fbuyers:"+fid)||[]).map(id=>DB.getBuyer(id)).filter(Boolean);},
  saveInsp(insp){
    S.set("insp:"+insp.id,insp);
    const ui=S.getJ("uinsp:"+insp.userId)||[];ui.unshift(insp.id);if(ui.length>500)ui.splice(500);S.set("uinsp:"+insp.userId,ui);
    const fi=S.getJ("finsp:"+insp.factoryId)||[];fi.unshift(insp.id);if(fi.length>1000)fi.splice(1000);S.set("finsp:"+insp.factoryId,fi);
    // index by supplier
    if(insp.supplierId){const si=S.getJ("supinsp:"+insp.supplierId)||[];si.unshift(insp.id);S.set("supinsp:"+insp.supplierId,si);}
    const fac=DB.getFac(insp.factoryId);
    if(fac){const m=curMon();const ms=fac.currentMonth===m?(fac.currentMonthScans||0)+1:1;DB.updFac(insp.factoryId,{scansTotal:(fac.scansTotal||0)+1,currentMonthScans:ms,currentMonth:m,lastActive:Date.now()});}
    const u=DB.getUser(insp.userId);if(u)DB.updUser(insp.userId,{scansTotal:(u.scansTotal||0)+1,lastActive:Date.now()});
  },
  getInsp(id){return S.getJ("insp:"+id);},
  userInsps(uid){return(S.getJ("uinsp:"+uid)||[]).slice(0,200).map(id=>S.getJ("insp:"+id)).filter(Boolean);},
  facInsps(fid){return(S.getJ("finsp:"+fid)||[]).slice(0,300).map(id=>S.getJ("insp:"+id)).filter(Boolean);},
  allInsps(){return S.list("insp:").map(k=>S.getJ(k)).filter(Boolean).sort((a,b)=>(b.ts||0)-(a.ts||0));},
  // Suppliers
  createSupplier(d){const id=genId("SUP");const s={id,...d,createdAt:Date.now(),status:"active"};S.set("sup:"+id,s);const idx=S.getJ("fsup:"+d.factoryId)||[];idx.push(id);S.set("fsup:"+d.factoryId,idx);return s;},
  getSupplier(id){return S.getJ("sup:"+id);},
  updSupplier(id,u){const s=DB.getSupplier(id);if(!s)return null;const n={...s,...u};S.set("sup:"+id,n);return n;},
  facSuppliers(fid){return(S.getJ("fsup:"+fid)||[]).map(id=>DB.getSupplier(id)).filter(Boolean);},
  supplierInsps(sid){return(S.getJ("supinsp:"+sid)||[]).map(id=>S.getJ("insp:"+id)).filter(Boolean);},
  // Disputes
  createDispute(d){const id=genId("DSP");const disp={id,...d,createdAt:Date.now(),status:"open"};S.set("dsp:"+id,disp);const fi=S.getJ("fdsp:"+d.factoryId)||[];fi.unshift(id);S.set("fdsp:"+d.factoryId,fi);const oi=S.getJ("alldsp")||[];oi.unshift(id);S.set("alldsp",oi);return disp;},
  getDispute(id){return S.getJ("dsp:"+id);},
  updDispute(id,u){const d=DB.getDispute(id);if(!d)return null;const n={...d,...u};S.set("dsp:"+id,n);return n;},
  facDisputes(fid){return(S.getJ("fdsp:"+fid)||[]).map(id=>DB.getDispute(id)).filter(Boolean);},
  allDisputes(){return(S.getJ("alldsp")||[]).map(id=>DB.getDispute(id)).filter(Boolean);},
  // Inquiries
  createInquiry(d){const id=genId("INQ");const inq={id,...d,createdAt:Date.now(),status:"new"};S.set("inq:"+id,inq);const fi=S.getJ("finq:"+d.factoryId)||[];fi.unshift(id);S.set("finq:"+d.factoryId,fi);const oi=S.getJ("allinq")||[];oi.unshift(id);S.set("allinq",oi);return inq;},
  getInquiry(id){return S.getJ("inq:"+id);},
  updInquiry(id,u){const q=DB.getInquiry(id);if(!q)return null;const n={...q,...u};S.set("inq:"+id,n);return n;},
  facInquiries(fid){return(S.getJ("finq:"+fid)||[]).map(id=>DB.getInquiry(id)).filter(Boolean);},
  allInquiries(){return(S.getJ("allinq")||[]).map(id=>DB.getInquiry(id)).filter(Boolean);},
  // Notifications
  addNotif(uid,n){const ns=S.getJ("notif:"+uid)||[];ns.unshift({...n,id:genId("N"),ts:Date.now(),read:false});if(ns.length>50)ns.splice(50);S.set("notif:"+uid,ns);},
  getNotifs(uid){return S.getJ("notif:"+uid)||[];},
  readAll(uid){S.set("notif:"+uid,DB.getNotifs(uid).map(n=>({...n,read:true})));},
};

// ── UI ATOMS ──
const Card = ({children,style={},onClick}) =>
  <div onClick={onClick} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,boxShadow:C.shadow,...style}}>{children}</div>;

const BillPill = ({status}) => {
  const m={paid:{c:C.green,bg:C.greenBg,b:C.greenBorder,l:"✓ Paid"},overdue:{c:C.red,bg:C.redBg,b:C.redBorder,l:"⚠ Overdue"},pending:{c:C.amber,bg:C.amberBg,b:C.amberBorder,l:"● Pending"}};
  const s=m[status]||m.pending;
  return <span style={{background:s.bg,border:`1px solid ${s.b}`,color:s.c,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{s.l}</span>;
};
const StatPill = ({status}) => {
  const m={active:{c:C.green,bg:C.greenBg,b:C.greenBorder,l:"Active"},paused:{c:C.red,bg:C.redBg,b:C.redBorder,l:"Paused"},suspended:{c:C.red,bg:C.redBg,b:C.redBorder,l:"Suspended"},inactive:{c:C.amber,bg:C.amberBg,b:C.amberBorder,l:"Inactive"},flagged:{c:C.red,bg:C.redBg,b:C.redBorder,l:"⚑ Flagged"}};
  const s=m[status]||m.inactive;
  return <span style={{background:s.bg,border:`1px solid ${s.b}`,color:s.c,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{s.l}</span>;
};
const DisputeStatusPill = ({status}) => {
  const m={open:{c:C.red,bg:C.redBg,b:C.redBorder,l:"🔴 Open"},reviewing:{c:C.amber,bg:C.amberBg,b:C.amberBorder,l:"🔍 Reviewing"},resolved:{c:C.green,bg:C.greenBg,b:C.greenBorder,l:"✅ Resolved"},dismissed:{c:C.textDim,bg:C.surface,b:C.border,l:"✗ Dismissed"}};
  const s=m[status]||m.open;
  return <span style={{background:s.bg,border:`1px solid ${s.b}`,color:s.c,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{s.l}</span>;
};
const InqPill = ({status}) => {
  const m={new:{c:C.primary,bg:C.primaryBg,b:C.primaryBorder,l:"🔔 New"},contacted:{c:C.amber,bg:C.amberBg,b:C.amberBorder,l:"📞 Contacted"},closed:{c:C.green,bg:C.greenBg,b:C.greenBorder,l:"✅ Closed"}};
  const s=m[status]||m.new;
  return <span style={{background:s.bg,border:`1px solid ${s.b}`,color:s.c,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{s.l}</span>;
};
const Avi = ({initials,size=36,color=C.primary,bg=C.primaryBg,border=C.primaryBorder}) =>
  <div style={{width:size,height:size,borderRadius:"50%",background:bg,border:`2px solid ${border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.33,fontWeight:700,color,flexShrink:0}}>{initials}</div>;
const PBar = ({value,color=C.primary,h=6}) =>
  <div style={{background:"#e9ecef",borderRadius:h,height:h,overflow:"hidden"}}>
    <div style={{background:color,width:`${Math.min(Math.max(value,0),100)}%`,height:"100%",borderRadius:h,transition:"width 0.4s"}}/>
  </div>;

function Btn({children,onClick,variant="primary",full,disabled,style={},size="md"}) {
  const pad={sm:"8px 16px",md:"12px 20px",lg:"15px 24px"}[size];
  const fs={sm:12,md:14,lg:15}[size];
  const vs={primary:{bg:C.primary,color:C.white,border:"none"},secondary:{bg:C.white,color:C.textMid,border:`1px solid ${C.border}`},green:{bg:C.green,color:C.white,border:"none"},red:{bg:C.red,color:C.white,border:"none"},ghost:{bg:"transparent",color:C.primary,border:`1px solid ${C.primaryBorder}`}};
  const v=vs[variant]||vs.primary;
  return <button onClick={onClick} disabled={disabled} style={{padding:pad,background:v.bg,border:v.border,borderRadius:10,color:v.color,fontWeight:700,fontSize:fs,cursor:disabled?"not-allowed":"pointer",fontFamily:"sans-serif",width:full?"100%":"auto",opacity:disabled?0.5:1,WebkitTapHighlightColor:"transparent",...style}}>{children}</button>;
}
function Inp({label,value,onChange,type="text",placeholder,required,icon,hint}) {
  const [f,setF]=useState(false);
  return (
    <div>
      {label&&<label style={{display:"block",fontSize:13,fontWeight:600,color:C.text,marginBottom:6}}>{label}{required&&<span style={{color:C.red}}> *</span>}</label>}
      <div style={{position:"relative"}}>
        {icon&&<span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:15,pointerEvents:"none"}}>{icon}</span>}
        <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          style={{width:"100%",padding:icon?"12px 14px 12px 42px":"12px 14px",background:C.white,border:`1.5px solid ${f?C.primary:C.border}`,borderRadius:10,color:C.text,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"sans-serif"}}
          onFocus={()=>setF(true)} onBlur={()=>setF(false)}/>
      </div>
      {hint&&<div style={{fontSize:11,color:C.textDim,marginTop:4}}>{hint}</div>}
    </div>
  );
}
function Sel({label,value,onChange,options,hint}) {
  return (
    <div>
      {label&&<label style={{display:"block",fontSize:13,fontWeight:600,color:C.text,marginBottom:6}}>{label}</label>}
      <select value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"12px 14px",background:C.white,border:`1.5px solid ${C.border}`,borderRadius:10,color:C.text,fontSize:14,outline:"none",fontFamily:"sans-serif",WebkitAppearance:"none",appearance:"none",backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238896a4' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 14px center"}}>
        {options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint&&<div style={{fontSize:11,color:C.textDim,marginTop:4}}>{hint}</div>}
    </div>
  );
}
function Modal({title,onClose,children}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:C.white,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:560,maxHeight:"92vh",overflow:"auto",boxShadow:"0 -4px 40px rgba(0,0,0,0.2)"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"10px 0 0",display:"flex",justifyContent:"center"}}><div style={{width:40,height:4,borderRadius:2,background:C.border}}/></div>
        <div style={{padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${C.border}`}}>
          <div style={{fontSize:17,fontWeight:700,color:C.text}}>{title}</div>
          <button onClick={onClose} style={{background:C.surface,border:"none",borderRadius:"50%",color:C.textDim,width:32,height:32,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",WebkitTapHighlightColor:"transparent"}}>×</button>
        </div>
        <div style={{padding:20}}>{children}</div>
      </div>
    </div>
  );
}
function KpiGrid({items}) {
  const {isMobile}=useBP();
  return (
    <div style={{display:"grid",gridTemplateColumns:`repeat(${isMobile?2:Math.min(items.length,4)},1fr)`,gap:12,marginBottom:18}}>
      {items.map(({label,value,color,icon})=>(
        <Card key={label} style={{padding:"16px 14px"}}>
          <div style={{fontSize:22,marginBottom:6}}>{icon}</div>
          <div style={{fontSize:22,fontWeight:800,color:color||C.text,lineHeight:1,marginBottom:3}}>{value}</div>
          <div style={{fontSize:12,fontWeight:600,color:C.textMid}}>{label}</div>
        </Card>
      ))}
    </div>
  );
}

// ── QR MODAL ── (reusable slab QR viewer)
function SlabQRModal({slab,onClose}) {
  const g=gradeConf(slab.grade);
  return (
    <Modal title="Slab QR Code" onClose={onClose}>
      <div style={{textAlign:"center",paddingBottom:8}}>
        <div style={{background:C.surface,borderRadius:14,padding:20,display:"inline-block",marginBottom:14,border:`1px solid ${C.border}`}}>
          <img src={slabQrUrl(slab.id)} alt="QR" style={{width:180,height:180,display:"block"}}/>
        </div>
        <div style={{fontSize:11,fontFamily:"monospace",color:C.textDim,marginBottom:12,letterSpacing:"1px"}}>{slab.id}</div>
        <div style={{background:g.bg,border:`1px solid ${g.border}`,borderRadius:10,padding:"10px 16px",display:"inline-flex",alignItems:"center",gap:8,marginBottom:16}}>
          <span style={{fontSize:18}}>{g.emoji}</span>
          <span style={{fontSize:14,fontWeight:700,color:g.color}}>{slab.grade} · {slab.stone}</span>
        </div>
        <div style={{fontSize:12,color:C.textMid,lineHeight:1.6,marginBottom:16}}>Buyers can scan this code to instantly view the full verified inspection record for this slab — no login required.</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Btn variant="secondary" onClick={onClose}>Close</Btn>
          <Btn onClick={()=>{const a=document.createElement("a");a.href=slabQrUrl(slab.id)+"&download=1";a.download=`QR_${slab.id}.png`;a.click();}}>⬇ Download</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── SLAB PUBLIC VIEW ── (what buyer sees after scanning QR)
function SlabPublicView({slabId,onBack}) {
  const slab=DB.getInsp(slabId);
  const fac=slab?DB.getFac(slab.factoryId):null;
  const g=slab?gradeConf(slab.grade):null;
  if(!slab) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif",flexDirection:"column",gap:12,padding:24}}>
      <div style={{fontSize:48}}>🔍</div>
      <div style={{fontSize:18,fontWeight:700}}>Slab Not Found</div>
      <div style={{fontSize:13,color:C.textDim,textAlign:"center"}}>This slab ID doesn't exist or hasn't been scanned yet.</div>
      {onBack&&<Btn variant="ghost" onClick={onBack}>← Back</Btn>}
    </div>
  );
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',sans-serif",color:C.text}}>
      <div style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary},${C.teal})`,padding:"16px 18px 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          {onBack&&<button onClick={onBack} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,color:"#fff",padding:"6px 12px",fontSize:12,cursor:"pointer",fontFamily:"sans-serif",WebkitTapHighlightColor:"transparent"}}>← Back</button>}
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:800,color:"#fff"}}>Epistable · Verified Slab</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>{fac?.name||"Factory"}</div>
          </div>
          <div style={{background:"rgba(255,255,255,0.1)",borderRadius:20,padding:"4px 12px",display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#4ade80"}}/>
            <span style={{fontSize:11,color:"rgba(255,255,255,0.8)",fontWeight:600}}>Verified</span>
          </div>
        </div>
      </div>
      <div style={{padding:"16px 16px 48px"}}>
        {slab.photo&&<div style={{borderRadius:14,overflow:"hidden",marginBottom:14,border:`1px solid ${C.border}`}}><img src={slab.photo} alt="" style={{width:"100%",maxHeight:220,objectFit:"cover",display:"block"}}/></div>}
        <Card style={{marginBottom:14,padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <div><div style={{fontSize:20,fontWeight:800}}>{slab.stone}</div><div style={{fontSize:11,fontFamily:"monospace",color:C.textDim,marginTop:2}}>{slab.id}</div></div>
            <div style={{textAlign:"right"}}>
              <span style={{background:g.bg,border:`1px solid ${g.border}`,color:g.color,padding:"6px 14px",borderRadius:20,fontSize:14,fontWeight:700,display:"block",marginBottom:4}}>{g.emoji} {slab.grade}</span>
              <div style={{fontSize:16,fontWeight:800,color:C.green}}>₹{slab.pricePerSqFt}/sqft</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
            {[["Thickness",(slab.measurements?.thickness||"—")+"mm"],["Size",(slab.measurements?.length||"—")+"×"+(slab.measurements?.width||"—")],["Polish","⭐".repeat(slab.measurements?.polish||0)||"—"]].map(([l,v])=>(
              <div key={l} style={{background:C.surface,borderRadius:8,padding:"8px",textAlign:"center"}}><div style={{fontSize:10,color:C.textDim,marginBottom:2}}>{l}</div><div style={{fontSize:12,fontWeight:600}}>{v}</div></div>
            ))}
          </div>
          {[["Inspector",slab.inspector],["Date",slab.date+" · "+(slab.time||"")],["Factory",fac?.name||slab.factoryName],["Export",slab.exportReady?"✈️ Export Ready":"📦 Domestic"],["Defects",(slab.defects||[]).join(", ")||"None"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:12,color:C.textDim}}>{l}</span>
              <span style={{fontSize:12,fontWeight:600}}>{v}</span>
            </div>
          ))}
        </Card>
        <div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:12,padding:"12px 14px",display:"flex",gap:10,alignItems:"flex-start"}}>
          <span style={{fontSize:18,flexShrink:0}}>🛡️</span>
          <div><div style={{fontSize:13,fontWeight:700,color:C.green,marginBottom:2}}>SilakAI Verified</div><div style={{fontSize:12,color:C.textMid}}>This record was created at time of inspection and cannot be altered.</div></div>
        </div>
      </div>
    </div>
  );
}

// ── CHATBOT ──
function ChatBot({role,ctxData}) {
  const [open,setOpen]=useState(false);
  const [msgs,setMsgs]=useState([{role:"assistant",content:role==="owner"?"Hi! Ask me anything about factories, billing, disputes or inquiries.":"Hi! Ask anything about inspections, quality, suppliers or inquiries."}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const bottomRef=useRef();
  const {isMobile}=useBP();
  useEffect(()=>{if(open&&bottomRef.current)bottomRef.current.scrollIntoView({behavior:"smooth"});},[msgs,open]);

  function buildCtx() {
    if(role==="owner") {
      const {facs,insps,users}=ctxData;
      const mon=curMon();
      const tb=facs.reduce((s,f)=>{const sc=f.currentMonth===mon?f.currentMonthScans||0:0;return s+calcBill(f.plan||"Starter",sc).total;},0);
      const disputes=DB.allDisputes();const inquiries=DB.allInquiries();
      return `You are SilakAI's owner assistant.\nPlatform: ${facs.length} factories, ${users.length} users, ${insps.length} inspections, ₹${tb} billed.\nOpen disputes: ${disputes.filter(d=>d.status==="open").length}. New inquiries: ${inquiries.filter(q=>q.status==="new").length}.\nFactories:\n${facs.map(f=>{const sc=f.currentMonth===mon?f.currentMonthScans||0:0;const b=calcBill(f.plan||"Starter",sc);return `- ${f.name}: ${f.plan||"Starter"}, ${f.status}, billing=${f.billingStatus||"pending"}, scans=${sc}/${b.includedScans}, bill=₹${b.total}`;}).join("\n")}\nAnswer concisely. Hindi if asked.`;
    }
    const {fac,insps,user}=ctxData;
    const mon=curMon();
    const sc=fac?.currentMonth===mon?fac?.currentMonthScans||0:0;
    const b=fac?calcBill(fac.plan||"Starter",sc):{total:0,includedScans:100};
    const byG=g=>insps.filter(i=>i.grade===g).length;
    const suppliers=DB.facSuppliers(fac?.id||"");
    const inquiries=DB.facInquiries(fac?.id||"");
    return `You are SilakAI's assistant for ${user.name} at ${user.factoryName}.\nFactory: ${fac?.name}, Plan=${fac?.plan||"Starter"}, Status=${fac?.status||"active"}\nBilling: ${sc}/${b.includedScans} scans, ₹${b.total} due\nInspections: Total=${insps.length}, Premium=${byG("Premium")}, Standard=${byG("Standard")}, Commercial=${byG("Commercial")}, Rejected=${byG("Rejected")}\nSuppliers: ${suppliers.length} registered.\nNew buyer inquiries: ${inquiries.filter(q=>q.status==="new").length}.\nAnswer concisely. Hindi if asked.`;
  }

  async function send() {
    if(!input.trim()||loading)return;
    const txt=input.trim();setInput("");
    setMsgs(prev=>[...prev,{role:"user",content:txt}]);
    setLoading(true);
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,system:buildCtx(),messages:[...msgs.slice(-8),{role:"user",content:txt}]})});
      const data=await res.json();
      setMsgs(prev=>[...prev,{role:"assistant",content:data.content?.[0]?.text||"Sorry, no response."}]);
    } catch(e) {
      setMsgs(prev=>[...prev,{role:"assistant",content:"Something went wrong. Try again."}]);
    }
    setLoading(false);
  }

  const sugg=role==="owner"?["Which factory has most rejections?","Any new buyer inquiries?","Open disputes?"]:["How many slabs today?","Any new inquiries?","Top supplier this month?"];
  return (
    <>
      <button onClick={()=>setOpen(true)} style={{position:"fixed",bottom:isMobile?80:24,right:20,width:56,height:56,borderRadius:"50%",background:`linear-gradient(135deg,${C.primary},${C.teal})`,border:"none",boxShadow:"0 4px 20px rgba(0,87,168,0.4)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,zIndex:150,WebkitTapHighlightColor:"transparent"}}>🤖</button>
      {open&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:isMobile?"center":"flex-end",padding:isMobile?0:"0 20px 20px",background:isMobile?"rgba(0,0,0,0.4)":"transparent"}} onClick={isMobile?()=>setOpen(false):undefined}>
          <div style={{width:isMobile?"100%":380,height:isMobile?"85vh":520,background:C.white,borderRadius:isMobile?"20px 20px 0 0":"16px",boxShadow:"0 8px 40px rgba(0,0,0,0.2)",display:"flex",flexDirection:"column",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
            <div style={{background:`linear-gradient(135deg,${C.primary},${C.teal})`,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🤖</div>
                <div><div style={{fontSize:15,fontWeight:700,color:C.white}}>SilakAI Assistant</div><div style={{fontSize:11,color:"rgba(255,255,255,0.7)"}}>Ask anything</div></div>
              </div>
              <button onClick={()=>setOpen(false)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:"50%",color:C.white,width:30,height:30,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",WebkitTapHighlightColor:"transparent"}}>×</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:12}}>
              {msgs.map((m,i)=>(
                <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                  <div style={{maxWidth:"82%",padding:"10px 14px",borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",background:m.role==="user"?C.primary:C.surface,color:m.role==="user"?C.white:C.text,fontSize:13,lineHeight:1.5,border:m.role==="user"?"none":`1px solid ${C.border}`}}>{m.content}</div>
                </div>
              ))}
              {loading&&<div style={{display:"flex",justifyContent:"flex-start"}}><div style={{padding:"10px 16px",borderRadius:"14px 14px 14px 4px",background:C.surface,border:`1px solid ${C.border}`,display:"flex",gap:4,alignItems:"center"}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.textDim,animation:`pulse 1s ease-in-out ${i*0.2}s infinite`}}/>)}</div></div>}
              <div ref={bottomRef}/>
            </div>
            {msgs.length<=1&&<div style={{padding:"0 16px 10px",display:"flex",gap:6,overflowX:"auto",flexShrink:0}}>{sugg.map(s=><button key={s} onClick={()=>setInput(s)} style={{padding:"6px 12px",background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:20,color:C.primary,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"sans-serif",WebkitTapHighlightColor:"transparent",flexShrink:0}}>{s}</button>)}</div>}
            <div style={{padding:"12px 16px",borderTop:`1px solid ${C.border}`,display:"flex",gap:10,flexShrink:0}}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask anything…" style={{flex:1,padding:"10px 14px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:24,color:C.text,fontSize:14,outline:"none",fontFamily:"sans-serif"}}/>
              <button onClick={send} disabled={!input.trim()||loading} style={{width:42,height:42,borderRadius:"50%",background:input.trim()&&!loading?C.primary:C.border,border:"none",cursor:input.trim()&&!loading?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,WebkitTapHighlightColor:"transparent"}}>➤</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}`}</style>
    </>
  );
}

// ── SHELL ──
function Shell({brandSub,navItems,page,onNav,onLogout,userName,userSub,children}) {
  const {isDesktop}=useBP();
  const [drawer,setDrawer]=useState(false);
  const Sidebar=(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary})`,padding:"20px 16px"}}>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:17,fontWeight:800,color:C.white}}>Epistable <span style={{color:"#7ec8f0"}}>AI</span></div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>Quality, quantified</div>
        </div>
        {brandSub}
      </div>
      <nav style={{padding:"10px 8px",flex:1,overflowY:"auto"}}>
        {navItems.map(n=>{
          const active=page===n.id;
          return <button key={n.id} onClick={()=>{onNav(n.id);setDrawer(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"12px",background:active?C.primaryBg:"transparent",border:`1px solid ${active?C.primaryBorder:"transparent"}`,borderRadius:8,color:active?C.primary:C.textMid,fontSize:14,cursor:"pointer",marginBottom:2,textAlign:"left",fontWeight:active?700:400,fontFamily:"sans-serif",WebkitTapHighlightColor:"transparent"}}>
            <span style={{fontSize:18,flexShrink:0,opacity:active?1:0.55}}>{n.icon}</span>{n.label}
            {n.badge&&<span style={{marginLeft:"auto",background:C.red,color:C.white,borderRadius:20,padding:"1px 7px",fontSize:11,fontWeight:700}}>{n.badge}</span>}
          </button>;
        })}
      </nav>
      <div style={{borderTop:`1px solid ${C.border}`,padding:"14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <Avi initials={(userName||"?").slice(0,2).toUpperCase()} size={36}/>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{userName}</div><div style={{fontSize:11,color:C.textDim,textTransform:"capitalize"}}>{userSub}</div></div>
        </div>
        <Btn full variant="secondary" size="sm" onClick={onLogout}>Sign Out</Btn>
      </div>
    </div>
  );
  if(!isDesktop) return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Segoe UI',sans-serif",color:C.text,display:"flex",flexDirection:"column"}}>
      <div style={{background:C.white,borderBottom:`1px solid ${C.border}`,height:56,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",position:"sticky",top:0,zIndex:100,flexShrink:0}}>
        <button onClick={()=>setDrawer(true)} style={{background:"none",border:"none",cursor:"pointer",padding:8,display:"flex",flexDirection:"column",gap:5,WebkitTapHighlightColor:"transparent"}}>
          <div style={{width:22,height:2,background:C.text,borderRadius:2}}/><div style={{width:16,height:2,background:C.text,borderRadius:2}}/><div style={{width:22,height:2,background:C.text,borderRadius:2}}/>
        </button>
        <div style={{fontSize:18,fontWeight:800,color:C.text}}>Epistable</div>
        <Avi initials={(userName||"?").slice(0,2).toUpperCase()} size={32}/>
      </div>
      {drawer&&(<div style={{position:"fixed",inset:0,zIndex:200,display:"flex"}}><div style={{width:260,background:C.white,height:"100%",overflowY:"auto",boxShadow:"4px 0 24px rgba(0,0,0,0.15)"}}>{Sidebar}</div><div style={{flex:1,background:"rgba(0,0,0,0.5)"}} onClick={()=>setDrawer(false)}/></div>)}
      <div style={{flex:1,overflowY:"auto",padding:"16px",paddingBottom:90}}>{children}</div>
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.white,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100,paddingBottom:"env(safe-area-inset-bottom)"}}>
        {navItems.slice(0,5).map(n=>{
          const active=page===n.id;
          return <button key={n.id} onClick={()=>onNav(n.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"8px 4px",background:"none",border:"none",cursor:"pointer",borderTop:`2px solid ${active?C.primary:"transparent"}`,WebkitTapHighlightColor:"transparent",position:"relative"}}>
            <span style={{fontSize:20,marginBottom:2,opacity:active?1:0.4}}>{n.icon}</span>
            <span style={{fontSize:10,fontWeight:active?700:400,color:active?C.primary:C.textDim}}>{n.label}</span>
            {n.badge&&<span style={{position:"absolute",top:4,right:"calc(50% - 16px)",background:C.red,color:C.white,borderRadius:10,padding:"0 4px",fontSize:9,fontWeight:700}}>{n.badge}</span>}
          </button>;
        })}
      </div>
    </div>
  );
  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Segoe UI',sans-serif",color:C.text,display:"flex",fontSize:14}}>
      <div style={{width:220,background:C.white,borderRight:`1px solid ${C.border}`,flexShrink:0,display:"flex",flexDirection:"column",minHeight:"100vh"}}>{Sidebar}</div>
      <div style={{flex:1,display:"flex",flexDirection:"column",maxHeight:"100vh",overflow:"hidden"}}>
        <div style={{background:C.white,borderBottom:`1px solid ${C.border}`,height:50,display:"flex",alignItems:"center",padding:"0 24px",flexShrink:0}}>
          <span style={{fontSize:14,fontWeight:600,color:C.text}}>{navItems.find(n=>n.id===page)?.icon} {navItems.find(n=>n.id===page)?.label}</span>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:24}}>{children}</div>
      </div>
    </div>
  );
}

// ── LOGIN ──
function Login({onOwner,onFactory,onBuyer}) {
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [showP,setShowP]=useState(false);
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const {isDesktop}=useBP();
  function submit() {
    if(!email||!pass){setErr("Please enter email and password.");return;}
    setLoading(true);setErr("");
    try {
      if(email.toLowerCase()===OWNER.email&&pass===OWNER.password){onOwner();return;}
      const u=DB.getUserByEmail(email);
      if(u){if(u.status==="suspended"){setErr("Account suspended.");setLoading(false);return;}if(u.password!==pass){setErr("Incorrect password.");setLoading(false);return;}DB.updUser(u.id,{lastActive:Date.now()});onFactory(u);return;}
      const b=DB.getBuyerByEmail(email);
      if(b){if(b.status==="suspended"){setErr("Account suspended.");setLoading(false);return;}if(b.password!==pass){setErr("Incorrect password.");setLoading(false);return;}DB.updBuyer(b.id,{lastActive:Date.now()});onBuyer(b);return;}
      setErr("No account found for this email.");setLoading(false);
    } catch(e){setErr("Login error: "+e.message);setLoading(false);}
  }
  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:isDesktop?"row":"column",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:`linear-gradient(160deg,${C.primary},${C.primaryD} 60%,#001f3d)`,padding:isDesktop?"0 64px":"40px 28px 32px",display:"flex",flexDirection:"column",justifyContent:"center",width:isDesktop?"45%":"100%",flexShrink:0}}>
        <div style={{marginBottom:isDesktop?52:28}}>
          <div style={{fontSize:28,fontWeight:800,color:C.white,lineHeight:1.1,marginBottom:8}}>Epistable <span style={{color:"#7ec8f0"}}>AI</span></div>
          <div style={{fontSize:16,fontWeight:400,color:"rgba(255,255,255,0.95)",letterSpacing:"1.5px",fontStyle:"italic",fontFamily:"Georgia, 'Times New Roman', serif",marginBottom:14}}>Quality, quantified</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{height:1,width:24,background:"rgba(255,255,255,0.25)",borderRadius:1}}/>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",letterSpacing:"0.5px"}}>Grade slabs · Track quality · Build trust</div>
          </div>
        </div>
        {isDesktop&&[["🔍","AI-powered slab grading"],["🏭","Supplier scorecards"],["🔲","QR codes per slab"],["📩","Buyer inquiry management"],["💳","Per-scan billing"],["🤖","AI assistant"]].map(([icon,text])=>(
          <div key={text} style={{display:"flex",alignItems:"center",gap:12,marginTop:14}}>
            <div style={{width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{icon}</div>
            <span style={{fontSize:13,color:"rgba(255,255,255,0.75)"}}>{text}</span>
          </div>
        ))}
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:isDesktop?"40px":"0"}}>
        <div style={{width:"100%",maxWidth:420,padding:isDesktop?"0":"28px 24px 48px"}}>
          <div style={{marginBottom:28}}><div style={{fontSize:isDesktop?26:22,fontWeight:800,color:C.text,marginBottom:6}}>Welcome back</div><div style={{fontSize:14,color:C.textDim}}>Sign in with your assigned credentials</div></div>
          {err&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:10,padding:"12px 16px",fontSize:13,color:C.red,marginBottom:16}}>⚠ {err}</div>}
          <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:20}}>
            <Inp label="Email" value={email} onChange={setEmail} type="email" placeholder="you@example.com" icon="✉️" required/>
            <div>
              <label style={{display:"block",fontSize:13,fontWeight:600,color:C.text,marginBottom:6}}>Password <span style={{color:C.red}}>*</span></label>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:15,pointerEvents:"none"}}>🔒</span>
                <input type={showP?"text":"password"} value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="••••••••"
                  style={{width:"100%",padding:"12px 48px 12px 42px",background:C.white,border:`1.5px solid ${C.border}`,borderRadius:10,color:C.text,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"sans-serif"}}
                  onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
                <button onClick={()=>setShowP(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.textDim,padding:4,WebkitTapHighlightColor:"transparent"}}>{showP?"🙈":"👁"}</button>
              </div>
            </div>
          </div>
          <Btn full size="lg" onClick={submit} disabled={loading}>{loading?"Signing in…":"Sign In →"}</Btn>
          <div style={{marginTop:16,textAlign:"center",fontSize:12,color:C.textDim}}>Contact your administrator for credentials</div>
        </div>
      </div>
    </div>
  );
}

// ── OWNER ──
function Owner({onLogout}) {
  const [page,setPage]=useState("overview");
  const [facs,setFacs]=useState([]);
  const [users,setUsers]=useState([]);
  const [insps,setInsps]=useState([]);
  const [selFac,setSelFac]=useState(null);
  const [loading,setLoading]=useState(true);
  const [buyerFacId,setBuyerFacId]=useState(null);
  function load(){setLoading(true);setFacs(DB.allFacs());setUsers(DB.allUsers().filter(u=>u.role!=="owner"));setInsps(DB.allInsps());setLoading(false);}
  useEffect(()=>{load();},[]);
  if(buyerFacId) return <BuyerPortal factoryId={buyerFacId} onBack={()=>setBuyerFacId(null)}/>;
  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",flexDirection:"column",gap:12,background:C.bg,fontFamily:"sans-serif"}}><div style={{fontSize:36}}>🪨</div><div style={{color:C.textDim}}>Loading…</div></div>;
  const overdue=facs.filter(f=>f.billingStatus==="overdue").length;
  const mon=curMon();
  const totalBill=facs.reduce((s,f)=>{const sc=f.currentMonth===mon?f.currentMonthScans||0:0;return s+calcBill(f.plan||"Starter",sc).total;},0);
  const allDisputes=DB.allDisputes();const openDisputes=allDisputes.filter(d=>d.status==="open").length;
  const allInquiries=DB.allInquiries();const newInquiries=allInquiries.filter(q=>q.status==="new").length;
  const nav=[
    {id:"overview",label:"Overview",icon:"⊞"},
    {id:"billing",label:"Billing",icon:"💳",badge:overdue||undefined},
    {id:"factories",label:"Factories",icon:"🏭"},
    {id:"users",label:"Users",icon:"👤"},
    {id:"disputes",label:"Disputes",icon:"⚠️",badge:openDisputes||undefined},
    {id:"inquiries",label:"Inquiries",icon:"📩",badge:newInquiries||undefined},
    {id:"settings",label:"Settings",icon:"⚙"},
  ];
  const pageContent={
    overview:<OwnerOverview facs={facs} users={users} insps={insps} totalBill={totalBill} overdue={overdue} setPage={setPage} pickFac={f=>{setSelFac(f);setPage("fac");}} openBuyer={id=>setBuyerFacId(id)}/>,
    billing:<OwnerBilling facs={facs} onRefresh={load}/>,
    factories:<OwnerFacs facs={facs} users={users} pickFac={f=>{setSelFac(f);setPage("fac");}} onRefresh={load}/>,
    fac:selFac?<OwnerFacDetail fac={selFac} users={users.filter(u=>u.factoryId===selFac.id)} onBack={()=>setPage("factories")} onRefresh={load}/>:null,
    users:<OwnerUsers users={users} facs={facs} onRefresh={load}/>,
    disputes:<OwnerDisputes/>,
    inquiries:<OwnerInquiries/>,
    settings:<OwnerSettings/>,
  };
  return (
    <>
      <Shell brandSub={<div style={{background:"rgba(255,255,255,0.1)",borderRadius:6,padding:"6px 10px",fontSize:11,color:"rgba(255,255,255,0.8)",display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:9,color:"#4ade80"}}>●</span>{facs.length} factories · {users.length} users</div>}
        navItems={nav} page={page} onNav={setPage} onLogout={onLogout} userName="SilakAI Owner" userSub="Super Admin">
        {pageContent[page]||pageContent.overview}
      </Shell>
      <ChatBot role="owner" ctxData={{facs,insps,users}}/>
    </>
  );
}

function OwnerOverview({facs,users,insps,totalBill,overdue,setPage,pickFac,openBuyer}) {
  const mon=curMon();
  const ms=facs.reduce((s,f)=>s+(f.currentMonth===mon?f.currentMonthScans||0:0),0);
  const newInq=DB.allInquiries().filter(q=>q.status==="new").length;
  return (
    <div>
      <div style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary},${C.teal})`,borderRadius:14,padding:"20px",marginBottom:18,color:C.white}}>
        <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>Owner Console</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.7)",marginBottom:14}}>Full platform visibility</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
          {[["₹"+totalBill,"Billed This Month"],[insps.length,"Total Scans"],[facs.filter(f=>f.status==="active").length,"Active Factories"],[overdue,"Overdue"]].map(([v,l])=>(
            <div key={l} style={{background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"12px"}}><div style={{fontSize:20,fontWeight:800}}>{v}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.7)"}}>{l}</div></div>
          ))}
        </div>
      </div>
      {overdue>0&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:12,padding:"14px 16px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>🚨</span><div><div style={{fontSize:13,fontWeight:700,color:C.red}}>{overdue} factory overdue</div></div></div>
        <Btn variant="red" size="sm" onClick={()=>setPage("billing")}>Resolve →</Btn>
      </div>}
      {newInq>0&&<div style={{background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:12,padding:"14px 16px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>📩</span><div><div style={{fontSize:13,fontWeight:700,color:C.primary}}>{newInq} new buyer {newInq===1?"inquiry":"inquiries"}</div></div></div>
        <Btn size="sm" onClick={()=>setPage("inquiries")}>View →</Btn>
      </div>}
      <KpiGrid items={[{label:"Billed This Month",value:"₹"+totalBill,icon:"💳",color:C.green},{label:"Scans This Month",value:ms,icon:"🔍",color:C.primary},{label:"Factories",value:facs.length,icon:"🏭",color:C.teal},{label:"New Inquiries",value:newInq,icon:"📩",color:C.primary}]}/>
      <Card>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:14,fontWeight:700}}>Factories</div>
          <Btn size="sm" variant="ghost" onClick={()=>setPage("factories")}>View All →</Btn>
        </div>
        {facs.length===0?<div style={{padding:32,textAlign:"center",color:C.textDim}}>No factories yet</div>:facs.map((f,i)=>{
          const sc=f.currentMonth===mon?f.currentMonthScans||0:0;const b=calcBill(f.plan||"Starter",sc);
          return <div key={f.id} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderBottom:i<facs.length-1?`1px solid ${C.border}`:"none"}}>
            <div style={{width:38,height:38,borderRadius:10,background:C.primaryBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🏭</div>
            <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={()=>pickFac(f)}><div style={{fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div><div style={{fontSize:11,color:C.textDim}}>{sc} scans · ₹{b.total} due</div></div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
              <StatPill status={f.status}/><BillPill status={f.billingStatus||"pending"}/>
              <button onClick={()=>openBuyer(f.id)} style={{fontSize:10,fontWeight:600,color:C.primary,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:6,padding:"2px 8px",cursor:"pointer",fontFamily:"sans-serif",WebkitTapHighlightColor:"transparent"}}>🌐 Buyer</button>
            </div>
          </div>;
        })}
      </Card>
    </div>
  );
}

function OwnerBilling({facs,onRefresh}) {
  const [confirm,setConfirm]=useState(null);
  const mon=curMon();
  const totalDue=facs.reduce((s,f)=>{const sc=f.currentMonth===mon?f.currentMonthScans||0:0;return s+calcBill(f.plan||"Starter",sc).total;},0);
  function markPaid(f){DB.markPaid(f.id);setConfirm(null);onRefresh();}
  function pauseF(f){DB.pauseFac(f.id);setConfirm(null);onRefresh();}
  function resumeF(f){DB.updFac(f.id,{status:"active",billingStatus:"paid"});onRefresh();}
  return (
    <div>
      {confirm&&<Modal title={confirm.type==="pay"?"Mark Paid":"Pause Factory"} onClose={()=>setConfirm(null)}>
        {confirm.type==="pay"?<div>
          <div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:12,padding:16,marginBottom:14}}><div style={{fontSize:15,fontWeight:700,color:C.green}}>Mark as Paid — {confirm.fac.name}</div><div style={{fontSize:24,fontWeight:800,color:C.green,marginTop:8}}>₹{calcBill(confirm.fac.plan||"Starter",confirm.fac.currentMonth===mon?confirm.fac.currentMonthScans||0:0).total}</div></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Btn variant="secondary" onClick={()=>setConfirm(null)}>Cancel</Btn><Btn variant="green" onClick={()=>markPaid(confirm.fac)}>Confirm</Btn></div>
        </div>:<div>
          <div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:12,padding:16,marginBottom:14}}><div style={{fontSize:15,fontWeight:700,color:C.red}}>⚠ Pause {confirm.fac.name}</div></div>
          <div style={{fontSize:13,color:C.textMid,marginBottom:18}}>All scans blocked immediately.</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Btn variant="secondary" onClick={()=>setConfirm(null)}>Cancel</Btn><Btn variant="red" onClick={()=>pauseF(confirm.fac)}>Pause</Btn></div>
        </div>}
      </Modal>}
      <KpiGrid items={[{label:"Total Due",value:"₹"+totalDue,icon:"💳",color:C.green},{label:"Overdue",value:facs.filter(f=>f.billingStatus==="overdue").length,icon:"🚨",color:C.red},{label:"Active",value:facs.filter(f=>f.status==="active").length,icon:"🏭",color:C.teal},{label:"Paused",value:facs.filter(f=>f.status==="paused").length,icon:"⏸",color:C.amber}]}/>
      <Card>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,fontSize:14,fontWeight:700}}>Invoices — {mon}</div>
        {facs.length===0?<div style={{padding:32,textAlign:"center",color:C.textDim}}>No factories yet</div>:facs.map((f,i)=>{
          const sc=f.currentMonth===mon?f.currentMonthScans||0:0;const b=calcBill(f.plan||"Starter",sc);const paused=f.status==="paused";
          return <div key={f.id} style={{padding:16,borderBottom:i<facs.length-1?`1px solid ${C.border}`:"none",background:paused?C.redBg:C.white}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div><div style={{fontSize:14,fontWeight:700}}>{f.name}</div><div style={{fontSize:11,color:C.textDim}}>{f.plan||"Starter"}{paused&&<span style={{color:C.red,fontWeight:700}}> · 🚫 PAUSED</span>}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:20,fontWeight:800,color:C.green}}>₹{b.total}</div><BillPill status={f.billingStatus||"pending"}/></div>
            </div>
            <PBar value={sc/b.includedScans*100} color={sc>b.includedScans?C.red:C.primary}/>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <Btn variant="ghost" size="sm" style={{flex:1}} onClick={()=>setConfirm({type:"pay",fac:f})}>✓ Mark Paid</Btn>
              {!paused?<Btn variant="secondary" size="sm" style={{flex:1,color:C.red,borderColor:C.redBorder}} onClick={()=>setConfirm({type:"pause",fac:f})}>⏸ Pause</Btn>
              :<Btn variant="secondary" size="sm" style={{flex:1,color:C.green,borderColor:C.greenBorder}} onClick={()=>resumeF(f)}>▶ Resume</Btn>}
            </div>
          </div>;
        })}
      </Card>
    </div>
  );
}

function UserFormModal({title,onClose,onSubmit,facs,isBuyer}) {
  const [form,setForm]=useState({name:"",email:"",password:"",role:"inspector",factoryId:"",company:""});
  const [busy,setBusy]=useState(false);const [done,setDone]=useState(null);const [showPwd,setShowPwd]=useState(false);
  function genPwd(){const c="ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";return Array.from({length:10},()=>c[Math.floor(Math.random()*c.length)]).join("");}
  function submit(){if(!form.name||!form.email||!form.password||(!isBuyer&&!form.factoryId))return;if(DB.getUserByEmail(form.email)||DB.getBuyerByEmail(form.email)){alert("Email already in use.");return;}setBusy(true);const result=onSubmit(form);setDone({...result,plainPassword:form.password});setBusy(false);}
  return (
    <Modal title={title} onClose={onClose}>
      {done?<div>
        <div style={{textAlign:"center",marginBottom:14}}><div style={{fontSize:48,marginBottom:8}}>✅</div><div style={{fontSize:18,fontWeight:800}}>Created!</div></div>
        <div style={{background:C.primaryBg,border:`2px solid ${C.primaryBorder}`,borderRadius:12,padding:16,marginBottom:12}}>
          {[["Name",done.name],...(done.company?[["Company",done.company]]:[]),["Email",done.email],["Password",done.plainPassword],["Role",isBuyer?"Buyer":done.role],["Factory",done.factoryName||"—"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.primaryBorder}`}}><span style={{fontSize:12,color:C.textDim}}>{l}</span><span style={{fontSize:13,fontWeight:l==="Password"?800:600,color:l==="Password"?C.primary:C.text,fontFamily:l==="Password"?"monospace":"inherit"}}>{v}</span></div>
          ))}
        </div>
        <div style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:8,padding:"10px 14px",fontSize:12,color:C.amber,marginBottom:14}}>⚠️ Save password now — cannot be retrieved later.</div>
        <Btn full onClick={onClose}>Done</Btn>
      </div>:<div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Inp label="Full Name" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required placeholder="Rajesh Kumar"/>
        {isBuyer&&<Inp label="Company" value={form.company} onChange={v=>setForm(p=>({...p,company:v}))} placeholder="Al-Rashid Stone Trading, Dubai"/>}
        <Inp label="Email" value={form.email} onChange={v=>setForm(p=>({...p,email:v}))} required type="email"/>
        <div>
          <label style={{display:"block",fontSize:13,fontWeight:600,color:C.text,marginBottom:6}}>Password <span style={{color:C.red}}>*</span></label>
          <div style={{display:"flex",gap:8}}>
            <input type={showPwd?"text":"password"} value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} placeholder="Min 6 chars" style={{flex:1,padding:"12px 14px",background:C.white,border:`1.5px solid ${C.border}`,borderRadius:10,color:C.text,fontSize:14,outline:"none",fontFamily:"monospace"}}/>
            <button onClick={()=>setShowPwd(p=>!p)} style={{padding:"0 14px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,cursor:"pointer",fontSize:16,WebkitTapHighlightColor:"transparent"}}>👁</button>
          </div>
        </div>
        {!isBuyer&&<Sel label="Role" value={form.role} onChange={v=>setForm(p=>({...p,role:v}))} options={[{value:"inspector",label:"Inspector"},{value:"manager",label:"Manager"},{value:"admin",label:"Admin"}]}/>}
        {facs&&<Sel label="Factory" value={form.factoryId} onChange={v=>setForm(p=>({...p,factoryId:v}))} options={[{value:"",label:"Select factory…"},...facs.map(f=>({value:f.id,label:f.name}))]}/>}
        <Btn variant="secondary" size="sm" style={{alignSelf:"flex-start"}} onClick={()=>setForm(p=>({...p,password:genPwd()}))}>🎲 Generate Password</Btn>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} disabled={busy||!form.name||!form.email||!form.password||(!isBuyer&&!form.factoryId)}>{busy?"…":"Create"}</Btn>
        </div>
      </div>}
    </Modal>
  );
}

function OwnerFacs({facs,users,pickFac,onRefresh}) {
  const [show,setShow]=useState(false);const [done,setDone]=useState(null);
  const [form,setForm]=useState({name:"",location:"",plan:"Starter",contactName:"",contactEmail:"",contactPhone:""});
  const mon=curMon();
  function create(){if(!form.name||!form.contactEmail)return;const f=DB.createFac(form);setDone(f);setForm({name:"",location:"",plan:"Starter",contactName:"",contactEmail:"",contactPhone:""});onRefresh();}
  return (
    <div>
      {show&&<Modal title="Create Factory" onClose={()=>{setShow(false);setDone(null);}}>
        {done?<div style={{textAlign:"center"}}><div style={{fontSize:48,marginBottom:12}}>🎉</div><div style={{fontSize:18,fontWeight:800,marginBottom:14}}>Factory Created!</div><Btn full onClick={()=>{setShow(false);setDone(null);}}>Done</Btn></div>
        :<div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Inp label="Factory Name" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} placeholder="Kishangarh Marble Works" required/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Location" value={form.location} onChange={v=>setForm(p=>({...p,location:v}))} placeholder="Rajasthan"/>
            <Sel label="Plan" value={form.plan} onChange={v=>setForm(p=>({...p,plan:v}))} options={Object.keys(PLANS)} hint={`₹${PLANS[form.plan].monthlyFee}/mo`}/>
          </div>
          <Inp label="Contact Email" value={form.contactEmail} onChange={v=>setForm(p=>({...p,contactEmail:v}))} placeholder="admin@factory.com" required type="email"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Btn variant="secondary" onClick={()=>setShow(false)}>Cancel</Btn><Btn onClick={create} disabled={!form.name||!form.contactEmail}>Create</Btn></div>
        </div>}
      </Modal>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><div style={{fontSize:18,fontWeight:800}}>Factories</div><div style={{fontSize:12,color:C.textDim}}>{facs.length} registered</div></div>
        <Btn size="sm" onClick={()=>setShow(true)}>+ Create</Btn>
      </div>
      {facs.length===0?<Card style={{padding:"48px",textAlign:"center"}}><div style={{fontSize:48,marginBottom:12}}>🏭</div><Btn onClick={()=>setShow(true)}>+ Create First Factory</Btn></Card>:
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {facs.map(f=>{const sc=f.currentMonth===mon?f.currentMonthScans||0:0;const b=calcBill(f.plan||"Starter",sc);return(
          <Card key={f.id}><div style={{padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div style={{flex:1,minWidth:0,paddingRight:10}}><div style={{fontSize:14,fontWeight:700}}>{f.name}</div><div style={{fontSize:11,color:C.textDim}}>{f.location} · {f.plan||"Starter"}</div></div>
              <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end",flexShrink:0}}><StatPill status={f.status}/><BillPill status={f.billingStatus||"pending"}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
              {[["Scans",sc,C.primary],["Users",users.filter(u=>u.factoryId===f.id).length,C.text],["Bill","₹"+b.total,C.green]].map(([l,v,col])=>(
                <div key={l} style={{background:C.surface,borderRadius:8,padding:"8px",textAlign:"center"}}><div style={{fontSize:15,fontWeight:800,color:col}}>{v}</div><div style={{fontSize:10,color:C.textDim}}>{l}</div></div>
              ))}
            </div>
            <Btn full variant="ghost" size="sm" onClick={()=>pickFac(f)}>Manage →</Btn>
          </div></Card>
        );})}
      </div>}
    </div>
  );
}

function OwnerFacDetail({fac,users,onBack,onRefresh}) {
  const [show,setShow]=useState(false);const [showBuyer,setShowBuyer]=useState(false);
  const mon=curMon();const sc=fac.currentMonth===mon?fac.currentMonthScans||0:0;const b=calcBill(fac.plan||"Starter",sc);
  return (
    <div>
      {show&&<UserFormModal title={"Add User — "+fac.name} onClose={()=>{setShow(false);onRefresh();}} onSubmit={form=>DB.createUser({...form,factoryId:fac.id,factoryName:fac.name,avatar:form.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()})}/>}
      {showBuyer&&<UserFormModal title={"Add Buyer — "+fac.name} isBuyer onClose={()=>{setShowBuyer(false);onRefresh();}} onSubmit={form=>DB.createBuyer({...form,factoryId:fac.id,factoryName:fac.name})}/>}
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.primary,fontWeight:600,fontSize:13,cursor:"pointer",marginBottom:16,padding:0,fontFamily:"sans-serif"}}>← Back</button>
      <Card style={{marginBottom:14,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div><div style={{fontSize:16,fontWeight:800}}>{fac.name}</div><div style={{fontSize:12,color:C.textDim}}>{fac.location}</div></div>
          <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}><StatPill status={fac.status}/><BillPill status={fac.billingStatus||"pending"}/></div>
        </div>
        <PBar value={sc/b.includedScans*100} color={sc>b.includedScans?C.red:C.primary} h={8}/>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}><span style={{fontSize:12,color:C.textDim}}>{sc}/{b.includedScans} scans</span><span style={{fontSize:14,fontWeight:800,color:C.green}}>₹{b.total}</span></div>
      </Card>
      <Card>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:14,fontWeight:700}}>Users ({users.length})</div>
          <div style={{display:"flex",gap:8}}><Btn size="sm" variant="secondary" onClick={()=>setShowBuyer(true)}>+ Buyer</Btn><Btn size="sm" onClick={()=>setShow(true)}>+ User</Btn></div>
        </div>
        {users.length===0?<div style={{padding:"32px",textAlign:"center",color:C.textDim}}>No users yet.</div>:users.map((u,i)=>(
          <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<users.length-1?`1px solid ${C.border}`:"none"}}>
            <Avi initials={u.avatar||"??"} size={36}/>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700}}>{u.name}</div><div style={{fontSize:11,color:C.textDim}}>{u.email}</div></div>
            <span style={{fontSize:10,fontWeight:600,color:C.primary,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,padding:"2px 7px",borderRadius:20,textTransform:"capitalize"}}>{u.role}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function OwnerUsers({users,facs,onRefresh}) {
  const [show,setShow]=useState(false);const [search,setSearch]=useState("");const [editUser,setEditUser]=useState(null);const [newRole,setNewRole]=useState("");
  const filtered=users.filter(u=>u.name?.toLowerCase().includes(search.toLowerCase())||u.email?.toLowerCase().includes(search.toLowerCase())||u.factoryName?.toLowerCase().includes(search.toLowerCase()));
  function saveRole(){if(!editUser||!newRole)return;DB.updUser(editUser.id,{role:newRole});setEditUser(null);onRefresh();}
  return (
    <div>
      {show&&<UserFormModal title="Create User" facs={facs} onClose={()=>{setShow(false);onRefresh();}} onSubmit={form=>{const fac=facs.find(f=>f.id===form.factoryId);return DB.createUser({...form,factoryName:fac?.name||"Unknown",avatar:form.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()});}}/>}
      {editUser&&<Modal title="Change Role" onClose={()=>setEditUser(null)}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:C.surface,borderRadius:10,marginBottom:16}}>
          <Avi initials={editUser.avatar||"??"} size={40}/><div><div style={{fontSize:14,fontWeight:700}}>{editUser.name}</div><div style={{fontSize:12,color:C.textDim}}>{editUser.factoryName}</div></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
          {["inspector","manager","admin"].map(r=>(
            <button key={r} onClick={()=>setNewRole(r)} style={{padding:"12px 8px",background:newRole===r?C.primaryBg:C.white,border:`2px solid ${newRole===r?C.primary:C.border}`,borderRadius:10,cursor:"pointer",fontFamily:"sans-serif",textAlign:"center",WebkitTapHighlightColor:"transparent"}}>
              <div style={{fontSize:18,marginBottom:4}}>{r==="inspector"?"🔍":r==="manager"?"📋":"🛡️"}</div>
              <div style={{fontSize:12,fontWeight:700,color:newRole===r?C.primary:C.textMid,textTransform:"capitalize"}}>{r}</div>
            </button>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Btn variant="secondary" onClick={()=>setEditUser(null)}>Cancel</Btn><Btn disabled={!newRole||newRole===editUser.role} onClick={saveRole}>Save Role</Btn></div>
      </Modal>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={{fontSize:18,fontWeight:800}}>All Users</div><div style={{fontSize:12,color:C.textDim}}>{users.length} accounts</div></div>
        <Btn size="sm" onClick={()=>setShow(true)}>+ Create</Btn>
      </div>
      <div style={{marginBottom:12}}><Inp value={search} onChange={setSearch} placeholder="Search name, email, factory…" icon="🔍"/></div>
      {filtered.length===0?<Card style={{padding:"40px",textAlign:"center"}}><div style={{fontSize:32,marginBottom:12}}>👤</div><div style={{fontWeight:600}}>No users yet</div></Card>:
      <Card>{filtered.map((u,i)=>(
        <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none"}}>
          <Avi initials={u.avatar||"??"} size={36}/>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700}}>{u.name}</div><div style={{fontSize:11,color:C.textDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.factoryName} · {u.email}</div></div>
          <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end",flexShrink:0}}>
            <button onClick={()=>{setEditUser(u);setNewRole(u.role);}} style={{fontSize:10,fontWeight:600,color:C.primary,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,padding:"3px 9px",borderRadius:20,textTransform:"capitalize",cursor:"pointer",fontFamily:"sans-serif",WebkitTapHighlightColor:"transparent"}}>{u.role} ✎</button>
            <StatPill status={u.status||"active"}/>
          </div>
        </div>
      ))}</Card>}
    </div>
  );
}

// ── SHARED DISPUTES + INQUIRIES (owner views) ──
function OwnerDisputes() {
  const [disputes,setDisputes]=useState(()=>DB.allDisputes());
  const [sel,setSel]=useState(null);
  const catLabel={wrong_grade:"Wrong Grade",defect_missed:"Defect Missed",measurement:"Wrong Measurement",other:"Other"};
  return (
    <div>
      {sel&&<Modal title="Dispute Detail" onClose={()=>setSel(null)}>
        <div style={{background:C.surface,borderRadius:10,padding:14,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div><div style={{fontSize:14,fontWeight:800}}>{sel.stone}</div><div style={{fontSize:11,color:C.textDim}}>Slab {sel.slabId} · {sel.factoryName}</div></div>
            <DisputeStatusPill status={sel.status}/>
          </div>
          {[["Buyer",sel.buyerName+(sel.buyerCompany?" · "+sel.buyerCompany:"")],["Category",catLabel[sel.category]||sel.category],["Grade",sel.grade],["Inspector",sel.inspector],["Date",fmtD(sel.createdAt)]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:12,color:C.textDim}}>{l}</span><span style={{fontSize:12,fontWeight:600}}>{v}</span></div>
          ))}
        </div>
        <div style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:10,padding:12,marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.amber,marginBottom:4}}>Buyer's Complaint</div>
          <div style={{fontSize:13,lineHeight:1.6}}>{sel.details}</div>
        </div>
        {sel.response&&<div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:12,marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.green,marginBottom:4}}>Factory Response</div>
          <div style={{fontSize:13}}>{sel.response}</div>
        </div>}
        <Btn full variant="secondary" onClick={()=>setSel(null)}>Close</Btn>
      </Modal>}
      <div style={{fontSize:18,fontWeight:800,marginBottom:14}}>All Disputes</div>
      {disputes.length===0?<Card style={{padding:"48px",textAlign:"center"}}><div style={{fontSize:48,marginBottom:12}}>🤝</div><div style={{fontWeight:600}}>No disputes yet</div></Card>:
      <Card>{disputes.map((d,i)=>(
        <div key={d.id} onClick={()=>setSel(d)} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<disputes.length-1?`1px solid ${C.border}`:"none",cursor:"pointer",background:d.status==="open"?C.redBg:C.white}}>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700}}>{d.stone} <span style={{fontSize:11,color:C.textDim}}>#{d.slabId}</span></div><div style={{fontSize:11,color:C.textDim}}>{d.factoryName} · {d.buyerName} · {catLabel[d.category]||d.category}</div></div>
          <DisputeStatusPill status={d.status}/>
        </div>
      ))}</Card>}
    </div>
  );
}

function OwnerInquiries() {
  const [inquiries,setInquiries]=useState(()=>DB.allInquiries());
  const [sel,setSel]=useState(null);
  function updStatus(id,status){DB.updInquiry(id,{status});setSel(null);setInquiries(DB.allInquiries());}
  return (
    <div>
      {sel&&<Modal title="Inquiry Detail" onClose={()=>setSel(null)}>
        <div style={{background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:12,padding:14,marginBottom:14}}>
          <div style={{fontSize:14,fontWeight:800,marginBottom:2}}>{sel.buyerName}{sel.buyerCompany?" · "+sel.buyerCompany:""}</div>
          <div style={{fontSize:12,color:C.textDim,marginBottom:10}}>{sel.factoryName} · {fmtD(sel.createdAt)}</div>
          {[["Slab",sel.slabId],["Stone",sel.stone],["Grade",sel.grade],["Price","₹"+sel.pricePerSqFt+"/sqft"],["Message",sel.message||"—"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.primaryBorder}`}}><span style={{fontSize:12,color:C.textDim}}>{l}</span><span style={{fontSize:12,fontWeight:600,maxWidth:"55%",textAlign:"right"}}>{v}</span></div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Btn variant="secondary" onClick={()=>updStatus(sel.id,"contacted")}>📞 Contacted</Btn>
          <Btn variant="green" onClick={()=>updStatus(sel.id,"closed")}>✅ Close</Btn>
        </div>
      </Modal>}
      <div style={{fontSize:18,fontWeight:800,marginBottom:14}}>All Buyer Inquiries</div>
      {inquiries.length===0?<Card style={{padding:"48px",textAlign:"center"}}><div style={{fontSize:48,marginBottom:12}}>📩</div><div style={{fontWeight:600}}>No inquiries yet</div></Card>:
      <Card>{inquiries.map((q,i)=>(
        <div key={q.id} onClick={()=>setSel(q)} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<inquiries.length-1?`1px solid ${C.border}`:"none",cursor:"pointer",background:q.status==="new"?C.primaryBg:C.white}}>
          <div style={{width:38,height:38,borderRadius:10,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>📩</div>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700}}>{q.buyerName}{q.buyerCompany?" · "+q.buyerCompany:""}</div><div style={{fontSize:11,color:C.textDim}}>{q.stone} · {q.factoryName} · {fmtD(q.createdAt)}</div></div>
          <InqPill status={q.status}/>
        </div>
      ))}</Card>}
    </div>
  );
}

function OwnerSettings() {
  const [saved,setSaved]=useState(false);
  return (
    <div>
      <div style={{fontSize:18,fontWeight:800,marginBottom:16}}>Settings</div>
      <Card style={{marginBottom:14}}><div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,fontSize:14,fontWeight:700}}>Platform</div><div style={{padding:16,display:"flex",flexDirection:"column",gap:14}}><Inp label="Platform Name" value="SilakAI" onChange={()=>{}}/><Inp label="Support Email" value="support@silak.ai" onChange={()=>{}}/></div></Card>
      <Card style={{marginBottom:16,padding:16}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:12}}>WhatsApp/SMS Alerts</div>
        <div style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:10,padding:12,marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:C.amber,marginBottom:4}}>🔧 Backend Required</div>
          <div style={{fontSize:12,color:C.textMid,lineHeight:1.5}}>Connect a Twilio or WhatsApp Business API account to enable real-time alerts for disputes, billing, and buyer inquiries.</div>
        </div>
        <Inp label="Twilio Account SID" value="" onChange={()=>{}} placeholder="ACxxxxxxxxxxxxxxxx" hint="Connect at twilio.com"/>
        <div style={{marginTop:10}}><Inp label="WhatsApp Business Number" value="" onChange={()=>{}} placeholder="+91 98765 43210"/></div>
      </Card>
      <Btn full size="lg" variant={saved?"green":"primary"} onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),2500);}}>{saved?"✓ Saved":"Save Settings"}</Btn>
    </div>
  );
}

// ── BUYER PORTAL ──
function BuyerPortal({factoryId,onBack,buyer=null}) {
  const [fac]=useState(()=>DB.getFac(factoryId));
  const [insps]=useState(()=>DB.facInsps(factoryId).filter(x=>x.grade==="Premium"||x.grade==="Standard"));
  const [filter,setFilter]=useState("All");
  const [search,setSearch]=useState("");
  const [selSlab,setSelSlab]=useState(null);
  const [dispute,setDispute]=useState(null);
  const [disputeText,setDisputeText]=useState({category:"",details:""});
  const [disputeSent,setDisputeSent]=useState(false);
  const [inquiry,setInquiry]=useState(null);
  const [inquiryMsg,setInquiryMsg]=useState("");
  const [inquirySent,setInquirySent]=useState(false);
  const [qrSlab,setQrSlab]=useState(null);
  const {isMobile}=useBP();
  const filtered=insps.filter(i=>(filter==="All"||i.grade===filter)&&(!search||i.stone?.toLowerCase().includes(search.toLowerCase())||i.id?.toLowerCase().includes(search.toLowerCase())));
  const gCount=g=>insps.filter(i=>i.grade===g).length;
  const pp=insps.length?Math.round(gCount("Premium")/insps.length*100):0;
  function downloadCSV(){const rows=[["Slab ID","Stone","Grade","Thickness mm","Length cm","Width cm","Defects","₹/sqft","Inspector","Date"]];filtered.forEach(i=>rows.push([i.id,i.stone,i.grade,i.measurements?.thickness||"",i.measurements?.length||"",i.measurements?.width||"",(i.defects||[]).join(";")||"None",i.pricePerSqFt,i.inspector,i.date]));const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(rows.map(r=>r.map(v=>`"${v}"`).join(",")).join("\n"));a.download=`SilakAI_${fac?.name||"Factory"}.csv`;a.click();}
  function submitInquiry(){
    if(!inquiry)return;
    DB.createInquiry({slabId:inquiry.id,stone:inquiry.stone,grade:inquiry.grade,pricePerSqFt:inquiry.pricePerSqFt,factoryId,factoryName:fac?.name||"",buyerName:buyer?.name||"Guest Buyer",buyerCompany:buyer?.company||"",buyerEmail:buyer?.email||"",message:inquiryMsg});
    DB.facUsers(factoryId).filter(u=>u.role==="admin"||u.role==="manager").forEach(u=>DB.addNotif(u.id,{title:"New Buyer Inquiry",msg:`${buyer?.name||"A buyer"} is interested in slab ${inquiry.id} (${inquiry.stone} · ${inquiry.grade})`,icon:"📩"}));
    setInquirySent(true);
  }
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',sans-serif",color:C.text}}>
      {qrSlab&&<SlabQRModal slab={qrSlab} onClose={()=>setQrSlab(null)}/>}
      <div style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary},${C.teal})`}}>
        <div style={{padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {onBack&&<button onClick={onBack} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,color:"#fff",padding:"6px 12px",fontSize:12,cursor:"pointer",fontFamily:"sans-serif",marginRight:4,WebkitTapHighlightColor:"transparent"}}>← Back</button>}
            <div><div style={{fontSize:15,fontWeight:800,color:"#fff"}}>Epistable</div><div style={{fontSize:9,color:"rgba(255,255,255,0.6)",textTransform:"uppercase",letterSpacing:"1px"}}>Verified Buyer Portal</div></div>
          </div>
          <div style={{background:"rgba(255,255,255,0.1)",borderRadius:20,padding:"4px 12px",display:"flex",alignItems:"center",gap:5}}><div style={{width:6,height:6,borderRadius:"50%",background:"#4ade80"}}/><span style={{fontSize:11,color:"rgba(255,255,255,0.8)",fontWeight:600}}>Verified</span></div>
        </div>
        <div style={{padding:"0 18px 20px"}}>
          <div style={{fontSize:20,fontWeight:800,color:"#fff",marginBottom:4}}>{fac?.name||"Factory"}</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.7)",marginBottom:14}}>{fac?.location} · All slabs graded by SilakAI</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
            {[["Total",insps.length,"📦"],["Premium",gCount("Premium"),"🏆"],["Standard",gCount("Standard"),"✅"],["Premium%",pp+"%","📊"]].map(([l,v,icon])=>(
              <div key={l} style={{background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"10px 6px",textAlign:"center"}}><div style={{fontSize:12,marginBottom:2}}>{icon}</div><div style={{fontSize:16,fontWeight:800,color:"#fff",lineHeight:1,marginBottom:2}}>{v}</div><div style={{fontSize:9,color:"rgba(255,255,255,0.65)"}}>{l}</div></div>
            ))}
          </div>
        </div>
      </div>
      <div style={{padding:"14px 14px 80px"}}>
        <div style={{marginBottom:12}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search slab ID or stone type…" style={{width:"100%",padding:"11px 14px",background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"sans-serif",marginBottom:10}}/>
          <div style={{display:"flex",gap:8,overflowX:"auto"}}>
            {["All","Premium","Standard"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{padding:"7px 16px",background:filter===f?C.primary:"transparent",border:`1px solid ${filter===f?C.primary:C.border}`,borderRadius:20,color:filter===f?C.white:C.textMid,fontSize:13,fontWeight:filter===f?600:400,cursor:"pointer",fontFamily:"sans-serif",whiteSpace:"nowrap",flexShrink:0,WebkitTapHighlightColor:"transparent"}}>{f}</button>
            ))}
            <button onClick={downloadCSV} style={{padding:"7px 16px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:20,color:C.primary,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif",whiteSpace:"nowrap",flexShrink:0,marginLeft:"auto",WebkitTapHighlightColor:"transparent"}}>⬇ CSV</button>
          </div>
        </div>
        <div style={{fontSize:12,color:C.textDim,marginBottom:12}}>{filtered.length} slabs</div>
        {filtered.length===0?<div style={{background:"#fff",borderRadius:12,padding:"40px 24px",textAlign:"center",border:`1px solid ${C.border}`}}><div style={{fontSize:36,marginBottom:10}}>🪨</div><div style={{fontSize:15,fontWeight:700}}>No slabs available yet</div></div>:
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
          {filtered.map(slab=>{
            const g=gradeConf(slab.grade);
            return (
              <div key={slab.id} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
                <div onClick={()=>setSelSlab(slab)} style={{cursor:"pointer"}}>
                  <div style={{aspectRatio:"16/9",background:g.bg,position:"relative",overflow:"hidden"}}>
                    {slab.photo?<img src={slab.photo} alt={slab.stone} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:
                    <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:6}}><span style={{fontSize:28}}>{g.emoji}</span></div>}
                    <div style={{position:"absolute",top:8,right:8,background:g.bg,border:`1px solid ${g.border}`,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,color:g.color}}>{slab.grade}</div>
                    <button onClick={e=>{e.stopPropagation();setQrSlab(slab);}} style={{position:"absolute",top:8,left:8,background:"rgba(255,255,255,0.9)",border:"none",borderRadius:8,padding:"4px 8px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"sans-serif",display:"flex",alignItems:"center",gap:4,WebkitTapHighlightColor:"transparent"}}>🔲 QR</button>
                  </div>
                  <div style={{padding:"12px 14px 8px"}}>
                    <div style={{fontSize:14,fontWeight:700,marginBottom:2}}>{slab.stone}</div>
                    <div style={{fontSize:11,color:C.textDim,marginBottom:8}}>ID: {slab.id} · {slab.date}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
                      {[["Thickness",(slab.measurements?.thickness||"—")+"mm"],["Size",(slab.measurements?.length||"—")+"×"+(slab.measurements?.width||"—")],["Polish","⭐".repeat(slab.measurements?.polish||0)||"—"]].map(([l,v])=>(
                        <div key={l} style={{background:C.surface,borderRadius:8,padding:"6px",textAlign:"center"}}><div style={{fontSize:10,color:C.textDim,marginBottom:2}}>{l}</div><div style={{fontSize:12,fontWeight:600}}>{v}</div></div>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{padding:"0 14px 12px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:8,borderTop:`1px solid ${C.border}`,gap:6}}>
                    <div style={{fontSize:16,fontWeight:800,color:C.green}}>₹{slab.pricePerSqFt}<span style={{fontSize:11,fontWeight:400,color:C.textDim}}>/sqft</span></div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>{setInquiry(slab);setInquiryMsg("");setInquirySent(false);}} style={{background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:8,padding:"5px 10px",color:C.primary,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"sans-serif",WebkitTapHighlightColor:"transparent"}}>📩 Interested</button>
                      <button onClick={()=>{setDispute(slab);setDisputeText({category:"",details:""});setDisputeSent(false);}} style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:8,padding:"5px 10px",color:C.amber,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"sans-serif",WebkitTapHighlightColor:"transparent"}}>⚠</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>}
      </div>

      {/* Slab detail modal */}
      {selSlab&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setSelSlab(null)}>
          <div style={{background:C.white,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:560,maxHeight:"90vh",overflow:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"10px 0 0",display:"flex",justifyContent:"center"}}><div style={{width:40,height:4,borderRadius:2,background:C.border}}/></div>
            {selSlab.photo&&<div style={{aspectRatio:"16/9",overflow:"hidden"}}><img src={selSlab.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>}
            <div style={{padding:"20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                <div><div style={{fontSize:18,fontWeight:800}}>{selSlab.stone}</div><div style={{fontSize:12,color:C.textDim,marginTop:2}}>ID: {selSlab.id}</div></div>
                {(()=>{const g=gradeConf(selSlab.grade);return<span style={{background:g.bg,border:`1px solid ${g.border}`,color:g.color,padding:"6px 14px",borderRadius:20,fontSize:13,fontWeight:700}}>{g.emoji} {selSlab.grade}</span>;})()}
              </div>
              <div style={{background:C.surface,borderRadius:12,padding:"14px",marginBottom:14}}>
                {[["Stone",selSlab.stone],["Grade",selSlab.grade],["Price","₹"+selSlab.pricePerSqFt+"/sqft"],["Thickness",(selSlab.measurements?.thickness||"—")+"mm"],["Size",(selSlab.measurements?.length||"—")+"×"+(selSlab.measurements?.width||"—")+" cm"],["Polish","⭐".repeat(selSlab.measurements?.polish||0)||"—"],["Defects",(selSlab.defects||[]).join(", ")||"None"],["Inspector",selSlab.inspector||"—"],["Date",selSlab.date]].map(([l,v])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:12,color:C.textDim}}>{l}</span><span style={{fontSize:12,fontWeight:600}}>{v}</span></div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                <button onClick={()=>setSelSlab(null)} style={{padding:"11px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>Close</button>
                <button onClick={()=>{setQrSlab(selSlab);setSelSlab(null);}} style={{padding:"11px",background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:10,color:C.primary,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>🔲 QR</button>
                <button onClick={()=>{setInquiry(selSlab);setInquiryMsg("");setInquirySent(false);setSelSlab(null);}} style={{padding:"11px",background:C.primary,border:"none",borderRadius:10,color:C.white,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>📩 Interested</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inquiry modal */}
      {inquiry&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setInquiry(null)}>
          <div style={{background:C.white,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:560,padding:"20px"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"0 0 10px",display:"flex",justifyContent:"center"}}><div style={{width:40,height:4,borderRadius:2,background:C.border}}/></div>
            {inquirySent?<div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:48,marginBottom:12}}>📩</div>
              <div style={{fontSize:18,fontWeight:800,marginBottom:8}}>Inquiry Sent!</div>
              <div style={{fontSize:13,color:C.textMid,lineHeight:1.6,marginBottom:20}}>Your interest in slab <strong>{inquiry.id}</strong> has been sent to {fac?.name}. They'll be in touch shortly.</div>
              <button onClick={()=>setInquiry(null)} style={{padding:"12px 28px",background:C.primary,border:"none",borderRadius:10,color:C.white,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>Done</button>
            </div>:<div>
              <div style={{fontSize:16,fontWeight:800,marginBottom:4}}>Express Interest</div>
              <div style={{background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:10,padding:12,marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:700}}>{inquiry.stone} · {inquiry.grade}</div>
                <div style={{fontSize:12,color:C.textDim}}>Slab {inquiry.id} · ₹{inquiry.pricePerSqFt}/sqft</div>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:6}}>Message (optional)</label>
                <textarea value={inquiryMsg} onChange={e=>setInquiryMsg(e.target.value)} placeholder="e.g. Quantity needed, delivery location, any questions…" rows={3} style={{width:"100%",padding:"12px 14px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,outline:"none",fontFamily:"sans-serif",resize:"none",boxSizing:"border-box"}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <button onClick={()=>setInquiry(null)} style={{padding:"12px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>Cancel</button>
                <button onClick={submitInquiry} style={{padding:"12px",background:C.primary,border:"none",borderRadius:10,color:C.white,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>Send Inquiry</button>
              </div>
            </div>}
          </div>
        </div>
      )}

      {/* Dispute modal */}
      {dispute&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setDispute(null)}>
          <div style={{background:C.white,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:560,padding:"20px"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"0 0 10px",display:"flex",justifyContent:"center"}}><div style={{width:40,height:4,borderRadius:2,background:C.border}}/></div>
            {disputeSent?<div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:48,marginBottom:12}}>✅</div>
              <div style={{fontSize:18,fontWeight:800,marginBottom:8}}>Dispute Raised</div>
              <div style={{fontSize:13,color:C.textMid,lineHeight:1.6,marginBottom:20}}>Your dispute for slab <strong>{dispute.id}</strong> has been logged and sent to the factory.</div>
              <button onClick={()=>setDispute(null)} style={{padding:"12px 28px",background:C.primary,border:"none",borderRadius:10,color:C.white,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>Done</button>
            </div>:<div>
              <div style={{fontSize:16,fontWeight:800,marginBottom:4}}>Raise a Dispute</div>
              <div style={{fontSize:13,color:C.textDim,marginBottom:14}}>Slab: {dispute.id} · {dispute.stone} · {dispute.grade}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                {[["wrong_grade","Wrong Grade","🏷️"],["defect_missed","Defect Missed","🔍"],["measurement","Wrong Measurement","📏"],["other","Other","💬"]].map(([v,l,icon])=>(
                  <button key={v} onClick={()=>setDisputeText(p=>({...p,category:v}))} style={{padding:"10px 8px",background:disputeText?.category===v?C.amberBg:C.white,border:`2px solid ${disputeText?.category===v?C.amberBorder:C.border}`,borderRadius:10,cursor:"pointer",fontFamily:"sans-serif",textAlign:"center",WebkitTapHighlightColor:"transparent"}}>
                    <div style={{fontSize:16,marginBottom:3}}>{icon}</div><div style={{fontSize:11,fontWeight:600,color:disputeText?.category===v?C.amber:C.textMid}}>{l}</div>
                  </button>
                ))}
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:6}}>Details <span style={{color:C.red}}>*</span></label>
                <textarea value={disputeText?.details||""} onChange={e=>setDisputeText(p=>({...p,details:e.target.value}))} rows={3} placeholder="Describe what was wrong…" style={{width:"100%",padding:"12px 14px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,outline:"none",fontFamily:"sans-serif",resize:"none",boxSizing:"border-box"}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <button onClick={()=>setDispute(null)} style={{padding:"12px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>Cancel</button>
                <button onClick={()=>{
                  const ok=disputeText?.category&&disputeText?.details?.trim();if(!ok)return;
                  DB.createDispute({slabId:dispute.id,stone:dispute.stone,grade:dispute.grade,inspector:dispute.inspector,factoryId:factoryId,factoryName:fac?.name||"",buyerName:buyer?.name||"Guest Buyer",buyerCompany:buyer?.company||"",category:disputeText.category,details:disputeText.details,slabDate:dispute.date});
                  DB.facUsers(factoryId).filter(u=>u.role==="admin"||u.role==="manager").forEach(u=>DB.addNotif(u.id,{title:"New Dispute",msg:`Buyer raised a dispute on slab ${dispute.id} (${dispute.stone})`,icon:"⚠️"}));
                  setDisputeSent(true);
                }} style={{padding:"12px",background:disputeText?.category&&disputeText?.details?.trim()?C.primary:C.border,border:"none",borderRadius:10,color:disputeText?.category&&disputeText?.details?.trim()?C.white:C.textDim,fontSize:14,fontWeight:600,cursor:disputeText?.category&&disputeText?.details?.trim()?"pointer":"default",fontFamily:"sans-serif"}}>Submit</button>
              </div>
            </div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── BUYER HOME ──
function BuyerHome({buyer,onLogout,onViewPortal}) {
  const fac=DB.getFac(buyer.factoryId);
  const insps=DB.facInsps(buyer.factoryId).filter(i=>i.grade==="Premium"||i.grade==="Standard");
  const premiumCount=insps.filter(i=>i.grade==="Premium").length;
  const pp=insps.length?Math.round(premiumCount/insps.length*100):0;
  const recent=insps.slice(0,3);
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',sans-serif",color:C.text}}>
      <div style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary},${C.teal})`,padding:"20px 18px 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Silak<span style={{color:"#7ec8f0"}}>AI</span> · Buyer Portal</div>
            <div style={{fontSize:20,fontWeight:800,color:C.white}}>Hello, {buyer.name.split(" ")[0]}!</div>
            {buyer.company&&<div style={{fontSize:13,color:"rgba(255,255,255,0.7)",marginTop:2}}>{buyer.company}</div>}
          </div>
          <button onClick={onLogout} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,color:C.white,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif",WebkitTapHighlightColor:"transparent"}}>Sign Out</button>
        </div>
        <div style={{background:"rgba(255,255,255,0.12)",borderRadius:12,padding:"14px 16px"}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginBottom:4}}>YOUR SUPPLIER</div>
          <div style={{fontSize:16,fontWeight:800,color:C.white,marginBottom:2}}>{fac?.name||buyer.factoryName}</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.7)",marginBottom:12}}>{fac?.location} · Verified by SilakAI</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {[["Available",insps.length,"📦"],["Premium",premiumCount,"🏆"],["Premium %",pp+"%","📊"]].map(([l,v,icon])=>(
              <div key={l} style={{background:"rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 6px",textAlign:"center"}}><div style={{fontSize:11,marginBottom:2}}>{icon}</div><div style={{fontSize:18,fontWeight:800,color:C.white,lineHeight:1,marginBottom:2}}>{v}</div><div style={{fontSize:9,color:"rgba(255,255,255,0.65)"}}>{l}</div></div>
            ))}
          </div>
        </div>
      </div>
      <div style={{padding:"16px 16px 48px"}}>
        <div onClick={onViewPortal} style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary})`,borderRadius:14,padding:"20px",marginBottom:14,display:"flex",alignItems:"center",gap:16,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
          <div style={{width:52,height:52,borderRadius:12,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>🪨</div>
          <div style={{flex:1}}><div style={{fontSize:16,fontWeight:800,color:C.white,marginBottom:3}}>View Verified Inventory</div><div style={{fontSize:12,color:"rgba(255,255,255,0.7)"}}>{insps.length} slabs · QR scan · Inquire · Dispute</div></div>
          <span style={{fontSize:22,color:"rgba(255,255,255,0.5)"}}>→</span>
        </div>
        {recent.length>0&&<Card style={{marginBottom:14}}>
          <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:13,fontWeight:700}}>Latest Available</div>
            <button onClick={onViewPortal} style={{background:"none",border:"none",color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>View all →</button>
          </div>
          {recent.map((r,i)=>{const g=gradeConf(r.grade);return(
            <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<recent.length-1?`1px solid ${C.border}`:"none"}}>
              {r.photo?<div style={{width:44,height:44,borderRadius:10,overflow:"hidden",flexShrink:0,border:`1px solid ${C.border}`}}><img src={r.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>:
              <div style={{width:44,height:44,borderRadius:10,background:g.bg,border:`1px solid ${g.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{g.emoji}</div>}
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700}}>{r.stone}</div><div style={{fontSize:11,color:C.textDim}}>{r.measurements?.thickness||"—"}mm</div></div>
              <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:11,fontWeight:700,color:g.color,background:g.bg,border:`1px solid ${g.border}`,padding:"3px 10px",borderRadius:20,marginBottom:2}}>{r.grade}</div><div style={{fontSize:13,fontWeight:800,color:C.green}}>₹{r.pricePerSqFt}</div></div>
            </div>
          );})}
        </Card>}
        <div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:12,padding:"12px 14px",display:"flex",gap:10,alignItems:"flex-start"}}>
          <span style={{fontSize:18,flexShrink:0}}>🛡️</span>
          <div><div style={{fontSize:13,fontWeight:700,color:C.green,marginBottom:2}}>SilakAI Verified</div><div style={{fontSize:12,color:C.textMid}}>All slabs independently inspected. Grades tamper-proof.</div></div>
        </div>
      </div>
    </div>
  );
}

// ── FACTORY APP ──
function FactoryApp({user,onLogout}) {
  const [page,setPage]=useState("home");
  const [insps,setInsps]=useState([]);
  const [fac,setFac]=useState(null);
  const [notifs,setNotifs]=useState([]);
  const [viewPortal,setViewPortal]=useState(false);
  function load(){setInsps(DB.userInsps(user.id));setFac(DB.getFac(user.factoryId));setNotifs(DB.getNotifs(user.id));}
  useEffect(()=>{load();},[]);
  if(viewPortal&&fac) return <BuyerPortal factoryId={fac.id} onBack={()=>setViewPortal(false)} buyer={null}/>;
  const isAdmin=user.role==="admin";
  const unread=notifs.filter(n=>!n.read).length;
  const mon=curMon();
  const sc=fac?.currentMonth===mon?fac?.currentMonthScans||0:0;
  const b=fac?calcBill(fac.plan||"Starter",sc):{total:0,includedScans:100};
  const paused=fac?.status==="paused";
  const facDispOpen=isAdmin?DB.facDisputes(fac?.id||"").filter(d=>d.status==="open").length:0;
  const facInqNew=isAdmin?DB.facInquiries(fac?.id||"").filter(q=>q.status==="new").length:0;
  const nav=[
    {id:"home",label:"Home",icon:"🏠"},
    {id:"scan",label:"Scan",icon:"🔍"},
    {id:"history",label:"History",icon:"📋"},
    {id:"analytics",label:"Analytics",icon:"📊"},
    ...(isAdmin?[{id:"suppliers",label:"Suppliers",icon:"🏭"},{id:"buyers",label:"Buyers",icon:"🌐"},{id:"inquiries",label:"Inquiries",icon:"📩",badge:facInqNew||undefined},{id:"disputes",label:"Disputes",icon:"⚠️",badge:facDispOpen||undefined}]:[]),
    {id:"notifs",label:"Alerts",icon:"🔔",badge:unread||undefined},
  ];
  const pages={
    home:<FacHome user={user} fac={fac} insps={insps} sc={sc} b={b} paused={paused} setPage={setPage} openPortal={()=>setViewPortal(true)}/>,
    scan:<FacScan user={user} fac={fac} paused={paused} onSaved={()=>{load();setPage("history");}}/>,
    history:<FacHistory insps={insps} user={user}/>,
    analytics:<FacAnalytics insps={insps} fac={fac}/>,
    ...(isAdmin?{suppliers:<FacSuppliers fac={fac} onInspSaved={load}/>,buyers:<FacBuyers user={user} fac={fac}/>,inquiries:<FacInquiries fac={fac}/>,disputes:<FacDisputes fac={fac}/>}:{}),
    notifs:<FacNotifs notifs={notifs} userId={user.id} onRead={()=>{DB.readAll(user.id);load();}}/>,
  };
  return (
    <>
      <Shell brandSub={<div style={{background:"rgba(255,255,255,0.1)",borderRadius:6,padding:"6px 10px",fontSize:11,color:"rgba(255,255,255,0.8)",display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:9,color:paused?"#f87171":"#4ade80"}}>●</span>{paused?"Paused":fac?.name||"Factory"}</div>}
        navItems={nav} page={page} onNav={p=>{setPage(p);if(p==="notifs"){DB.readAll(user.id);load();}}} onLogout={onLogout} userName={user.name} userSub={user.role}>
        {paused&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,padding:"12px 20px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}><span style={{fontSize:18}}>🚫</span><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:C.red}}>Account Paused</div><div style={{fontSize:12,color:C.red,opacity:0.8}}>Contact SilakAI owner to resume.</div></div></div>}
        {pages[page]||pages.home}
      </Shell>
      <ChatBot role="factory" ctxData={{fac,insps,user}}/>
    </>
  );
}

function FacHome({user,fac,insps,sc,b,paused,setPage,openPortal}) {
  const today=insps.filter(i=>Date.now()-i.ts<86400000);
  const byG=g=>insps.filter(i=>i.grade===g).length;
  const pp=insps.length?Math.round(byG("Premium")/insps.length*100):0;
  return (
    <div>
      <div style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary})`,borderRadius:14,padding:"18px",marginBottom:18,color:C.white}}>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.7)",marginBottom:6,textTransform:"capitalize"}}>👋 {user.role}</div>
        <div style={{fontSize:20,fontWeight:800,marginBottom:4}}>{user.name}</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.7)",marginBottom:14}}>{fac?.name||"Factory"}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {[["Today",today.length,"🔍"],["Total",insps.length,"📦"],["Premium%",pp+"%","🏆"]].map(([l,v,icon])=>(
            <div key={l} style={{background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"10px 6px",textAlign:"center"}}><div style={{fontSize:12}}>{icon}</div><div style={{fontSize:18,fontWeight:800,lineHeight:1,marginTop:4}}>{v}</div><div style={{fontSize:9,color:"rgba(255,255,255,0.65)",marginTop:2}}>{l}</div></div>
          ))}
        </div>
      </div>
      <KpiGrid items={[{label:"Scans This Month",value:sc,icon:"🔍",color:C.primary},{label:"Scan Limit",value:b.includedScans,icon:"📊",color:C.teal},{label:"Premium Rate",value:pp+"%",icon:"🏆",color:C.green},{label:"Bill Due",value:"₹"+b.total,icon:"💳",color:C.amber}]}/>
      <PBar value={sc/b.includedScans*100} color={sc>=b.includedScans?C.red:sc/b.includedScans>0.8?C.amber:C.primary} h={8}/>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:6,marginBottom:14}}><span style={{fontSize:11,color:C.textDim}}>{sc}/{b.includedScans} scans</span><span style={{fontSize:11,fontWeight:700,color:C.amber}}>₹{b.total} due</span></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <button onClick={()=>setPage("scan")} disabled={paused} style={{background:paused?"#e2e8f0":`linear-gradient(135deg,${C.primary},${C.teal})`,border:"none",borderRadius:14,padding:"20px 16px",cursor:paused?"not-allowed":"pointer",textAlign:"left",WebkitTapHighlightColor:"transparent"}}>
          <div style={{fontSize:28,marginBottom:8}}>🔍</div><div style={{fontSize:15,fontWeight:800,color:paused?C.textDim:C.white}}>New Scan</div>
        </button>
        <button onClick={openPortal} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 16px",cursor:"pointer",textAlign:"left",WebkitTapHighlightColor:"transparent"}}>
          <div style={{fontSize:28,marginBottom:8}}>🌐</div><div style={{fontSize:15,fontWeight:800,color:C.text}}>Buyer View</div>
        </button>
      </div>
      {today.length>0&&<Card>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:13,fontWeight:700}}>Today's Scans</div>
          <button onClick={()=>setPage("history")} style={{background:"none",border:"none",color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>All →</button>
        </div>
        {today.slice(0,5).map((r,i)=>{const g=gradeConf(r.grade);return(
          <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",borderBottom:i<Math.min(today.length,5)-1?`1px solid ${C.border}`:"none"}}>
            <div style={{width:38,height:38,borderRadius:8,background:g.bg,border:`1px solid ${g.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{g.emoji}</div>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700}}>{r.stone}</div><div style={{fontSize:11,color:C.textDim}}>{fmtT(r.ts)}</div></div>
            <span style={{fontSize:11,fontWeight:700,color:g.color,background:g.bg,border:`1px solid ${g.border}`,padding:"3px 10px",borderRadius:20,flexShrink:0}}>{r.grade}</span>
          </div>
        );})}
      </Card>}
    </div>
  );
}

// ── SUPPLIERS ──
function FacSuppliers({fac,onInspSaved}) {
  const [suppliers,setSuppliers]=useState(()=>DB.facSuppliers(fac?.id||""));
  const [show,setShow]=useState(false);
  const [sel,setSel]=useState(null);
  const [form,setForm]=useState({name:"",contact:"",phone:"",location:"",notes:""});
  function load(){setSuppliers(DB.facSuppliers(fac?.id||""));}
  function create(){if(!form.name)return;DB.createSupplier({...form,factoryId:fac?.id});setForm({name:"",contact:"",phone:"",location:"",notes:""});setShow(false);load();}
  function getStats(s){const insps=DB.supplierInsps(s.id);const total=insps.length;const premium=insps.filter(i=>i.grade==="Premium").length;const rejected=insps.filter(i=>i.grade==="Rejected").length;const pp=total?Math.round(premium/total*100):0;const rp=total?Math.round(rejected/total*100):0;return{total,pp,rp};}
  const flagged=suppliers.filter(s=>{const{rp}=getStats(s);return rp>=20;});
  return (
    <div>
      {show&&<Modal title="Add Supplier" onClose={()=>setShow(false)}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Inp label="Supplier Name" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required placeholder="Shree Marble Exports"/>
          <Inp label="Contact Person" value={form.contact} onChange={v=>setForm(p=>({...p,contact:v}))} placeholder="Mahesh Gupta"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Phone" value={form.phone} onChange={v=>setForm(p=>({...p,phone:v}))} placeholder="+91 98765…"/>
            <Inp label="Location" value={form.location} onChange={v=>setForm(p=>({...p,location:v}))} placeholder="Kishangarh"/>
          </div>
          <div><label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:6}}>Notes</label><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} style={{width:"100%",padding:"12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:"sans-serif",resize:"none",outline:"none",boxSizing:"border-box"}}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Btn variant="secondary" onClick={()=>setShow(false)}>Cancel</Btn><Btn onClick={create} disabled={!form.name}>Add Supplier</Btn></div>
        </div>
      </Modal>}
      {sel&&<Modal title={sel.name} onClose={()=>setSel(null)}>
        {(()=>{const insps=DB.supplierInsps(sel.id);const{total,pp,rp}=getStats(sel);const byG=g=>insps.filter(i=>i.grade===g).length;return(
          <div>
            <div style={{background:rp>=20?C.redBg:C.greenBg,border:`1px solid ${rp>=20?C.redBorder:C.greenBorder}`,borderRadius:12,padding:14,marginBottom:14}}>
              <div style={{fontSize:15,fontWeight:800,color:rp>=20?C.red:C.green,marginBottom:8}}>{rp>=20?"⚑ High Rejection Rate":"✓ Good Quality"}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {[["Total Slabs",total],["Premium %",pp+"%"],["Rejection %",rp+"%"]].map(([l,v])=>(
                  <div key={l} style={{background:C.white,borderRadius:8,padding:"8px",textAlign:"center"}}><div style={{fontSize:16,fontWeight:800}}>{v}</div><div style={{fontSize:10,color:C.textDim}}>{l}</div></div>
                ))}
              </div>
            </div>
            <div style={{marginBottom:14}}>
              {GRADES.map(g=>{const cnt=byG(g.id);const pct=total?Math.round(cnt/total*100):0;return(
                <div key={g.id} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,fontWeight:600}}>{g.emoji} {g.id}</span><span style={{fontSize:12,color:g.color}}>{cnt} ({pct}%)</span></div><PBar value={pct} color={g.color} h={5}/></div>
              );})}
            </div>
            {[["Contact",sel.contact||"—"],["Phone",sel.phone||"—"],["Location",sel.location||"—"],["Notes",sel.notes||"—"]].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:12,color:C.textDim}}>{l}</span><span style={{fontSize:12,fontWeight:600}}>{v}</span></div>
            ))}
            <div style={{marginTop:14,display:"flex",gap:10}}>
              <Btn variant="secondary" full onClick={()=>setSel(null)}>Close</Btn>
              {rp>=20&&<Btn variant="red" full onClick={()=>{DB.updSupplier(sel.id,{status:"flagged"});setSel(null);load();}}>⚑ Flag Supplier</Btn>}
            </div>
          </div>
        );})()}
      </Modal>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={{fontSize:18,fontWeight:800}}>Suppliers</div><div style={{fontSize:12,color:C.textDim}}>{suppliers.length} registered</div></div>
        <Btn size="sm" onClick={()=>setShow(true)}>+ Add</Btn>
      </div>
      {flagged.length>0&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:12,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:18}}>⚑</span><div style={{fontSize:13,fontWeight:700,color:C.red}}>{flagged.length} supplier{flagged.length>1?"s":""} with high rejection rate</div>
      </div>}
      {suppliers.length===0?<Card style={{padding:"48px",textAlign:"center"}}><div style={{fontSize:48,marginBottom:12}}>🏭</div><div style={{fontWeight:600,marginBottom:8}}>No suppliers yet</div><div style={{fontSize:12,color:C.textDim,marginBottom:16}}>Track where your stone comes from and monitor quality per supplier</div><Btn onClick={()=>setShow(true)}>+ Add First Supplier</Btn></Card>:
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {suppliers.map(s=>{const{total,pp,rp}=getStats(s);const rc=rp>=20?C.red:rp>=10?C.amber:C.green;return(
          <Card key={s.id} onClick={()=>setSel(s)} style={{padding:14,cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:700}}>{s.name}</div><div style={{fontSize:11,color:C.textDim}}>{s.location||"—"} · {s.contact||"—"}</div></div>
              <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end",flexShrink:0}}>
                {s.status==="flagged"&&<StatPill status="flagged"/>}
                <span style={{fontSize:11,fontWeight:700,color:C.textDim}}>{total} slabs</span>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <div style={{background:C.greenBg,borderRadius:8,padding:"8px",textAlign:"center"}}><div style={{fontSize:14,fontWeight:800,color:C.green}}>{pp}%</div><div style={{fontSize:10,color:C.textDim}}>Premium</div></div>
              <div style={{background:rp>=20?C.redBg:C.surface,borderRadius:8,padding:"8px",textAlign:"center"}}><div style={{fontSize:14,fontWeight:800,color:rc}}>{rp}%</div><div style={{fontSize:10,color:C.textDim}}>Rejected</div></div>
            </div>
            <PBar value={rp} color={rc} h={5}/>
          </Card>
        );})}
      </div>}
    </div>
  );
}

// ── FACTORY BUYERS ──
function FacBuyers({user,fac}) {
  const [buyers,setBuyers]=useState(()=>DB.facBuyers(fac?.id||""));
  const [show,setShow]=useState(false);
  function load(){setBuyers(DB.facBuyers(fac?.id||""));}
  return (
    <div>
      {show&&<UserFormModal title={"Add Buyer — "+fac?.name} isBuyer onClose={()=>{setShow(false);load();}} onSubmit={form=>DB.createBuyer({...form,factoryId:fac.id,factoryName:fac.name})}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={{fontSize:18,fontWeight:800}}>Buyers</div><div style={{fontSize:12,color:C.textDim}}>{buyers.length} accounts</div></div>
        <Btn size="sm" onClick={()=>setShow(true)}>+ Add Buyer</Btn>
      </div>
      {buyers.length===0?<Card style={{padding:"40px",textAlign:"center"}}><div style={{fontSize:36,marginBottom:12}}>🌐</div><div style={{fontWeight:600,marginBottom:8}}>No buyers yet</div><Btn onClick={()=>setShow(true)}>+ Add First Buyer</Btn></Card>:
      <Card>{buyers.map((b,i)=>(
        <div key={b.id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<buyers.length-1?`1px solid ${C.border}`:"none"}}>
          <Avi initials={b.name.slice(0,2).toUpperCase()} size={36} color={C.teal} bg="#e0f7fa" border="#80deea"/>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700}}>{b.name}</div><div style={{fontSize:11,color:C.textDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.company?b.company+" · ":""}{b.email}</div></div>
          <StatPill status={b.status||"active"}/>
        </div>
      ))}</Card>}
    </div>
  );
}

// ── FACTORY INQUIRIES ──
function FacInquiries({fac}) {
  const [inquiries,setInquiries]=useState(()=>DB.facInquiries(fac?.id||""));
  const [sel,setSel]=useState(null);
  function load(){setInquiries(DB.facInquiries(fac?.id||""));}
  function updStatus(id,status){DB.updInquiry(id,{status});setSel(null);load();}
  const newCount=inquiries.filter(q=>q.status==="new").length;
  return (
    <div>
      {sel&&<Modal title="Buyer Inquiry" onClose={()=>setSel(null)}>
        <div style={{background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:12,padding:14,marginBottom:14}}>
          <div style={{fontSize:14,fontWeight:800,marginBottom:2}}>{sel.buyerName}{sel.buyerCompany?" · "+sel.buyerCompany:""}</div>
          {sel.buyerEmail&&<div style={{fontSize:12,color:C.textDim,marginBottom:10}}>{sel.buyerEmail}</div>}
          {[["Slab",sel.slabId],["Stone",sel.stone],["Grade",sel.grade],["Price","₹"+sel.pricePerSqFt+"/sqft"],["Date",fmtD(sel.createdAt)]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.primaryBorder}`}}><span style={{fontSize:12,color:C.textDim}}>{l}</span><span style={{fontSize:12,fontWeight:600}}>{v}</span></div>
          ))}
          {sel.message&&<div style={{marginTop:10,background:C.white,borderRadius:8,padding:"10px",fontSize:13,color:C.text,lineHeight:1.5}}>"{sel.message}"</div>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Btn variant="secondary" onClick={()=>updStatus(sel.id,"contacted")}>📞 Mark Contacted</Btn>
          <Btn variant="green" onClick={()=>updStatus(sel.id,"closed")}>✅ Close Inquiry</Btn>
        </div>
      </Modal>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={{fontSize:18,fontWeight:800}}>Buyer Inquiries</div><div style={{fontSize:12,color:C.textDim}}>{inquiries.length} total · {newCount} new</div></div>
      </div>
      {newCount>0&&<div style={{background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:12,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:18}}>📩</span><div style={{fontSize:13,fontWeight:700,color:C.primary}}>{newCount} new {newCount===1?"inquiry":"inquiries"} from buyers</div>
      </div>}
      {inquiries.length===0?<Card style={{padding:"48px",textAlign:"center"}}><div style={{fontSize:48,marginBottom:12}}>📩</div><div style={{fontWeight:600,marginBottom:6}}>No inquiries yet</div><div style={{fontSize:12,color:C.textDim}}>When buyers express interest in slabs, it shows here</div></Card>:
      <Card>{inquiries.map((q,i)=>(
        <div key={q.id} onClick={()=>setSel(q)} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<inquiries.length-1?`1px solid ${C.border}`:"none",cursor:"pointer",background:q.status==="new"?C.primaryBg:C.white}}>
          <div style={{width:38,height:38,borderRadius:10,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>📩</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700}}>{q.buyerName}{q.buyerCompany?" · "+q.buyerCompany:""}</div>
            <div style={{fontSize:11,color:C.textDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.stone} · {q.grade} · {fmtD(q.createdAt)}</div>
          </div>
          <InqPill status={q.status}/>
        </div>
      ))}</Card>}
    </div>
  );
}

// ── FACTORY DISPUTES ──
function FacDisputes({fac}) {
  const [disputes,setDisputes]=useState(()=>DB.facDisputes(fac?.id||""));
  const [sel,setSel]=useState(null);const [response,setResponse]=useState("");
  function load(){setDisputes(DB.facDisputes(fac?.id||""));}
  function update(id,status){DB.updDispute(id,{status,response:response||undefined,respondedAt:Date.now()});setSel(null);setResponse("");load();}
  const catLabel={wrong_grade:"Wrong Grade",defect_missed:"Defect Missed",measurement:"Wrong Measurement",other:"Other"};
  const open=disputes.filter(d=>d.status==="open").length;
  return (
    <div>
      {sel&&<Modal title="Dispute Detail" onClose={()=>{setSel(null);setResponse("");}}>
        <div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:10,padding:14,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div><div style={{fontSize:14,fontWeight:800}}>{sel.stone}</div><div style={{fontSize:11,color:C.textDim}}>Slab {sel.slabId}</div></div>
            <DisputeStatusPill status={sel.status}/>
          </div>
          <div style={{fontSize:12,color:C.textMid}}>Category: <strong>{catLabel[sel.category]||sel.category}</strong></div>
          <div style={{fontSize:12,color:C.textMid,marginTop:4}}>From: <strong>{sel.buyerName}{sel.buyerCompany?" · "+sel.buyerCompany:""}</strong></div>
        </div>
        <div style={{background:C.surface,borderRadius:10,padding:12,marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.textDim,marginBottom:6}}>BUYER'S DESCRIPTION</div>
          <div style={{fontSize:13,lineHeight:1.6}}>{sel.details}</div>
        </div>
        {sel.response&&<div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:12,marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.green,marginBottom:4}}>Your Response</div>
          <div style={{fontSize:13}}>{sel.response}</div>
        </div>}
        {(sel.status==="open"||sel.status==="reviewing")&&<div>
          <div style={{marginBottom:10}}>
            <label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:6}}>Response (optional)</label>
            <textarea value={response} onChange={e=>setResponse(e.target.value)} rows={3} placeholder="Explain your decision to the buyer…" style={{width:"100%",padding:"12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:"sans-serif",resize:"none",outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            <Btn variant="secondary" size="sm" onClick={()=>update(sel.id,"reviewing")}>🔍 Review</Btn>
            <Btn variant="secondary" size="sm" style={{color:C.textDim}} onClick={()=>update(sel.id,"dismissed")}>✗ Dismiss</Btn>
            <Btn variant="green" size="sm" onClick={()=>update(sel.id,"resolved")}>✅ Resolve</Btn>
          </div>
        </div>}
      </Modal>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={{fontSize:18,fontWeight:800}}>Disputes</div><div style={{fontSize:12,color:C.textDim}}>{disputes.length} total · {open} open</div></div>
      </div>
      {open>0&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:12,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:18}}>⚠️</span><div style={{fontSize:13,fontWeight:700,color:C.red}}>{open} dispute{open>1?"s":""} need attention</div>
      </div>}
      {disputes.length===0?<Card style={{padding:"48px",textAlign:"center"}}><div style={{fontSize:48,marginBottom:12}}>🤝</div><div style={{fontWeight:600}}>No disputes yet</div></Card>:
      <Card>{disputes.map((d,i)=>(
        <div key={d.id} onClick={()=>{setSel(d);setResponse(d.response||"");}} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<disputes.length-1?`1px solid ${C.border}`:"none",cursor:"pointer",background:d.status==="open"?C.redBg:C.white}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700}}>{d.stone} <span style={{fontSize:11,color:C.textDim}}>#{d.slabId}</span></div>
            <div style={{fontSize:11,color:C.textDim}}>{catLabel[d.category]||d.category} · {d.buyerName} · {fmtD(d.createdAt)}</div>
          </div>
          <DisputeStatusPill status={d.status}/>
        </div>
      ))}</Card>}
    </div>
  );
}

function FacScan({user,fac,paused,onSaved}) {
  const [step,setStep]=useState(0);
  const [form,setForm]=useState({stone:"makrana",supplierId:"",supplier:"",measurements:{thickness:"",length:"",width:"",polish:3,soundTest:"clear",edgeCondition:"good",surfaceFinish:"polished"},defects:[],exportReady:false,notes:""});
  const [grade,setGrade]=useState(null);const [loading,setLoading]=useState(false);const [saved,setSaved]=useState(false);const [photo,setPhoto]=useState(null);
  const fileRef=useRef();
  const cameraRef=useRef();
  const videoRef=useRef();
  const canvasRef=useRef();
  const [cameraOpen,setCameraOpen]=useState(false);
  const [cameraStream,setCameraStream]=useState(null);
  const [cameraError,setCameraError]=useState("");
  const [photos,setPhotos]=useState([]);
  const suppliers=DB.facSuppliers(fac?.id||"");
  if(paused) return <div style={{textAlign:"center",padding:40}}><div style={{fontSize:48,marginBottom:12}}>🚫</div><div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Account Paused</div></div>;

  async function openCamera(){
    setCameraError("");setCameraOpen(true);
    try {
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment",width:{ideal:1280},height:{ideal:720}}});
      setCameraStream(stream);
      setTimeout(()=>{if(videoRef.current){videoRef.current.srcObject=stream;videoRef.current.play();}},100);
    } catch(e){
      setCameraError("Camera access denied or unavailable. Please use the upload option.");
      setCameraOpen(false);
    }
  }
  function stopCamera(){if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());setCameraStream(null);}setCameraOpen(false);}
  function capturePhoto(){
    if(!videoRef.current||!canvasRef.current)return;
    const v=videoRef.current;const c=canvasRef.current;
    c.width=v.videoWidth;c.height=v.videoHeight;
    c.getContext("2d").drawImage(v,0,0);
    setPhotos(p=>[...p,c.toDataURL("image/jpeg",0.85)]);
    stopCamera();
  }
  function removePhoto(idx){setPhotos(p=>p.filter((_,i)=>i!==idx));}
  function toggleDefect(id){setForm(p=>({...p,defects:p.defects.includes(id)?p.defects.filter(d=>d!==id):[...p.defects,id]}));}
  function setMeas(k,v){setForm(p=>({...p,measurements:{...p.measurements,[k]:v}}));}
  async function gradeWithAI(){
    setLoading(true);setGrade(null);
    try {
      const supplierName=form.supplierId?suppliers.find(s=>s.id===form.supplierId)?.name||form.supplier:form.supplier;
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:500,system:`You are SilakAI, a stone slab grading expert.\nGrade as: Premium (₹${GRADES[0].price}/sqft), Standard (₹${GRADES[1].price}/sqft), Commercial (₹${GRADES[2].price}/sqft), or Rejected.\nReturn ONLY JSON: {"grade":"Premium|Standard|Commercial|Rejected","reason":"1-2 sentences","pricePerSqFt":number,"exportReady":boolean,"tips":"1 tip"}`,messages:[{role:"user",content:`Stone: ${STONES.find(s=>s.id===form.stone)?.label||form.stone}\nSupplier: ${supplierName||"Unknown"}\nMeasurements: Thickness=${form.measurements.thickness}mm, Size=${form.measurements.length}×${form.measurements.width}cm, Polish=${form.measurements.polish}/5, Sound=${form.measurements.soundTest}, Edge=${form.measurements.edgeCondition}, Finish=${form.measurements.surfaceFinish}\nDefects: ${form.defects.length===0?"None":form.defects.join(", ")}\nExport: ${form.exportReady}\nNotes: ${form.notes||"None"}`}]})});
      const data=await res.json();
      let text=data.content?.[0]?.text||"{}";text=text.replace(/```json|```/g,"").trim();
      setGrade(JSON.parse(text));
    } catch(e){setGrade({grade:"Standard",reason:"Could not connect to AI. Default grade assigned.",pricePerSqFt:480,exportReady:false,tips:"Check connection and retry."});}
    setLoading(false);
  }
  function save(){
    if(!grade)return;
    const supplierName=form.supplierId?suppliers.find(s=>s.id===form.supplierId)?.name||form.supplier:form.supplier;
    const insp={id:genId("SLB"),userId:user.id,factoryId:user.factoryId,factoryName:user.factoryName||fac?.name,inspector:user.name,stone:STONES.find(s=>s.id===form.stone)?.label||form.stone,supplier:supplierName,supplierId:form.supplierId||null,grade:grade.grade,reason:grade.reason,pricePerSqFt:grade.pricePerSqFt,exportReady:grade.exportReady||form.exportReady,measurements:form.measurements,defects:form.defects,notes:form.notes,photo:photos[0]||null,photos:photos,ts:Date.now(),date:fmtD(Date.now()),time:fmtT(Date.now())};
    DB.saveInsp(insp);setSaved(true);
  }
  if(saved) return (
    <div style={{textAlign:"center",padding:"48px 24px"}}>
      <div style={{fontSize:64,marginBottom:16}}>{gradeConf(grade?.grade||"Standard").emoji}</div>
      <div style={{fontSize:24,fontWeight:800,marginBottom:4}}>{grade?.grade}</div>
      <div style={{fontSize:32,fontWeight:800,color:C.green,marginBottom:8}}>₹{grade?.pricePerSqFt}/sqft</div>
      <div style={{fontSize:13,color:C.textMid,marginBottom:24,lineHeight:1.6}}>{grade?.reason}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Btn variant="secondary" onClick={()=>{      setStep(0);setForm({stone:"makrana",supplierId:"",supplier:"",measurements:{thickness:"",length:"",width:"",polish:3,soundTest:"clear",edgeCondition:"good",surfaceFinish:"polished"},defects:[],exportReady:false,notes:""});setGrade(null);setSaved(false);setPhotos([]);}}>New Scan</Btn>
        <Btn onClick={onSaved}>View History</Btn>
      </div>
    </div>
  );
  const steps=["Stone","Measurements","Defects","Grade"];
  return (
    <div>
      <div style={{display:"flex",gap:4,marginBottom:20}}>
        {steps.map((s,i)=>(
          <div key={s} style={{flex:1,textAlign:"center"}}><div style={{height:4,borderRadius:2,background:i<=step?C.primary:C.border,marginBottom:4}}/><div style={{fontSize:10,color:i===step?C.primary:C.textDim,fontWeight:i===step?700:400}}>{s}</div></div>
        ))}
      </div>
      {step===0&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>Stone Type</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {STONES.map(s=>(
            <button key={s.id} onClick={()=>setForm(p=>({...p,stone:s.id}))} style={{padding:"12px",background:form.stone===s.id?C.primaryBg:C.white,border:`2px solid ${form.stone===s.id?C.primary:C.border}`,borderRadius:10,cursor:"pointer",textAlign:"left",fontFamily:"sans-serif",WebkitTapHighlightColor:"transparent"}}>
              <div style={{fontSize:13,fontWeight:700,color:form.stone===s.id?C.primary:C.text}}>{s.label}</div>
            </button>
          ))}
        </div>
        {suppliers.length>0?<Sel label="Supplier" value={form.supplierId} onChange={v=>setForm(p=>({...p,supplierId:v}))} options={[{value:"",label:"Select supplier…"},...suppliers.map(s=>({value:s.id,label:s.name}))]}/>
        :<Inp label="Supplier Name" value={form.supplier} onChange={v=>setForm(p=>({...p,supplier:v}))} placeholder="e.g. Shree Marble Exports"/>}
        <div>
          <label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:6}}>Slab Photo (optional)</label>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={e=>{const files=Array.from(e.target.files);files.forEach(f=>{const r=new FileReader();r.onload=ev=>setPhotos(p=>[...p,ev.target.result]);r.readAsDataURL(f);});e.target.value="";}} style={{display:"none"}}/>
          <canvas ref={canvasRef} style={{display:"none"}}/>
          {cameraOpen&&<div style={{position:"fixed",inset:0,background:"#000",zIndex:500,display:"flex",flexDirection:"column"}}>
            <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
              <button onClick={stopCamera} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,color:"#fff",padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>✕ Cancel</button>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.7)",fontWeight:600}}>Point at slab</div>
              <div style={{width:80}}/>
            </div>
            {cameraError?<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}><div style={{background:"rgba(255,255,255,0.1)",borderRadius:14,padding:24,textAlign:"center"}}><div style={{fontSize:32,marginBottom:10}}>📵</div><div style={{color:"#fff",fontSize:14,lineHeight:1.6}}>{cameraError}</div></div></div>:
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
              <video ref={videoRef} autoPlay playsInline muted style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              <div style={{position:"absolute",inset:0,border:"2px solid transparent",pointerEvents:"none"}}>
                <div style={{position:"absolute",top:"15%",left:"10%",width:"80%",height:"70%",border:"2px solid rgba(255,255,255,0.5)",borderRadius:12,boxShadow:"0 0 0 9999px rgba(0,0,0,0.35)"}}/>
                <div style={{position:"absolute",top:"calc(15% - 12px)",left:"10%",right:"10%",textAlign:"center"}}><span style={{background:"rgba(0,0,0,0.6)",color:"rgba(255,255,255,0.8)",fontSize:11,padding:"3px 10px",borderRadius:20}}>Align slab within frame</span></div>
              </div>
            </div>}
            <div style={{padding:"20px",display:"flex",justifyContent:"center",flexShrink:0}}>
              <button onClick={capturePhoto} style={{width:72,height:72,borderRadius:"50%",background:"#fff",border:"4px solid rgba(255,255,255,0.4)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,WebkitTapHighlightColor:"transparent",boxShadow:"0 4px 20px rgba(0,0,0,0.4)"}}>📸</button>
            </div>
          </div>}
          {photos.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:10}}>
            {photos.map((src,idx)=>(
              <div key={idx} style={{position:"relative",borderRadius:10,overflow:"hidden",border:`2px solid ${C.primaryBorder}`,aspectRatio:"1"}}>
                <img src={src} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                <button onClick={()=>removePhoto(idx)} style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,0.65)",border:"none",borderRadius:"50%",color:"#fff",width:22,height:22,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",WebkitTapHighlightColor:"transparent"}}>×</button>
                {idx===0&&<div style={{position:"absolute",bottom:4,left:4,background:"rgba(0,87,168,0.8)",color:"#fff",fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:6}}>COVER</div>}
              </div>
            ))}
          </div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <button onClick={openCamera} style={{padding:"16px 12px",background:C.surface,border:`2px dashed ${C.primaryBorder}`,borderRadius:12,cursor:"pointer",textAlign:"center",fontFamily:"sans-serif",WebkitTapHighlightColor:"transparent"}}>
              <div style={{fontSize:24,marginBottom:4}}>📷</div><div style={{fontSize:13,fontWeight:700,color:C.primary}}>Camera</div><div style={{fontSize:11,color:C.textDim,marginTop:1}}>Take photo</div>
            </button>
            <button onClick={()=>fileRef.current?.click()} style={{padding:"16px 12px",background:C.surface,border:`2px dashed ${C.border}`,borderRadius:12,cursor:"pointer",textAlign:"center",fontFamily:"sans-serif",WebkitTapHighlightColor:"transparent"}}>
              <div style={{fontSize:24,marginBottom:4}}>🖼️</div><div style={{fontSize:13,fontWeight:700,color:C.textMid}}>Upload</div><div style={{fontSize:11,color:C.textDim,marginTop:1}}>From gallery</div>
            </button>
          </div>
          {photos.length>0&&<div style={{fontSize:11,color:C.textDim,marginTop:6,textAlign:"center"}}>{photos.length} photo{photos.length>1?"s":""} added · First photo is cover</div>}
        </div>
        <Btn full onClick={()=>setStep(1)}>Next → Measurements</Btn>
      </div>}
      {step===1&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>Measurements</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          <Inp label="Thickness (mm)" value={form.measurements.thickness} onChange={v=>setMeas("thickness",v)} placeholder="20"/>
          <Inp label="Length (cm)" value={form.measurements.length} onChange={v=>setMeas("length",v)} placeholder="120"/>
          <Inp label="Width (cm)" value={form.measurements.width} onChange={v=>setMeas("width",v)} placeholder="60"/>
        </div>
        <div>
          <label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:8}}>Polish Level: {form.measurements.polish}/5</label>
          <input type="range" min={1} max={5} value={form.measurements.polish} onChange={e=>setMeas("polish",Number(e.target.value))} style={{width:"100%"}}/>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.textDim,marginTop:4}}><span>1 — Rough</span><span>5 — Mirror</span></div>
        </div>
        <Sel label="Sound Test" value={form.measurements.soundTest} onChange={v=>setMeas("soundTest",v)} options={[{value:"clear",label:"🔔 Clear"},{value:"dull",label:"💀 Dull"},{value:"hollow",label:"💨 Hollow"}]}/>
        <Sel label="Edge Condition" value={form.measurements.edgeCondition} onChange={v=>setMeas("edgeCondition",v)} options={[{value:"good",label:"✅ Good"},{value:"minor",label:"⚠️ Minor chips"},{value:"damaged",label:"❌ Damaged"}]}/>
        <Sel label="Surface Finish" value={form.measurements.surfaceFinish} onChange={v=>setMeas("surfaceFinish",v)} options={[{value:"polished",label:"Polished"},{value:"honed",label:"Honed"},{value:"brushed",label:"Brushed"},{value:"sandblasted",label:"Sandblasted"}]}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Btn variant="secondary" onClick={()=>setStep(0)}>← Back</Btn><Btn onClick={()=>setStep(2)}>Next → Defects</Btn></div>
      </div>}
      {step===2&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>Defects Found</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {DEFECTS.map(d=>{const sel=form.defects.includes(d.id);return(
            <button key={d.id} onClick={()=>toggleDefect(d.id)} style={{padding:"12px",background:sel?"#fff3e0":C.white,border:`2px solid ${sel?d.color:C.border}`,borderRadius:10,cursor:"pointer",textAlign:"left",fontFamily:"sans-serif",WebkitTapHighlightColor:"transparent"}}>
              <div style={{fontSize:13,fontWeight:700,color:sel?d.color:C.text}}>{sel?"✓ ":""}{d.label}</div>
            </button>
          );})}
        </div>
        <button onClick={()=>setForm(p=>({...p,exportReady:!p.exportReady}))} style={{padding:"10px 18px",background:form.exportReady?C.greenBg:C.white,border:`2px solid ${form.exportReady?C.green:C.border}`,borderRadius:10,cursor:"pointer",fontWeight:600,fontSize:13,fontFamily:"sans-serif",color:form.exportReady?C.green:C.textMid,alignSelf:"flex-start",WebkitTapHighlightColor:"transparent"}}>{form.exportReady?"✅ Export Ready":"📦 Domestic Only"}</button>
        <div><label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:6}}>Notes</label><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={3} placeholder="Any observations…" style={{width:"100%",padding:"12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:"sans-serif",resize:"none",outline:"none",boxSizing:"border-box"}}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Btn variant="secondary" onClick={()=>setStep(1)}>← Back</Btn><Btn onClick={()=>{setStep(3);gradeWithAI();}}>🤖 Grade with AI</Btn></div>
      </div>}
      {step===3&&<div>
        <div style={{fontSize:16,fontWeight:700,marginBottom:14}}>AI Grade Result</div>
        {loading?<div style={{textAlign:"center",padding:"60px 20px"}}>
          <div style={{fontSize:48,marginBottom:16,animation:"spin 2s linear infinite"}}>🤖</div>
          <div style={{fontSize:16,fontWeight:700}}>Analysing slab…</div>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>:grade?(()=>{const g=gradeConf(grade.grade);return(
          <div>
            <div style={{background:g.bg,border:`2px solid ${g.border}`,borderRadius:14,padding:"24px",textAlign:"center",marginBottom:14}}>
              <div style={{fontSize:52,marginBottom:8}}>{g.emoji}</div>
              <div style={{fontSize:26,fontWeight:800,color:g.color,marginBottom:4}}>{grade.grade}</div>
              <div style={{fontSize:32,fontWeight:800,color:C.green,marginBottom:8}}>₹{grade.pricePerSqFt}<span style={{fontSize:16,fontWeight:400,color:C.textDim}}>/sqft</span></div>
              {grade.exportReady&&<div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,color:C.green,display:"inline-block"}}>✈️ Export Ready</div>}
            </div>
            <Card style={{padding:16,marginBottom:12}}>
              <div style={{fontSize:13,color:C.text,lineHeight:1.6,marginBottom:8}}>{grade.reason}</div>
              {grade.tips&&<div style={{background:C.primaryBg,borderRadius:8,padding:"10px 14px",fontSize:12,color:C.primary}}>💡 {grade.tips}</div>}
            </Card>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {GRADES.map(g=>(
                <button key={g.id} onClick={()=>setGrade({...grade,grade:g.id,pricePerSqFt:g.price})} style={{padding:"8px 4px",background:grade.grade===g.id?g.bg:C.white,border:`2px solid ${grade.grade===g.id?g.border:C.border}`,borderRadius:10,cursor:"pointer",fontFamily:"sans-serif",textAlign:"center",WebkitTapHighlightColor:"transparent"}}>
                  <div style={{fontSize:14,marginBottom:3}}>{g.emoji}</div><div style={{fontSize:9,fontWeight:700,color:grade.grade===g.id?g.color:C.textDim}}>{g.id}</div>
                </button>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Btn variant="secondary" onClick={()=>{setStep(2);setGrade(null);}}>← Redo</Btn><Btn variant="green" onClick={save}>✓ Save Slab</Btn></div>
          </div>
        );})():null}
      </div>}
    </div>
  );
}

function FacHistory({insps,user}) {
  const [search,setSearch]=useState("");const [filterG,setFilterG]=useState("All");const [qrSlab,setQrSlab]=useState(null);
  const filtered=insps.filter(i=>(filterG==="All"||i.grade===filterG)&&(!search||i.stone?.toLowerCase().includes(search.toLowerCase())||i.id?.toLowerCase().includes(search.toLowerCase())));
  return (
    <div>
      {qrSlab&&<SlabQRModal slab={qrSlab} onClose={()=>setQrSlab(null)}/>}
      <div style={{fontSize:18,fontWeight:800,marginBottom:14}}>Scan History</div>
      <div style={{marginBottom:10}}><Inp value={search} onChange={setSearch} placeholder="Search stone, slab ID…" icon="🔍"/></div>
      <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:14,paddingBottom:4}}>
        {["All",...GRADES.map(g=>g.id)].map(f=>(
          <button key={f} onClick={()=>setFilterG(f)} style={{padding:"6px 14px",background:filterG===f?C.primary:C.white,border:`1px solid ${filterG===f?C.primary:C.border}`,borderRadius:20,color:filterG===f?C.white:C.textMid,fontSize:12,fontWeight:filterG===f?700:400,cursor:"pointer",fontFamily:"sans-serif",whiteSpace:"nowrap",flexShrink:0,WebkitTapHighlightColor:"transparent"}}>{f}</button>
        ))}
      </div>
      {filtered.length===0?<Card style={{padding:"48px",textAlign:"center"}}><div style={{fontSize:48,marginBottom:12}}>📋</div><div style={{fontWeight:600}}>No inspections yet</div></Card>:
      <Card>{filtered.map((r,i)=>{const g=gradeConf(r.grade);return(
        <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none"}}>
          {r.photo?<div style={{width:44,height:44,borderRadius:8,overflow:"hidden",flexShrink:0,border:`1px solid ${C.border}`}}><img src={r.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>:
          <div style={{width:44,height:44,borderRadius:8,background:g.bg,border:`1px solid ${g.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{g.emoji}</div>}
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700}}>{r.stone}</div><div style={{fontSize:11,color:C.textDim}}>{r.date} · {r.time}</div></div>
          <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end",flexShrink:0}}>
            <span style={{fontSize:11,fontWeight:700,color:g.color,background:g.bg,border:`1px solid ${g.border}`,padding:"3px 10px",borderRadius:20}}>{r.grade}</span>
            <button onClick={()=>setQrSlab(r)} style={{fontSize:10,fontWeight:600,color:C.primary,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:6,padding:"2px 8px",cursor:"pointer",fontFamily:"sans-serif",WebkitTapHighlightColor:"transparent"}}>🔲 QR</button>
          </div>
        </div>
      );})}
      </Card>}
    </div>
  );
}

function FacAnalytics({insps,fac}) {
  const byG=g=>insps.filter(i=>i.grade===g).length;
  const total=insps.length;const pp=total?Math.round(byG("Premium")/total*100):0;
  const today=insps.filter(i=>Date.now()-i.ts<86400000).length;
  const week=insps.filter(i=>Date.now()-i.ts<7*86400000).length;
  const defectMap={};insps.forEach(i=>(i.defects||[]).forEach(d=>{defectMap[d]=(defectMap[d]||0)+1;}));
  const topDefects=Object.entries(defectMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  return (
    <div>
      <div style={{fontSize:18,fontWeight:800,marginBottom:16}}>Analytics</div>
      <KpiGrid items={[{label:"Today",value:today,icon:"📅",color:C.primary},{label:"This Week",value:week,icon:"📆",color:C.teal},{label:"Premium Rate",value:pp+"%",icon:"🏆",color:C.green},{label:"Total",value:total,icon:"📦",color:C.text}]}/>
      <Card style={{marginBottom:14}}>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,fontSize:14,fontWeight:700}}>Grade Distribution</div>
        <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
          {GRADES.map(g=>{const count=byG(g.id);const pct=total?Math.round(count/total*100):0;return(
            <div key={g.id}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:13,fontWeight:700}}>{g.emoji} {g.id}</span><span style={{fontSize:13,fontWeight:700,color:g.color}}>{count} ({pct}%)</span></div><PBar value={pct} color={g.color}/></div>
          );})}
        </div>
      </Card>
      {topDefects.length>0&&<Card>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,fontSize:14,fontWeight:700}}>Top Defects</div>
        <div style={{padding:16,display:"flex",flexDirection:"column",gap:10}}>
          {topDefects.map(([d,cnt])=>(
            <div key={d} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:13,fontWeight:600,textTransform:"capitalize"}}>{d}</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:80,background:C.border,borderRadius:4,height:6,overflow:"hidden"}}><div style={{width:(cnt/Math.max(...Object.values(defectMap))*100)+"%",background:C.amber,height:"100%",borderRadius:4}}/></div>
                <span style={{fontSize:12,fontWeight:700,color:C.amber,minWidth:20}}>{cnt}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>}
    </div>
  );
}

function FacNotifs({notifs,userId,onRead}) {
  useEffect(()=>{if(notifs.some(n=>!n.read))onRead();},[]);
  return (
    <div>
      <div style={{fontSize:18,fontWeight:800,marginBottom:14}}>Alerts</div>
      {notifs.length===0?<Card style={{padding:"48px",textAlign:"center"}}><div style={{fontSize:48,marginBottom:12}}>🔔</div><div style={{fontWeight:600}}>No notifications</div></Card>:
      <Card>{notifs.map((n,i)=>(
        <div key={n.id} style={{display:"flex",gap:12,padding:"14px 16px",borderBottom:i<notifs.length-1?`1px solid ${C.border}`:"none",background:n.read?C.white:C.primaryBg}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{n.icon||"🔔"}</div>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,marginBottom:2}}>{n.title}</div><div style={{fontSize:12,color:C.textMid,lineHeight:1.5}}>{n.msg}</div><div style={{fontSize:11,color:C.textDim,marginTop:4}}>{fmtD(n.ts)} · {fmtT(n.ts)}</div></div>
        </div>
      ))}</Card>}
    </div>
  );
}

// ── ROOT ──
export default function App() {
  const [session,setSession]=useState(null);
  const [viewSlabId,setViewSlabId]=useState(null);
  // Simulate QR scan deep link for demo
  if(viewSlabId) return <SlabPublicView slabId={viewSlabId} onBack={()=>setViewSlabId(null)}/>;
  if(session?.type==="owner") return <Owner onLogout={()=>setSession(null)}/>;
  if(session?.type==="buyer") {
    if(session.showPortal) return <BuyerPortal factoryId={session.buyer.factoryId} buyer={session.buyer} onBack={()=>setSession({...session,showPortal:false})}/>;
    return <BuyerHome buyer={session.buyer} onLogout={()=>setSession(null)} onViewPortal={()=>setSession({...session,showPortal:true})}/>;
  }
  if(session?.type==="factory") return <FactoryApp user={session.user} onLogout={()=>setSession(null)}/>;
  return <Login onOwner={()=>setSession({type:"owner"})} onFactory={u=>setSession({type:"factory",user:u})} onBuyer={b=>setSession({type:"buyer",buyer:b})}/>;
}
