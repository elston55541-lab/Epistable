import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import { acceptInviteWithPassword, getSessionProfile, signInWithEmail, signOut } from "./lib/auth";
import { maybeOne, requireData, rows } from "./lib/supabaseSafe";
import { C, STONES, DEFECTS, GRADES, PLANS, genId, fmtT, fmtD, curMon, calcBill, gradeConf, slabQrUrl } from "./lib/domain";
import { useBP } from "./hooks/useBP";
import { Avi, BillPill, Btn, Card, DisputeStatusPill, Inp, InqPill, KpiGrid, Loader, Modal, PBar, Sel, StatPill, T } from "./components/ui";
import { SlabCertificate } from "./components/SlabCertificate";

// ── DB (Supabase) ──
const INSP_LIST_SELECT = "id,user_id,factory_id,factory_name,inspector,stone,supplier,supplier_id,grade,reason,price_per_sq_ft,export_ready,inventory_status,measurements,defects,notes,photo,ts,date,time";
const mapInquiry = d => ({
  ...d,
  factoryId:d.factory_id,
  factoryName:d.factory_name,
  buyerName:d.buyer_name,
  buyerCompany:d.buyer_company,
  buyerEmail:d.buyer_email,
  slabId:d.slab_id,
  pricePerSqFt:d.price_per_sq_ft,
  factoryNotes:d.factory_notes||"",
  followUpAt:d.follow_up_at||null,
  priority:d.priority||"warm",
});
const mapQuote = d => ({
  ...d,
  inquiryId:d.inquiry_id,
  slabId:d.slab_id,
  factoryId:d.factory_id,
  factoryName:d.factory_name,
  buyerName:d.buyer_name,
  buyerCompany:d.buyer_company,
  buyerEmail:d.buyer_email,
  pricePerSqFt:d.price_per_sq_ft,
  areaSqFt:d.area_sq_ft,
  totalAmount:d.total_amount,
  validityTs:d.validity_ts,
  buyerMessage:d.buyer_message,
  buyerDecidedAt:d.buyer_decided_at,
  parentQuoteId:d.parent_quote_id,
  revisionNumber:d.revision_number||1,
  fulfillmentStatus:d.fulfillment_status||"not_started",
});

const QUOTE_FULFILLMENT = [
  {id:"not_started",label:"Not started",buyer:"Waiting for buyer response",factory:"Starts after buyer accepts",color:C.textDim,bg:C.surface,border:C.border},
  {id:"payment_pending",label:"Payment pending",buyer:"Factory is waiting for payment confirmation",factory:"Confirm advance/payment with buyer",color:C.amber,bg:C.amberBg,border:C.amberBorder},
  {id:"payment_received",label:"Payment received",buyer:"Payment received. Factory is preparing dispatch",factory:"Payment received. Prepare dispatch",color:C.green,bg:C.greenBg,border:C.greenBorder},
  {id:"dispatch_scheduled",label:"Dispatch scheduled",buyer:"Dispatch has been scheduled",factory:"Dispatch date/vehicle is scheduled",color:C.primary,bg:C.primaryBg,border:C.primaryBorder},
  {id:"dispatched",label:"Dispatched",buyer:"Slab has been dispatched",factory:"Slab has left the factory",color:C.blue2,bg:C.blue2Bg,border:C.blue2Border},
  {id:"delivered",label:"Delivered",buyer:"Slab delivered. Awaiting final closure",factory:"Delivered. Ready to close as sold",color:C.purple,bg:C.purpleBg,border:C.purpleBorder},
  {id:"sold",label:"Sold",buyer:"Order closed as sold",factory:"Closed as sold",color:C.green,bg:C.greenBg,border:C.greenBorder},
];
const fulfillmentConf = status => QUOTE_FULFILLMENT.find(x=>x.id===status)||QUOTE_FULFILLMENT[0];
const activeFulfillment = q => q.fulfillmentStatus||q.fulfillment_status||(q.status==="accepted"?"payment_pending":"not_started");
const TEXT = {
  pageTitle: {...T.title,marginBottom:14},
  pageHeader: {...T.title},
  heroTitle: {fontSize:20,lineHeight:1.2,fontWeight:800,letterSpacing:0},
  panelTitle: {fontSize:14,lineHeight:1.35,fontWeight:800,letterSpacing:0},
  itemTitle: {fontSize:13,lineHeight:1.35,fontWeight:800,letterSpacing:0},
  meta: {...T.hint,color:C.textDim},
  tinyMeta: {fontSize:11,lineHeight:1.35,color:C.textDim,letterSpacing:0},
  emptyTitle: {fontSize:15,lineHeight:1.35,fontWeight:800,letterSpacing:0},
};

const DB = {
  // Factories
  async createFac(d) {
    const id=genId("FAC");
    const f={id,...d,created_at:Date.now(),status:"active",scans_total:0,billing_status:"pending",current_month_scans:0,current_month:curMon()};
    requireData(await supabase.from("factories").insert(f));
    return f;
  },
  async getFac(id) {
    return maybeOne(await supabase.from("factories").select().eq("id",id).maybeSingle());
  },
  async getFacByName(name) {
    if(!name)return null;
    return maybeOne(await supabase.from("factories").select().ilike("name",name.trim()).maybeSingle());
  },
  async updFac(id,u) {
    return requireData(await supabase.from("factories").update(u).eq("id",id).select().single());
  },
  async allFacs() {
    return rows(await supabase.from("factories").select().order("created_at",{ascending:false}));
  },

  // Users
  async createUser(d) {
  const id=genId("USR");
  const u={
    id,
    auth_user_id:d.authUserId||null,
    name:d.name,
    email:d.email.toLowerCase(),
    role:d.role,
    factory_id:d.factoryId,
    factory_name:d.factoryName,
    avatar:d.avatar,
    status:d.status||"pending",
    scans_total:0,
    last_active:null,
    created_at:Date.now()
  };
  requireData(await supabase.from("profiles").insert(u));
  return u;
},
  async getUser(id) {
    return maybeOne(await supabase.from("profiles").select().eq("id",id).maybeSingle());
  },
  async getUserByEmail(email) {
  return maybeOne(await supabase.from("profiles").select().eq("email",email.toLowerCase()).neq("role","buyer").maybeSingle());
  },
  async updUser(id,u) {
    return requireData(await supabase.from("profiles").update(u).eq("id",id).select().single());
  },
  async facUsers(fid) {
    return rows(await supabase.from("profiles").select().eq("factory_id",fid).order("created_at",{ascending:false}));
  },
  async allUsers() {
    return rows(await supabase.from("profiles").select().order("created_at",{ascending:false}));
  },

  // Buyers
 async createBuyer(d) {
  const id=genId("BUY");
 const b={
    id,
    auth_user_id:d.authUserId||null,
    name:d.name,
    email:d.email.toLowerCase(),
    role:"buyer",
    company:d.company||"",
    factory_id:d.factoryId,
    factory_name:d.factoryName,
    status:d.status||"pending",
    last_active:null,
    created_at:Date.now()
  };
  requireData(await supabase.from("profiles").insert(b));
  return b;
  },
  async getBuyerByEmail(email) {
  return maybeOne(await supabase.from("profiles").select().eq("email",email.toLowerCase()).eq("role","buyer").maybeSingle());
  },
  async updBuyer(id,u) {
    requireData(await supabase.from("profiles").update(u).eq("id",id));
  },
  async facBuyers(fid) {
    return rows(await supabase.from("profiles").select().eq("factory_id",fid).eq("role","buyer"));
  },

  // Inspections
  async saveInsp(insp) {
    requireData(await supabase.from("inspections").insert({
      id:insp.id, user_id:insp.userId, factory_id:insp.factoryId,
      factory_name:insp.factoryName, inspector:insp.inspector,
      stone:insp.stone, supplier:insp.supplier, supplier_id:insp.supplierId,
      grade:insp.grade, reason:insp.reason, price_per_sq_ft:insp.pricePerSqFt,
      export_ready:insp.exportReady, inventory_status:insp.inventoryStatus||"available", measurements:insp.measurements,
      defects:insp.defects, notes:insp.notes, photo:insp.photo,
      photos:insp.photos, ts:insp.ts, date:insp.date, time:insp.time
    }));
    const fac=await DB.getFac(insp.factoryId);
    if(fac){
      const m=curMon();
      const ms=fac.current_month===m?(fac.current_month_scans||0)+1:1;
      await DB.updFac(insp.factoryId,{scans_total:(fac.scans_total||0)+1,current_month_scans:ms,current_month:m,last_active:Date.now()});
    }
    const usr=await DB.getUser(insp.userId); if(usr) await DB.updUser(insp.userId,{scans_total:(usr.scans_total||0)+1,last_active:Date.now()});
  },
  async getInsp(id) {
    const data=await maybeOne(await supabase.from("inspections").select().eq("id",id).maybeSingle());
    if(!data)return null;
    return {...data,userId:data.user_id,factoryId:data.factory_id,factoryName:data.factory_name,supplierId:data.supplier_id,pricePerSqFt:data.price_per_sq_ft,exportReady:data.export_ready,inventoryStatus:data.inventory_status||"available"};
  },
  async userInsps(uid) {
    const data=await rows(await supabase.from("inspections").select(INSP_LIST_SELECT).eq("user_id",uid).order("ts",{ascending:false}).limit(200));
    return (data||[]).map(d=>({...d,userId:d.user_id,factoryId:d.factory_id,factoryName:d.factory_name,supplierId:d.supplier_id,pricePerSqFt:d.price_per_sq_ft,exportReady:d.export_ready,inventoryStatus:d.inventory_status||"available"}));
  },
  async facInsps(fid) {
    const data=await rows(await supabase.from("inspections").select(INSP_LIST_SELECT).eq("factory_id",fid).order("ts",{ascending:false}).limit(300));
    return (data||[]).map(d=>({...d,userId:d.user_id,factoryId:d.factory_id,factoryName:d.factory_name,supplierId:d.supplier_id,pricePerSqFt:d.price_per_sq_ft,exportReady:d.export_ready,inventoryStatus:d.inventory_status||"available"}));
  },
  async allInsps() {
    const data=await rows(await supabase.from("inspections").select("id,factory_id,grade,ts").order("ts",{ascending:false}).limit(1000));
    return (data||[]).map(d=>({...d,userId:d.user_id,factoryId:d.factory_id,factoryName:d.factory_name,supplierId:d.supplier_id,pricePerSqFt:d.price_per_sq_ft,exportReady:d.export_ready}));
  },
  async updInspStatus(id,status) {
    return requireData(await supabase.from("inspections").update({inventory_status:status}).eq("id",id).select().single());
  },

  // Suppliers
  async createSupplier(d) {
    const id=genId("SUP");
    const s={id,...d,created_at:Date.now(),status:"active",factory_id:d.factoryId};
    requireData(await supabase.from("suppliers").insert(s));
    return s;
  },
  async updSupplier(id,u) {
    requireData(await supabase.from("suppliers").update(u).eq("id",id));
  },
  async facSuppliers(fid) {
    return rows(await supabase.from("suppliers").select().eq("factory_id",fid));
  },
  async supplierInsps(sid) {
    const data=await rows(await supabase.from("inspections").select().eq("supplier_id",sid).order("ts",{ascending:false}));
    return (data||[]).map(d=>({...d,userId:d.user_id,factoryId:d.factory_id,factoryName:d.factory_name,supplierId:d.supplier_id,pricePerSqFt:d.price_per_sq_ft,exportReady:d.export_ready}));
  },
  async linkInspectionsToSupplier(ids,supplier) {
    if(!ids.length)return [];
    const data=await rows(await supabase.from("inspections").update({supplier_id:supplier.id,supplier:supplier.name}).in("id",ids).select());
    return (data||[]).map(d=>({...d,userId:d.user_id,factoryId:d.factory_id,factoryName:d.factory_name,supplierId:d.supplier_id,pricePerSqFt:d.price_per_sq_ft,exportReady:d.export_ready}));
  },

  // Disputes
  async createDispute(d) {
    const id=genId("DSP");
    const disp={
      id,
      created_at:Date.now(),
      status:"open",
      factory_id:d.factoryId,
      factory_name:d.factoryName,
      buyer_name:d.buyerName,
      buyer_company:d.buyerCompany,
      slab_id:d.slabId,
      stone:d.stone,
      category:d.category,
      details:d.details,
      response:d.response||null
    };
    requireData(await supabase.from("disputes").insert(disp));
    return disp;
  },
  async updDispute(id,u) {
    requireData(await supabase.from("disputes").update(u).eq("id",id));
  },
  async facDisputes(fid) {
    const data=await rows(await supabase.from("disputes").select().eq("factory_id",fid).order("created_at",{ascending:false}));
    return (data||[]).map(d=>({...d,factoryId:d.factory_id,factoryName:d.factory_name,buyerName:d.buyer_name,buyerCompany:d.buyer_company,slabId:d.slab_id}));
  },
  async allDisputes() {
    const data=await rows(await supabase.from("disputes").select().order("created_at",{ascending:false}));
    return (data||[]).map(d=>({...d,factoryId:d.factory_id,factoryName:d.factory_name,buyerName:d.buyer_name,buyerCompany:d.buyer_company,slabId:d.slab_id}));
  },

  // Inquiries
  async createInquiry(d) {
    const id=genId("INQ");
    const inq={
      id,
      created_at:Date.now(),
      status:"new",
      factory_id:d.factoryId,
      factory_name:d.factoryName,
      buyer_name:d.buyerName,
      buyer_company:d.buyerCompany,
      buyer_email:d.buyerEmail,
      slab_id:d.slabId,
      stone:d.stone,
      grade:d.grade,
      price_per_sq_ft:d.pricePerSqFt,
      message:d.message||"",
      priority:d.priority||"warm",
      factory_notes:d.factoryNotes||"",
      follow_up_at:d.followUpAt||null
    };
    requireData(await supabase.from("inquiries").insert(inq));
    return inq;
  },
  async updInquiry(id,u) {
    requireData(await supabase.from("inquiries").update(u).eq("id",id));
  },
  async facInquiries(fid) {
    const data=await rows(await supabase.from("inquiries").select().eq("factory_id",fid).order("created_at",{ascending:false}));
    return (data||[]).map(mapInquiry);
  },
  async buyerInquiries(email,fid) {
    if(!email)return [];
    const data=await rows(await supabase.from("inquiries").select().eq("buyer_email",email.toLowerCase()).eq("factory_id",fid).order("created_at",{ascending:false}).limit(20));
    return (data||[]).map(mapInquiry);
  },
  async allInquiries() {
    const data=await rows(await supabase.from("inquiries").select().order("created_at",{ascending:false}));
    return (data||[]).map(mapInquiry);
  },

  // Quotes
  async createQuote(d) {
    const id=genId("QTE");
    const row={
      id,
      inquiry_id:d.inquiryId,
      slab_id:d.slabId,
      factory_id:d.factoryId,
      factory_name:d.factoryName,
      buyer_name:d.buyerName,
      buyer_company:d.buyerCompany,
      buyer_email:d.buyerEmail,
      stone:d.stone,
      grade:d.grade,
      price_per_sq_ft:d.pricePerSqFt,
      area_sq_ft:d.areaSqFt,
      total_amount:d.totalAmount,
      validity_ts:d.validityTs,
      parent_quote_id:d.parentQuoteId||null,
      revision_number:d.revisionNumber||1,
      notes:d.notes,
      status:d.status||"sent",
      fulfillment_status:d.fulfillmentStatus||"not_started",
      created_at:Date.now(),
      updated_at:Date.now()
    };
    requireData(await supabase.from("quotes").insert(row));
    return mapQuote(row);
  },
  async facQuotes(fid) {
    const data=await rows(await supabase.from("quotes").select().eq("factory_id",fid).order("created_at",{ascending:false}));
    return (data||[]).map(mapQuote);
  },
  async buyerQuotes(email,fid) {
    if(!email)return [];
    const data=await rows(await supabase.from("quotes").select().eq("buyer_email",email.toLowerCase()).eq("factory_id",fid).order("created_at",{ascending:false}).limit(30));
    return (data||[]).map(mapQuote);
  },
  async updQuote(id,u) {
    requireData(await supabase.from("quotes").update({...u,updated_at:Date.now()}).eq("id",id));
  },
  async updateQuoteFulfillment(id,status) {
    const data=await rows(await supabase.rpc("update_quote_fulfillment",{quote_id:id,next_fulfillment_status:status}));
    return data[0]?mapQuote(data[0]):null;
  },
  async notifyBuyerRevisedQuote(id) {
    requireData(await supabase.rpc("notify_buyer_revised_quote",{quote_id:id}));
  },

  // Notifications
  async addNotif(uid,n) {
    requireData(await supabase.from("notifications").insert({id:genId("N"),user_id:uid,...n,ts:Date.now(),read:false}));
  },
  async getNotifs(uid) {
    return rows(await supabase.from("notifications").select().eq("user_id",uid).order("ts",{ascending:false}).limit(50));
  },
  async readAll(uid) {
    requireData(await supabase.from("notifications").update({read:true}).eq("user_id",uid));
  },

  // Activity
  async addActivity(a) {
    const row={id:genId("ACT"),ts:Date.now(),...a};
    try {
      requireData(await supabase.from("activity_logs").insert(row));
      return row;
    } catch(e) {
      console.warn("Activity log skipped",e);
      return null;
    }
  },
  async allActivity() {
    try {
      return rows(await supabase.from("activity_logs").select().order("ts",{ascending:false}).limit(30));
    } catch(e) {
      console.warn("Activity log load skipped",e);
      return [];
    }
  },
  async facActivity(fid) {
    try {
      return rows(await supabase.from("activity_logs").select().eq("factory_id",fid).order("ts",{ascending:false}).limit(30));
    } catch(e) {
      console.warn("Activity log load skipped",e);
      return [];
    }
  },
};

async function resolveBuyerFactoryId(buyer) {
  const direct=buyer?.factory_id||buyer?.factoryId;
  if(direct&&typeof direct==="string")return direct;
  if(buyer?.email) {
    const linked=await DB.getBuyerByEmail(buyer.email);
    if(linked?.factory_id)return linked.factory_id;
  }
  const fac=await DB.getFacByName(buyer?.factory_name||buyer?.factoryName);
  return fac?.id||"";
}

function activityForProfile(action,actor,target,details={}) {
  return {
    action,
    actor_id:actor?.id||null,
    actor_name:actor?.name||"Epistable Owner",
    factory_id:target.factory_id||details.factory_id||null,
    factory_name:target.factory_name||details.factory_name||"",
    target_type:"profile",
    target_id:target.id,
    target_name:target.name||target.email||target.id,
    details
  };
}

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
        <div style={{fontSize:12,color:C.textMid,lineHeight:1.6,marginBottom:16}}>Buyers can scan this code to instantly view the full verified inspection record for this slab.</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Btn variant="secondary" onClick={onClose}>Close</Btn>
          <Btn onClick={()=>{const a=document.createElement("a");a.href=slabQrUrl(slab.id)+"&download=1";a.download=`QR_${slab.id}.png`;a.click();}}>⬇ Download</Btn>
        </div>
      </div>
    </Modal>
  );
}

function ActivityList({items=[],compact=false}) {
  const labels={
    profile_created:"created access",
    profile_updated:"updated access",
    profile_suspended:"suspended access",
    profile_restored:"restored access"
  };
  return (
    <Card style={{marginTop:compact?12:14}}>
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,fontSize:14,fontWeight:800}}>Recent Activity</div>
      {items.length===0?<div style={{padding:"24px 16px",textAlign:"center",fontSize:13,color:C.textDim}}>No activity yet</div>:
      items.slice(0,compact?5:8).map((a,i)=>(
        <div key={a.id} style={{display:"flex",gap:10,padding:"12px 16px",borderBottom:i<Math.min(items.length,compact?5:8)-1?`1px solid ${C.border}`:"none"}}>
          <div style={{width:32,height:32,borderRadius:8,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>↻</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:800,color:C.text}}>{a.actor_name||"Someone"} {labels[a.action]||a.action} for {a.target_name}</div>
            <div style={{fontSize:11,color:C.textDim,marginTop:2}}>{a.factory_name||"Platform"} · {fmtD(a.ts)} · {fmtT(a.ts)}</div>
          </div>
        </div>
      ))}
    </Card>
  );
}

const INV_STATUS = {
  available:{label:"Available",color:C.green,bg:C.greenBg,border:C.greenBorder},
  reserved:{label:"Reserved",color:C.amber,bg:C.amberBg,border:C.amberBorder},
  sold:{label:"Sold",color:C.red,bg:C.redBg,border:C.redBorder},
};
const invConf=status=>INV_STATUS[status]||INV_STATUS.available;
function InventoryPill({status}) {
  const s=invConf(status);
  return <span style={{background:s.bg,border:`1px solid ${s.border}`,color:s.color,padding:"3px 9px",borderRadius:20,fontSize:10,fontWeight:900,whiteSpace:"nowrap"}}>{s.label}</span>;
}

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
      const tb=facs.reduce((s,f)=>{const sc=f.current_month===mon?f.current_month_scans||0:0;return s+calcBill(f.plan||"Starter",sc).total;},0);
      const totalScans=facs.reduce((s,f)=>s+(f.scans_total||0),0)||insps.length;
      return `You are Epistable's owner assistant.\nPlatform: ${facs.length} factories, ${users.length} users, ${totalScans} inspections, ₹${tb} billed.\nAnswer concisely. Hindi if asked.`;
    }
    const {fac,insps,user}=ctxData;
    const mon=curMon();
    const sc=fac?.current_month===mon?fac?.current_month_scans||0:0;
    const b=fac?calcBill(fac.plan||"Starter",sc):{total:0,includedScans:100};
    const byG=g=>insps.filter(i=>i.grade===g).length;
    return `You are Epistable's assistant for ${user.name} at ${user.factory_name}.\nFactory: ${fac?.name}, Plan=${fac?.plan||"Starter"}\nBilling: ${sc}/${b.includedScans} scans, ₹${b.total} due\nInspections: Total=${insps.length}, Premium=${byG("Premium")}, Standard=${byG("Standard")}, Commercial=${byG("Commercial")}, Rejected=${byG("Rejected")}\nAnswer concisely. Hindi if asked.`;
  }

  async function send() {
    if(!input.trim()||loading)return;
    const txt=input.trim();setInput("");
    setMsgs(prev=>[...prev,{role:"user",content:txt}]);
    setLoading(true);
    try {
      const res=await fetch("https://epistable-ai.elston55541.workers.dev/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,system:buildCtx(),messages:[...msgs.slice(-8),{role:"user",content:txt}]})});
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
                <div><div style={{fontSize:15,fontWeight:700,color:C.white}}>Epistable Assistant</div><div style={{fontSize:11,color:"rgba(255,255,255,0.7)"}}>Ask anything</div></div>
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

function Login({onOwner,onFactory,onBuyer}) {
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [showP,setShowP]=useState(false);
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const {isDesktop}=useBP();

  async function submit() {
    if(!email||!pass){setErr("Please enter email and password.");return;}
    setLoading(true);setErr("");
    try {
      const {profile}=await signInWithEmail(email,pass);
      if(profile.role==="owner"){onOwner();return;}
      if(profile.role==="buyer"){
        DB.updBuyer(profile.id,{last_active:Date.now()}).catch(e=>console.warn("Could not update buyer activity",e));
        onBuyer(profile);return;
      }
      DB.updUser(profile.id,{last_active:Date.now()}).catch(e=>console.warn("Could not update user activity",e));
      onFactory(profile);return;
    } catch(e){setErr("Login error: "+e.message);setLoading(false);}
  }

  const fieldStyle={
    width:"100%",padding:isDesktop?"15px 16px":"13px 14px",background:C.white,border:`1px solid ${C.border}`,
    borderRadius:6,color:C.text,fontSize:isDesktop?16:15,outline:"none",boxSizing:"border-box",fontFamily:"sans-serif"
  };
  const LoginFields=()=>(
    <>
      <div style={{display:"flex",flexDirection:"column",gap:15,marginBottom:20}}>
        <div>
          <label style={{display:"block",fontSize:13,fontWeight:600,color:C.text,marginBottom:7}}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} autoComplete="email" placeholder="you@example.com" style={fieldStyle}/>
        </div>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
            <label style={{fontSize:13,fontWeight:600,color:C.text}}>Password</label>
            <button type="button" onClick={()=>setShowP(p=>!p)} style={{background:"none",border:"none",padding:0,color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>{showP?"Hide":"Show"}</button>
          </div>
          <input type={showP?"text":"password"} value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} autoComplete="current-password" placeholder="Enter password" style={fieldStyle}/>
        </div>
      </div>
      <Btn full size="lg" onClick={submit} disabled={loading} style={{borderRadius:6,padding:isDesktop?"15px 20px":"13px 20px",fontWeight:700,fontSize:isDesktop?15:14}}>{loading?"Signing in...":"Log In"}</Btn>
    </>
  );
  if(isDesktop)return (
    <div style={{minHeight:"100vh",background:C.bg,display:"grid",gridTemplateColumns:"minmax(360px,40%) minmax(0,1fr)",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:`linear-gradient(160deg,${C.primary},${C.primaryD} 60%,#001f3d)`,padding:"0 56px",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",minHeight:"100vh",boxSizing:"border-box",textAlign:"center"}}>
        <div style={{marginBottom:58,width:"100%",maxWidth:360}}>
          <div style={{fontSize:34,fontWeight:800,color:C.white,lineHeight:1.1,marginBottom:10}}>Epistable <span style={{color:"#7ec8f0"}}>AI</span></div>
          <div style={{fontSize:18,fontWeight:400,color:"rgba(255,255,255,0.95)",letterSpacing:"1.2px",fontStyle:"italic",fontFamily:"Georgia, 'Times New Roman', serif",marginBottom:18}}>Quality, quantified</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            <div style={{height:1,width:30,background:"rgba(255,255,255,0.25)",borderRadius:1}}/>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.58)"}}>Grade slabs · Track quality · Build trust</div>
          </div>
        </div>
        {["AI-powered slab grading","Supplier scorecards","QR codes per slab","Buyer inquiry management","Per-scan billing","AI assistant"].map(text=>(
          <div key={text} style={{display:"flex",alignItems:"center",gap:14,marginTop:17,width:"100%",maxWidth:290,textAlign:"left"}}>
            <div style={{width:36,height:36,borderRadius:9,background:"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.82)",flexShrink:0}}>✓</div>
            <span style={{fontSize:14,color:"rgba(255,255,255,0.78)",fontWeight:400}}>{text}</span>
          </div>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"40px"}}>
        <div style={{width:"100%",maxWidth:460}}>
          <div style={{marginBottom:30,textAlign:"center"}}><div style={{fontSize:30,fontWeight:600,color:C.text,marginBottom:8}}>Welcome back</div><div style={{fontSize:15,color:C.textDim}}>Sign in with your assigned credentials</div></div>
          {err&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"11px 14px",fontSize:13,color:C.red,marginBottom:16,fontWeight:500}}>{err}</div>}
          <LoginFields/>
          <div style={{marginTop:16,textAlign:"center",fontSize:12,color:C.textDim}}>Contact your administrator for credentials</div>
        </div>
      </div>
    </div>
  );
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',sans-serif",color:C.text,display:"flex",flexDirection:"column",boxSizing:"border-box"}}>
      <div style={{background:`linear-gradient(160deg,${C.primary},${C.primaryD} 62%,#001f3d)`,padding:"58px 24px 40px",color:C.white}}>
        <div style={{maxWidth:390,margin:"0 auto",textAlign:"center"}}>
          <div style={{fontSize:26,fontWeight:800,lineHeight:1.15,marginBottom:10}}>Epistable <span style={{color:"#7ec8f0"}}>AI</span></div>
          <div style={{fontSize:15,fontWeight:400,color:"rgba(255,255,255,0.95)",letterSpacing:"1.1px",fontStyle:"italic",fontFamily:"Georgia, 'Times New Roman', serif",marginBottom:16}}>Quality, quantified</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            <div style={{height:1,width:24,background:"rgba(255,255,255,0.25)",borderRadius:1}}/>
            <div style={{fontSize:12,lineHeight:1.4,color:"rgba(255,255,255,0.62)"}}>Grade slabs · Track quality · Build trust</div>
          </div>
        </div>
      </div>

      <div style={{width:"100%",maxWidth:390,margin:"0 auto",padding:"24px 20px 28px",boxSizing:"border-box",flex:1}}>
        <div style={{marginBottom:18,textAlign:"center"}}>
          <div style={{fontSize:24,fontWeight:600,color:C.text,marginBottom:5}}>Welcome back</div>
          <div style={{fontSize:14,color:C.textDim}}>Sign in with your assigned credentials</div>
        </div>
        <div style={{width:"100%",background:C.white,border:`1px solid ${C.border}`,borderRadius:8,boxShadow:"0 8px 24px rgba(26,37,51,0.08)",padding:22,boxSizing:"border-box"}}>
          {err&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:6,padding:"11px 12px",fontSize:13,color:C.red,marginBottom:16,fontWeight:500}}>{err}</div>}
          <LoginFields/>
        </div>

        <div style={{width:"100%",marginTop:18,textAlign:"center"}}>
          <div style={{fontSize:12,color:C.textDim,marginBottom:14}}>Need access? Contact your factory administrator.</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr",gap:8}}>
            {["Verified slab certificates","Buyer-ready inventory","Factory quality control"].map(text=>(
              <div key={text} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 10px",fontSize:11,fontWeight:600,color:C.textMid}}>{text}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── OWNER ──
function InviteAccept({onAccepted}) {
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [mode,setMode]=useState("signup");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  async function submit(){
    if(!email||!pass){setErr("Enter your invited email and password.");return;}
    setLoading(true);setErr("");
    try {
      const {profile}=await acceptInviteWithPassword(email,pass,mode);
      if(!profile)throw new Error("No pending invite found for this email.");
      onAccepted(profile);
    } catch(e) {
      setErr(e.message||"Could not accept invite.");
      setLoading(false);
    }
  }
  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI',sans-serif",padding:24}}>
      <Card style={{width:"100%",maxWidth:430,padding:22}}>
        <div style={{fontSize:22,fontWeight:900,color:C.text,marginBottom:6}}>Accept Epistable Invite</div>
        <div style={{fontSize:13,color:C.textDim,marginBottom:18}}>Use the same email your admin invited. New users can create a password here; existing users can sign in.</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
          <Btn variant={mode==="signup"?"primary":"secondary"} size="sm" onClick={()=>setMode("signup")}>Create Login</Btn>
          <Btn variant={mode==="signin"?"primary":"secondary"} size="sm" onClick={()=>setMode("signin")}>I Have Login</Btn>
        </div>
        {err&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:10,padding:"10px 12px",fontSize:12,color:C.red,fontWeight:700,marginBottom:12}}>{err}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Inp label="Invited Email" value={email} onChange={setEmail} type="email" required/>
          <Inp label="Password" value={pass} onChange={setPass} type="password" required hint={mode==="signup"?"Choose a password for this login.":"Enter your existing password."}/>
          <Btn full onClick={submit} disabled={loading}>{loading?"Accepting...":"Accept Invite"}</Btn>
          <Btn full variant="secondary" onClick={()=>window.location.assign("/")}>Back to Login</Btn>
        </div>
      </Card>
    </div>
  );
}

function Owner({onLogout}) {
  const [page,setPage]=useState("overview");
  const [facs,setFacs]=useState([]);
  const [users,setUsers]=useState([]);
  const [insps,setInsps]=useState([]);
  const [activity,setActivity]=useState([]);
  const [selFac,setSelFac]=useState(null);
  const [loading,setLoading]=useState(true);

  async function load(){
    setLoading(true);
    try {
      const [f,u,i,a]=await Promise.all([DB.allFacs(),DB.allUsers(),DB.allInsps(),DB.allActivity()]);
      setFacs(f);setUsers(u.filter(u=>u.role!=="owner"));setInsps(i);setActivity(a);
    } catch(e) {
      console.error("Owner load failed",e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(()=>{load();},[]);
  if(loading)return <Loader/>;

  const mon=curMon();
  const totalBill=facs.reduce((s,f)=>{const sc=f.current_month===mon?f.current_month_scans||0:0;return s+calcBill(f.plan||"Starter",sc).total;},0);
  const overdue=facs.filter(f=>f.billing_status==="overdue").length;

  const nav=[
    {id:"overview",label:"Overview",icon:"⊞"},
    {id:"billing",label:"Billing",icon:"💳",badge:overdue||undefined},
    {id:"factories",label:"Factories",icon:"🏭"},
    {id:"users",label:"Users",icon:"👤"},
    {id:"disputes",label:"Disputes",icon:"⚠️"},
    {id:"inquiries",label:"Inquiries",icon:"📩"},
    {id:"settings",label:"Settings",icon:"⚙"},
  ];
  const pages={
    overview:<OwnerOverview facs={facs} users={users} insps={insps} activity={activity} totalBill={totalBill} overdue={overdue} setPage={setPage} pickFac={f=>{setSelFac(f);setPage("fac");}}/>,
    billing:<OwnerBilling facs={facs} onRefresh={load}/>,
    factories:<OwnerFacs facs={facs} users={users} pickFac={f=>{setSelFac(f);setPage("fac");}} onRefresh={load}/>,
    fac:selFac?<OwnerFacDetail fac={selFac} onBack={()=>setPage("factories")} onRefresh={load}/>:null,
    users:<OwnerUsers users={users} facs={facs} onRefresh={load}/>,
    disputes:<OwnerDisputes/>,
    inquiries:<OwnerInquiries/>,
    settings:<OwnerSettings/>,
  };

  return (
    <>
      <Shell brandSub={<div style={{background:"rgba(255,255,255,0.1)",borderRadius:6,padding:"6px 10px",fontSize:11,color:"rgba(255,255,255,0.8)",display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:9,color:"#4ade80"}}>●</span>{facs.length} factories · {users.length} users</div>}
        navItems={nav} page={page} onNav={p=>{setPage(p);if(p!=="fac")setSelFac(null);}} onLogout={onLogout} userName="Epistable Owner" userSub="Super Admin">
        {pages[page]||pages.overview}
      </Shell>
      <ChatBot role="owner" ctxData={{facs,insps,users}}/>
    </>
  );
}

function OwnerOverview({facs,users,insps,activity,totalBill,overdue,setPage,pickFac}) {
  const mon=curMon();
  const ms=facs.reduce((s,f)=>s+(f.current_month===mon?f.current_month_scans||0:0),0);
  const totalScans=facs.reduce((s,f)=>s+(f.scans_total||0),0)||insps.length;
  return (
    <div>
      <div style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary},${C.teal})`,borderRadius:14,padding:"20px",marginBottom:18,color:C.white}}>
        <div style={{...TEXT.heroTitle,marginBottom:4}}>Owner Console</div>
        <div style={{fontSize:13,lineHeight:1.45,color:"rgba(255,255,255,0.7)",marginBottom:14}}>Full platform visibility</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
          {[["₹"+totalBill,"Billed This Month"],[totalScans,"Total Scans"],[facs.filter(f=>f.status==="active").length,"Active Factories"],[overdue,"Overdue"]].map(([v,l])=>(
            <div key={l} style={{background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"12px"}}><div style={{fontSize:20,fontWeight:800}}>{v}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.7)"}}>{l}</div></div>
          ))}
        </div>
      </div>
      <KpiGrid items={[{label:"Billed This Month",value:"₹"+totalBill,icon:"💳",color:C.green},{label:"Scans This Month",value:ms,icon:"🔍",color:C.primary},{label:"Factories",value:facs.length,icon:"🏭",color:C.teal},{label:"Users",value:users.length,icon:"👤",color:C.text}]}/>
      <Card>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={TEXT.panelTitle}>Factories</div>
          <Btn size="sm" variant="ghost" onClick={()=>setPage("factories")}>View All →</Btn>
        </div>
        {facs.length===0?<div style={{padding:32,textAlign:"center",color:C.textDim}}>No factories yet</div>:facs.map((f,i)=>{
          const sc=f.current_month===mon?f.current_month_scans||0:0;const b=calcBill(f.plan||"Starter",sc);
          return <div key={f.id} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderBottom:i<facs.length-1?`1px solid ${C.border}`:"none",cursor:"pointer"}} onClick={()=>pickFac(f)}>
            <div style={{width:38,height:38,borderRadius:10,background:C.primaryBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🏭</div>
            <div style={{flex:1,minWidth:0}}><div style={{...TEXT.itemTitle,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div><div style={TEXT.tinyMeta}>{sc} scans · ₹{b.total} due</div></div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
              <StatPill status={f.status}/><BillPill status={f.billing_status||"pending"}/>
            </div>
          </div>;
        })}
      </Card>
      <ActivityList items={activity}/>
    </div>
  );
}

function OwnerBilling({facs,onRefresh}) {
  const mon=curMon();
  const totalDue=facs.reduce((s,f)=>{const sc=f.current_month===mon?f.current_month_scans||0:0;return s+calcBill(f.plan||"Starter",sc).total;},0);
  async function markPaid(f){await DB.updFac(f.id,{billing_status:"paid"});onRefresh();}
  async function pauseF(f){await DB.updFac(f.id,{status:"paused"});onRefresh();}
  async function resumeF(f){await DB.updFac(f.id,{status:"active",billing_status:"paid"});onRefresh();}
  return (
    <div>
      <KpiGrid items={[{label:"Total Due",value:"₹"+totalDue,icon:"💳",color:C.green},{label:"Overdue",value:facs.filter(f=>f.billing_status==="overdue").length,icon:"🚨",color:C.red},{label:"Active",value:facs.filter(f=>f.status==="active").length,icon:"🏭",color:C.teal},{label:"Paused",value:facs.filter(f=>f.status==="paused").length,icon:"⏸",color:C.amber}]}/>
      <Card>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,...TEXT.panelTitle}}>Invoices — {mon}</div>
        {facs.map((f,i)=>{
          const sc=f.current_month===mon?f.current_month_scans||0:0;const b=calcBill(f.plan||"Starter",sc);const paused=f.status==="paused";
          return <div key={f.id} style={{padding:16,borderBottom:i<facs.length-1?`1px solid ${C.border}`:"none",background:paused?C.redBg:C.white}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div><div style={TEXT.panelTitle}>{f.name}</div><div style={TEXT.tinyMeta}>{f.plan||"Starter"}{paused&&<span style={{color:C.red,fontWeight:800}}> · 🚫 PAUSED</span>}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:20,fontWeight:800,color:C.green}}>₹{b.total}</div><BillPill status={f.billing_status||"pending"}/></div>
            </div>
            <PBar value={sc/b.includedScans*100} color={sc>b.includedScans?C.red:C.primary}/>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <Btn variant="ghost" size="sm" style={{flex:1}} onClick={()=>markPaid(f)}>✓ Mark Paid</Btn>
              {!paused?<Btn variant="secondary" size="sm" style={{flex:1,color:C.red,borderColor:C.redBorder}} onClick={()=>pauseF(f)}>⏸ Pause</Btn>
              :<Btn variant="secondary" size="sm" style={{flex:1,color:C.green,borderColor:C.greenBorder}} onClick={()=>resumeF(f)}>▶ Resume</Btn>}
            </div>
          </div>;
        })}
      </Card>
    </div>
  );
}

function OwnerFacs({facs,users,pickFac,onRefresh}) {
  const [show,setShow]=useState(false);
  const [form,setForm]=useState({name:"",location:"",plan:"Starter",contact_email:""});
  const mon=curMon();
  async function create(){
    if(!form.name||!form.contact_email)return;
    await DB.createFac(form);
    setForm({name:"",location:"",plan:"Starter",contact_email:""});
    setShow(false);onRefresh();
  }
  return (
    <div>
      {show&&<Modal title="Create Factory" onClose={()=>setShow(false)}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Inp label="Factory Name" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required placeholder="Kishangarh Marble Works"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Location" value={form.location} onChange={v=>setForm(p=>({...p,location:v}))} placeholder="Rajasthan"/>
            <Sel label="Plan" value={form.plan} onChange={v=>setForm(p=>({...p,plan:v}))} options={Object.keys(PLANS)} hint={`₹${PLANS[form.plan].monthlyFee}/mo`}/>
          </div>
          <Inp label="Contact Email" value={form.contact_email} onChange={v=>setForm(p=>({...p,contact_email:v}))} required type="email"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Btn variant="secondary" onClick={()=>setShow(false)}>Cancel</Btn><Btn onClick={create} disabled={!form.name||!form.contact_email}>Create</Btn></div>
        </div>
      </Modal>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><div style={TEXT.pageHeader}>Factories</div><div style={TEXT.meta}>{facs.length} registered</div></div>
        <Btn size="sm" onClick={()=>setShow(true)}>+ Create</Btn>
      </div>
      {facs.length===0?<Card style={{padding:"48px",textAlign:"center"}}><div style={{fontSize:48,marginBottom:12}}>🏭</div><Btn onClick={()=>setShow(true)}>+ Create First Factory</Btn></Card>:
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {facs.map(f=>{const sc=f.current_month===mon?f.current_month_scans||0:0;const b=calcBill(f.plan||"Starter",sc);const uCount=users.filter(u=>u.factory_id===f.id).length;return(
          <Card key={f.id}><div style={{padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div style={{flex:1,minWidth:0,paddingRight:10}}><div style={TEXT.panelTitle}>{f.name}</div><div style={TEXT.tinyMeta}>{f.location} · {f.plan||"Starter"}</div></div>
              <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end",flexShrink:0}}><StatPill status={f.status}/><BillPill status={f.billing_status||"pending"}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
              {[["Scans",sc,C.primary],["Users",uCount,C.text],["Bill","₹"+b.total,C.green]].map(([l,v,col])=>(
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

function OwnerFacDetail({fac,onBack,onRefresh}) {
  const [users,setUsers]=useState([]);
  const [show,setShow]=useState(false);
  const [showBuyer,setShowBuyer]=useState(false);
  const [manage,setManage]=useState(null);
  const mon=curMon();
  async function load(){const u=await DB.facUsers(fac.id);setUsers(u);}
  useEffect(()=>{load();},[]);
  const sc=fac.current_month===mon?fac.current_month_scans||0:0;
  const b=calcBill(fac.plan||"Starter",sc);

  async function createUser(form){
    const u=await DB.createUser({...form,factoryId:fac.id,factoryName:fac.name,avatar:form.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()});
    await DB.addActivity(activityForProfile("profile_created",null,u,{role:u.role,status:u.status}));
    load();return u;
  }
  async function createBuyer(form){
    const b=await DB.createBuyer({
      name:form.name,
      email:form.email,
      authUserId:form.authUserId,
      company:form.company||"",
      factoryId:fac.id,
      factoryName:fac.name
    });
    await DB.addActivity(activityForProfile("profile_created",null,b,{role:"buyer",status:b.status}));
    return b;
   }
  async function saveUser(user,updates){
    await DB.updUser(user.id,updates);
    await DB.addActivity(activityForProfile(updates.status==="suspended"?"profile_suspended":user.status==="suspended"&&updates.status==="active"?"profile_restored":"profile_updated",null,{...user,...updates},{role:updates.role,status:updates.status}));
    setUsers(prev=>prev.map(u=>u.id===user.id?{...u,...updates}:u));
    onRefresh();
  }

  return (
    <div>
      {show&&<UserFormModal title={"Add User — "+fac.name} facs={[fac]} onClose={()=>setShow(false)} onSubmit={createUser}/>}
      {showBuyer&&<UserFormModal title={"Add Buyer — "+fac.name} isBuyer onClose={()=>setShowBuyer(false)} onSubmit={createBuyer}/>}
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.primary,fontWeight:600,fontSize:13,cursor:"pointer",marginBottom:16,padding:0,fontFamily:"sans-serif"}}>← Back</button>
      {manage&&<UserAccessModal user={manage} facs={[fac]} ownerMode onClose={()=>setManage(null)} onSave={saveUser}/>}
      <Card style={{marginBottom:14,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div><div style={{fontSize:16,lineHeight:1.3,fontWeight:800,letterSpacing:0}}>{fac.name}</div><div style={TEXT.meta}>{fac.location}</div></div>
          <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}><StatPill status={fac.status}/><BillPill status={fac.billing_status||"pending"}/></div>
        </div>
        <PBar value={sc/b.includedScans*100} color={sc>b.includedScans?C.red:C.primary} h={8}/>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}><span style={{fontSize:12,color:C.textDim}}>{sc}/{b.includedScans} scans</span><span style={{fontSize:14,fontWeight:800,color:C.green}}>₹{b.total}</span></div>
      </Card>
      <Card>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={TEXT.panelTitle}>Users ({users.length})</div>
          <div style={{display:"flex",gap:8}}><Btn size="sm" variant="secondary" onClick={()=>setShowBuyer(true)}>+ Buyer</Btn><Btn size="sm" onClick={()=>setShow(true)}>+ User</Btn></div>
        </div>
        {users.length===0?<div style={{padding:"32px",textAlign:"center",color:C.textDim}}>No users yet.</div>:users.map((u,i)=>(
          <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<users.length-1?`1px solid ${C.border}`:"none"}}>
            <Avi initials={u.avatar||"??"} size={36}/>
            <div style={{flex:1,minWidth:0}}><div style={TEXT.itemTitle}>{u.name}</div><div style={TEXT.tinyMeta}>{u.email}</div></div>
            <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
              <span style={{fontSize:10,fontWeight:600,color:C.primary,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,padding:"2px 7px",borderRadius:20,textTransform:"capitalize"}}>{u.role}</span>
              <StatPill status={u.status||"active"}/>
              <Btn size="sm" variant="secondary" onClick={()=>setManage(u)}>Manage</Btn>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function UserFormModal({title,onClose,onSubmit,onDone,facs,isBuyer}) {
  const [form,setForm]=useState({name:"",email:"",authUserId:"",role:"inspector",factoryId:facs?.[0]?.id||"",company:""});
  const [busy,setBusy]=useState(false);const [done,setDone]=useState(null);const [err,setErr]=useState("");
  async function submit(){
    if(!form.name||!form.email)return;
    setBusy(true);setErr("");
    try {
      const result=await onSubmit(form);
      setDone(result);
    } catch(e) {
      setErr(e.message||"Could not create profile.");
    }
    setBusy(false);
  }
  function finish(){(onDone||onClose)();}
  function sendInviteEmail(profile){
    const inviteUrl=`${window.location.origin}/invite`;
    const subject=encodeURIComponent("You're invited to Epistable AI");
    const body=encodeURIComponent(`Hi ${profile.name || ""},\n\nYou've been invited to Epistable AI.\n\nUse this link to accept your access and create your login:\n${inviteUrl}\n\nUse this email address when accepting the invite: ${profile.email}\n\nThanks,\nEpistable AI`);
    window.location.href=`mailto:${encodeURIComponent(profile.email)}?subject=${subject}&body=${body}`;
  }
  return (
    <Modal title={title} onClose={busy?()=>{}:onClose} closeOnBackdrop={false}>
      {done?<div>
        <div style={{textAlign:"center",marginBottom:14}}><div style={{fontSize:48,marginBottom:8}}>✅</div><div style={TEXT.pageHeader}>Created!</div></div>
        <div style={{background:C.primaryBg,border:`2px solid ${C.primaryBorder}`,borderRadius:12,padding:16,marginBottom:12}}>
          {[["Name",done.name],["Email",done.email],["Role",isBuyer?"Buyer":done.role],["Auth ID",done.auth_user_id||"Link in Supabase Auth"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.primaryBorder}`}}><span style={{fontSize:12,color:C.textDim}}>{l}</span><span style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:l==="Auth ID"?"monospace":"inherit",textAlign:"right"}}>{v}</span></div>
          ))}
        </div>
        <div style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:8,padding:"10px 14px",fontSize:12,color:C.amber,marginBottom:14}}>Send them this link to accept access: {window.location.origin}/invite</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Btn variant="secondary" onClick={()=>sendInviteEmail(done)}>Send Invite Email</Btn>
          <Btn onClick={finish}>Done</Btn>
        </div>
      </div>:<div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Inp label="Full Name" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required placeholder="Rajesh Kumar"/>
        {isBuyer&&<Inp label="Company" value={form.company} onChange={v=>setForm(p=>({...p,company:v}))} placeholder="Al-Rashid Stone Trading, Dubai"/>}
        <Inp label="Email" value={form.email} onChange={v=>setForm(p=>({...p,email:v}))} required type="email"/>
        <Inp label="Supabase Auth User ID" value={form.authUserId} onChange={v=>setForm(p=>({...p,authUserId:v}))} placeholder="Optional" hint="Leave blank for invite flow. The user links this by accepting /invite."/>
        {!isBuyer&&<Sel label="Role" value={form.role} onChange={v=>setForm(p=>({...p,role:v}))} options={[{value:"inspector",label:"Inspector"},{value:"manager",label:"Manager"},{value:"admin",label:"Admin"}]}/>}
        {err&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.red,fontWeight:700}}>{err}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Btn variant="secondary" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn onClick={submit} disabled={busy||!form.name||!form.email}>{busy?"Creating…":"Create Profile"}</Btn>
        </div>
      </div>}
    </Modal>
  );
}

function UserAccessModal({user,facs,onClose,onSave,ownerMode=false,fixedRole=null}) {
  const [form,setForm]=useState({
    name:user.name||"",
    email:user.email||"",
    authUserId:user.auth_user_id||"",
    role:fixedRole||user.role||"inspector",
    factoryId:user.factory_id||facs?.[0]?.id||"",
    company:user.company||"",
    status:user.status||"active"
  });
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const roleOptions=ownerMode
    ? [{value:"admin",label:"Admin"},{value:"manager",label:"Manager"},{value:"inspector",label:"Inspector"},{value:"buyer",label:"Buyer"}]
    : [{value:"admin",label:"Admin"},{value:"manager",label:"Manager"},{value:"inspector",label:"Inspector"},{value:"buyer",label:"Buyer"}];
  const facOptions=(facs||[]).map(f=>({value:f.id,label:f.name}));
  async function submit(nextStatus=form.status){
    if(!form.name||!form.email)return;
    setBusy(true);setErr("");
    try {
      const fac=(facs||[]).find(f=>f.id===form.factoryId);
      await onSave(user,{
        name:form.name.trim(),
        email:form.email.trim().toLowerCase(),
        auth_user_id:form.authUserId.trim()||null,
        role:fixedRole||form.role,
        factory_id:form.factoryId||null,
        factory_name:fac?.name||user.factory_name||"",
        company:(fixedRole||form.role)==="buyer"?(form.company||""):"",
        status:nextStatus,
        avatar:form.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()
      });
      onClose();
    } catch(e) {
      setErr(e.message||"Could not update access.");
    }
    setBusy(false);
  }
  const suspended=form.status==="suspended";
  return (
    <Modal title={"Manage Access"} onClose={busy?()=>{}:onClose} closeOnBackdrop={false}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"flex",alignItems:"center",gap:12,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
          <Avi initials={(user.avatar||user.name||"??").slice(0,2).toUpperCase()} size={38}/>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:800,color:C.text}}>{user.name}</div><div style={{fontSize:11,color:C.textDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div></div>
          <StatPill status={form.status}/>
        </div>
        <Inp label="Full Name" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required/>
        <Inp label="Email" value={form.email} onChange={v=>setForm(p=>({...p,email:v}))} required type="email"/>
        <Inp label="Supabase Auth User ID" value={form.authUserId} onChange={v=>setForm(p=>({...p,authUserId:v}))} hint="This links the profile to Supabase Auth login."/>
        <div style={{display:"grid",gridTemplateColumns:ownerMode?"1fr 1fr":"1fr",gap:12}}>
          {fixedRole?<div><label style={{display:"block",fontSize:13,fontWeight:600,color:C.text,marginBottom:6}}>Role</label><div style={{background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:10,padding:"12px 14px",fontSize:13,fontWeight:800,color:C.primary,textTransform:"capitalize"}}>{fixedRole}</div></div>:<Sel label="Role" value={form.role} onChange={v=>setForm(p=>({...p,role:v}))} options={roleOptions}/>}
          {ownerMode&&<Sel label="Factory" value={form.factoryId} onChange={v=>setForm(p=>({...p,factoryId:v}))} options={facOptions}/>}
        </div>
        {(fixedRole||form.role)==="buyer"&&<Inp label="Company" value={form.company} onChange={v=>setForm(p=>({...p,company:v}))}/>}
        <Sel label="Access Status" value={form.status} onChange={v=>setForm(p=>({...p,status:v}))} options={[{value:"active",label:"Active"},{value:"suspended",label:"Suspended"},{value:"inactive",label:"Inactive"}]}/>
        {err&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.red,fontWeight:700}}>{err}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Btn variant="secondary" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn onClick={()=>submit()} disabled={busy||!form.name||!form.email}>{busy?"Saving...":"Save Changes"}</Btn>
        </div>
        <Btn variant={suspended?"green":"red"} onClick={()=>submit(suspended?"active":"suspended")} disabled={busy} full>
          {suspended?"Restore Access":"Suspend Access"}
        </Btn>
      </div>
    </Modal>
  );
}

function OwnerUsers({users,facs,onRefresh}) {
  const [show,setShow]=useState(false);const [search,setSearch]=useState("");
  const [manage,setManage]=useState(null);
  const filtered=users.filter(u=>u.name?.toLowerCase().includes(search.toLowerCase())||u.email?.toLowerCase().includes(search.toLowerCase())||u.factory_name?.toLowerCase().includes(search.toLowerCase()));
  async function createUser(form){
    const fac=facs.find(f=>f.id===form.factoryId);
    const u=await DB.createUser({...form,factoryName:fac?.name||"Unknown",avatar:form.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()});
    await DB.addActivity(activityForProfile("profile_created",null,u,{role:u.role,status:u.status}));
    return u;
  }
  async function saveUser(user,updates){
    await DB.updUser(user.id,updates);
    await DB.addActivity(activityForProfile(updates.status==="suspended"?"profile_suspended":user.status==="suspended"&&updates.status==="active"?"profile_restored":"profile_updated",null,{...user,...updates},{role:updates.role,status:updates.status}));
    onRefresh();
  }
  return (
    <div>
      {show&&<UserFormModal title="Create User" facs={facs} onClose={()=>setShow(false)} onDone={()=>{setShow(false);onRefresh();}} onSubmit={createUser}/>}
      {manage&&<UserAccessModal user={manage} facs={facs} ownerMode onClose={()=>setManage(null)} onSave={saveUser}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={TEXT.pageHeader}>All Users</div><div style={TEXT.meta}>{users.length} accounts</div></div>
        <Btn size="sm" onClick={()=>setShow(true)}>+ Create</Btn>
      </div>
      <div style={{marginBottom:12}}><Inp value={search} onChange={setSearch} placeholder="Search name, email, factory…" icon="🔍"/></div>
      {filtered.length===0?<Card style={{padding:"40px",textAlign:"center"}}><div style={{fontSize:32,marginBottom:12}}>👤</div><div style={{fontWeight:600}}>No users yet</div></Card>:
      <Card>{filtered.map((u,i)=>(
        <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none"}}>
          <Avi initials={u.avatar||"??"} size={36}/>
          <div style={{flex:1,minWidth:0}}><div style={TEXT.itemTitle}>{u.name}</div><div style={{...TEXT.tinyMeta,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.factory_name} · {u.email}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            <span style={{fontSize:10,fontWeight:600,color:C.primary,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,padding:"3px 9px",borderRadius:20,textTransform:"capitalize"}}>{u.role}</span>
            <StatPill status={u.status||"active"}/>
            <Btn size="sm" variant="secondary" onClick={()=>setManage(u)}>Manage</Btn>
          </div>
        </div>
      ))}</Card>}
    </div>
  );
}

function OwnerDisputes() {
  const [disputes,setDisputes]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{DB.allDisputes().then(d=>{setDisputes(d);setLoading(false);});},[]);
  const catLabel={wrong_grade:"Wrong Grade",defect_missed:"Defect Missed",measurement:"Wrong Measurement",other:"Other"};
  if(loading)return <Loader/>;
  return (
    <div>
      <div style={TEXT.pageTitle}>All Disputes</div>
      {disputes.length===0?<Card style={{padding:"48px",textAlign:"center"}}><div style={{fontSize:48,marginBottom:12}}>🤝</div><div style={TEXT.emptyTitle}>No disputes yet</div></Card>:
      <Card>{disputes.map((d,i)=>(
        <div key={d.id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<disputes.length-1?`1px solid ${C.border}`:"none",background:d.status==="open"?C.redBg:C.white}}>
          <div style={{flex:1,minWidth:0}}><div style={TEXT.itemTitle}>{d.stone} <span style={TEXT.tinyMeta}>#{d.slab_id}</span></div><div style={TEXT.tinyMeta}>{d.factory_name} · {d.buyer_name} · {catLabel[d.category]||d.category}</div></div>
          <DisputeStatusPill status={d.status}/>
        </div>
      ))}</Card>}
    </div>
  );
}

function OwnerInquiries() {
  const [inquiries,setInquiries]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{DB.allInquiries().then(i=>{setInquiries(i);setLoading(false);});},[]);
  async function updStatus(id,status){await DB.updInquiry(id,{status});const i=await DB.allInquiries();setInquiries(i);}
  if(loading)return <Loader/>;
  return (
    <div>
      <div style={TEXT.pageTitle}>All Buyer Inquiries</div>
      {inquiries.length===0?<Card style={{padding:"48px",textAlign:"center"}}><div style={{fontSize:48,marginBottom:12}}>📩</div><div style={TEXT.emptyTitle}>No inquiries yet</div></Card>:
      <Card>{inquiries.map((q,i)=>(
        <div key={q.id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<inquiries.length-1?`1px solid ${C.border}`:"none",background:q.status==="new"?C.primaryBg:C.white}}>
          <div style={{flex:1,minWidth:0}}><div style={TEXT.itemTitle}>{q.buyer_name}{q.buyer_company?" · "+q.buyer_company:""}</div><div style={TEXT.tinyMeta}>{q.stone} · {q.factory_name} · {fmtD(q.created_at)}</div></div>
          <InqPill status={q.status}/>
        </div>
      ))}</Card>}
    </div>
  );
}

function OwnerSettings() {
  return (
    <div>
      <div style={{...TEXT.pageHeader,marginBottom:16}}>Settings</div>
      <Card style={{padding:16,marginBottom:14}}><Inp label="Platform Name" value="Epistable AI" onChange={()=>{}}/></Card>
      <div style={{background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:12,padding:14,fontSize:13,color:C.primary}}>✅ Using Supabase — data syncs across all devices in real time.</div>
    </div>
  );
}

// ── FACTORY APP ──
function FactoryApp({user,onLogout}) {
  const [page,setPage]=useState("home");
  const [insps,setInsps]=useState([]);
  const [fac,setFac]=useState(null);
  const [notifs,setNotifs]=useState([]);
  const [activity,setActivity]=useState([]);
  const [inquiries,setInquiries]=useState([]);
  const [salesInsps,setSalesInsps]=useState([]);
  const [disputes,setDisputes]=useState([]);
  const [quotes,setQuotes]=useState([]);
  const [loading,setLoading]=useState(true);
  const [adminDataLoading,setAdminDataLoading]=useState(false);
  const [viewPortal,setViewPortal]=useState(false);

  async function load({blockAdmin=true}={}){
    setLoading(true);
    const canManage=user.role==="admin"||user.role==="manager";
    const [i,f]=await Promise.all([DB.userInsps(user.id),DB.getFac(user.factory_id)]);
    setInsps(i);setFac(f);setSalesInsps(prev=>canManage?(prev.length?prev:i):i);
    setLoading(false);
    setAdminDataLoading(true);
    const adminLoad=Promise.all([DB.getNotifs(user.id),DB.facActivity(user.factory_id),canManage?DB.facInquiries(user.factory_id):Promise.resolve([]),canManage?DB.facInsps(user.factory_id):Promise.resolve([]),canManage?DB.facDisputes(user.factory_id):Promise.resolve([]),canManage?DB.facQuotes(user.factory_id):Promise.resolve([])])
      .then(([n,a,q,fi,d,qt])=>{setNotifs(n);setActivity(a);setInquiries(q);setSalesInsps(canManage?fi:i);setDisputes(d);setQuotes(qt);})
      .catch(e=>console.error("Factory dashboard refresh failed",e))
      .finally(()=>setAdminDataLoading(false));
    if(blockAdmin)await adminLoad;
  }
  useEffect(()=>{load({blockAdmin:false});},[]);
  if(loading)return <Loader/>;
  const isAdmin=user.role==="admin"||user.role==="manager";
  if(viewPortal&&fac&&isAdmin)return <BuyerPortal factoryId={fac.id} onBack={()=>setViewPortal(false)} buyer={null}/>;
  const unread=notifs.filter(n=>!n.read).length;
  const mon=curMon();
  const sc=fac?.current_month===mon?fac?.current_month_scans||0:0;
  const b=fac?calcBill(fac.plan||"Starter",sc):{total:0,includedScans:100};
  const paused=fac?.status==="paused";

  const nav=[
    {id:"home",label:"Home",icon:"🏠"},
    {id:"scan",label:"Scan",icon:"🔍"},
    {id:"history",label:"History",icon:"📋"},
    {id:"analytics",label:"Analytics",icon:"📊"},
    ...(isAdmin?[{id:"team",label:"Team",icon:"👥"},{id:"suppliers",label:"Suppliers",icon:"🏭"},{id:"buyers",label:"Buyers",icon:"🌐"},{id:"inquiries",label:"Inquiries",icon:"📩"},{id:"disputes",label:"Disputes",icon:"⚠️"}]:[]),
    {id:"notifs",label:"Alerts",icon:"🔔",badge:unread||undefined},
  ];
  if(isAdmin&&!nav.some(n=>n.id==="sales"))nav.splice(4,0,{id:"sales",label:"Sales",icon:"₹"});
  if(isAdmin&&!nav.some(n=>n.id==="quotes"))nav.splice(5,0,{id:"quotes",label:"Quotes",icon:"Q"});

  const pages={
    home:<FacHome user={user} fac={fac} insps={insps} inquiries={inquiries} sc={sc} b={b} paused={paused} isAdmin={isAdmin} setPage={setPage} openPortal={()=>setViewPortal(true)}/>,
    scan:<FacScan user={user} fac={fac} paused={paused} onSaved={()=>{load();setPage("history");}}/>,
    history:<FacHistory insps={insps}/>,
    analytics:<FacAnalytics insps={insps}/>,
    ...(isAdmin?{sales:<FacSalesDashboard inquiries={inquiries} insps={salesInsps} disputes={disputes} quotes={quotes} setPage={setPage} onChange={load}/>}:{ }),
    ...(isAdmin?{quotes:<FacQuotesPage quotes={quotes} insps={salesInsps} onChange={load}/>}:{ }),
    ...(isAdmin?{team:<FacTeam fac={fac} actor={user} activity={activity} onActivity={load}/>,suppliers:<FacSuppliers fac={fac}/>,buyers:<FacBuyers fac={fac} actor={user} onActivity={load}/>,inquiries:<FacInquiries fac={fac} onChange={load}/>,disputes:<FacDisputes fac={fac}/>}:{}),
    notifs:<FacNotifs notifs={notifs} onRead={async()=>{await DB.readAll(user.id);load();}}/>,
  };

  return (
    <>
      <Shell brandSub={<div style={{background:"rgba(255,255,255,0.1)",borderRadius:6,padding:"6px 10px",fontSize:11,color:"rgba(255,255,255,0.8)",display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:9,color:paused?"#f87171":"#4ade80"}}>●</span>{paused?"Paused":fac?.name||"Factory"}</div>}
        navItems={nav} page={page} onNav={p=>{setPage(p);if(p==="notifs"){DB.readAll(user.id);load();}}} onLogout={onLogout} userName={user.name} userSub={user.role}>
        {paused&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,padding:"12px 20px",display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18}}>🚫</span><div style={{fontSize:13,fontWeight:700,color:C.red}}>Account Paused — Contact Epistable support to resume.</div></div>}
        {adminDataLoading&&isAdmin&&<div style={{background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:10,padding:"9px 12px",fontSize:12,fontWeight:800,color:C.primary,marginBottom:12}}>Refreshing dashboard data...</div>}
        {pages[page]||pages.home}
      </Shell>
      <ChatBot role="factory" ctxData={{fac,insps,user}}/>
    </>
  );
}

function FacHome({user,fac,insps,inquiries=[],sc,b,paused,isAdmin,setPage,openPortal}) {
  const today=insps.filter(i=>Date.now()-i.ts<86400000);
  const byG=g=>insps.filter(i=>i.grade===g).length;
  const pp=insps.length?Math.round(byG("Premium")/insps.length*100):0;
  const overdueFollowups=inquiries.filter(q=>q.followUpAt&&q.followUpAt<Date.now()&&q.status!=="closed");
  const quoteRequests=inquiries.filter(q=>/quote request/i.test(q.message||"")&&q.status!=="closed");
  const newInquiries=inquiries.filter(q=>q.status==="new");
  const availableSlabs=insps.filter(i=>(i.inventoryStatus||"available")==="available").length;
  const reservedSlabs=insps.filter(i=>(i.inventoryStatus||"available")==="reserved").length;
  const soldSlabs=insps.filter(i=>(i.inventoryStatus||"available")==="sold").length;
  const rejectedToday=today.filter(i=>i.grade==="Rejected").length;
  const adminPriorities=[...overdueFollowups.slice(0,2).map(q=>({label:"Overdue follow-up",detail:q.buyerName||q.buyer_name||"Buyer",color:C.red,page:"inquiries"})),...quoteRequests.slice(0,2).map(q=>({label:"Quote request",detail:`${q.buyerName||q.buyer_name||"Buyer"} - ${q.stone}`,color:C.green,page:"inquiries"})),...newInquiries.slice(0,2).map(q=>({label:"New inquiry",detail:`${q.buyerName||q.buyer_name||"Buyer"} - ${q.stone}`,color:C.primary,page:"inquiries"}))].slice(0,4);
  const homeKpisNext=[{label:"Scans This Month",value:sc,icon:"Scan",color:C.primary},{label:"Available Slabs",value:availableSlabs,icon:"Stock",color:C.green},{label:"Premium Rate",value:pp+"%",icon:"Grade",color:C.green},{label:"Bill Due",value:"Rs "+b.total,icon:"Bill",color:C.amber},...(isAdmin?[{label:"Quote Requests",value:quoteRequests.length,icon:"Quote",color:C.primary},{label:"Overdue Follow-ups",value:overdueFollowups.length,icon:"Due",color:overdueFollowups.length?C.red:C.textDim}]:[])];
  return (
    <div>
      <div style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary})`,borderRadius:14,padding:"18px",marginBottom:18,color:C.white}}>
        <div style={{fontSize:12,lineHeight:1.45,color:"rgba(255,255,255,0.7)",marginBottom:6,textTransform:"capitalize"}}>👋 {user.role}</div>
        <div style={{...TEXT.heroTitle,marginBottom:4}}>{user.name}</div>
        <div style={{fontSize:13,lineHeight:1.45,color:"rgba(255,255,255,0.7)",marginBottom:14}}>{fac?.name||"Factory"}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {[["Today",today.length,"🔍"],["Total",insps.length,"📦"],["Premium%",pp+"%","🏆"]].map(([l,v,icon])=>(
            <div key={l} style={{background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"10px 6px",textAlign:"center"}}><div style={{fontSize:12}}>{icon}</div><div style={{fontSize:18,fontWeight:800,lineHeight:1.1,letterSpacing:0,marginTop:4}}>{v}</div><div style={{fontSize:10,lineHeight:1.3,color:"rgba(255,255,255,0.65)",marginTop:2}}>{l}</div></div>
          ))}
        </div>
      </div>
      <KpiGrid items={homeKpisNext}/>
      {isAdmin&&<Card style={{padding:14,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:12}}>
          <div><div style={{fontSize:14,fontWeight:900}}>Today at a glance</div><div style={TEXT.tinyMeta}>Inventory, buyer demand, and quality signals</div></div>
          <Btn size="sm" variant="ghost" onClick={()=>setPage("sales")}>Sales</Btn>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
          {[["Reserved",reservedSlabs,C.amber],["Sold",soldSlabs,C.green],["Rejected Today",rejectedToday,rejectedToday?C.red:C.textDim]].map(([label,value,color])=>(
            <div key={label} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 10px"}}>
              <div style={{fontSize:18,fontWeight:900,color,lineHeight:1}}>{value}</div>
              <div style={{fontSize:10,color:C.textDim,fontWeight:800,marginTop:5}}>{label}</div>
            </div>
          ))}
        </div>
        {adminPriorities.length===0?<div style={{fontSize:12,color:C.textDim,background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,padding:10}}>No urgent buyer follow-ups right now.</div>:
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {adminPriorities.map((p,i)=>(
              <button key={`${p.label}-${i}`} onClick={()=>setPage(p.page)} style={{display:"flex",alignItems:"center",gap:9,background:C.white,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 10px",cursor:"pointer",fontFamily:"sans-serif",textAlign:"left"}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:p.color,flexShrink:0}}/>
                <span style={{flex:1,minWidth:0}}><span style={{display:"block",fontSize:12,fontWeight:900,color:C.text}}>{p.label}</span><span style={{display:"block",fontSize:11,color:C.textDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.detail}</span></span>
                <span style={{fontSize:11,color:C.primary,fontWeight:900}}>Open</span>
              </button>
            ))}
          </div>}
      </Card>}
      {isAdmin&&overdueFollowups.length>0&&<Card style={{padding:14,marginBottom:14,borderColor:C.redBorder,background:C.redBg}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
          <div>
            <div style={{fontSize:14,fontWeight:900,color:C.red}}>Follow-ups overdue</div>
            <div style={{fontSize:12,color:C.textMid,marginTop:2}}>{overdueFollowups.slice(0,2).map(q=>q.buyerName||q.buyer_name).join(", ")}{overdueFollowups.length>2?" and more":""}</div>
          </div>
          <Btn size="sm" variant="red" onClick={()=>setPage("inquiries")}>Open</Btn>
        </div>
      </Card>}
      <PBar value={sc/b.includedScans*100} color={sc>=b.includedScans?C.red:sc/b.includedScans>0.8?C.amber:C.primary} h={8}/>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:6,marginBottom:14}}><span style={{fontSize:11,color:C.textDim}}>{sc}/{b.includedScans} scans</span><span style={{fontSize:11,fontWeight:700,color:C.amber}}>₹{b.total} due</span></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <button onClick={()=>setPage("scan")} disabled={paused} style={{background:paused?"#e2e8f0":`linear-gradient(135deg,${C.primary},${C.teal})`,border:"none",borderRadius:14,padding:"20px 16px",cursor:paused?"not-allowed":"pointer",textAlign:"left",WebkitTapHighlightColor:"transparent"}}>
          <div style={{fontSize:28,marginBottom:8}}>🔍</div><div style={{fontSize:15,fontWeight:800,color:paused?C.textDim:C.white}}>New Scan</div>
        </button>
        {isAdmin?
          <button onClick={openPortal} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 16px",cursor:"pointer",textAlign:"left",WebkitTapHighlightColor:"transparent"}}>
            <div style={{fontSize:28,marginBottom:8}}>🌐</div><div style={{fontSize:15,fontWeight:800,color:C.text}}>Public Inventory Preview</div>
          </button>:
          <button onClick={()=>setPage("history")} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 16px",cursor:"pointer",textAlign:"left",WebkitTapHighlightColor:"transparent"}}>
            <div style={{fontSize:28,marginBottom:8}}>📋</div><div style={{fontSize:15,fontWeight:800,color:C.text}}>Slab Certificates</div>
          </button>}
      </div>
      {today.length>0&&<Card>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={TEXT.itemTitle}>Today's Scans</div>
          <button onClick={()=>setPage("history")} style={{background:"none",border:"none",color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer"}}>All →</button>
        </div>
        {today.slice(0,5).map((r,i)=>{const g=gradeConf(r.grade);return(
          <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",borderBottom:i<Math.min(today.length,5)-1?`1px solid ${C.border}`:"none"}}>
            <div style={{width:38,height:38,borderRadius:8,background:g.bg,border:`1px solid ${g.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{g.emoji}</div>
            <div style={{flex:1,minWidth:0}}><div style={TEXT.itemTitle}>{r.stone}</div><div style={TEXT.tinyMeta}>{fmtT(r.ts)}</div></div>
            <span style={{...T.pill,color:g.color,background:g.bg,border:`1px solid ${g.border}`,padding:"3px 10px",borderRadius:20,flexShrink:0}}>{r.grade}</span>
          </div>
        );})}
      </Card>}
    </div>
  );
}

const PHOTO_SLOTS = [
  {id:"front",label:"Full slab",hint:"Entire slab in one frame",required:true},
  {id:"surface",label:"Surface close-up",hint:"Polish, stain, vein, color",required:true},
  {id:"edge",label:"Edge/corner",hint:"Thickness, chips, corner condition",required:true},
  {id:"defect",label:"Defect close-up",hint:"Required when defects are selected",required:false},
];

function FacScan({user,fac,paused,onSaved}) {
  const [step,setStep]=useState(0);
  const [form,setForm]=useState({stone:"makrana",supplierId:"",supplier:"",measurements:{thickness:"",length:"",width:"",polish:3,soundTest:"clear",edgeCondition:"good",surfaceFinish:"polished"},defects:[],exportReady:false,notes:""});
  const [grade,setGrade]=useState(null);const [loading,setLoading]=useState(false);const [saved,setSaved]=useState(false);
  const [photos,setPhotos]=useState({});
  const [photoSlot,setPhotoSlot]=useState("front");
  const [suppliers,setSuppliers]=useState([]);
  const [supplierMode,setSupplierMode]=useState("registered");
  const [quickSupplier,setQuickSupplier]=useState("");
  const [supplierBusy,setSupplierBusy]=useState(false);
  const [supplierErr,setSupplierErr]=useState("");
  const fileRef=useRef();const videoRef=useRef();const canvasRef=useRef();
  const [cameraOpen,setCameraOpen]=useState(false);const [cameraStream,setCameraStream]=useState(null);const [cameraError,setCameraError]=useState("");
  useEffect(()=>{if(fac)DB.facSuppliers(fac.id).then(setSuppliers);},[fac]);
  if(paused)return <div style={{textAlign:"center",padding:40}}><div style={{fontSize:48,marginBottom:12}}>🚫</div><div style={{fontSize:16,fontWeight:700}}>Account Paused</div></div>;

  const requiredPhotoSlots=PHOTO_SLOTS.filter(s=>s.required||(s.id==="defect"&&form.defects.length>0));
  const completePhotoSlots=requiredPhotoSlots.filter(s=>photos[s.id]?.src).length;
  const photoReady=completePhotoSlots===requiredPhotoSlots.length;
  const photoEvidence=PHOTO_SLOTS.map(s=>photos[s.id]?{slot:s.id,label:s.label,src:photos[s.id].src}:null).filter(Boolean);
  const selectedSupplier=suppliers.find(s=>s.id===form.supplierId);
  const supplierReady=supplierMode==="unknown"||(supplierMode==="registered"&&!!form.supplierId)||(supplierMode==="manual"&&!!form.supplier.trim());
  const supplierName=()=>supplierMode==="unknown"?"Unknown supplier":supplierMode==="registered"?(selectedSupplier?.name||""):form.supplier.trim();
  function setEvidencePhoto(slotId,src){setPhotos(p=>({...p,[slotId]:{src,label:PHOTO_SLOTS.find(s=>s.id===slotId)?.label||slotId}}));}
  function removeEvidencePhoto(slotId){setPhotos(p=>{const n={...p};delete n[slotId];return n;});}
  function chooseUpload(slotId){setPhotoSlot(slotId);setTimeout(()=>fileRef.current?.click(),0);}
  function chooseSupplierMode(mode){
    setSupplierMode(mode);setSupplierErr("");
    if(mode==="registered")setForm(p=>({...p,supplier:""}));
    if(mode==="manual")setForm(p=>({...p,supplierId:""}));
    if(mode==="unknown")setForm(p=>({...p,supplierId:"",supplier:"Unknown supplier"}));
  }
  async function addQuickSupplier(){
    const name=quickSupplier.trim();
    if(!name){setSupplierErr("Enter a supplier name.");return;}
    setSupplierBusy(true);setSupplierErr("");
    try {
      const s=await DB.createSupplier({name,contact:"",phone:"",location:"",notes:"Created during scan",factoryId:fac?.id});
      setSuppliers(prev=>[s,...prev]);
      setForm(p=>({...p,supplierId:s.id,supplier:""}));
      setSupplierMode("registered");
      setQuickSupplier("");
    } catch(e) {
      setSupplierErr(e.message||"Could not add supplier.");
    }
    setSupplierBusy(false);
  }

  async function openCamera(slotId=photoSlot){
    setPhotoSlot(slotId);
    setCameraError("");setCameraOpen(true);
    try {
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
      setCameraStream(stream);
      setTimeout(()=>{if(videoRef.current){videoRef.current.srcObject=stream;videoRef.current.play();}},100);
    } catch(e){setCameraError("Camera unavailable. Use upload instead.");setCameraOpen(false);}
  }
  function stopCamera(){if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());setCameraStream(null);}setCameraOpen(false);}
  function capturePhoto(){
    if(!videoRef.current||!canvasRef.current)return;
    const v=videoRef.current;const c=canvasRef.current;
    c.width=v.videoWidth;c.height=v.videoHeight;
    c.getContext("2d").drawImage(v,0,0);
    setEvidencePhoto(photoSlot,c.toDataURL("image/jpeg",0.85));
    stopCamera();
  }
  function toggleDefect(id){setForm(p=>({...p,defects:p.defects.includes(id)?p.defects.filter(d=>d!==id):[...p.defects,id]}));}
  function setMeas(k,v){setForm(p=>({...p,measurements:{...p.measurements,[k]:v}}));}

  async function gradeWithAI(){
    setLoading(true);setGrade(null);
    try {
      const res=await fetch("https://epistable-ai.elston55541.workers.dev/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:500,system:`You are Epistable, a stone slab grading expert. Grade as: Premium (₹${GRADES[0].price}/sqft), Standard (₹${GRADES[1].price}/sqft), Commercial (₹${GRADES[2].price}/sqft), or Rejected. Return ONLY JSON: {"grade":"Premium|Standard|Commercial|Rejected","reason":"1-2 sentences","pricePerSqFt":number,"exportReady":boolean,"tips":"1 tip"}`,messages:[{role:"user",content:`Stone: ${STONES.find(s=>s.id===form.stone)?.label||form.stone}\nSupplier: ${supplierName()||"Unknown"}\nThickness=${form.measurements.thickness}mm, Size=${form.measurements.length}×${form.measurements.width}cm, Polish=${form.measurements.polish}/5\nDefects: ${form.defects.join(", ")||"None"}\nNotes: ${form.notes||"None"}`}]})});
      const data=await res.json();
      let text=data.content?.[0]?.text||"{}";text=text.replace(/```json|```/g,"").trim();
      setGrade(JSON.parse(text));
    } catch(e){setGrade({grade:"Standard",reason:"AI unavailable. Default grade assigned.",pricePerSqFt:480,exportReady:false,tips:"Check connection."});}
    setLoading(false);
  }

  async function save(){
    if(!grade)return;
    const capturedSupplier=supplierName();
    const insp={id:genId("SLB"),userId:user.id,factoryId:user.factory_id,factoryName:user.factory_name||fac?.name,inspector:user.name,stone:STONES.find(s=>s.id===form.stone)?.label||form.stone,supplier:capturedSupplier,supplierId:supplierMode==="registered"?form.supplierId||null:null,grade:grade.grade,reason:grade.reason,pricePerSqFt:grade.pricePerSqFt,exportReady:grade.exportReady||form.exportReady,measurements:form.measurements,defects:form.defects,notes:form.notes,photo:photoEvidence[0]?.src||null,photos:photoEvidence,ts:Date.now(),date:fmtD(Date.now()),time:fmtT(Date.now())};
    await DB.saveInsp(insp);
    setSaved(true);
  }

  if(saved)return(
    <div style={{textAlign:"center",padding:"48px 24px"}}>
      <div style={{fontSize:64,marginBottom:16}}>{gradeConf(grade?.grade||"Standard").emoji}</div>
      <div style={{fontSize:24,fontWeight:800,marginBottom:4}}>{grade?.grade}</div>
      <div style={{fontSize:32,fontWeight:800,color:C.green,marginBottom:8}}>₹{grade?.pricePerSqFt}/sqft</div>
      <div style={{fontSize:13,color:C.textMid,marginBottom:24,lineHeight:1.6}}>{grade?.reason}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Btn variant="secondary" onClick={()=>{setStep(0);setForm({stone:"makrana",supplierId:"",supplier:"",measurements:{thickness:"",length:"",width:"",polish:3,soundTest:"clear",edgeCondition:"good",surfaceFinish:"polished"},defects:[],exportReady:false,notes:""});setSupplierMode("registered");setQuickSupplier("");setSupplierErr("");setGrade(null);setSaved(false);setPhotos({});setPhotoSlot("front");}}>New Scan</Btn>
        <Btn onClick={onSaved}>View History</Btn>
      </div>
    </div>
  );

  const steps=["Stone","Measurements","Defects","Grade"];
  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f){const r=new FileReader();r.onload=ev=>setEvidencePhoto(photoSlot,ev.target.result);r.readAsDataURL(f);}e.target.value="";}} style={{display:"none"}}/>
      <canvas ref={canvasRef} style={{display:"none"}}/>
      {cameraOpen&&<div style={{position:"fixed",inset:0,background:"#000",zIndex:500,display:"flex",flexDirection:"column"}}>
        <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <button onClick={stopCamera} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,color:"#fff",padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>✕ Cancel</button>
          <div style={{color:"#fff",fontSize:13,fontWeight:800}}>{PHOTO_SLOTS.find(s=>s.id===photoSlot)?.label}</div>
        </div>
        {cameraError?<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24,color:"#fff"}}>{cameraError}</div>:
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
          <video ref={videoRef} autoPlay playsInline muted style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        </div>}
        <div style={{padding:"20px",display:"flex",justifyContent:"center",flexShrink:0}}>
          <button onClick={capturePhoto} style={{width:72,height:72,borderRadius:"50%",background:"#fff",border:"4px solid rgba(255,255,255,0.4)",cursor:"pointer",fontSize:28,WebkitTapHighlightColor:"transparent"}}>📸</button>
        </div>
      </div>}
      <div style={{display:"flex",gap:4,marginBottom:20}}>
        {steps.map((s,i)=>(
          <div key={s} style={{flex:1,textAlign:"center"}}><div style={{height:4,borderRadius:2,background:i<=step?C.primary:C.border,marginBottom:4}}/><div style={{fontSize:10,color:i===step?C.primary:C.textDim,fontWeight:i===step?700:400}}>{s}</div></div>
        ))}
      </div>
      {step===0&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{fontSize:16,fontWeight:700}}>Stone Type</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {STONES.map(s=>(
            <button key={s.id} onClick={()=>setForm(p=>({...p,stone:s.id}))} style={{padding:"12px",background:form.stone===s.id?C.primaryBg:C.white,border:`2px solid ${form.stone===s.id?C.primary:C.border}`,borderRadius:10,cursor:"pointer",textAlign:"left",fontFamily:"sans-serif",WebkitTapHighlightColor:"transparent"}}>
              <div style={{fontSize:13,fontWeight:700,color:form.stone===s.id?C.primary:C.text}}>{s.label}</div>
            </button>
          ))}
        </div>
        <Card style={{padding:14,borderColor:supplierReady?C.greenBorder:C.amberBorder,background:supplierReady?C.white:C.amberBg}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:14,fontWeight:900}}>Supplier Source</div>
              <div style={{fontSize:11,color:C.textDim,marginTop:2}}>This powers supplier scorecards and purchasing decisions.</div>
            </div>
            <span style={{fontSize:11,fontWeight:900,color:supplierReady?C.green:C.amber}}>{supplierReady?"Captured":"Required"}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
            {[["registered","Registered"],["manual","Typed"],["unknown","Unknown"]].map(([mode,label])=>(
              <button key={mode} onClick={()=>chooseSupplierMode(mode)} style={{padding:"9px 6px",background:supplierMode===mode?C.primary:C.white,border:`1px solid ${supplierMode===mode?C.primary:C.border}`,borderRadius:8,color:supplierMode===mode?C.white:C.textMid,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"sans-serif"}}>{label}</button>
            ))}
          </div>
          {supplierMode==="registered"&&<>
            {suppliers.length>0?<Sel label="Select Supplier" value={form.supplierId} onChange={v=>setForm(p=>({...p,supplierId:v}))} options={[{value:"",label:"Select supplier..."},...suppliers.map(s=>({value:s.id,label:s.name}))]}/>
            :<div style={{fontSize:12,color:C.textMid,marginBottom:10}}>No registered suppliers yet. Add one below or use Typed/Unknown.</div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,marginTop:10}}>
              <input value={quickSupplier} onChange={e=>setQuickSupplier(e.target.value)} placeholder="Quick add supplier" style={{width:"100%",padding:"10px 12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"sans-serif"}}/>
              <Btn size="sm" variant="secondary" onClick={addQuickSupplier} disabled={supplierBusy}>{supplierBusy?"Adding...":"+ Add"}</Btn>
            </div>
          </>}
          {supplierMode==="manual"&&<Inp label="Supplier Name" value={form.supplier} onChange={v=>setForm(p=>({...p,supplier:v}))} placeholder="e.g. Shree Marble Exports" hint="This will appear under unregistered suppliers until added as a supplier record."/>}
          {supplierMode==="unknown"&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.textMid,fontWeight:700}}>Use only when the slab source is genuinely unavailable.</div>}
          {supplierErr&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 10px",fontSize:12,color:C.red,fontWeight:800,marginTop:10}}>{supplierErr}</div>}
        </Card>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <label style={{display:"block",fontSize:13,fontWeight:700}}>Photo Evidence</label>
            <span style={{fontSize:11,fontWeight:800,color:photoReady?C.green:C.amber}}>{completePhotoSlots}/{requiredPhotoSlots.length} required</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            {PHOTO_SLOTS.slice(0,3).map(slot=>(
              <div key={slot.id} style={{border:`1px solid ${photos[slot.id]?C.greenBorder:C.border}`,borderRadius:12,overflow:"hidden",background:photos[slot.id]?C.greenBg:C.white}}>
                <div style={{aspectRatio:"4/3",background:C.surface,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {photos[slot.id]?<img src={photos[slot.id].src} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>:<div style={{fontSize:11,color:C.textDim,fontWeight:700,textAlign:"center",padding:8}}>{slot.hint}</div>}
                  {photos[slot.id]&&<button onClick={()=>removeEvidencePhoto(slot.id)} style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,0.65)",border:"none",borderRadius:"50%",color:"#fff",width:22,height:22,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>}
                </div>
                <div style={{padding:9}}>
                  <div style={{fontSize:12,fontWeight:800,color:C.text,marginBottom:6}}>{photos[slot.id]?"✓ ":""}{slot.label}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    <button onClick={()=>openCamera(slot.id)} style={{padding:"7px",background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:8,color:C.primary,fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"sans-serif"}}>Camera</button>
                    <button onClick={()=>chooseUpload(slot.id)} style={{padding:"7px",background:C.white,border:`1px solid ${C.border}`,borderRadius:8,color:C.textMid,fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"sans-serif"}}>Upload</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Btn full onClick={()=>setStep(1)} disabled={!photoReady||!supplierReady}>Next → Measurements</Btn>
      </div>}
      {step===1&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{fontSize:16,fontWeight:700}}>Measurements</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          <Inp label="Thickness (mm)" value={form.measurements.thickness} onChange={v=>setMeas("thickness",v)} placeholder="20"/>
          <Inp label="Length (cm)" value={form.measurements.length} onChange={v=>setMeas("length",v)} placeholder="120"/>
          <Inp label="Width (cm)" value={form.measurements.width} onChange={v=>setMeas("width",v)} placeholder="60"/>
        </div>
        <div>
          <label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:8}}>Polish Level: {form.measurements.polish}/5</label>
          <input type="range" min={1} max={5} value={form.measurements.polish} onChange={e=>setMeas("polish",Number(e.target.value))} style={{width:"100%"}}/>
        </div>
        <Sel label="Sound Test" value={form.measurements.soundTest} onChange={v=>setMeas("soundTest",v)} options={[{value:"clear",label:"🔔 Clear"},{value:"dull",label:"💀 Dull"},{value:"hollow",label:"💨 Hollow"}]}/>
        <Sel label="Edge Condition" value={form.measurements.edgeCondition} onChange={v=>setMeas("edgeCondition",v)} options={[{value:"good",label:"✅ Good"},{value:"minor",label:"⚠️ Minor chips"},{value:"damaged",label:"❌ Damaged"}]}/>
        <Sel label="Surface Finish" value={form.measurements.surfaceFinish} onChange={v=>setMeas("surfaceFinish",v)} options={[{value:"polished",label:"Polished"},{value:"honed",label:"Honed"},{value:"brushed",label:"Brushed"},{value:"sandblasted",label:"Sandblasted"}]}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Btn variant="secondary" onClick={()=>setStep(0)}>← Back</Btn><Btn onClick={()=>setStep(2)}>Next → Defects</Btn></div>
      </div>}
      {step===2&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{fontSize:16,fontWeight:700}}>Defects Found</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {DEFECTS.map(d=>{const sel=form.defects.includes(d.id);return(
            <button key={d.id} onClick={()=>toggleDefect(d.id)} style={{padding:"12px",background:sel?"#fff3e0":C.white,border:`2px solid ${sel?d.color:C.border}`,borderRadius:10,cursor:"pointer",textAlign:"left",fontFamily:"sans-serif"}}>
              <div style={{fontSize:13,fontWeight:700,color:sel?d.color:C.text}}>{sel?"✓ ":""}{d.label}</div>
            </button>
          );})}
        </div>
        <button onClick={()=>setForm(p=>({...p,exportReady:!p.exportReady}))} style={{padding:"10px 18px",background:form.exportReady?C.greenBg:C.white,border:`2px solid ${form.exportReady?C.green:C.border}`,borderRadius:10,cursor:"pointer",fontWeight:600,fontSize:13,fontFamily:"sans-serif",color:form.exportReady?C.green:C.textMid,alignSelf:"flex-start"}}>{form.exportReady?"✅ Export Ready":"📦 Domestic Only"}</button>
        {form.defects.length>0&&<Card style={{padding:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:13,fontWeight:800}}>Defect close-up required</div>
              <div style={{fontSize:11,color:C.textDim,marginTop:2}}>Capture the most visible defect so buyers can verify the grade.</div>
            </div>
            <span style={{fontSize:11,fontWeight:800,color:photos.defect?C.green:C.red}}>{photos.defect?"Complete":"Missing"}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"120px 1fr",gap:10,alignItems:"stretch"}}>
            <div style={{aspectRatio:"1",background:C.surface,border:`1px solid ${photos.defect?C.greenBorder:C.border}`,borderRadius:10,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {photos.defect?<img src={photos.defect.src} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>:<span style={{fontSize:11,color:C.textDim,fontWeight:700,textAlign:"center",padding:8}}>Defect photo</span>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8,justifyContent:"center"}}>
              <button onClick={()=>openCamera("defect")} style={{padding:"10px",background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:8,color:C.primary,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"sans-serif"}}>Camera</button>
              <button onClick={()=>chooseUpload("defect")} style={{padding:"10px",background:C.white,border:`1px solid ${C.border}`,borderRadius:8,color:C.textMid,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"sans-serif"}}>Upload</button>
              {photos.defect&&<button onClick={()=>removeEvidencePhoto("defect")} style={{padding:"8px",background:"transparent",border:"none",color:C.red,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"sans-serif"}}>Remove</button>}
            </div>
          </div>
        </Card>}
        <div><label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:6}}>Notes</label><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={3} style={{width:"100%",padding:"12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:"sans-serif",resize:"none",outline:"none",boxSizing:"border-box"}}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Btn variant="secondary" onClick={()=>setStep(1)}>← Back</Btn><Btn disabled={!photoReady} onClick={()=>{setStep(3);gradeWithAI();}}>🤖 Grade with AI</Btn></div>
      </div>}
      {step===3&&<div>
        <div style={{fontSize:16,fontWeight:700,marginBottom:14}}>AI Grade Result</div>
        {loading?<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:48,marginBottom:16}}>🤖</div><div style={{fontSize:16,fontWeight:700}}>Analysing slab…</div></div>
        :grade?(()=>{const g=gradeConf(grade.grade);return(
          <div>
            <div style={{background:g.bg,border:`2px solid ${g.border}`,borderRadius:14,padding:"24px",textAlign:"center",marginBottom:14}}>
              <div style={{fontSize:52,marginBottom:8}}>{g.emoji}</div>
              <div style={{fontSize:26,fontWeight:800,color:g.color,marginBottom:4}}>{grade.grade}</div>
              <div style={{fontSize:32,fontWeight:800,color:C.green,marginBottom:8}}>₹{grade.pricePerSqFt}<span style={{fontSize:16,fontWeight:400,color:C.textDim}}>/sqft</span></div>
            </div>
            <Card style={{padding:16,marginBottom:12}}>
              <div style={{fontSize:13,color:C.text,lineHeight:1.6,marginBottom:8}}>{grade.reason}</div>
              {grade.tips&&<div style={{background:C.primaryBg,borderRadius:8,padding:"10px 14px",fontSize:12,color:C.primary}}>💡 {grade.tips}</div>}
            </Card>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {GRADES.map(g=>(
                <button key={g.id} onClick={()=>setGrade({...grade,grade:g.id,pricePerSqFt:g.price})} style={{padding:"8px 4px",background:grade.grade===g.id?g.bg:C.white,border:`2px solid ${grade.grade===g.id?g.border:C.border}`,borderRadius:10,cursor:"pointer",fontFamily:"sans-serif",textAlign:"center"}}>
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

function FactorySlabDetailModal({slab,onClose,onQr,onStatus}) {
  const [copied,setCopied]=useState(false);
  const [statusBusy,setStatusBusy]=useState(false);
  const g=gradeConf(slab.grade);
  const measurements=slab.measurements||{};
  const defects=Array.isArray(slab.defects)?slab.defects:[];
  const photos=(Array.isArray(slab.photos)?slab.photos:[]).map((p,idx)=>typeof p==="string"?{src:p,label:idx===0?"Primary photo":`Evidence ${idx+1}`}:p).filter(p=>p?.src);
  const certificateUrl=`${window.location.origin}/slab/${encodeURIComponent(slab.id)}`;
  async function copyLink(){
    try {
      await navigator.clipboard.writeText(certificateUrl);
      setCopied(true);
      setTimeout(()=>setCopied(false),1500);
    } catch(e) {
      window.prompt("Copy certificate link",certificateUrl);
    }
  }
  async function changeStatus(status){
    if(status===(slab.inventoryStatus||"available")||statusBusy)return;
    setStatusBusy(true);
    await onStatus?.(slab,status);
    setStatusBusy(false);
  }
  return (
    <Modal title="Slab Details" onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{background:g.bg,border:`1px solid ${g.border}`,borderRadius:12,padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:10}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:11,fontFamily:"monospace",color:C.textDim,marginBottom:4}}>{slab.id}</div>
              <div style={{fontSize:18,fontWeight:900,color:C.text,marginBottom:3}}>{slab.stone}</div>
              <div style={{fontSize:12,color:C.textMid}}>{slab.date} · {slab.time}</div>
            </div>
            <span style={{fontSize:12,fontWeight:900,color:g.color,background:C.white,border:`1px solid ${g.border}`,borderRadius:20,padding:"5px 10px",flexShrink:0}}>{slab.grade}</span>
          </div>
          <div style={{fontSize:24,fontWeight:900,color:C.green}}>Rs {slab.pricePerSqFt||0}<span style={{fontSize:12,fontWeight:600,color:C.textDim}}> / sq ft</span></div>
        </div>
        <Card style={{padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:14,fontWeight:900}}>Inventory Status</div>
              <div style={{fontSize:11,color:C.textDim,marginTop:2}}>Controls whether buyers should treat this slab as purchasable.</div>
            </div>
            <InventoryPill status={slab.inventoryStatus}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {Object.entries(INV_STATUS).map(([id,c])=>(
              <button key={id} disabled={statusBusy} onClick={()=>changeStatus(id)} style={{padding:"9px 6px",background:(slab.inventoryStatus||"available")===id?c.bg:C.white,border:`1px solid ${(slab.inventoryStatus||"available")===id?c.border:C.border}`,borderRadius:8,color:(slab.inventoryStatus||"available")===id?c.color:C.textMid,fontSize:12,fontWeight:900,cursor:statusBusy?"not-allowed":"pointer",fontFamily:"sans-serif"}}>{c.label}</button>
            ))}
          </div>
        </Card>
        {(slab.photo||photos.length>0)&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {[slab.photo?{src:slab.photo,label:"Primary"}:null,...photos].filter(Boolean).slice(0,6).map((p,idx)=>(
            <div key={idx} style={{position:"relative",borderRadius:10,overflow:"hidden",border:`1px solid ${C.border}`,aspectRatio:"1"}}>
              <img src={p.src} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
              {p.label&&<div style={{position:"absolute",left:4,right:4,bottom:4,background:"rgba(0,0,0,0.62)",borderRadius:5,padding:"3px 4px",fontSize:9,fontWeight:800,color:"#fff",textAlign:"center"}}>{p.label}</div>}
            </div>
          ))}
        </div>}
        <Card style={{padding:14}}>
          <div style={{fontSize:14,fontWeight:900,marginBottom:8}}>Inspection</div>
          {[["Supplier",slab.supplier],["Inspector",slab.inspector],["Thickness",measurements.thickness?`${measurements.thickness} mm`:""],["Size",measurements.length&&measurements.width?`${measurements.length} x ${measurements.width} cm`:""],["Sound",measurements.soundTest],["Edge",measurements.edgeCondition],["Finish",measurements.surfaceFinish],["Export Ready",slab.exportReady?"Yes":"No"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",gap:10,padding:"7px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:12,color:C.textDim,fontWeight:700}}>{l}</span><span style={{fontSize:12,color:C.text,fontWeight:800,textAlign:"right"}}>{v||"Not recorded"}</span></div>
          ))}
        </Card>
        <Card style={{padding:14}}>
          <div style={{fontSize:14,fontWeight:900,marginBottom:8}}>Grade Reason</div>
          <div style={{fontSize:13,lineHeight:1.6,color:C.textMid}}>{slab.reason||"No reason recorded."}</div>
          {defects.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10}}>{defects.map(d=><span key={d} style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:20,padding:"4px 9px",fontSize:11,fontWeight:800,color:C.amber,textTransform:"capitalize"}}>{d}</span>)}</div>}
          {slab.notes&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 10px",fontSize:12,color:C.textMid,lineHeight:1.5,marginTop:10}}>{slab.notes}</div>}
        </Card>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Btn variant="secondary" onClick={copyLink}>{copied?"Copied":"Copy Link"}</Btn>
          <Btn variant="secondary" onClick={onQr}>Share QR</Btn>
          <Btn style={{gridColumn:"1 / -1"}} onClick={()=>window.open(certificateUrl,"_blank","noopener,noreferrer")}>View Certificate</Btn>
        </div>
      </div>
    </Modal>
  );
}

function FacHistory({insps}) {
  const [search,setSearch]=useState("");const [filterG,setFilterG]=useState("All");const [qrSlab,setQrSlab]=useState(null);const [detailSlab,setDetailSlab]=useState(null);
  const [statusOverrides,setStatusOverrides]=useState({});
  const withStatus=insps.map(i=>({...i,inventoryStatus:statusOverrides[i.id]||i.inventoryStatus||"available"}));
  const filtered=withStatus.filter(i=>(filterG==="All"||i.grade===filterG)&&(!search||i.stone?.toLowerCase().includes(search.toLowerCase())||i.id?.toLowerCase().includes(search.toLowerCase())));
  async function updateStatus(slab,status){
    await DB.updInspStatus(slab.id,status);
    setStatusOverrides(p=>({...p,[slab.id]:status}));
    setDetailSlab(p=>p?.id===slab.id?{...p,inventoryStatus:status}:p);
  }
  return (
    <div>
      {qrSlab&&<SlabQRModal slab={qrSlab} onClose={()=>setQrSlab(null)}/>}
      {detailSlab&&<FactorySlabDetailModal slab={detailSlab} onClose={()=>setDetailSlab(null)} onStatus={updateStatus} onQr={()=>{setQrSlab(detailSlab);setDetailSlab(null);}}/>}
      <div style={TEXT.pageTitle}>Scan History</div>
      <div style={{marginBottom:10}}><Inp value={search} onChange={setSearch} placeholder="Search stone, slab ID…" icon="🔍"/></div>
      <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:14}}>
        {["All",...GRADES.map(g=>g.id)].map(f=>(
          <button key={f} onClick={()=>setFilterG(f)} style={{padding:"6px 14px",background:filterG===f?C.primary:C.white,border:`1px solid ${filterG===f?C.primary:C.border}`,borderRadius:20,color:filterG===f?C.white:C.textMid,fontSize:12,fontWeight:filterG===f?700:400,cursor:"pointer",fontFamily:"sans-serif",whiteSpace:"nowrap",flexShrink:0}}>{f}</button>
        ))}
      </div>
      {filtered.length===0?<Card style={{padding:"48px",textAlign:"center"}}><div style={{fontSize:48,marginBottom:12}}>📋</div><div style={{fontWeight:600}}>No inspections yet</div></Card>:
      <Card>{filtered.map((r,i)=>{const g=gradeConf(r.grade);return(
        <div key={r.id} onClick={()=>setDetailSlab(r)} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none",cursor:"pointer"}}>
          {r.photo?<div style={{width:44,height:44,borderRadius:8,overflow:"hidden",flexShrink:0}}><img src={r.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>:
          <div style={{width:44,height:44,borderRadius:8,background:g.bg,border:`1px solid ${g.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{g.emoji}</div>}
          <div style={{flex:1,minWidth:0}}><div style={TEXT.itemTitle}>{r.stone}</div><div style={TEXT.tinyMeta}>{r.date} · {r.time}</div></div>
          <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end",flexShrink:0}}>
            <span style={{...T.pill,color:g.color,background:g.bg,border:`1px solid ${g.border}`,padding:"3px 10px",borderRadius:20}}>{r.grade}</span>
            <InventoryPill status={r.inventoryStatus}/>
            <button onClick={e=>{e.stopPropagation();setQrSlab(r);}} style={{fontSize:10,fontWeight:600,color:C.primary,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:6,padding:"2px 8px",cursor:"pointer",fontFamily:"sans-serif"}}>🔲 QR</button>
          </div>
        </div>
      );})}
      </Card>}
    </div>
  );
}

function FacAnalytics({insps}) {
  const byG=g=>insps.filter(i=>i.grade===g).length;
  const total=insps.length;const pp=total?Math.round(byG("Premium")/total*100):0;
  const today=insps.filter(i=>Date.now()-i.ts<86400000).length;
  const week=insps.filter(i=>Date.now()-i.ts<7*86400000).length;
  const defectMap={};insps.forEach(i=>(i.defects||[]).forEach(d=>{defectMap[d]=(defectMap[d]||0)+1;}));
  const topDefects=Object.entries(defectMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  return (
    <div>
      <div style={{...TEXT.pageHeader,marginBottom:16}}>Analytics</div>
      <KpiGrid items={[{label:"Today",value:today,icon:"📅",color:C.primary},{label:"This Week",value:week,icon:"📆",color:C.teal},{label:"Premium Rate",value:pp+"%",icon:"🏆",color:C.green},{label:"Total",value:total,icon:"📦",color:C.text}]}/>
      <Card style={{marginBottom:14}}>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,...TEXT.panelTitle}}>Grade Distribution</div>
        <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
          {GRADES.map(g=>{const count=byG(g.id);const pct=total?Math.round(count/total*100):0;return(
            <div key={g.id}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={TEXT.itemTitle}>{g.emoji} {g.id}</span><span style={{...TEXT.itemTitle,color:g.color}}>{count} ({pct}%)</span></div><PBar value={pct} color={g.color}/></div>
          );})}
        </div>
      </Card>
      {topDefects.length>0&&<Card>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,...TEXT.panelTitle}}>Top Defects</div>
        <div style={{padding:16,display:"flex",flexDirection:"column",gap:10}}>
          {topDefects.map(([d,cnt])=>(
            <div key={d} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:13,fontWeight:600,textTransform:"capitalize"}}>{d}</span>
              <span style={{fontSize:12,fontWeight:700,color:C.amber}}>{cnt}</span>
            </div>
          ))}
        </div>
      </Card>}
    </div>
  );
}

function FacTeam({fac,actor,activity=[],onActivity}) {
  const [users,setUsers]=useState([]);
  const [manage,setManage]=useState(null);
  const [search,setSearch]=useState("");
  async function load(){
    const u=await DB.facUsers(fac?.id||"");
    setUsers((u||[]).filter(x=>x.role!=="owner"));
  }
  useEffect(()=>{load();},[fac?.id]);
  async function saveUser(user,updates){
    await DB.updUser(user.id,{...updates,factory_id:fac.id,factory_name:fac.name});
    await DB.addActivity(activityForProfile(updates.status==="suspended"?"profile_suspended":user.status==="suspended"&&updates.status==="active"?"profile_restored":"profile_updated",actor,{...user,...updates,factory_id:fac.id,factory_name:fac.name},{role:updates.role,status:updates.status}));
    setUsers(prev=>prev.map(u=>u.id===user.id?{...u,...updates,factory_id:fac.id,factory_name:fac.name}:u));
    onActivity?.();
  }
  const filtered=users.filter(u=>!search||u.name?.toLowerCase().includes(search.toLowerCase())||u.email?.toLowerCase().includes(search.toLowerCase())||u.role?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      {manage&&<UserAccessModal user={manage} facs={[fac]} onClose={()=>setManage(null)} onSave={saveUser}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={TEXT.pageHeader}>Team Access</div><div style={TEXT.meta}>{users.length} profiles</div></div>
        <Btn size="sm" variant="secondary" onClick={load}>↺</Btn>
      </div>
      <div style={{marginBottom:12}}><Inp value={search} onChange={setSearch} placeholder="Search team, buyers, roles..." icon="🔍"/></div>
      {filtered.length===0?<Card style={{padding:"40px",textAlign:"center"}}><div style={{fontSize:32,marginBottom:12}}>👥</div><div style={{fontWeight:600}}>No profiles found</div></Card>:
      <Card>{filtered.map((u,i)=>(
        <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none"}}>
          <Avi initials={u.avatar||u.name?.slice(0,2).toUpperCase()||"??"} size={36}/>
          <div style={{flex:1,minWidth:0}}><div style={TEXT.itemTitle}>{u.name}</div><div style={{...TEXT.tinyMeta,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email}{u.company?" · "+u.company:""}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            <span style={{fontSize:10,fontWeight:600,color:C.primary,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,padding:"3px 9px",borderRadius:20,textTransform:"capitalize"}}>{u.role}</span>
            <StatPill status={u.status||"active"}/>
            <Btn size="sm" variant="secondary" onClick={()=>setManage(u)}>Manage</Btn>
          </div>
        </div>
      ))}</Card>}
      <ActivityList items={activity} compact/>
    </div>
  );
}

function FacSuppliers({fac}) {
  const [suppliers,setSuppliers]=useState([]);const [insps,setInsps]=useState([]);const [show,setShow]=useState(false);const [sel,setSel]=useState(null);
  const [windowDays,setWindowDays]=useState("90");const [sortBy,setSortBy]=useState("score");
  const [cleanup,setCleanup]=useState({name:"",supplierId:"",busy:false,error:""});
  const [form,setForm]=useState({name:"",contact:"",phone:"",location:"",notes:""});
  async function load(){const [s,i]=await Promise.all([DB.facSuppliers(fac?.id||""),DB.facInsps(fac?.id||"")]);setSuppliers(s);setInsps(i);}
  useEffect(()=>{load();},[fac?.id]);
  async function create(){if(!form.name)return;await DB.createSupplier({...form,factoryId:fac?.id});setForm({name:"",contact:"",phone:"",location:"",notes:""});setShow(false);load();}
  const normalize=v=>(v||"").trim().toLowerCase();
  const cutoff=windowDays==="all"?0:Date.now()-(Number(windowDays)||90)*86400000;
  const trackedInsps=insps.filter(i=>(i.supplierId||i.supplier)&&(windowDays==="all"||i.ts>=cutoff));
  const supplierNames=new Set(suppliers.map(s=>normalize(s.name)));
  function supplierRows(s){
    if(s._manual)return trackedInsps.filter(i=>!i.supplierId&&i.supplier&&!supplierNames.has(normalize(i.supplier)));
    return trackedInsps.filter(i=>i.supplierId===s.id||(!i.supplierId&&normalize(i.supplier)===normalize(s.name)));
  }
  function statsFor(s){
    const rows=supplierRows(s);
    const total=rows.length;
    const byG=g=>rows.filter(i=>i.grade===g).length;
    const premium=byG("Premium");const standard=byG("Standard");const commercial=byG("Commercial");const rejected=byG("Rejected");
    const premiumPct=total?Math.round(premium/total*100):0;
    const standardPct=total?Math.round(standard/total*100):0;
    const commercialPct=total?Math.round(commercial/total*100):0;
    const rejectPct=total?Math.round(rejected/total*100):0;
    const exportReady=rows.filter(i=>i.exportReady).length;
    const exportReadyPct=total?Math.round(exportReady/total*100):0;
    const defectSlabs=rows.filter(i=>(i.defects||[]).length>0).length;
    const defectRate=total?Math.round(defectSlabs/total*100):0;
    const avgPrice=total?Math.round(rows.reduce((sum,i)=>sum+(Number(i.pricePerSqFt)||0),0)/total):0;
    const volumeBonus=Math.min(10,Math.round(total/5));
    const score=total?Math.min(100,Math.max(0,Math.round((premiumPct*0.75)+(standardPct*0.28)+(exportReadyPct*0.12)+volumeBonus-(rejectPct*0.7)-(defectRate*0.22)))):0;
    const defects={};rows.forEach(i=>(i.defects||[]).forEach(d=>{defects[d]=(defects[d]||0)+1;}));
    const topDefects=Object.entries(defects).sort((a,b)=>b[1]-a[1]).slice(0,4);
    const recent=rows.slice(0,6);
    const lastScan=rows[0]?.ts||null;
    const risk=total===0?{label:"No Data",color:C.textDim,bg:C.surface,border:C.border}
      :rejectPct>=20||defectRate>=55?{label:"Review",color:C.red,bg:C.redBg,border:C.redBorder}
      :score>=70&&rejectPct<=8?{label:"Preferred",color:C.green,bg:C.greenBg,border:C.greenBorder}
      :{label:"Monitor",color:C.amber,bg:C.amberBg,border:C.amberBorder};
    const recommendation=total===0?"Scan slabs from this supplier to build a reliable scorecard."
      :rejectPct>=20?"Review recent rejected slabs before placing the next order."
      :defectRate>=45?"Ask for tighter pre-dispatch checks around the recurring defects."
      :premiumPct>=55&&rejectPct<=8?"Prioritize this supplier for premium/export-ready orders."
      :"Keep monitoring before changing purchasing preference.";
    return {rows,total,premium,standard,commercial,premiumPct,standardPct,commercialPct,rejected,rejectPct,exportReadyPct,defectRate,avgPrice,score,topDefects,recent,lastScan,risk,recommendation};
  }
  const manualSupplier={id:"manual-suppliers",name:"Unregistered Suppliers",location:"Manual scan entries",contact:"Add suppliers to separate these",_manual:true};
  const manualStats=statsFor(manualSupplier);
  const scorecards=[...suppliers,...(manualStats.total>0?[manualSupplier]:[])].map(s=>({...s,_stats:statsFor(s)}));
  const ranked=[...scorecards].sort((a,b)=>{
    if(sortBy==="premium")return b._stats.premiumPct-a._stats.premiumPct||b._stats.total-a._stats.total;
    if(sortBy==="reject")return b._stats.rejectPct-a._stats.rejectPct||b._stats.rejected-a._stats.rejected;
    if(sortBy==="volume")return b._stats.total-a._stats.total||b._stats.score-a._stats.score;
    return b._stats.score-a._stats.score||b._stats.total-a._stats.total;
  });
  const scored=ranked.filter(s=>s._stats.total>0);
  const best=scored[0];
  const mostScanned=[...ranked].sort((a,b)=>b._stats.total-a._stats.total)[0];
  const mostRejected=[...scored].sort((a,b)=>b._stats.rejectPct-a._stats.rejectPct||b._stats.rejected-a._stats.rejected)[0];
  const totalSupplierScans=trackedInsps.length;
  const manualGroups=Object.values(supplierRows(manualSupplier).reduce((acc,row)=>{
    const name=row.supplier||"Unknown supplier";
    const key=normalize(name);
    if(!acc[key])acc[key]={name,rows:[]};
    acc[key].rows.push(row);
    return acc;
  },{})).sort((a,b)=>b.rows.length-a.rows.length||a.name.localeCompare(b.name));
  async function cleanupManualSupplier(group,mode){
    setCleanup(p=>({...p,name:group.name,busy:true,error:""}));
    try {
      const supplier=mode==="create"
        ? await DB.createSupplier({name:group.name,contact:"",phone:"",location:"",notes:"Created from unregistered scan cleanup",factoryId:fac?.id})
        : suppliers.find(s=>s.id===cleanup.supplierId);
      if(!supplier)throw new Error("Select a supplier to link.");
      await DB.linkInspectionsToSupplier(group.rows.map(r=>r.id),supplier);
      setCleanup({name:"",supplierId:"",busy:false,error:""});
      await load();
      setSel(null);
    } catch(e) {
      setCleanup(p=>({...p,busy:false,error:e.message||"Could not clean up supplier scans."}));
    }
  }
  return (
    <div>
      {show&&<Modal title="Add Supplier" onClose={()=>setShow(false)}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Inp label="Supplier Name" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required/>
          <Inp label="Contact Person" value={form.contact} onChange={v=>setForm(p=>({...p,contact:v}))}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Phone" value={form.phone} onChange={v=>setForm(p=>({...p,phone:v}))}/>
            <Inp label="Location" value={form.location} onChange={v=>setForm(p=>({...p,location:v}))}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Btn variant="secondary" onClick={()=>setShow(false)}>Cancel</Btn><Btn onClick={create} disabled={!form.name}>Add</Btn></div>
        </div>
      </Modal>}
      {sel&&(()=>{const st=sel._stats;return <Modal title={sel.name+" Scorecard"} onClose={()=>setSel(null)}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
          {[["Score",st.score,C.primary],["Premium",st.premiumPct+"%",C.green],["Reject",st.rejectPct+"%",C.red]].map(([l,v,c])=>(
            <div key={l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:10,textAlign:"center"}}><div style={{fontSize:18,fontWeight:900,color:c}}>{v}</div><div style={{fontSize:10,color:C.textDim,fontWeight:700}}>{l}</div></div>
          ))}
        </div>
        <div style={{background:st.risk.bg,border:`1px solid ${st.risk.border}`,borderRadius:10,padding:"10px 12px",fontSize:12,fontWeight:800,color:st.risk.color,marginBottom:12}}>{st.risk.label}: {st.recommendation}</div>
        {sel._manual&&<Card style={{padding:14,marginBottom:12,borderColor:C.amberBorder}}>
          <div style={{fontSize:14,fontWeight:900,marginBottom:4}}>Clean Up Typed Supplier Names</div>
          <div style={{fontSize:12,color:C.textDim,lineHeight:1.5,marginBottom:12}}>Convert typed scan entries into registered suppliers so future scorecards stay accurate.</div>
          {cleanup.error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 10px",fontSize:12,color:C.red,fontWeight:800,marginBottom:10}}>{cleanup.error}</div>}
          {manualGroups.map(group=>(
            <div key={group.name} style={{border:`1px solid ${C.border}`,borderRadius:10,padding:10,marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:10,marginBottom:8}}>
                <div style={{minWidth:0}}><div style={{fontSize:13,fontWeight:900,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{group.name}</div><div style={{fontSize:11,color:C.textDim}}>{group.rows.length} scan{group.rows.length===1?"":"s"} to clean up</div></div>
                <Btn size="sm" variant="ghost" disabled={cleanup.busy&&cleanup.name===group.name} onClick={()=>cleanupManualSupplier(group,"create")}>{cleanup.busy&&cleanup.name===group.name?"Working...":"Create"}</Btn>
              </div>
              {suppliers.length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8}}>
                <select value={cleanup.name===group.name?cleanup.supplierId:""} onChange={e=>setCleanup({name:group.name,supplierId:e.target.value,busy:false,error:""})} style={{width:"100%",padding:"9px 10px",background:C.white,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,fontFamily:"sans-serif",minWidth:0}}>
                  <option value="">Link to existing...</option>
                  {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <Btn size="sm" variant="secondary" disabled={cleanup.busy||cleanup.name!==group.name||!cleanup.supplierId} onClick={()=>cleanupManualSupplier(group,"link")}>Link</Btn>
              </div>}
            </div>
          ))}
        </Card>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
          {[["Defect Rate",st.defectRate+"%",C.amber],["Export Ready",st.exportReadyPct+"%",C.teal],["Avg Price","Rs "+st.avgPrice,C.green]].map(([l,v,c])=>(
            <div key={l} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:10,textAlign:"center"}}><div style={{fontSize:15,fontWeight:900,color:c}}>{v}</div><div style={{fontSize:10,color:C.textDim,fontWeight:700}}>{l}</div></div>
          ))}
        </div>
        <Card style={{padding:14,marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:900,marginBottom:10}}>Grade Distribution</div>
          {GRADES.map(g=>{const count=st.rows.filter(i=>i.grade===g.id).length;const pct=st.total?Math.round(count/st.total*100):0;return(
            <div key={g.id} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:800,marginBottom:4}}><span>{g.id}</span><span style={{color:g.color}}>{count} ({pct}%)</span></div><PBar value={pct} color={g.color}/></div>
          );})}
        </Card>
        <Card style={{padding:14,marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:900,marginBottom:10}}>Top Defects</div>
          {st.topDefects.length===0?<div style={{fontSize:13,color:C.green,fontWeight:800}}>No defects recorded</div>:st.topDefects.map(([d,c])=>(
            <div key={d} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"7px 0",borderBottom:`1px solid ${C.border}`}}><span style={{textTransform:"capitalize",fontWeight:700}}>{d}</span><span style={{fontWeight:900,color:C.amber}}>{c}</span></div>
          ))}
        </Card>
        <Card style={{padding:14}}>
          <div style={{fontSize:14,fontWeight:900,marginBottom:10}}>Recent Slabs</div>
          {st.recent.length===0?<div style={{fontSize:13,color:C.textDim}}>No inspections yet.</div>:st.recent.map((r,i)=>{const g=gradeConf(r.grade);return(
            <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:i<st.recent.length-1?`1px solid ${C.border}`:"none"}}>
              <div style={{width:34,height:34,borderRadius:8,background:g.bg,border:`1px solid ${g.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{g.emoji}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:800}}>{r.stone}</div><div style={{fontSize:10,color:C.textDim}}>{r.date} · {r.id}</div></div>
              <span style={{fontSize:10,fontWeight:900,color:g.color,background:g.bg,border:`1px solid ${g.border}`,borderRadius:20,padding:"3px 8px"}}>{r.grade}</span>
            </div>
          );})}
        </Card>
      </Modal>;})()}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={TEXT.pageHeader}>Supplier Scorecards</div><div style={TEXT.meta}>{suppliers.length} registered suppliers</div></div>
        <div style={{display:"flex",gap:8}}><Btn size="sm" variant="secondary" onClick={load}>Refresh</Btn><Btn size="sm" onClick={()=>setShow(true)}>+ Add</Btn></div>
      </div>
      {scorecards.length>0&&<KpiGrid items={[
        {label:"Best Score",value:best?best._stats.score:"-",icon:"Top",color:C.green},
        {label:"Most Scanned",value:mostScanned?mostScanned._stats.total:0,icon:"Vol",color:C.primary},
        {label:"Reject Watch",value:mostRejected?mostRejected._stats.rejectPct+"%":"0%",icon:"Risk",color:C.red},
        {label:"Supplier Scans",value:totalSupplierScans,icon:"Scan",color:C.teal},
      ]}/>}
      <Card style={{padding:12,marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Sel label="Scan Window" value={windowDays} onChange={setWindowDays} options={[{value:"30",label:"Last 30 days"},{value:"90",label:"Last 90 days"},{value:"180",label:"Last 180 days"},{value:"all",label:"All time"}]}/>
          <Sel label="Rank By" value={sortBy} onChange={setSortBy} options={[{value:"score",label:"Quality score"},{value:"premium",label:"Premium rate"},{value:"reject",label:"Rejection risk"},{value:"volume",label:"Scan volume"}]}/>
        </div>
      </Card>
      {scorecards.length===0?<Card style={{padding:"48px",textAlign:"center"}}><div style={{fontSize:32,fontWeight:900,marginBottom:12}}>Suppliers</div><Btn onClick={()=>setShow(true)}>+ Add First Supplier</Btn></Card>:
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {ranked.map(s=>{const st=s._stats;return(
          <Card key={s.id} style={{padding:14,cursor:"pointer"}} onClick={()=>setSel(s)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:10}}>
              <div style={{minWidth:0}}><div style={{fontSize:14,fontWeight:900,marginBottom:2}}>{s.name}</div><div style={{fontSize:11,color:C.textDim}}>{s.location||"—"} · {s.contact||"—"}</div></div>
              <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:18,fontWeight:900,color:st.risk.color}}>{st.score}</div><div style={{fontSize:10,color:C.textDim,fontWeight:700}}>Score</div></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:10}}>
              {[["Scans",st.total,C.primary],["Premium",st.premiumPct+"%",C.green],["Reject",st.rejectPct+"%",C.red],["Defects",st.defectRate+"%",C.amber]].map(([l,v,c])=><div key={l} style={{background:C.surface,borderRadius:8,padding:8,textAlign:"center"}}><div style={{fontSize:14,fontWeight:900,color:c}}>{v}</div><div style={{fontSize:10,color:C.textDim,fontWeight:700}}>{l}</div></div>)}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:st.topDefects.length>0?10:0}}>
              <span style={{background:st.risk.bg,border:`1px solid ${st.risk.border}`,borderRadius:20,padding:"3px 9px",fontSize:10,fontWeight:900,color:st.risk.color}}>{st.risk.label}</span>
              <span style={{fontSize:10,fontWeight:700,color:C.textDim}}>{st.lastScan?`Last scan ${fmtD(st.lastScan)}`:"No scans yet"}</span>
            </div>
            {st.topDefects.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {st.topDefects.map(([d,c])=><span key={d} style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:20,padding:"3px 8px",fontSize:10,fontWeight:800,color:C.amber,textTransform:"capitalize"}}>{d} · {c}</span>)}
            </div>}
          </Card>
        );})}
      </div>}
    </div>
  );
}

function FacBuyers({fac,actor,onActivity}) {
  const [buyers,setBuyers]=useState([]);const [show,setShow]=useState(false);const [manage,setManage]=useState(null);
  async function load(){const b=await DB.facBuyers(fac?.id||"");setBuyers(b);}
  useEffect(()=>{load();},[fac?.id]);
  async function createBuyer(form){
    const b=await DB.createBuyer({name:form.name,email:form.email,authUserId:form.authUserId,company:form.company||"",factoryId:fac.id,factoryName:fac.name});
    await DB.addActivity(activityForProfile("profile_created",actor,b,{role:"buyer",status:b.status}));
    setBuyers(prev=>prev.some(x=>x.id===b.id)?prev:[b,...prev]);
    return b;
  }
  function closeAfterCreate(){
    setShow(false);
    load();
  }
  async function saveBuyer(buyer,updates){
    await DB.updUser(buyer.id,{...updates,role:"buyer",factory_id:fac.id,factory_name:fac.name});
    await DB.addActivity(activityForProfile(updates.status==="suspended"?"profile_suspended":buyer.status==="suspended"&&updates.status==="active"?"profile_restored":"profile_updated",actor,{...buyer,...updates,role:"buyer",factory_id:fac.id,factory_name:fac.name},{role:"buyer",status:updates.status}));
    setBuyers(prev=>prev.map(b=>b.id===buyer.id?{...b,...updates,role:"buyer",factory_id:fac.id,factory_name:fac.name}:b));
    onActivity?.();
  }
  return (
    <div>
{show&&<UserFormModal title={"Add Buyer — "+fac?.name} isBuyer onClose={()=>setShow(false)} onDone={closeAfterCreate} onSubmit={createBuyer}/>}      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={TEXT.pageHeader}>Buyers</div><div style={TEXT.meta}>{buyers.length} accounts</div></div>
        <Btn size="sm" variant="secondary" onClick={load}>↺</Btn> <Btn size="sm" onClick={()=>setShow(true)}>+ Add Buyer</Btn>
      </div>
      {manage&&<UserAccessModal user={manage} facs={[fac]} fixedRole="buyer" onClose={()=>setManage(null)} onSave={saveBuyer}/>}
      {buyers.length===0?<Card style={{padding:"40px",textAlign:"center"}}><div style={{fontSize:36,marginBottom:12}}>🌐</div><Btn onClick={()=>setShow(true)}>+ Add First Buyer</Btn></Card>:
      <Card>{buyers.map((b,i)=>(
        <div key={b.id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<buyers.length-1?`1px solid ${C.border}`:"none"}}>
          <Avi initials={b.name.slice(0,2).toUpperCase()} size={36} color={C.teal} bg="#e0f7fa" border="#80deea"/>
          <div style={{flex:1,minWidth:0}}><div style={TEXT.itemTitle}>{b.name}</div><div style={TEXT.tinyMeta}>{b.company?b.company+" · ":""}{b.email}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            <StatPill status={b.status||"active"}/>
            <Btn size="sm" variant="secondary" onClick={()=>setManage(b)}>Manage</Btn>
          </div>
        </div>
      ))}</Card>}
    </div>
  );
}

function FacInquiries({fac,onChange}) {
  const [inquiries,setInquiries]=useState([]);const [sel,setSel]=useState(null);
  const [follow,setFollow]=useState({priority:"warm",factoryNotes:"",followUpDate:""});
  const [quote,setQuote]=useState({areaSqFt:"",validityDate:"",notes:""});
  const [quoteBusy,setQuoteBusy]=useState(false);
  const [search,setSearch]=useState("");
  const [statusFilter,setStatusFilter]=useState("all");
  const [priorityFilter,setPriorityFilter]=useState("all");
  const [requestFilter,setRequestFilter]=useState("all");
  async function load(){setInquiries(await DB.facInquiries(fac?.id||""));}
  useEffect(()=>{load();},[]);
  function quoteRequest(q){
    const msg=q?.message||"";
    const read=label=>msg.match(new RegExp(`${label}:\\s*([^\\n]+)`,"i"))?.[1]?.trim()||"";
    const area=read("Area required").replace(/[^0-9.]/g,"");
    return {isQuote:/quote request/i.test(msg),area,deliveryLocation:read("Delivery location"),targetDate:read("Target date"),buyerNotes:read("Buyer notes"),additionalMessage:read("Additional message")};
  }
  function quoteNotesFromRequest(req){
    return [req.deliveryLocation?`Delivery location: ${req.deliveryLocation}`:null,req.targetDate?`Target date: ${req.targetDate}`:null,req.buyerNotes?`Buyer notes: ${req.buyerNotes}`:null,req.additionalMessage?`Additional message: ${req.additionalMessage}`:null].filter(Boolean).join("\n");
  }
  const defaultQuoteDate=()=>new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  function openInquiry(q){
    const req=quoteRequest(q);
    setSel(q);
    setFollow({priority:req.isQuote?"hot":q.priority||"warm",factoryNotes:q.factoryNotes||"",followUpDate:q.followUpAt?new Date(q.followUpAt).toISOString().slice(0,10):""});
    setQuote({areaSqFt:req.area||"",validityDate:defaultQuoteDate(),notes:quoteNotesFromRequest(req)});
  }
  function followTs(){return follow.followUpDate?new Date(`${follow.followUpDate}T09:00:00`).getTime():null;}
  function buyerPhone(q){return (q.message||"").match(/Phone:\s*([^\n]+)/i)?.[1]?.trim()||"";}
  async function refresh(){await load();onChange?.();}
  async function updStatus(id,status){await DB.updInquiry(id,{status});setSel(null);await refresh();}
  async function reserveInquiry(q){await DB.updInquiry(q.id,{status:"reserved"});await DB.updInspStatus(q.slabId||q.slab_id,"reserved");setSel(null);await refresh();}
  async function saveFollowup(){if(!sel)return;await DB.updInquiry(sel.id,{priority:follow.priority,factory_notes:follow.factoryNotes||null,follow_up_at:followTs()});setSel(null);await refresh();}
  async function createQuote(){
    if(!sel||quoteBusy)return;
    const area=Number(quote.areaSqFt||0);
    const price=Number(sel.pricePerSqFt||sel.price_per_sq_ft||0);
    if(!area||!price)return;
    setQuoteBusy(true);
    try {
      const q=await DB.createQuote({inquiryId:sel.id,slabId:sel.slabId||sel.slab_id,factoryId:sel.factoryId||sel.factory_id,factoryName:sel.factoryName||sel.factory_name,buyerName:sel.buyerName||sel.buyer_name,buyerCompany:sel.buyerCompany||sel.buyer_company,buyerEmail:sel.buyerEmail||sel.buyer_email,stone:sel.stone,grade:sel.grade,pricePerSqFt:price,areaSqFt:area,totalAmount:Math.round(area*price),validityTs:quote.validityDate?new Date(`${quote.validityDate}T23:59:59`).getTime():null,notes:quote.notes,status:"sent"});
      await DB.updInquiry(sel.id,{status:"reserved"});
      await DB.updInspStatus(sel.slabId||sel.slab_id,"reserved");
      setSel(null);await refresh();
      window.open(`/quote/${encodeURIComponent(q.id)}`,"_blank");
    } finally { setQuoteBusy(false); }
  }
  const overdueCount=inquiries.filter(q=>q.followUpAt&&q.followUpAt<Date.now()&&q.status!=="closed").length;
  const quoteRequestCount=inquiries.filter(q=>quoteRequest(q).isQuote&&q.status!=="closed").length;
  const hotCount=inquiries.filter(q=>(q.priority||"warm")==="hot"&&q.status!=="closed").length;
  const filtered=inquiries.filter(q=>{
    const req=quoteRequest(q);
    const hay=[q.buyerName,q.buyer_name,q.buyerCompany,q.buyer_company,q.buyerEmail,q.buyer_email,q.stone,q.grade,q.slabId,q.slab_id,q.message].filter(Boolean).join(" ").toLowerCase();
    const overdue=q.followUpAt&&q.followUpAt<Date.now()&&q.status!=="closed";
    return (statusFilter==="all"||q.status===statusFilter)&&(priorityFilter==="all"||(q.priority||"warm")===priorityFilter)&&(requestFilter==="all"||(requestFilter==="quote"&&req.isQuote)||(requestFilter==="overdue"&&overdue))&&(!search||hay.includes(search.toLowerCase()));
  }).sort((a,b)=>{
    const score=q=>q.followUpAt&&q.followUpAt<Date.now()&&q.status!=="closed"?0:(q.priority||"warm")==="hot"?1:quoteRequest(q).isQuote?2:q.status==="new"?3:q.status==="contacted"?4:q.status==="reserved"?5:6;
    return score(a)-score(b)||Number(b.created_at||0)-Number(a.created_at||0);
  });
  return (
    <div>
      {sel&&(()=>{const req=quoteRequest(sel);const buyerEmail=sel.buyerEmail||sel.buyer_email;const slabId=sel.slabId||sel.slab_id;return <Modal title={req.isQuote?"Quote Request":"Buyer Inquiry"} onClose={()=>setSel(null)}>
        <div style={{background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:12,padding:14,marginBottom:14}}>
          <div style={{fontSize:14,fontWeight:800,marginBottom:2}}>{sel.buyerName||sel.buyer_name}{(sel.buyerCompany||sel.buyer_company)?" - "+(sel.buyerCompany||sel.buyer_company):""}</div>
          {[["Slab",slabId],["Stone",sel.stone],["Grade",sel.grade],...(req.isQuote?[]:[["Message",sel.message||"-"]])].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.primaryBorder}`}}><span style={{fontSize:12,color:C.textDim}}>{l}</span><span style={{fontSize:12,fontWeight:600}}>{v}</span></div>
          ))}
        </div>
        {req.isQuote&&<Card style={{padding:12,marginBottom:12,boxShadow:"none",background:C.greenBg,borderColor:C.greenBorder}}>
          <div style={{fontSize:13,fontWeight:900,color:C.green,marginBottom:9}}>Buyer quote requirements</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:req.buyerNotes||req.additionalMessage?9:0}}>
            {[["Area",req.area?`${req.area} sq ft`:"Not specified"],["Delivery",req.deliveryLocation||"Not specified"],["Target date",req.targetDate||"Not specified"],["Est. value",req.area?`Rs ${Math.round(Number(req.area||0)*Number(sel.pricePerSqFt||sel.price_per_sq_ft||0)).toLocaleString("en-IN")}`:"-"]].map(([l,v])=>(
              <div key={l} style={{background:C.white,border:`1px solid ${C.greenBorder}`,borderRadius:8,padding:"8px 9px"}}><div style={{fontSize:10,color:C.textDim,fontWeight:800,marginBottom:3}}>{l}</div><div style={{fontSize:12,color:C.text,fontWeight:800,overflow:"hidden",textOverflow:"ellipsis"}}>{v}</div></div>
            ))}
          </div>
          {(req.buyerNotes||req.additionalMessage)&&<div style={{background:C.white,border:`1px solid ${C.greenBorder}`,borderRadius:8,padding:"9px 10px",fontSize:12,lineHeight:1.45,color:C.textMid}}>{req.buyerNotes&&<div><span style={{fontWeight:900,color:C.text}}>Notes:</span> {req.buyerNotes}</div>}{req.additionalMessage&&<div style={{marginTop:req.buyerNotes?5:0}}><span style={{fontWeight:900,color:C.text}}>Message:</span> {req.additionalMessage}</div>}</div>}
        </Card>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}><Sel label="Priority" value={follow.priority} onChange={v=>setFollow(p=>({...p,priority:v}))} options={[{value:"hot",label:"Hot"},{value:"warm",label:"Warm"},{value:"low",label:"Low"}]}/><Inp label="Next follow-up" type="date" value={follow.followUpDate} onChange={v=>setFollow(p=>({...p,followUpDate:v}))}/></div>
        <div style={{marginBottom:12}}><label style={{display:"block",fontSize:13,fontWeight:600,color:C.text,marginBottom:6}}>Factory Notes</label><textarea value={follow.factoryNotes} onChange={e=>setFollow(p=>({...p,factoryNotes:e.target.value}))} rows={3} placeholder="Call notes, buyer requirement, next step..." style={{width:"100%",padding:"12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:"sans-serif",resize:"none",outline:"none",boxSizing:"border-box"}}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}><Btn variant="ghost" onClick={()=>buyerEmail&&(window.location.href=`mailto:${buyerEmail}?subject=Epistable inquiry for ${slabId}`)} disabled={!buyerEmail}>Email</Btn><Btn variant="ghost" onClick={()=>{const p=buyerPhone(sel).replace(/[^0-9]/g,"");if(p)window.open(`https://wa.me/${p}`,"_blank");}} disabled={!buyerPhone(sel)}>WhatsApp</Btn></div>
        <Card style={{padding:12,marginBottom:12,boxShadow:"none",background:C.surface}}><div style={{fontSize:13,fontWeight:900,marginBottom:10}}>Create Quote</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}><Inp label="Area (sq ft)" value={quote.areaSqFt} onChange={v=>setQuote(p=>({...p,areaSqFt:v.replace(/[^0-9.]/g,"")}))} placeholder="120"/><Inp label="Valid until" type="date" value={quote.validityDate} onChange={v=>setQuote(p=>({...p,validityDate:v}))}/></div><textarea value={quote.notes} onChange={e=>setQuote(p=>({...p,notes:e.target.value}))} rows={2} placeholder="Quote notes, payment terms, delivery..." style={{width:"100%",padding:"10px 12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:"sans-serif",resize:"none",outline:"none",boxSizing:"border-box",marginBottom:10}}/><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><div style={{fontSize:12,color:C.textDim,fontWeight:800}}>Total: Rs {Math.round(Number(quote.areaSqFt||0)*Number(sel.pricePerSqFt||sel.price_per_sq_ft||0)).toLocaleString("en-IN")}</div><Btn size="sm" onClick={createQuote} disabled={quoteBusy||!Number(quote.areaSqFt||0)}>{quoteBusy?"Creating...":"Create Quote"}</Btn></div></Card>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Btn variant="secondary" onClick={saveFollowup}>Save</Btn><Btn variant="secondary" onClick={()=>updStatus(sel.id,"contacted")}>Contacted</Btn><Btn variant="ghost" onClick={()=>reserveInquiry(sel)}>Reserve</Btn><Btn variant="green" onClick={()=>updStatus(sel.id,"closed")}>Close</Btn></div>
      </Modal>;})()}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:14}}><div><div style={TEXT.pageHeader}>Buyer Inquiries</div><div style={TEXT.meta}>Prioritize quote requests, hot buyers, and overdue follow-ups</div></div><Btn size="sm" variant="secondary" onClick={load}>Refresh</Btn></div>
      <KpiGrid items={[{label:"Open",value:inquiries.filter(q=>q.status!=="closed").length,icon:"Open",color:C.primary},{label:"Quote Requests",value:quoteRequestCount,icon:"Quote",color:C.green},{label:"Hot Buyers",value:hotCount,icon:"Hot",color:C.red},{label:"Overdue",value:overdueCount,icon:"Due",color:overdueCount?C.red:C.textDim}]}/>
      <Card style={{padding:12,marginBottom:14}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search buyer, slab, stone..." style={{padding:"11px 12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:"sans-serif",outline:"none",minWidth:0}}/><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{padding:"11px 12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:"sans-serif",outline:"none"}}><option value="all">All statuses</option><option value="new">New</option><option value="contacted">Contacted</option><option value="reserved">Reserved</option><option value="closed">Closed</option></select><select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)} style={{padding:"11px 12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:"sans-serif",outline:"none"}}><option value="all">All priorities</option><option value="hot">Hot</option><option value="warm">Warm</option><option value="low">Low</option></select><select value={requestFilter} onChange={e=>setRequestFilter(e.target.value)} style={{padding:"11px 12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:"sans-serif",outline:"none"}}><option value="all">All inquiries</option><option value="quote">Quote requests</option><option value="overdue">Overdue follow-ups</option></select></div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginTop:10}}><div style={{fontSize:12,color:C.textDim,fontWeight:800}}>{filtered.length} of {inquiries.length} inquiries shown</div><button onClick={()=>{setSearch("");setStatusFilter("all");setPriorityFilter("all");setRequestFilter("all");}} style={{background:"transparent",border:"none",color:C.primary,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"sans-serif"}}>Reset filters</button></div></Card>
      {inquiries.length===0?<Card style={{padding:"48px",textAlign:"center"}}><div style={{fontSize:15,fontWeight:900}}>No inquiries yet</div></Card>:filtered.length===0?<Card style={{padding:"42px",textAlign:"center"}}><div style={{fontSize:15,fontWeight:900,marginBottom:5}}>No matching inquiries</div><div style={TEXT.meta}>Try clearing filters or search.</div></Card>:<Card>{filtered.map((q,i)=>{const req=quoteRequest(q);const overdue=q.followUpAt&&q.followUpAt<Date.now()&&q.status!=="closed";return(<div key={q.id} onClick={()=>openInquiry(q)} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none",cursor:"pointer",background:overdue?C.redBg:q.status==="new"?C.primaryBg:C.white}}><div style={{flex:1,minWidth:0}}><div style={TEXT.itemTitle}>{q.buyerName||q.buyer_name}</div><div style={TEXT.tinyMeta}>{q.stone} - {q.grade}{req.isQuote?" - Quote request":""}{q.followUpAt?` - Follow up ${fmtD(q.followUpAt)}`:""}</div></div><div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>{overdue&&<span style={{fontSize:10,fontWeight:800,color:C.red,background:C.white,border:`1px solid ${C.redBorder}`,borderRadius:20,padding:"3px 8px"}}>Overdue</span>}<span style={{fontSize:10,fontWeight:800,color:(q.priority||"warm")==="hot"?C.red:(q.priority||"warm")==="low"?C.textDim:C.amber,background:C.white,border:`1px solid ${C.border}`,borderRadius:20,padding:"3px 8px",textTransform:"capitalize"}}>{q.priority||"warm"}</span><InqPill status={q.status}/></div></div>);})}</Card>}
    </div>
  );
}
function FacQuotesPage({quotes=[],insps=[],onChange}) {
  const [search,setSearch]=useState("");
  const [statusFilter,setStatusFilter]=useState("all");
  const [copied,setCopied]=useState("");
  const [saleBusy,setSaleBusy]=useState("");
  const [fulfillBusy,setFulfillBusy]=useState("");
  const [reviseQuote,setReviseQuote]=useState(null);
  const [reviseForm,setReviseForm]=useState({areaSqFt:"",pricePerSqFt:"",validityDate:"",notes:""});
  const [reviseBusy,setReviseBusy]=useState(false);
  const soldSlabIds=new Set(insps.filter(i=>(i.inventoryStatus||"available")==="sold").map(i=>i.id));
  function effectiveStatus(q){
    if(q.status==="sent"&&q.validityTs&&q.validityTs<Date.now())return "expired";
    if(q.status==="accepted"&&soldSlabIds.has(q.slabId||q.slab_id))return "sold";
    return q.status||"sent";
  }
  function isExpiringSoon(q){
    const vt=q.validityTs||q.validity_ts;
    return q.status==="sent"&&vt&&vt>Date.now()&&vt-Date.now()<=3*86400000;
  }
  const counts=quotes.reduce((acc,q)=>{const s=effectiveStatus(q);acc[s]=(acc[s]||0)+1;return acc;},{});
  const awaitingResponse=quotes.filter(q=>effectiveStatus(q)==="sent").length;
  const expiringSoon=quotes.filter(isExpiringSoon).length;
  const fulfillmentActionCount=quotes.filter(q=>effectiveStatus(q)==="accepted"&&!["delivered","sold"].includes(activeFulfillment(q))).length;
  const actionCount=quotes.filter(q=>["accepted","revision_requested"].includes(effectiveStatus(q))).length;
  const soldValue=quotes.filter(q=>effectiveStatus(q)==="sold").reduce((s,q)=>s+Number(q.totalAmount||q.total_amount||0),0);
  const filtered=quotes.filter(q=>{
    const hay=[q.id,q.buyerName,q.buyer_name,q.buyerCompany,q.buyer_company,q.buyerEmail,q.buyer_email,q.stone,q.slabId,q.slab_id,q.grade,q.buyerMessage,q.buyer_message].filter(Boolean).join(" ").toLowerCase();
    const status=effectiveStatus(q);
    return (statusFilter==="all"||status===statusFilter||(statusFilter==="expiring_soon"&&isExpiringSoon(q)))&&(!search||hay.includes(search.toLowerCase()));
  }).sort((a,b)=>{
    const rank=q=>effectiveStatus(q)==="revision_requested"?0:effectiveStatus(q)==="accepted"?1:isExpiringSoon(q)?2:effectiveStatus(q)==="sent"?3:effectiveStatus(q)==="expired"?4:effectiveStatus(q)==="revised"?5:effectiveStatus(q)==="sold"?6:9;
    return rank(a)-rank(b)||Number(b.created_at||0)-Number(a.created_at||0);
  });
  function statusStyle(status){
    const map={
      sent:{label:"Sent",c:C.primary,bg:C.primaryBg,b:C.primaryBorder},
      expiring_soon:{label:"Expiring soon",c:C.amber,bg:C.amberBg,b:C.amberBorder},
      accepted:{label:"Accepted",c:C.green,bg:C.greenBg,b:C.greenBorder},
      revision_requested:{label:"Changes requested",c:C.amber,bg:C.amberBg,b:C.amberBorder},
      revised:{label:"Revised",c:C.textDim,bg:C.surface,b:C.border},
      expired:{label:"Expired",c:C.red,bg:C.redBg,b:C.redBorder},
      sold:{label:"Sold",c:C.green,bg:C.greenBg,b:C.greenBorder},
    };
    return map[status]||map.sent;
  }
  function nextStep(status,q){
    const map={
      revision_requested:{text:"Buyer requested changes. Create and send a revised quote.",c:C.amber,bg:C.amberBg,b:C.amberBorder},
      accepted:{text:"Buyer accepted. Confirm payment or dispatch, then mark the slab sold.",c:C.green,bg:C.greenBg,b:C.greenBorder},
      sent:{text:"Waiting for buyer response.",c:C.primary,bg:C.primaryBg,b:C.primaryBorder},
      expired:{text:"Quote expired. Send a fresh quote if the buyer is still interested.",c:C.red,bg:C.redBg,b:C.redBorder},
      revised:{text:"This quote was replaced by a newer revision.",c:C.textDim,bg:C.surface,b:C.border},
      sold:{text:"Closed. Slab is marked sold.",c:C.green,bg:C.greenBg,b:C.greenBorder},
    };
    if(status==="sent"&&q&&isExpiringSoon(q))return {text:"Quote expires soon. Follow up with the buyer before it goes cold.",c:C.amber,bg:C.amberBg,b:C.amberBorder};
    return map[status]||map.sent;
  }
  function quoteFulfillmentSteps(current){
    const ids=["payment_pending","payment_received","dispatch_scheduled","dispatched","delivered","sold"];
    const currentIndex=ids.indexOf(current);
    return ids.map((id,i)=>({...fulfillmentConf(id),done:currentIndex>=i,current:currentIndex===i}));
  }
  async function copyQuote(q){
    const url=`${window.location.origin}/quote/${encodeURIComponent(q.id)}`;
    try{await navigator.clipboard.writeText(url);setCopied(q.id);setTimeout(()=>setCopied(""),1400);}catch(e){window.prompt("Copy quote link",url);}
  }
  async function copyFollowup(q){
    const url=`${window.location.origin}/quote/${encodeURIComponent(q.id)}`;
    const text=`Hi ${q.buyerName||q.buyer_name||"there"}, sharing the Epistable quote for ${q.stone}: ${url}`;
    try{await navigator.clipboard.writeText(text);setCopied("follow-"+q.id);setTimeout(()=>setCopied(""),1400);}catch(e){window.prompt("Copy follow-up message",text);}
  }
  function openRevision(q){
    setReviseQuote(q);
    setReviseForm({
      areaSqFt:String(q.areaSqFt||q.area_sq_ft||""),
      pricePerSqFt:String(q.pricePerSqFt||q.price_per_sq_ft||""),
      validityDate:q.validityTs||q.validity_ts?new Date(q.validityTs||q.validity_ts).toISOString().slice(0,10):"",
      notes:q.notes||""
    });
  }
  async function markQuoteSold(q){
    if(saleBusy)return;
    setSaleBusy(q.id);
    try {
      await DB.updateQuoteFulfillment(q.id,"sold");
      await DB.updInspStatus(q.slabId||q.slab_id,"sold");
      if(q.inquiryId||q.inquiry_id)await DB.updInquiry(q.inquiryId||q.inquiry_id,{status:"closed"});
      await onChange?.();
    } finally {
      setSaleBusy("");
    }
  }
  async function updateFulfillment(q,status){
    if(fulfillBusy)return;
    setFulfillBusy(q.id+"-"+status);
    try {
      await DB.updateQuoteFulfillment(q.id,status);
      await onChange?.();
    } finally {
      setFulfillBusy("");
    }
  }
  async function createRevision(){
    if(!reviseQuote||reviseBusy)return;
    const area=Number(reviseForm.areaSqFt||0);
    const price=Number(reviseForm.pricePerSqFt||0);
    if(!area||!price)return;
    setReviseBusy(true);
    try {
      const q=await DB.createQuote({
        inquiryId:reviseQuote.inquiryId||reviseQuote.inquiry_id,
        slabId:reviseQuote.slabId||reviseQuote.slab_id,
        factoryId:reviseQuote.factoryId||reviseQuote.factory_id,
        factoryName:reviseQuote.factoryName||reviseQuote.factory_name,
        buyerName:reviseQuote.buyerName||reviseQuote.buyer_name,
        buyerCompany:reviseQuote.buyerCompany||reviseQuote.buyer_company,
        buyerEmail:reviseQuote.buyerEmail||reviseQuote.buyer_email,
        stone:reviseQuote.stone,
        grade:reviseQuote.grade,
        pricePerSqFt:price,
        areaSqFt:area,
        totalAmount:Math.round(area*price),
        validityTs:reviseForm.validityDate?new Date(`${reviseForm.validityDate}T23:59:59`).getTime():null,
        notes:reviseForm.notes,
        parentQuoteId:reviseQuote.parentQuoteId||reviseQuote.parent_quote_id||reviseQuote.id,
        revisionNumber:Number(reviseQuote.revisionNumber||reviseQuote.revision_number||1)+1,
        status:"sent"
      });
      await DB.updQuote(reviseQuote.id,{status:"revised"});
      try{await DB.notifyBuyerRevisedQuote(q.id);}catch(e){console.warn("Buyer quote notification skipped",e);}
      setReviseQuote(null);await onChange?.();
      window.open(`/quote/${encodeURIComponent(q.id)}`,"_blank");
    } finally {
      setReviseBusy(false);
    }
  }
  return (
    <div>
      {reviseQuote&&<Modal title="Create Revised Quote" onClose={()=>setReviseQuote(null)}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:10,padding:12}}>
            <div style={{fontSize:13,fontWeight:900,color:C.amber,marginBottom:4}}>Buyer requested changes</div>
            <div style={{fontSize:12,color:C.textMid,lineHeight:1.5}}>{reviseQuote.buyerMessage||reviseQuote.buyer_message||"No buyer note provided."}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Inp label="Area (sq ft)" value={reviseForm.areaSqFt} onChange={v=>setReviseForm(p=>({...p,areaSqFt:v.replace(/[^0-9.]/g,"")}))}/>
            <Inp label="Price / sq ft" value={reviseForm.pricePerSqFt} onChange={v=>setReviseForm(p=>({...p,pricePerSqFt:v.replace(/[^0-9.]/g,"")}))}/>
          </div>
          <Inp label="Valid until" type="date" value={reviseForm.validityDate} onChange={v=>setReviseForm(p=>({...p,validityDate:v}))}/>
          <textarea value={reviseForm.notes} onChange={e=>setReviseForm(p=>({...p,notes:e.target.value}))} rows={3} placeholder="Revised quote notes, delivery, payment terms..." style={{width:"100%",padding:"11px 12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:"sans-serif",resize:"none",outline:"none",boxSizing:"border-box"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
            <div style={{fontSize:13,fontWeight:900,color:C.green}}>Total: Rs {Math.round(Number(reviseForm.areaSqFt||0)*Number(reviseForm.pricePerSqFt||0)).toLocaleString("en-IN")}</div>
            <Btn onClick={createRevision} disabled={reviseBusy||!Number(reviseForm.areaSqFt||0)||!Number(reviseForm.pricePerSqFt||0)}>{reviseBusy?"Creating...":"Create Revision"}</Btn>
          </div>
        </div>
      </Modal>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:14}}>
        <div><div style={TEXT.pageHeader}>Quotes</div><div style={TEXT.meta}>Manage sent quotes, buyer decisions, revisions, and sold status</div></div>
      </div>
      <KpiGrid items={[{label:"Awaiting Response",value:awaitingResponse,icon:"Reply",color:C.primary},{label:"Needs Action",value:actionCount,icon:"Now",color:actionCount?C.amber:C.textDim},{label:"Expiring Soon",value:expiringSoon,icon:"Due",color:expiringSoon?C.amber:C.textDim},{label:"Sold Value",value:"Rs "+soldValue.toLocaleString("en-IN"),icon:"Sold",color:C.green}]}/>
      <Card style={{padding:12,marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search quote, buyer, stone, slab..." style={{padding:"11px 12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:"sans-serif",outline:"none",minWidth:0}}/>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{padding:"11px 12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:"sans-serif",outline:"none"}}>
            <option value="all">All statuses</option>
            <option value="sent">Sent</option>
            <option value="expiring_soon">Expiring soon</option>
            <option value="accepted">Accepted</option>
            <option value="revision_requested">Changes requested</option>
            <option value="revised">Revised</option>
            <option value="expired">Expired</option>
            <option value="sold">Sold</option>
          </select>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
          {["sent","expiring_soon","accepted","revision_requested","revised","expired","sold"].map(s=>{const cfg=statusStyle(s);const count=s==="expiring_soon"?expiringSoon:counts[s]||0;return <button key={s} onClick={()=>setStatusFilter(statusFilter===s?"all":s)} style={{padding:"5px 10px",background:statusFilter===s?cfg.bg:C.white,border:`1px solid ${statusFilter===s?cfg.b:C.border}`,borderRadius:20,color:statusFilter===s?cfg.c:C.textDim,fontSize:11,fontWeight:900,cursor:"pointer",fontFamily:"sans-serif"}}>{cfg.label} ({count})</button>;})}
        </div>
      </Card>
      {filtered.length===0?<Card style={{padding:"44px",textAlign:"center"}}><div style={{fontSize:15,fontWeight:900,marginBottom:5}}>No quotes found</div><div style={{fontSize:12,color:C.textDim}}>Quotes created from inquiries will appear here for follow-up and closing.</div></Card>:
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(q=>{const status=effectiveStatus(q);const cfg=statusStyle(status);const step=nextStep(status,q);const canRevise=status==="revision_requested";const canSell=status==="accepted";const fulfillment=fulfillmentConf(activeFulfillment(q));const buyerEmail=q.buyerEmail||q.buyer_email;return(
          <Card key={q.id} style={{padding:14,borderColor:canRevise?C.amberBorder:canSell?C.greenBorder:C.border}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",marginBottom:10,flexWrap:"wrap"}}>
              <div style={{minWidth:0}}>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
                  <span style={{fontSize:12,fontFamily:"monospace",fontWeight:900,color:C.text}}>{q.id}</span>
                  <span style={{fontSize:10,fontWeight:900,color:cfg.c,background:cfg.bg,border:`1px solid ${cfg.b}`,borderRadius:20,padding:"2px 8px"}}>{cfg.label}</span>
                  {isExpiringSoon(q)&&<span style={{fontSize:10,fontWeight:900,color:C.amber,background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:20,padding:"2px 8px"}}>Expiring soon</span>}
                  {status==="accepted"&&<span style={{fontSize:10,fontWeight:900,color:fulfillment.color,background:fulfillment.bg,border:`1px solid ${fulfillment.border}`,borderRadius:20,padding:"2px 8px"}}>{fulfillment.label}</span>}
                  {(q.revisionNumber||q.revision_number)>1&&<span style={{fontSize:10,fontWeight:900,color:C.purple,background:C.purpleBg,border:`1px solid ${C.purpleBorder}`,borderRadius:20,padding:"2px 8px"}}>Rev {q.revisionNumber||q.revision_number}</span>}
                </div>
                <div style={{fontSize:14,fontWeight:900,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.buyerCompany||q.buyerName||"Buyer"}</div>
                <div style={{fontSize:11,color:C.textDim,marginTop:2}}>{q.stone} · {q.grade} · {q.slabId||q.slab_id}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:18,fontWeight:900,color:C.green}}>Rs {Number(q.totalAmount||0).toLocaleString("en-IN")}</div>
                <div style={{fontSize:11,color:C.textDim}}>{q.validityTs||q.validity_ts?`Valid ${fmtD(q.validityTs||q.validity_ts)}`:"No validity"}</div>
              </div>
            </div>
            <div style={{background:step.bg,border:`1px solid ${step.b}`,borderRadius:8,padding:"8px 10px",fontSize:12,color:step.c,lineHeight:1.45,fontWeight:800,marginBottom:10}}>{step.text}</div>
            {status==="accepted"&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:10,marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:900,marginBottom:8}}>Fulfillment stage</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:6}}>
                {quoteFulfillmentSteps(activeFulfillment(q)).map(s=><button key={s.id} disabled={!!fulfillBusy||s.id==="sold"} onClick={()=>updateFulfillment(q,s.id)} style={{padding:"8px 6px",background:s.current?s.bg:C.white,border:`1px solid ${s.current?s.border:C.border}`,borderRadius:8,color:s.current?s.color:C.textMid,fontSize:11,fontWeight:900,cursor:fulfillBusy||s.id==="sold"?"not-allowed":"pointer",fontFamily:"sans-serif",opacity:s.id==="sold"?0.65:1}}>{s.done&&!s.current?"Done · ":""}{s.label}</button>)}
              </div>
            </div>}
            {(q.buyerMessage||q.buyer_message)&&<div style={{background:C.white,border:`1px solid ${canRevise?C.amberBorder:C.border}`,borderRadius:8,padding:"9px 10px",fontSize:12,color:C.textMid,lineHeight:1.45,marginBottom:10}}><span style={{fontWeight:900,color:canRevise?C.amber:C.text}}>Buyer note:</span> {q.buyerMessage||q.buyer_message}</div>}
            <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
              <Btn size="sm" variant="secondary" onClick={()=>window.open(`/quote/${encodeURIComponent(q.id)}`,"_blank","noopener,noreferrer")}>Open Buyer Quote</Btn>
              <Btn size="sm" variant="secondary" onClick={()=>copyQuote(q)}>{copied===q.id?"Copied":"Copy Link"}</Btn>
              <Btn size="sm" variant="secondary" onClick={()=>copyFollowup(q)}>{copied==="follow-"+q.id?"Copied Msg":"Copy Follow-up"}</Btn>
              {buyerEmail&&<Btn size="sm" variant="secondary" onClick={()=>{window.location.href=`mailto:${buyerEmail}?subject=Epistable quote ${q.id}`;}}>Email Buyer</Btn>}
              {(q.slabId||q.slab_id)&&<Btn size="sm" variant="secondary" onClick={()=>window.open(`/slab/${encodeURIComponent(q.slabId||q.slab_id)}`,"_blank","noopener,noreferrer")}>View Slab</Btn>}
              {canRevise&&<Btn size="sm" variant="ghost" onClick={()=>openRevision(q)}>Create Revised Quote</Btn>}
              {canSell&&<Btn size="sm" variant="green" disabled={saleBusy===q.id} onClick={()=>markQuoteSold(q)}>{saleBusy===q.id?"Closing...":"Mark Slab Sold"}</Btn>}
            </div>
          </Card>
        );})}
      </div>}
    </div>
  );
}

function FacSalesDashboard({inquiries=[],insps=[],disputes=[],quotes=[],setPage,onChange}) {
  const [orderBusy,setOrderBusy]=useState("");
  const [orderCopied,setOrderCopied]=useState("");
  const byStatus=s=>inquiries.filter(q=>q.status===s).length;
  const overdue=inquiries.filter(q=>q.followUpAt&&q.followUpAt<Date.now()&&q.status!=="closed");
  const funnel=[["New",byStatus("new"),C.primary],["Contacted",byStatus("contacted"),C.amber],["Reserved",byStatus("reserved"),C.purple],["Closed",byStatus("closed"),C.green]];
  const maxFunnel=Math.max(1,...funnel.map(x=>x[1]));
  const slabInterest=Object.values(inquiries.reduce((acc,q)=>{
    const id=q.slabId||q.slab_id||"unknown";
    acc[id]=acc[id]||{id,stone:q.stone,grade:q.grade,count:0,latest:0};
    acc[id].count+=1;acc[id].latest=Math.max(acc[id].latest,q.created_at||0);
    return acc;
  },{})).sort((a,b)=>b.count-a.count||b.latest-a.latest).slice(0,5);
  const recent=[
    ...inquiries.slice(0,8).map(q=>({kind:"Inquiry",title:q.buyerName||q.buyer_name||"Buyer",sub:`${q.stone} · ${q.status}`,ts:q.created_at||0,color:q.status==="new"?C.primary:q.status==="reserved"?C.purple:C.textMid})),
    ...disputes.slice(0,5).map(d=>({kind:"Dispute",title:d.buyerName||d.buyer_name||"Buyer",sub:`${d.stone} · ${d.status}`,ts:d.created_at||0,color:d.status==="open"?C.red:C.textMid})),
  ].sort((a,b)=>b.ts-a.ts).slice(0,8);
  const soldSlabIds=new Set(insps.filter(i=>(i.inventoryStatus||"available")==="sold").map(i=>i.id));
  const sentQuotes=quotes.filter(q=>q.status==="sent").length;
  const acceptedQuotes=quotes.filter(q=>q.status==="accepted").length;
  const soldQuotes=quotes.filter(q=>q.status==="accepted"&&soldSlabIds.has(q.slabId||q.slab_id));
  const acceptedActionItems=quotes.filter(q=>q.status==="accepted"&&!soldSlabIds.has(q.slabId||q.slab_id)).slice(0,5);
  const wonValue=soldQuotes.reduce((sum,q)=>sum+Number(q.totalAmount||q.total_amount||0),0);
  const decidedQuotes=quotes.filter(q=>q.status==="accepted"||q.status==="revision_requested").slice(0,5);
  const revisionRequests=quotes.filter(q=>q.status==="revision_requested").slice(0,5);
  const fulfillmentStages=["payment_pending","payment_received","dispatch_scheduled","dispatched","delivered"];
  const activeOrders=quotes
    .filter(q=>q.status==="accepted"&&!soldSlabIds.has(q.slabId||q.slab_id)&&activeFulfillment(q)!=="sold")
    .sort((a,b)=>fulfillmentStages.indexOf(activeFulfillment(a))-fulfillmentStages.indexOf(activeFulfillment(b))||Number(a.created_at||0)-Number(b.created_at||0));
  const stageCounts=fulfillmentStages.map(id=>({conf:fulfillmentConf(id),count:activeOrders.filter(q=>activeFulfillment(q)===id).length}));
  const stageRank={payment_pending:0,payment_received:1,dispatch_scheduled:2,dispatched:3,delivered:4,sold:5};
  function orderAction(q){
    const status=activeFulfillment(q);
    const map={payment_pending:"Confirm payment",payment_received:"Schedule dispatch",dispatch_scheduled:"Dispatch slab",dispatched:"Confirm delivery",delivered:"Mark sold"};
    return map[status]||"Review order";
  }
  function nextOrderStatus(q){
    const status=activeFulfillment(q);
    const map={payment_pending:"payment_received",payment_received:"dispatch_scheduled",dispatch_scheduled:"dispatched",dispatched:"delivered",delivered:"sold"};
    return map[status]||"payment_pending";
  }
  async function copyOrderLink(q){
    const url=`${window.location.origin}/quote/${encodeURIComponent(q.id)}`;
    try{await navigator.clipboard.writeText(url);setOrderCopied(q.id);setTimeout(()=>setOrderCopied(""),1400);}catch(e){window.prompt("Copy quote link",url);}
  }
  async function advanceOrder(q){
    if(orderBusy)return;
    const next=nextOrderStatus(q);
    setOrderBusy(q.id);
    try {
      await DB.updateQuoteFulfillment(q.id,next);
      if(next==="sold"){
        await DB.updInspStatus(q.slabId||q.slab_id,"sold");
        if(q.inquiryId||q.inquiry_id)await DB.updInquiry(q.inquiryId||q.inquiry_id,{status:"closed"});
      }
      await onChange?.();
    } finally {
      setOrderBusy("");
    }
  }
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={TEXT.pageHeader}>Sales Dashboard</div><div style={TEXT.meta}>Buyer demand, quote movement, and follow-ups</div></div>
        <Btn size="sm" variant="ghost" onClick={()=>setPage("quotes")}>Open Quotes</Btn>
      </div>
      <KpiGrid items={[{label:"New Inquiries",value:byStatus("new"),icon:"New",color:C.primary},{label:"Quotes Sent",value:sentQuotes,icon:"₹",color:C.green},{label:"Accepted Quotes",value:acceptedQuotes,icon:"Won",color:C.green},{label:"Sold Value",value:"₹"+wonValue.toLocaleString("en-IN"),icon:"Sold",color:C.green}]}/>
      <Card style={{padding:16,marginBottom:14,borderColor:activeOrders.length?C.primaryBorder:C.border}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:14}}>
          <div>
            <div style={{fontSize:15,fontWeight:900}}>Active Orders</div>
            <div style={{fontSize:12,color:C.textDim,marginTop:2}}>Accepted quotes that need payment, dispatch, delivery, or sold closure</div>
          </div>
          <Btn size="sm" variant={activeOrders.length?"primary":"secondary"} onClick={()=>setPage("quotes")}>Manage Orders</Btn>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8,marginBottom:activeOrders.length?14:0}}>
          {stageCounts.map(({conf,count})=>(
            <div key={conf.id} style={{background:count?conf.bg:C.surface,border:`1px solid ${count?conf.border:C.border}`,borderRadius:10,padding:"10px 9px"}}>
              <div style={{fontSize:18,fontWeight:900,color:count?conf.color:C.textDim,lineHeight:1}}>{count}</div>
              <div style={{fontSize:10,fontWeight:900,color:count?conf.color:C.textDim,marginTop:5}}>{conf.label}</div>
            </div>
          ))}
        </div>
        {activeOrders.length===0?<div style={{fontSize:13,color:C.textDim,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>No active accepted orders yet. When a buyer accepts a quote, it will appear here until sold.</div>:
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {activeOrders.slice(0,5).map(q=>{const conf=fulfillmentConf(activeFulfillment(q));const nextIndex=Math.max(0,stageRank[activeFulfillment(q)]??0);return(
            <div key={q.id} style={{display:"grid",gridTemplateColumns:"minmax(0,1.2fr) minmax(120px,0.7fr) auto",gap:10,alignItems:"center",padding:"11px 0",borderTop:`1px solid ${C.border}`}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:13,fontWeight:900,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.buyerCompany||q.buyerName||"Buyer"}</div>
                <div style={{fontSize:11,color:C.textDim,marginTop:2}}>{q.stone} - Rs {Number(q.totalAmount||q.total_amount||0).toLocaleString("en-IN")} - {q.id}</div>
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:900,color:conf.color,marginBottom:5}}>{conf.label}</div>
                <PBar value={(nextIndex+1)/fulfillmentStages.length*100} color={conf.color} h={6}/>
              </div>
              <div style={{display:"flex",gap:6,justifyContent:"flex-end",flexWrap:"wrap"}}>
                <Btn size="sm" variant="secondary" onClick={()=>window.open(`/quote/${encodeURIComponent(q.id)}`,"_blank","noopener,noreferrer")}>Open</Btn>
                <Btn size="sm" variant="secondary" onClick={()=>copyOrderLink(q)}>{orderCopied===q.id?"Copied":"Copy"}</Btn>
                <Btn size="sm" variant={activeFulfillment(q)==="delivered"?"green":"ghost"} disabled={orderBusy===q.id} onClick={()=>advanceOrder(q)}>{orderBusy===q.id?"Updating...":orderAction(q)}</Btn>
              </div>
            </div>
          );})}
          {activeOrders.length>5&&<button onClick={()=>setPage("quotes")} style={{background:"transparent",border:"none",color:C.primary,fontSize:12,fontWeight:900,cursor:"pointer",fontFamily:"sans-serif",padding:"8px 0 0",textAlign:"left"}}>View {activeOrders.length-5} more active orders</button>}
        </div>}
      </Card>
      {revisionRequests.length>0&&<Card style={{padding:14,marginBottom:14,borderColor:C.amberBorder,background:C.amberBg}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:10}}>
          <div><div style={{fontSize:14,fontWeight:900,color:C.amber}}>Quote changes requested</div><div style={{fontSize:12,color:C.textMid,marginTop:2}}>Handle these in Quotes so revisions stay tracked in one place.</div></div>
          <Btn size="sm" variant="ghost" onClick={()=>setPage("quotes")}>{revisionRequests.length} to review</Btn>
        </div>
        {revisionRequests.map((q,i)=>(
          <div key={q.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderTop:i===0?`1px solid ${C.amberBorder}`:"none",borderBottom:i<revisionRequests.length-1?`1px solid ${C.amberBorder}`:"none"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:900,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.buyerCompany||q.buyerName||"Buyer"}</div>
              <div style={{fontSize:11,color:C.textMid}}>{q.stone} · Rs {Number(q.totalAmount||0).toLocaleString("en-IN")}</div>
              {q.buyerMessage&&<div style={{fontSize:12,color:C.textMid,lineHeight:1.45,marginTop:4}}>{q.buyerMessage}</div>}
            </div>
            <Btn size="sm" variant="ghost" onClick={()=>setPage("quotes")}>Review</Btn>
          </div>
        ))}
      </Card>}
      {acceptedActionItems.length>0&&<Card style={{padding:14,marginBottom:14,borderColor:C.greenBorder,background:C.greenBg}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:10}}>
          <div><div style={{fontSize:14,fontWeight:900,color:C.green}}>Accepted quotes ready to move</div><div style={{fontSize:12,color:C.textMid,marginTop:2}}>Advance payment, dispatch, delivery, and sold status from this dashboard.</div></div>
          <Btn size="sm" variant="ghost" onClick={()=>setPage("quotes")}>Open Quotes</Btn>
        </div>
        {acceptedActionItems.map((q,i)=>(
          <div key={q.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderTop:i===0?`1px solid ${C.greenBorder}`:"none",borderBottom:i<acceptedActionItems.length-1?`1px solid ${C.greenBorder}`:"none"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:900,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.buyerCompany||q.buyerName||"Buyer"}</div>
              <div style={{fontSize:11,color:C.textMid}}>{q.stone} · Rs {Number(q.totalAmount||0).toLocaleString("en-IN")}</div>
            </div>
            <Btn size="sm" variant="green" disabled={orderBusy===q.id} onClick={()=>advanceOrder(q)}>{orderBusy===q.id?"Updating...":orderAction(q)}</Btn>
          </div>
        ))}
      </Card>}
      {overdue.length>0&&<Card style={{padding:14,marginBottom:14,borderColor:C.redBorder,background:C.redBg}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
          <div><div style={{fontSize:14,fontWeight:900,color:C.red}}>Follow up now</div><div style={{fontSize:12,color:C.textMid,marginTop:2}}>{overdue.slice(0,3).map(q=>q.buyerName||q.buyer_name).join(", ")}</div></div>
          <Btn size="sm" variant="red" onClick={()=>setPage("inquiries")}>Review</Btn>
        </div>
      </Card>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:14}}>
        <Card style={{padding:16}}>
          <div style={{fontSize:15,fontWeight:900,marginBottom:14}}>Inquiry Funnel</div>
          {funnel.map(([label,count,color])=>(
            <div key={label} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:800,marginBottom:5}}><span>{label}</span><span style={{color}}>{count}</span></div>
              <PBar value={count/maxFunnel*100} color={color} h={8}/>
            </div>
          ))}
        </Card>
        <Card style={{padding:16}}>
          <div style={{fontSize:15,fontWeight:900,marginBottom:12}}>Top Interested Slabs</div>
          {slabInterest.length===0?<div style={{fontSize:13,color:C.textDim}}>No buyer interest yet</div>:slabInterest.map((s,i)=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:i<slabInterest.length-1?`1px solid ${C.border}`:"none"}}>
              <div style={{width:28,height:28,borderRadius:8,background:C.primaryBg,color:C.primary,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900}}>{i+1}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:800,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.stone||s.id}</div><div style={{fontSize:11,color:C.textDim}}>{s.grade||"Grade"} · {s.id}</div></div>
              <div style={{fontSize:13,fontWeight:900,color:C.primary}}>{s.count}</div>
            </div>
          ))}
        </Card>
        <Card style={{padding:16}}>
          <div style={{fontSize:15,fontWeight:900,marginBottom:12}}>Recent Buyer Activity</div>
          {recent.length===0?<div style={{fontSize:13,color:C.textDim}}>No buyer activity yet</div>:recent.map((a,i)=>(
            <div key={`${a.kind}-${a.ts}-${i}`} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:i<recent.length-1?`1px solid ${C.border}`:"none"}}>
              <div style={{width:9,height:9,borderRadius:"50%",background:a.color,marginTop:5,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:800}}>{a.kind}: {a.title}</div><div style={{fontSize:11,color:C.textDim}}>{a.sub} · {fmtD(a.ts)}</div></div>
            </div>
          ))}
        </Card>
        <Card style={{padding:16}}>
          <div style={{fontSize:15,fontWeight:900,marginBottom:12}}>Latest Quote Updates</div>
          {decidedQuotes.length===0?<div style={{fontSize:13,color:C.textDim}}>No accepted quotes or change requests yet.</div>:decidedQuotes.map((q,i)=>{
            const accepted=q.status==="accepted";
            return (
              <div key={q.id} style={{padding:"10px 0",borderBottom:i<decidedQuotes.length-1?`1px solid ${C.border}`:"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:10,marginBottom:4}}>
                  <div style={{fontSize:13,fontWeight:900,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.buyerCompany||q.buyerName||"Buyer"}</div>
                  <span style={{fontSize:10,fontWeight:900,color:accepted?C.green:C.amber,background:accepted?C.greenBg:C.amberBg,border:`1px solid ${accepted?C.greenBorder:C.amberBorder}`,borderRadius:20,padding:"2px 8px",whiteSpace:"nowrap"}}>{accepted?"Accepted":"Changes requested"}</span>
                </div>
                <div style={{fontSize:11,color:C.textDim,marginBottom:q.buyerMessage?4:0}}>{q.stone} · Rs {Number(q.totalAmount||0).toLocaleString("en-IN")}</div>
                {q.buyerMessage&&<div style={{fontSize:12,color:C.textMid,lineHeight:1.45}}>{q.buyerMessage}</div>}
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

function FacDisputes({fac}) {
  const [disputes,setDisputes]=useState([]);const [sel,setSel]=useState(null);const [response,setResponse]=useState("");
  async function load(){setDisputes(await DB.facDisputes(fac?.id||""));}
  useEffect(()=>{load();},[]);
  async function update(id,status){await DB.updDispute(id,{status,response:response||undefined});setSel(null);setResponse("");load();}
  const catLabel={wrong_grade:"Wrong Grade",defect_missed:"Defect Missed",measurement:"Wrong Measurement",other:"Other"};
  return (
    <div>
      {sel&&<Modal title="Dispute" onClose={()=>{setSel(null);setResponse("");}}>
        <div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:10,padding:14,marginBottom:14}}>
          <div style={{fontSize:14,fontWeight:800,marginBottom:4}}>{sel.stone} — {catLabel[sel.category]||sel.category}</div>
          <div style={{fontSize:13,lineHeight:1.6}}>{sel.details}</div>
        </div>
        <div style={{marginBottom:12}}><textarea value={response} onChange={e=>setResponse(e.target.value)} rows={3} placeholder="Your response…" style={{width:"100%",padding:"12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:"sans-serif",resize:"none",outline:"none",boxSizing:"border-box"}}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Btn variant="secondary" size="sm" onClick={()=>update(sel.id,"dismissed")}>✗ Dismiss</Btn>
          <Btn variant="green" size="sm" onClick={()=>update(sel.id,"resolved")}>✅ Resolve</Btn>
        </div>
      </Modal>}
      <div style={TEXT.pageTitle}>Disputes</div>
      {disputes.length===0?<Card style={{padding:"48px",textAlign:"center"}}><div style={{fontSize:48,marginBottom:12}}>🤝</div><div style={TEXT.emptyTitle}>No disputes</div></Card>:
      <Card>{disputes.map((d,i)=>(
        <div key={d.id} onClick={()=>{setSel(d);setResponse(d.response||"");}} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<disputes.length-1?`1px solid ${C.border}`:"none",cursor:"pointer",background:d.status==="open"?C.redBg:C.white}}>
          <div style={{flex:1,minWidth:0}}><div style={TEXT.itemTitle}>{d.stone}</div><div style={TEXT.tinyMeta}>{catLabel[d.category]||d.category} · {d.buyer_name}</div></div>
          <DisputeStatusPill status={d.status}/>
        </div>
      ))}</Card>}
    </div>
  );
}

function FacNotifs({notifs,onRead}) {
  useEffect(()=>{if(notifs.some(n=>!n.read))onRead();},[]);
  return (
    <div>
      <div style={TEXT.pageTitle}>Alerts</div>
      {notifs.length===0?<Card style={{padding:"48px",textAlign:"center"}}><div style={{fontSize:48,marginBottom:12}}>🔔</div><div style={{...TEXT.emptyTitle,marginBottom:5}}>No alerts yet</div><div style={TEXT.meta}>Quote updates, buyer decisions, and follow-ups will appear here.</div></Card>:
      <Card>{notifs.map((n,i)=>(
        <div key={n.id} style={{display:"flex",gap:12,padding:"14px 16px",borderBottom:i<notifs.length-1?`1px solid ${C.border}`:"none",background:n.read?C.white:C.primaryBg}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{n.icon||"🔔"}</div>
          <div style={{flex:1}}><div style={{...TEXT.itemTitle,marginBottom:2}}>{n.title}</div><div style={{...TEXT.meta,color:C.textMid}}>{n.msg}</div></div>
        </div>
      ))}</Card>}
    </div>
  );
}

// ── BUYER ──
function quoteStatusConf(status) {
  const m={
    sent:{label:"Sent",c:C.primary,bg:C.primaryBg,b:C.primaryBorder},
    accepted:{label:"Accepted",c:C.green,bg:C.greenBg,b:C.greenBorder},
    revision_requested:{label:"Changes requested",c:C.amber,bg:C.amberBg,b:C.amberBorder},
    revised:{label:"Revised",c:C.textDim,bg:C.surface,b:C.border},
    expired:{label:"Expired",c:C.red,bg:C.redBg,b:C.redBorder},
    sold:{label:"Sold",c:C.green,bg:C.greenBg,b:C.greenBorder},
  };
  return m[status]||m.sent;
}

function quoteTimelineItems(q) {
  const status=q.status||"sent";
  const expired=q.validityTs&&q.validityTs<Date.now();
  const timelineStatus=expired&&status==="sent"?"expired":status;
  const fulfillment=fulfillmentConf(activeFulfillment(q));
  const fulfillmentIndex=QUOTE_FULFILLMENT.findIndex(s=>s.id===fulfillment.id);
  return [
    {label:"Quote sent",detail:q.created_at?fmtD(q.created_at):"Sent by factory",done:true,current:false},
    {
      label:"Buyer response",
      detail:timelineStatus==="accepted"?"Accepted by buyer":timelineStatus==="revision_requested"?"Changes requested":timelineStatus==="revised"?"Revised quote issued":timelineStatus==="expired"?"Expired before response":"Waiting for response",
      done:["accepted","revision_requested","revised"].includes(timelineStatus),
      current:timelineStatus==="sent"
    },
    ...(["accepted"].includes(timelineStatus)?QUOTE_FULFILLMENT.filter(x=>x.id!=="not_started").map(x=>({
      label:x.label,
      detail:x.buyer,
      done:fulfillmentIndex>=QUOTE_FULFILLMENT.findIndex(s=>s.id===x.id),
      current:fulfillment.id===x.id
    })):[{
      label:timelineStatus==="revision_requested"?"Factory review":timelineStatus==="revised"?"Revised quote":timelineStatus==="expired"?"Quote expired":"Order tracking",
      detail:timelineStatus==="revision_requested"?"Factory can send a revised quote":timelineStatus==="revised"?"Use the latest quote from the factory":timelineStatus==="expired"?"Ask the factory for a fresh quote":"Starts after quote acceptance",
      done:timelineStatus==="revised",
      current:timelineStatus==="revision_requested"
    }])
  ];
}

function BuyerQuoteTimeline({quote}) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}>
      {quoteTimelineItems(quote).map((step,i)=>(
        <div key={`${quote.id}-${step.label}`} style={{display:"flex",gap:8,alignItems:"flex-start",background:step.current?C.primaryBg:step.done?C.greenBg:C.surface,border:`1px solid ${step.current?C.primaryBorder:step.done?C.greenBorder:C.border}`,borderRadius:10,padding:10}}>
          <div style={{width:22,height:22,borderRadius:"50%",background:step.done?C.green:step.current?C.primary:C.border,color:step.done||step.current?C.white:C.textDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,flexShrink:0}}>{step.done?"OK":i+1}</div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:11,fontWeight:900,color:step.done?C.green:step.current?C.primary:C.text}}>{step.label}</div>
            <div style={{fontSize:10,color:C.textMid,lineHeight:1.35,marginTop:2}}>{step.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function buyerQuoteNextAction(q) {
  const expired=q.validityTs&&q.validityTs<Date.now()&&q.status==="sent";
  if(expired)return {label:"Ask factory for updated quote",color:C.red,bg:C.redBg,border:C.redBorder};
  if(q.status==="sent")return {label:"Accept or request changes",color:C.primary,bg:C.primaryBg,border:C.primaryBorder};
  if(q.status==="revision_requested")return {label:"Waiting for factory revision",color:C.amber,bg:C.amberBg,border:C.amberBorder};
  if(q.status==="accepted") {
    const f=fulfillmentConf(activeFulfillment(q));
    return {label:f.buyer,color:f.color,bg:f.bg,border:f.border};
  }
  if(q.status==="revised")return {label:"A newer quote replaced this one",color:C.textDim,bg:C.surface,border:C.border};
  return {label:"Quote closed",color:C.textDim,bg:C.surface,border:C.border};
}

function buyerQuotePriority(q) {
  const expired=q.validityTs&&q.validityTs<Date.now()&&q.status==="sent";
  if(q.status==="sent"&&!expired)return 0;
  if(q.status==="accepted"&&activeFulfillment(q)!=="sold")return 1;
  if(q.status==="revision_requested")return 2;
  if(expired)return 3;
  if(q.status==="revised")return 4;
  if(activeFulfillment(q)==="sold")return 5;
  return 6;
}

function BuyerQuotesPage({buyer,onBack,onLogout,onViewPortal}) {
  const [fac,setFac]=useState(null);const [quotes,setQuotes]=useState([]);const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState("active");const [search,setSearch]=useState("");const [sortBy,setSortBy]=useState("priority");const [copiedQuote,setCopiedQuote]=useState("");
  const [quoteAction,setQuoteAction]=useState(null);const [quoteMsg,setQuoteMsg]=useState("");const [quoteBusy,setQuoteBusy]=useState("");const [quoteError,setQuoteError]=useState("");
  const [resolvedFactoryId,setResolvedFactoryId]=useState(buyer.factory_id||buyer.factoryId||"");
  const buyerFactoryId=buyer.factory_id||buyer.factoryId||resolvedFactoryId;
  async function load(){
    let fid=buyerFactoryId;
    if(!fid){fid=await resolveBuyerFactoryId(buyer);if(fid)setResolvedFactoryId(fid);}
    if(!fid){setLoading(false);return;}
    setLoading(true);
    const [f,qt]=await Promise.all([DB.getFac(fid),DB.buyerQuotes(buyer.email,fid)]);
    setFac(f);setQuotes(qt);setLoading(false);
  }
  useEffect(()=>{load();},[buyer.email,buyer.factory_id,buyer.factoryId,resolvedFactoryId]);
  function openQuoteAction(q,decision){setQuoteAction({quote:q,decision});setQuoteMsg("");setQuoteError("");}
  async function submitQuoteAction(){
    if(!quoteAction||quoteBusy)return;
    setQuoteBusy(quoteAction.decision);setQuoteError("");
    const {data,error}=await supabase.rpc("respond_to_quote",{quote_id:quoteAction.quote.id,decision:quoteAction.decision,message:quoteMsg});
    setQuoteBusy("");
    if(error){setQuoteError(error.message||"Could not update quote.");return;}
    const row=Array.isArray(data)?data[0]:data;
    if(row)setQuotes(prev=>prev.map(q=>q.id===row.id?mapQuote(row):q));
    setQuoteAction(null);setQuoteMsg("");
  }
  async function copyBuyerQuoteSummary(q){
    const next=buyerQuoteNextAction(q);
    const text=[
      `Epistable quote: ${q.id}`,
      `Factory: ${q.factoryName||q.factory_name||fac?.name||"Verified factory"}`,
      `Slab: ${q.slabId||q.slab_id||"-"} | ${q.stone} | ${q.grade}`,
      `Area: ${Number(q.areaSqFt||q.area_sq_ft||0).toLocaleString("en-IN")} sq ft`,
      `Total: Rs ${Number(q.totalAmount||q.total_amount||0).toLocaleString("en-IN")}`,
      `Status: ${next.label}`,
      `${window.location.origin}/quote/${encodeURIComponent(q.id)}`,
    ].join("\n");
    try{await navigator.clipboard.writeText(text);setCopiedQuote(q.id);setTimeout(()=>setCopiedQuote(""),1400);}catch(e){window.prompt("Copy quote summary",text);}
  }
  const filtered=quotes.filter(q=>{
    const expired=q.validityTs&&q.validityTs<Date.now()&&q.status==="sent";
    const matchesFilter=filter==="respond"?q.status==="sent"&&!expired:
      filter==="accepted"?q.status==="accepted"&&activeFulfillment(q)!=="sold":
      filter==="closed"?expired||q.status==="revised"||activeFulfillment(q)==="sold":
      !expired&&q.status!=="revised"&&activeFulfillment(q)!=="sold";
    const hay=[q.id,q.stone,q.grade,q.slabId,q.slab_id,q.factoryName,q.factory_name,q.buyerMessage,q.buyer_message].filter(Boolean).join(" ").toLowerCase();
    return matchesFilter&&(!search||hay.includes(search.toLowerCase()));
  }).sort((a,b)=>{
    if(sortBy==="newest")return Number(b.created_at||0)-Number(a.created_at||0);
    if(sortBy==="valueHigh")return Number(b.totalAmount||b.total_amount||0)-Number(a.totalAmount||a.total_amount||0);
    if(sortBy==="valueLow")return Number(a.totalAmount||a.total_amount||0)-Number(b.totalAmount||b.total_amount||0);
    return buyerQuotePriority(a)-buyerQuotePriority(b)||Number(b.created_at||0)-Number(a.created_at||0);
  });
  const needResponse=quotes.filter(q=>q.status==="sent"&&!(q.validityTs&&q.validityTs<Date.now())).length;
  const accepted=quotes.filter(q=>q.status==="accepted"&&activeFulfillment(q)!=="sold").length;
  if(loading)return <Loader/>;
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',sans-serif",color:C.text}}>
      {quoteAction&&<Modal title={quoteAction.decision==="accepted"?"Accept Quote":"Request Changes"} onClose={()=>{setQuoteAction(null);setQuoteError("");}}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
            <div style={{fontSize:13,fontWeight:900,marginBottom:3}}>{quoteAction.quote.stone} - Rs {Number(quoteAction.quote.totalAmount||0).toLocaleString("en-IN")}</div>
            <div style={{fontSize:11,color:C.textDim}}>{quoteAction.quote.grade} - {quoteAction.quote.id}</div>
          </div>
          <textarea value={quoteMsg} onChange={e=>setQuoteMsg(e.target.value)} rows={3} placeholder={quoteAction.decision==="accepted"?"Optional note for the factory":"What should the factory change?"} style={{width:"100%",padding:"11px 12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:"sans-serif",resize:"none",outline:"none",boxSizing:"border-box"}}/>
          {quoteError&&<div style={{fontSize:12,color:C.red,background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 10px"}}>{quoteError}</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Btn variant="secondary" onClick={()=>setQuoteAction(null)}>Cancel</Btn>
            <Btn variant={quoteAction.decision==="accepted"?"green":"primary"} onClick={submitQuoteAction} disabled={!!quoteBusy}>{quoteBusy?"Sending...":quoteAction.decision==="accepted"?"Accept Quote":"Send Request"}</Btn>
          </div>
        </div>
      </Modal>}
      <div style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary},${C.teal})`,padding:"16px 16px 22px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:16}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,color:C.white,padding:"7px 12px",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"sans-serif"}}>Back</button>
          <button onClick={onLogout} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,color:C.white,padding:"7px 12px",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"sans-serif"}}>Sign Out</button>
        </div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.68)",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:5}}>Buyer Quotes</div>
        <div style={{fontSize:24,fontWeight:900,color:C.white,marginBottom:4}}>Track quotes and orders</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.75)"}}>{fac?.name||buyer.factory_name||"Factory"} - {quotes.length} quotes</div>
      </div>
      <div style={{padding:"14px 14px 60px"}}>
        <KpiGrid items={[{label:"Need Response",value:needResponse,icon:"Reply",color:C.primary},{label:"Accepted",value:accepted,icon:"Won",color:C.green},{label:"Total Quotes",value:quotes.length,icon:"Quote",color:C.text},{label:"Factory",value:fac?.name?"1":"-",icon:"Mill",color:C.teal}]}/>
        <Card style={{padding:12,marginBottom:14}}>
          <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(130px,180px)",gap:8}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search quote, slab, stone..." style={{padding:"11px 12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:"sans-serif",outline:"none",minWidth:0}}/>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{padding:"11px 12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:"sans-serif",outline:"none",minWidth:0}}>
              <option value="priority">Priority first</option>
              <option value="newest">Newest first</option>
              <option value="valueHigh">Value high-low</option>
              <option value="valueLow">Value low-high</option>
            </select>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginTop:9}}>
            <div style={{fontSize:12,color:C.textDim,fontWeight:800}}>{filtered.length} of {quotes.length} quotes shown</div>
            <button onClick={()=>{setSearch("");setSortBy("priority");setFilter("active");}} style={{background:"transparent",border:"none",color:C.primary,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"sans-serif"}}>Reset</button>
          </div>
        </Card>
        <div style={{display:"flex",gap:8,overflowX:"auto",marginBottom:14}}>
          {[["active","Active"],["respond","Need response"],["accepted","Accepted"],["closed","Closed"]].map(([id,label])=>(
            <button key={id} onClick={()=>setFilter(id)} style={{padding:"8px 14px",background:filter===id?C.primary:C.white,border:`1px solid ${filter===id?C.primary:C.border}`,borderRadius:20,color:filter===id?C.white:C.textMid,fontSize:12,fontWeight:900,cursor:"pointer",fontFamily:"sans-serif",whiteSpace:"nowrap",flexShrink:0}}>{label}</button>
          ))}
        </div>
        {filtered.length===0?<Card style={{padding:"42px 24px",textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:900,marginBottom:6}}>No quotes here yet</div>
          <div style={{fontSize:13,color:C.textDim,marginBottom:16}}>Browse verified slabs and express interest to receive a quote.</div>
          <Btn onClick={()=>onViewPortal(buyerFactoryId)}>Browse Inventory</Btn>
        </Card>:<div style={{display:"flex",flexDirection:"column",gap:12}}>
          {filtered.map(q=>{const s=quoteStatusConf(q.status);const f=fulfillmentConf(activeFulfillment(q));const next=buyerQuoteNextAction(q);const expired=q.validityTs&&q.validityTs<Date.now()&&q.status==="sent";const canRespond=q.status==="sent"&&!expired;return(
            <Card key={q.id} style={{padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:10}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:15,fontWeight:900,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.stone}</div>
                  <div style={{fontSize:11,color:C.textDim,marginTop:2}}>{q.grade} - {q.id} - {fmtD(q.created_at)}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:900,color:C.green}}>Rs {Number(q.totalAmount||0).toLocaleString("en-IN")}</div>
                  <div style={{fontSize:11,color:C.textDim}}>{q.validityTs?`Valid ${fmtD(q.validityTs)}`:"No validity"}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:10}}>
                <span style={{background:s.bg,border:`1px solid ${s.b}`,color:s.c,padding:"4px 9px",borderRadius:20,fontSize:10,fontWeight:900}}>{expired?"Expired":s.label}</span>
                {q.status==="accepted"&&<span style={{background:f.bg,border:`1px solid ${f.border}`,color:f.color,padding:"4px 9px",borderRadius:20,fontSize:10,fontWeight:900}}>{f.label}</span>}
              </div>
              <div style={{background:next.bg,border:`1px solid ${next.border}`,borderRadius:10,padding:"9px 11px",fontSize:12,fontWeight:900,color:next.color,marginBottom:12}}>{next.label}</div>
              <BuyerQuoteTimeline quote={q}/>
              {(q.buyerMessage||q.buyer_message)&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,padding:10,fontSize:12,color:C.textMid,lineHeight:1.45,marginTop:12}}><span style={{fontWeight:900,color:C.text}}>Your note:</span> {q.buyerMessage||q.buyer_message}</div>}
              <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end",marginTop:12}}>
                <Btn size="sm" variant="secondary" onClick={()=>window.open(`/quote/${encodeURIComponent(q.id)}`,"_blank","noopener,noreferrer")}>Open Quote</Btn>
                <Btn size="sm" variant="secondary" onClick={()=>copyBuyerQuoteSummary(q)}>{copiedQuote===q.id?"Copied":"Copy Summary"}</Btn>
                {q.slabId&&<Btn size="sm" variant="secondary" onClick={()=>window.location.assign(`/slab/${encodeURIComponent(q.slabId)}`)}>Slab Certificate</Btn>}
                {canRespond&&<Btn size="sm" variant="ghost" onClick={()=>openQuoteAction(q,"revision_requested")}>Request Changes</Btn>}
                {canRespond&&<Btn size="sm" variant="green" onClick={()=>openQuoteAction(q,"accepted")}>Accept</Btn>}
              </div>
            </Card>
          );})}
        </div>}
      </div>
    </div>
  );
}

function BuyerHome({buyer,onLogout,onViewPortal,onViewQuotes}) {
  const [fac,setFac]=useState(null);const [insps,setInsps]=useState([]);const [inquiries,setInquiries]=useState([]);const [quotes,setQuotes]=useState([]);
  const [quoteAction,setQuoteAction]=useState(null);const [quoteMsg,setQuoteMsg]=useState("");const [quoteBusy,setQuoteBusy]=useState("");const [quoteError,setQuoteError]=useState("");
  const [resolvedFactoryId,setResolvedFactoryId]=useState(buyer.factory_id||buyer.factoryId||"");
  const buyerFactoryId=buyer.factory_id||buyer.factoryId||resolvedFactoryId;
  useEffect(()=>{
    let active=true;
    async function load(){
      let fid=buyerFactoryId;
      if(!fid){fid=await resolveBuyerFactoryId(buyer);if(active&&fid)setResolvedFactoryId(fid);}
      if(!fid||!active)return;
      const [f,i,q,qt]=await Promise.all([DB.getFac(fid),DB.facInsps(fid),DB.buyerInquiries(buyer.email,fid),DB.buyerQuotes(buyer.email,fid)]);
      if(active){setFac(f);setInsps(i.filter(x=>x.grade==="Premium"||x.grade==="Standard"));setInquiries(q);setQuotes(qt);}
    }
    load();
    return()=>{active=false;};
  },[buyer.email,buyer.factory_id,buyer.factoryId,resolvedFactoryId]);
  const activeInquiries=inquiries.filter(q=>q.status!=="closed").length;
  const visibleQuotes=[...quotes].sort((a,b)=>buyerQuotePriority(a)-buyerQuotePriority(b)||Number(b.created_at||0)-Number(a.created_at||0));
  const activeQuotes=quotes.filter(q=>!(q.status==="sent"&&q.validityTs&&q.validityTs<Date.now())&&!["revised","expired","sold"].includes(q.status)&&activeFulfillment(q)!=="sold").length;
  const responseQuotes=quotes.filter(q=>q.status==="sent"&&!(q.validityTs&&q.validityTs<Date.now())).length;
  const priorityQuote=visibleQuotes[0];
  const priorityAction=priorityQuote?buyerQuoteNextAction(priorityQuote):null;
  function openQuoteAction(q,decision){setQuoteAction({quote:q,decision});setQuoteMsg("");setQuoteError("");}
  async function submitQuoteAction(){
    if(!quoteAction||quoteBusy)return;
    setQuoteBusy(quoteAction.decision);setQuoteError("");
    const {data,error}=await supabase.rpc("respond_to_quote",{quote_id:quoteAction.quote.id,decision:quoteAction.decision,message:quoteMsg});
    setQuoteBusy("");
    if(error){setQuoteError(error.message||"Could not update quote.");return;}
    const row=Array.isArray(data)?data[0]:data;
    if(row)setQuotes(prev=>prev.map(q=>q.id===row.id?mapQuote(row):q));
    setQuoteAction(null);setQuoteMsg("");
  }
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',sans-serif",color:C.text}}>
      {quoteAction&&<Modal title={quoteAction.decision==="accepted"?"Accept Quote":"Request Changes"} onClose={()=>{setQuoteAction(null);setQuoteError("");}}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
            <div style={{fontSize:13,fontWeight:900,marginBottom:3}}>{quoteAction.quote.stone} · Rs {Number(quoteAction.quote.totalAmount||0).toLocaleString("en-IN")}</div>
            <div style={{fontSize:11,color:C.textDim}}>{quoteAction.quote.grade} · {quoteAction.quote.id}</div>
          </div>
          <textarea value={quoteMsg} onChange={e=>setQuoteMsg(e.target.value)} rows={3} placeholder={quoteAction.decision==="accepted"?"Optional note for the factory":"What should the factory change?"} style={{width:"100%",padding:"11px 12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:"sans-serif",resize:"none",outline:"none",boxSizing:"border-box"}}/>
          {quoteError&&<div style={{fontSize:12,color:C.red,background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 10px"}}>{quoteError}</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Btn variant="secondary" onClick={()=>setQuoteAction(null)}>Cancel</Btn>
            <Btn variant={quoteAction.decision==="accepted"?"green":"primary"} onClick={submitQuoteAction} disabled={!!quoteBusy}>{quoteBusy? "Sending..." : quoteAction.decision==="accepted"?"Accept Quote":"Send Request"}</Btn>
          </div>
        </div>
      </Modal>}
      <div style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary},${C.teal})`,padding:"20px 18px 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Epistable · Buyer Portal</div>
            <div style={{fontSize:20,fontWeight:800,color:C.white}}>Hello, {buyer.name.split(" ")[0]}!</div>
            {buyer.company&&<div style={{fontSize:13,color:"rgba(255,255,255,0.7)",marginTop:2}}>{buyer.company}</div>}
          </div>
          <button onClick={onLogout} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,color:C.white,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>Sign Out</button>
        </div>
        <div style={{background:"rgba(255,255,255,0.12)",borderRadius:12,padding:"14px 16px"}}>
          <div style={{fontSize:16,lineHeight:1.3,fontWeight:800,letterSpacing:0,color:C.white,marginBottom:2}}>{fac?.name||buyer.factory_name}</div>
          <div style={{fontSize:12,lineHeight:1.45,color:"rgba(255,255,255,0.7)",marginBottom:12}}>{fac?.location} · Verified by Epistable</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {[["Available",insps.length,"📦"],["Inquiries",activeInquiries,"📩"],["Quotes",activeQuotes,"Quote"]].map(([l,v,icon])=>(
              <div key={l} style={{background:"rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 6px",textAlign:"center"}}><div style={{fontSize:11}}>{icon}</div><div style={{fontSize:18,fontWeight:800,color:C.white,lineHeight:1.1,letterSpacing:0,marginBottom:2}}>{v}</div><div style={{fontSize:10,lineHeight:1.3,color:"rgba(255,255,255,0.65)"}}>{l}</div></div>
            ))}
          </div>
        </div>
      </div>
      <div style={{padding:"16px 16px 48px"}}>
        <div onClick={()=>{try{if(buyerFactoryId)localStorage.setItem("epistable_last_buyer_factory_id",buyerFactoryId);}catch{}onViewPortal(buyerFactoryId);}} style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary})`,borderRadius:14,padding:"20px",marginBottom:14,display:"flex",alignItems:"center",gap:16,cursor:"pointer"}}>
          <div style={{width:52,height:52,borderRadius:12,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>🪨</div>
          <div style={{flex:1}}><div style={{fontSize:16,lineHeight:1.3,fontWeight:800,letterSpacing:0,color:C.white,marginBottom:3}}>View Verified Inventory</div><div style={{fontSize:12,lineHeight:1.45,color:"rgba(255,255,255,0.7)"}}>{insps.length} slabs available</div></div>
          <span style={{fontSize:22,color:"rgba(255,255,255,0.5)"}}>→</span>
        </div>
        <div onClick={onViewQuotes} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px 20px",marginBottom:14,display:"flex",alignItems:"center",gap:14,cursor:"pointer",boxShadow:C.shadow}}>
          <div style={{width:46,height:46,borderRadius:12,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:C.primary,flexShrink:0}}>Quote</div>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:15,fontWeight:900,color:C.text,marginBottom:3}}>Track Quotes & Orders</div><div style={{fontSize:12,color:C.textMid}}>{activeQuotes} active quotes, {responseQuotes} waiting for response</div></div>
          <span style={{fontSize:20,color:C.textDim}}>&gt;</span>
        </div>
        {priorityQuote&&<Card style={{padding:14,marginBottom:14,borderColor:priorityAction.border,background:priorityAction.bg}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:10}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:11,fontWeight:900,color:priorityAction.color,textTransform:"uppercase",marginBottom:4}}>Next action</div>
              <div style={{fontSize:15,fontWeight:900,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{priorityQuote.stone}</div>
              <div style={{fontSize:12,color:C.textMid,marginTop:3}}>{priorityQuote.grade} - Rs {Number(priorityQuote.totalAmount||0).toLocaleString("en-IN")}</div>
            </div>
            <span style={{fontSize:11,fontWeight:900,color:priorityAction.color,background:C.white,border:`1px solid ${priorityAction.border}`,borderRadius:20,padding:"5px 9px",whiteSpace:"nowrap"}}>{priorityAction.label}</span>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
            <Btn size="sm" variant="secondary" onClick={onViewQuotes}>Track</Btn>
            <Btn size="sm" variant="secondary" onClick={()=>window.open(`/quote/${encodeURIComponent(priorityQuote.id)}`,"_blank","noopener,noreferrer")}>Open Quote</Btn>
            {priorityQuote.status==="sent"&&!(priorityQuote.validityTs&&priorityQuote.validityTs<Date.now())&&<Btn size="sm" variant="green" onClick={()=>openQuoteAction(priorityQuote,"accepted")}>Accept</Btn>}
          </div>
        </Card>}
        <div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:12,padding:"12px 14px",display:"flex",gap:10}}>
          <span style={{fontSize:18,flexShrink:0}}>🛡️</span>
          <div><div style={{...TEXT.itemTitle,color:C.green,marginBottom:2}}>Epistable Verified</div><div style={{...TEXT.meta,color:C.textMid}}>All slabs independently graded. Records are tamper-proof.</div></div>
        </div>
        {quotes.length>0&&<Card style={{marginTop:14}}>
          <div style={{padding:"13px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
            <div><div style={{fontSize:14,fontWeight:800}}>My Quotes</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>Track quotes sent by the factory</div></div>
            <button onClick={onViewQuotes} style={{background:"transparent",border:"none",color:C.primary,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"sans-serif",whiteSpace:"nowrap"}}>View all</button>
          </div>
          {visibleQuotes.slice(0,5).map((q,i)=>{const s=quoteStatusConf(q.status);const f=fulfillmentConf(activeFulfillment(q));const expired=q.validityTs&&q.validityTs<Date.now();const canRespond=q.status==="sent"&&!expired;return(
            <div key={q.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderBottom:i<Math.min(visibleQuotes.length,5)-1?`1px solid ${C.border}`:"none",flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:800,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.stone} · Rs {Number(q.totalAmount||0).toLocaleString("en-IN")}</div>
                <div style={{fontSize:11,color:C.textDim}}>{q.grade} · {fmtD(q.created_at)}</div>
              </div>
              <span style={{background:s.bg,border:`1px solid ${s.b}`,color:s.c,padding:"3px 9px",borderRadius:20,fontSize:10,fontWeight:800,whiteSpace:"nowrap"}}>{s.label}</span>
              {q.status==="accepted"&&<span style={{background:f.bg,border:`1px solid ${f.border}`,color:f.color,padding:"3px 9px",borderRadius:20,fontSize:10,fontWeight:800,whiteSpace:"nowrap"}}>{f.label}</span>}
              <button onClick={onViewQuotes} style={{background:C.white,border:`1px solid ${C.primaryBorder}`,borderRadius:8,color:C.primary,padding:"5px 8px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"sans-serif",whiteSpace:"nowrap"}}>Track</button>
              <button onClick={()=>window.open(`/quote/${encodeURIComponent(q.id)}`,"_blank","noopener,noreferrer")} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,color:C.primary,padding:"5px 8px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"sans-serif",whiteSpace:"nowrap"}}>Open</button>
              {q.slabId&&<button onClick={()=>window.location.assign(`/slab/${encodeURIComponent(q.slabId)}`)} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,color:C.textMid,padding:"5px 8px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"sans-serif",whiteSpace:"nowrap"}}>Slab</button>}
              {canRespond&&<button onClick={()=>openQuoteAction(q,"revision_requested")} style={{background:C.white,border:`1px solid ${C.amberBorder}`,borderRadius:8,color:C.amber,padding:"5px 8px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"sans-serif",whiteSpace:"nowrap"}}>Changes</button>}
              {canRespond&&<button onClick={()=>openQuoteAction(q,"accepted")} style={{background:C.green,border:"none",borderRadius:8,color:C.white,padding:"5px 8px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"sans-serif",whiteSpace:"nowrap"}}>Accept</button>}
            </div>
          );})}
        </Card>}
        {inquiries.length>0&&<Card style={{marginTop:14}}>
          <div style={{padding:"13px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:14,fontWeight:800}}>My Inquiries</div>
            <button onClick={onViewPortal} style={{background:"transparent",border:"none",color:C.primary,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"sans-serif"}}>Browse slabs</button>
          </div>
          {inquiries.slice(0,4).map((q,i)=>(
            <div key={q.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderBottom:i<Math.min(inquiries.length,4)-1?`1px solid ${C.border}`:"none"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:800,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.stone}</div>
                <div style={{fontSize:11,color:C.textDim}}>{q.grade} · {fmtD(q.created_at)}</div>
              </div>
              <InqPill status={q.status}/>
            </div>
          ))}
        </Card>}
      </div>
    </div>
  );
}

function slabDims(slab) {
  const m=slab?.measurements||{};
  return m.length&&m.width?`${m.length} x ${m.width} cm`:"Size not recorded";
}

function BuyerPortal({factoryId,onBack,buyer}) {
  const [fac,setFac]=useState(null);const [insps,setInsps]=useState([]);const [filter,setFilter]=useState("All");const [search,setSearch]=useState("");
  const [stoneFilter,setStoneFilter]=useState("All");const [supplierFilter,setSupplierFilter]=useState("All");const [exportFilter,setExportFilter]=useState("All");const [statusFilter,setStatusFilter]=useState("available");
  const [maxPrice,setMaxPrice]=useState("");const [sortBy,setSortBy]=useState("newest");
  const [viewMode,setViewMode]=useState("all");const [savedIds,setSavedIds]=useState([]);
  const localFactoryId=()=>{try{return localStorage.getItem("epistable_last_buyer_factory_id")||"";}catch{return "";}};
  const [portalFactoryId,setPortalFactoryId]=useState(factoryId||buyer?.factory_id||buyer?.factoryId||localFactoryId());
  const [inquiry,setInquiry]=useState(null);const [inquiryMsg,setInquiryMsg]=useState("");const [inquirySent,setInquirySent]=useState(false);
  const [quoteReq,setQuoteReq]=useState({areaSqFt:"",deliveryLocation:"",targetDate:"",notes:""});
  const [qrSlab,setQrSlab]=useState(null);
  const [shortlistCopied,setShortlistCopied]=useState(false);
  const {isMobile}=useBP();
  const shortlistKey=`epistable_shortlist_${buyer?.id||buyer?.email||factoryId||"guest"}`;
  useEffect(()=>{
    let active=true;
    async function load(){
      let fid=factoryId||buyer?.factory_id||buyer?.factoryId||portalFactoryId||localFactoryId();
      if(!fid&&buyer?.email){
        const freshBuyer=await DB.getBuyerByEmail(buyer.email);
        fid=freshBuyer?.factory_id||freshBuyer?.factoryId||"";
      }
      if(!fid&&buyer?.factory_name){
        const namedFac=await DB.getFacByName(buyer.factory_name);
        fid=namedFac?.id||"";
      }
      if(!fid)return;
      if(active)setPortalFactoryId(fid);
      const [f,i]=await Promise.all([DB.getFac(fid),DB.facInsps(fid)]);
      if(active){setFac(f);setInsps(i.filter(x=>x.grade==="Premium"||x.grade==="Standard"));}
    }
    load();
    return()=>{active=false;};
  },[factoryId,buyer?.email,buyer?.factory_id,buyer?.factoryId]);
  useEffect(()=>{
    try{setSavedIds(JSON.parse(localStorage.getItem(shortlistKey)||"[]"));}catch{setSavedIds([]);}
  },[shortlistKey]);
  const savedSet=new Set(savedIds);
  const savedSlabs=insps.filter(i=>savedSet.has(i.id));
  const availableCount=insps.filter(i=>(i.inventoryStatus||"available")==="available").length;
  const reservedCount=insps.filter(i=>(i.inventoryStatus||"available")==="reserved").length;
  const exportCount=insps.filter(i=>i.exportReady).length;
  const premiumCount=insps.filter(i=>i.grade==="Premium").length;
  function toggleSaved(id){
    setSavedIds(prev=>{
      const next=prev.includes(id)?prev.filter(x=>x!==id):[id,...prev];
      try{localStorage.setItem(shortlistKey,JSON.stringify(next));}catch{}
      return next;
    });
  }
  async function copyShortlist(){
    const lines=savedSlabs.map(s=>`${s.stone} | ${s.grade} | Rs ${s.pricePerSqFt}/sqft | ${window.location.origin}/slab/${encodeURIComponent(s.id)}`);
    const text=lines.length?lines.join("\n"):"No slabs saved yet.";
    try{await navigator.clipboard.writeText(text);setShortlistCopied(true);setTimeout(()=>setShortlistCopied(false),1400);}catch(e){window.prompt("Copy shortlist",text);}
  }
  const stoneOptions=["All",...Array.from(new Set(insps.map(i=>i.stone).filter(Boolean))).sort()];
  const supplierOptions=["All",...Array.from(new Set(insps.map(i=>i.supplier).filter(Boolean))).sort()];
  const filtered=insps
    .filter(i=>(filter==="All"||i.grade===filter)
      &&(viewMode==="all"||savedSet.has(i.id))
      &&(stoneFilter==="All"||i.stone===stoneFilter)
      &&(supplierFilter==="All"||i.supplier===supplierFilter)
      &&(exportFilter==="All"||(exportFilter==="Export"&&i.exportReady)||(exportFilter==="Domestic"&&!i.exportReady))
      &&(statusFilter==="All"||(i.inventoryStatus||"available")===statusFilter)
      &&(!maxPrice||Number(i.pricePerSqFt||0)<=Number(maxPrice))
      &&(!search||[i.stone,i.id,i.supplier,i.grade,slabDims(i),...(i.defects||[])].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())))
    .sort((a,b)=>{
      if(sortBy==="priceLow")return Number(a.pricePerSqFt||0)-Number(b.pricePerSqFt||0);
      if(sortBy==="priceHigh")return Number(b.pricePerSqFt||0)-Number(a.pricePerSqFt||0);
      if(sortBy==="grade")return (a.grade==="Premium"?0:1)-(b.grade==="Premium"?0:1);
      return Number(b.ts||0)-Number(a.ts||0);
    });
  const clearFilters=()=>{setViewMode("all");setFilter("All");setStoneFilter("All");setSupplierFilter("All");setExportFilter("All");setStatusFilter("available");setMaxPrice("");setSortBy("newest");setSearch("");};
  function openQuoteRequest(slab){
    setInquiry(slab);
    setInquiryMsg("");
    setQuoteReq({areaSqFt:"",deliveryLocation:"",targetDate:"",notes:""});
    setInquirySent(false);
  }
  async function submitInquiry(){
    if(!inquiry)return;
    const requestLines=[
      "Quote request",
      quoteReq.areaSqFt?`Area required: ${quoteReq.areaSqFt} sq ft`:null,
      quoteReq.deliveryLocation?`Delivery location: ${quoteReq.deliveryLocation}`:null,
      quoteReq.targetDate?`Target date: ${quoteReq.targetDate}`:null,
      quoteReq.notes?`Buyer notes: ${quoteReq.notes}`:null,
      inquiryMsg?`Additional message: ${inquiryMsg}`:null
    ].filter(Boolean);
    await DB.createInquiry({slabId:inquiry.id,stone:inquiry.stone,grade:inquiry.grade,pricePerSqFt:inquiry.pricePerSqFt,factoryId:portalFactoryId,factoryName:fac?.name||"",buyerName:buyer?.name||"Guest Buyer",buyerCompany:buyer?.company||"",buyerEmail:buyer?.email||"",message:requestLines.join("\n")});
    setInquirySent(true);
  }
  const estimateTotal=quoteReq.areaSqFt&&inquiry?Math.round(Number(quoteReq.areaSqFt||0)*Number(inquiry.pricePerSqFt||0)):0;
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',sans-serif",color:C.text}}>
      {qrSlab&&<SlabQRModal slab={qrSlab} onClose={()=>setQrSlab(null)}/>}
      <div style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary},${C.teal})`}}>
        <div style={{padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {onBack&&<button onClick={onBack} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,color:"#fff",padding:"6px 12px",fontSize:12,cursor:"pointer",fontFamily:"sans-serif"}}>← Back</button>}
            <div style={{fontSize:15,fontWeight:800,color:"#fff"}}>Epistable</div>
          </div>
          <div style={{background:"rgba(255,255,255,0.1)",borderRadius:20,padding:"4px 12px",display:"flex",alignItems:"center",gap:5}}><div style={{width:6,height:6,borderRadius:"50%",background:"#4ade80"}}/><span style={{fontSize:11,color:"rgba(255,255,255,0.8)",fontWeight:600}}>Verified</span></div>
        </div>
        <div style={{padding:"0 18px 20px"}}>
          <div style={{fontSize:20,fontWeight:800,color:"#fff",marginBottom:4}}>{fac?.name||"Factory"}</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.7)",marginBottom:14}}>{insps.length} verified slabs available</div>
        </div>
      </div>
      <div style={{padding:"14px 14px 80px"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search slab ID or stone type…" style={{width:"100%",padding:"11px 14px",background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"sans-serif",marginBottom:10}}/>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:8,marginBottom:10}}>
          {[["Available",availableCount,C.green],["Reserved",reservedCount,C.amber],["Export Ready",exportCount,C.teal],["Premium",premiumCount,C.primary]].map(([label,value,color])=>(
            <div key={label} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 11px"}}>
              <div style={{fontSize:18,fontWeight:900,color,lineHeight:1}}>{value}</div>
              <div style={{fontSize:10,color:C.textDim,fontWeight:800,marginTop:5}}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          {[{id:"all",label:"All slabs",count:insps.length},{id:"saved",label:"Shortlist",count:savedIds.length}].map(v=>(
            <button key={v.id} onClick={()=>setViewMode(v.id)} style={{padding:"10px 12px",background:viewMode===v.id?C.primary:C.white,border:`1px solid ${viewMode===v.id?C.primary:C.border}`,borderRadius:10,color:viewMode===v.id?C.white:C.textMid,fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <span>{v.label}</span>
              <span style={{fontSize:11,opacity:0.75}}>({v.count})</span>
            </button>
          ))}
        </div>
        {savedIds.length>0&&<Card style={{padding:"10px 12px",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,background:viewMode==="saved"?C.primaryBg:C.white,borderColor:viewMode==="saved"?C.primaryBorder:C.border}}>
          <div style={{fontSize:12,color:C.textMid,fontWeight:800}}>{savedIds.length} saved slab{savedIds.length===1?"":"s"} in this browser</div>
          <button onClick={copyShortlist} style={{background:C.white,border:`1px solid ${C.primaryBorder}`,borderRadius:8,color:C.primary,padding:"6px 10px",fontSize:11,fontWeight:900,cursor:"pointer",fontFamily:"sans-serif",whiteSpace:"nowrap"}}>{shortlistCopied?"Copied":"Copy shortlist"}</button>
        </Card>}
        <div style={{display:"flex",gap:8,overflowX:"auto",marginBottom:14}}>
          {["All","Premium","Standard"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{padding:"7px 16px",background:filter===f?C.primary:"transparent",border:`1px solid ${filter===f?C.primary:C.border}`,borderRadius:20,color:filter===f?C.white:C.textMid,fontSize:13,fontWeight:filter===f?600:400,cursor:"pointer",fontFamily:"sans-serif",whiteSpace:"nowrap",flexShrink:0}}>{f}</button>
          ))}
        </div>
        <Card style={{padding:12,marginBottom:14}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(6,1fr)",gap:8}}>
            <select value={stoneFilter} onChange={e=>setStoneFilter(e.target.value)} style={{padding:"10px",border:`1px solid ${C.border}`,borderRadius:8,background:C.white,fontSize:12,fontFamily:"sans-serif",minWidth:0}}>
              {stoneOptions.map(o=><option key={o} value={o}>{o==="All"?"All stones":o}</option>)}
            </select>
            <select value={supplierFilter} onChange={e=>setSupplierFilter(e.target.value)} style={{padding:"10px",border:`1px solid ${C.border}`,borderRadius:8,background:C.white,fontSize:12,fontFamily:"sans-serif",minWidth:0}}>
              {supplierOptions.map(o=><option key={o} value={o}>{o==="All"?"All suppliers":o}</option>)}
            </select>
            <select value={exportFilter} onChange={e=>setExportFilter(e.target.value)} style={{padding:"10px",border:`1px solid ${C.border}`,borderRadius:8,background:C.white,fontSize:12,fontFamily:"sans-serif",minWidth:0}}>
              <option value="All">Export + domestic</option>
              <option value="Export">Export ready</option>
              <option value="Domestic">Domestic only</option>
            </select>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{padding:"10px",border:`1px solid ${C.border}`,borderRadius:8,background:C.white,fontSize:12,fontFamily:"sans-serif",minWidth:0}}>
              <option value="available">Available only</option>
              <option value="reserved">Reserved</option>
              <option value="sold">Sold</option>
              <option value="All">All statuses</option>
            </select>
            <input value={maxPrice} onChange={e=>setMaxPrice(e.target.value.replace(/[^0-9]/g,""))} inputMode="numeric" placeholder="Max Rs/sqft" style={{padding:"10px",border:`1px solid ${C.border}`,borderRadius:8,background:C.white,fontSize:12,fontFamily:"sans-serif",minWidth:0}}/>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{padding:"10px",border:`1px solid ${C.border}`,borderRadius:8,background:C.white,fontSize:12,fontFamily:"sans-serif",minWidth:0}}>
              <option value="newest">Newest first</option>
              <option value="priceLow">Price low-high</option>
              <option value="priceHigh">Price high-low</option>
              <option value="grade">Premium first</option>
            </select>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginTop:10}}>
            <div style={{fontSize:12,color:C.textDim,fontWeight:700}}>{filtered.length} of {insps.length} slabs shown</div>
            <button onClick={clearFilters} style={{background:"transparent",border:"none",color:C.primary,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"sans-serif"}}>Reset filters</button>
          </div>
        </Card>
        {filtered.length===0?<div style={{background:"#fff",borderRadius:12,padding:"40px 24px",textAlign:"center"}}><div style={{fontSize:36,marginBottom:10}}>🪨</div><div style={{fontSize:15,fontWeight:700}}>{viewMode==="saved"?"No saved slabs yet":"No slabs available yet"}</div></div>:
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
          {filtered.map(slab=>{
            const g=gradeConf(slab.grade);
            const inv=slab.inventoryStatus||"available";
            const canInquire=inv==="available";
            const saved=savedSet.has(slab.id);
            return (
              <div key={slab.id} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
                <div onClick={()=>window.location.assign(`/slab/${encodeURIComponent(slab.id)}`)} style={{cursor:"pointer"}}>
                  <div style={{aspectRatio:"16/9",background:g.bg,position:"relative",overflow:"hidden"}}>
                    {slab.photo?<img src={slab.photo} alt={slab.stone} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:
                    <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:28}}>{g.emoji}</span></div>}
                    <div style={{position:"absolute",top:8,right:8,background:g.bg,border:`1px solid ${g.border}`,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,color:g.color}}>{slab.grade}</div>
                    <button onClick={e=>{e.stopPropagation();setQrSlab(slab);}} style={{position:"absolute",top:8,left:8,background:"rgba(255,255,255,0.9)",border:"none",borderRadius:8,padding:"4px 8px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"sans-serif"}}>🔲 QR</button>
                    <button onClick={e=>{e.stopPropagation();toggleSaved(slab.id);}} style={{position:"absolute",top:8,left:58,background:saved?C.primary:C.white,border:`1px solid ${saved?C.primary:C.border}`,borderRadius:8,padding:"4px 8px",fontSize:11,fontWeight:800,color:saved?C.white:C.textMid,cursor:"pointer",fontFamily:"sans-serif"}}>{saved?"Saved":"Save"}</button>
                    <div style={{position:"absolute",bottom:8,left:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                      <InventoryPill status={inv}/>
                      {slab.exportReady&&<span style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:20,padding:"3px 9px",fontSize:10,fontWeight:800,color:C.green}}>Export ready</span>}
                    </div>
                  </div>
                  <div style={{padding:"12px 14px 8px"}}>
                    <div style={{fontSize:14,fontWeight:800,marginBottom:3}}>{slab.stone}</div>
                    <div style={{fontSize:11,color:C.textDim,marginBottom:8}}>{slab.date} · {slabDims(slab)}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                      {slab.supplier&&<span style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:"3px 8px",fontSize:10,fontWeight:700,color:C.textMid}}>{slab.supplier}</span>}
                      {(slab.defects||[]).length===0?<span style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:20,padding:"3px 8px",fontSize:10,fontWeight:700,color:C.green}}>No defects</span>:<span style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:20,padding:"3px 8px",fontSize:10,fontWeight:700,color:C.amber}}>{slab.defects.length} defects</span>}
                    </div>
                  </div>
                </div>
                <div style={{padding:"0 14px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:`1px solid ${C.border}`,paddingTop:8}}>
                  <div style={{fontSize:16,lineHeight:1.25,fontWeight:800,letterSpacing:0,color:C.green}}>₹{slab.pricePerSqFt}<span style={{fontSize:11,fontWeight:400,color:C.textDim}}>/sqft</span></div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>
                    <button onClick={()=>window.location.assign(`/slab/${encodeURIComponent(slab.id)}`)} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 9px",color:C.textMid,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"sans-serif"}}>View</button>
                    <button onClick={()=>toggleSaved(slab.id)} style={{background:saved?C.primary:C.white,border:`1px solid ${saved?C.primary:C.border}`,borderRadius:8,padding:"5px 9px",color:saved?C.white:C.textMid,fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"sans-serif"}}>{saved?"Saved":"Save"}</button>
                    <button disabled={!canInquire} onClick={()=>{if(!canInquire)return;openQuoteRequest(slab);}} style={{background:canInquire?C.primaryBg:C.surface,border:`1px solid ${canInquire?C.primaryBorder:C.border}`,borderRadius:8,padding:"5px 10px",color:canInquire?C.primary:C.textDim,fontSize:11,fontWeight:700,cursor:canInquire?"pointer":"not-allowed",fontFamily:"sans-serif"}}>{canInquire?"Request Quote":invConf(inv).label}</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>}
      </div>
      {inquiry&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setInquiry(null)}>
          <div style={{background:C.white,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:560,padding:"20px"}} onClick={e=>e.stopPropagation()}>
            {inquirySent?<div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:48,marginBottom:12}}>₹</div>
              <div style={{...TEXT.pageHeader,marginBottom:8}}>Quote Request Sent</div>
              <div style={{fontSize:13,lineHeight:1.5,color:C.textMid,marginBottom:20}}>Your quote request for slab <strong>{inquiry.id}</strong> has been sent to {fac?.name}.</div>
              <button onClick={()=>setInquiry(null)} style={{padding:"12px 28px",background:C.primary,border:"none",borderRadius:10,color:C.white,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>Done</button>
            </div>:<div>
              <div style={{fontSize:16,lineHeight:1.3,fontWeight:800,letterSpacing:0,marginBottom:10}}>Request Quote — {inquiry.stone}</div>
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:12,marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:4}}>
                  <div style={{fontSize:13,fontWeight:900}}>{inquiry.grade} slab</div>
                  <div style={{fontSize:14,fontWeight:900,color:C.green}}>Rs {inquiry.pricePerSqFt}/sqft</div>
                </div>
                <div style={{fontSize:11,color:C.textDim}}>{inquiry.id} · {slabDims(inquiry)}</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                <Inp label="Area Required" value={quoteReq.areaSqFt} onChange={v=>setQuoteReq(p=>({...p,areaSqFt:v.replace(/[^0-9.]/g,"")}))} placeholder="120" hint="sq ft"/>
                <Inp label="Target Date" value={quoteReq.targetDate} onChange={v=>setQuoteReq(p=>({...p,targetDate:v}))} type="date"/>
              </div>
              {estimateTotal>0&&<div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:"10px 12px",fontSize:12,fontWeight:900,color:C.green,marginBottom:10}}>Estimated quote value: Rs {estimateTotal.toLocaleString("en-IN")}</div>}
              <Inp label="Delivery Location" value={quoteReq.deliveryLocation} onChange={v=>setQuoteReq(p=>({...p,deliveryLocation:v}))} placeholder="City, country" />
              <textarea value={quoteReq.notes} onChange={e=>setQuoteReq(p=>({...p,notes:e.target.value}))} placeholder="Requirement notes, payment terms, packing, shipping..." rows={3} style={{width:"100%",padding:"12px 14px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,lineHeight:1.5,outline:"none",resize:"none",boxSizing:"border-box",margin:"12px 0 10px"}}/>
              <textarea value={inquiryMsg} onChange={e=>setInquiryMsg(e.target.value)} placeholder="Optional message to the factory..." rows={2} style={{width:"100%",padding:"12px 14px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,lineHeight:1.5,outline:"none",resize:"none",boxSizing:"border-box",marginBottom:14}}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <button onClick={()=>setInquiry(null)} style={{padding:"12px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>Cancel</button>
                <button onClick={submitInquiry} style={{padding:"12px",background:C.primary,border:"none",borderRadius:10,color:C.white,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>Send Request</button>
              </div>
            </div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ROOT ──
function PublicQuotePage({quoteId}) {
  const [quote,setQuote]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [copied,setCopied]=useState(false);
  const [summaryCopied,setSummaryCopied]=useState(false);
  const [buyerMessage,setBuyerMessage]=useState("");
  const [decisionBusy,setDecisionBusy]=useState("");
  const [decisionError,setDecisionError]=useState("");
  useEffect(()=>{
    let active=true;
    supabase.rpc("get_public_quote",{quote_id:quoteId}).then(({data,error})=>{
      if(!active)return;
      if(error){setError(error.message||"Quote unavailable.");setLoading(false);return;}
      const row=Array.isArray(data)?data[0]:data;
      if(!row)setError("Quote not found.");
      setQuote(row);setLoading(false);
    });
    return()=>{active=false;};
  },[quoteId]);
  if(loading)return <Loader/>;
  if(error)return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <Card style={{padding:24,maxWidth:420,textAlign:"center"}}>
        <div style={{fontSize:18,fontWeight:900,marginBottom:8}}>Quote unavailable</div>
        <div style={{fontSize:13,color:C.textMid}}>{error}</div>
      </Card>
    </div>
  );
  const statusColor={draft:C.textDim,sent:C.primary,accepted:C.green,revision_requested:C.amber,revised:C.textDim,expired:C.red}[quote.status]||C.primary;
  const statusLabel=(quote.status||"sent").replace("_"," ");
  const validUntil=quote.validity_ts?fmtD(quote.validity_ts):"Not specified";
  const expired=quote.validity_ts&&quote.validity_ts<Date.now();
  const expiringSoon=quote.status==="sent"&&quote.validity_ts&&quote.validity_ts>Date.now()&&quote.validity_ts-Date.now()<=3*86400000;
  const daysLeft=quote.validity_ts&&!expired?Math.max(1,Math.ceil((quote.validity_ts-Date.now())/86400000)):0;
  const timelineStatus=expired&&quote.status==="sent"?"expired":quote.status||"sent";
  const fulfillment=fulfillmentConf(quote.fulfillment_status||(quote.status==="accepted"?"payment_pending":"not_started"));
  const canDecide=quote.status==="sent"&&!expired;
  const quoteTimeline=[
    {label:"Quote sent",detail:quote.created_at?fmtD(quote.created_at):"Sent to buyer",done:true,current:false},
    {
      label:"Buyer response",
      detail:timelineStatus==="accepted"?"Accepted by buyer":timelineStatus==="revision_requested"?"Changes requested by buyer":timelineStatus==="revised"?"Buyer requested changes":timelineStatus==="expired"?"Expired before response":"Waiting for buyer",
      done:["accepted","revision_requested","revised"].includes(timelineStatus),
      current:timelineStatus==="sent"
    },
    ...(["accepted"].includes(timelineStatus)?QUOTE_FULFILLMENT.filter(x=>!["not_started"].includes(x.id)).map(x=>({
      label:x.label,
      detail:x.buyer,
      done:QUOTE_FULFILLMENT.findIndex(s=>s.id===fulfillment.id)>=QUOTE_FULFILLMENT.findIndex(s=>s.id===x.id),
      current:fulfillment.id===x.id,
      muted:false
    })):[{
      label:timelineStatus==="revised"?"Revised quote":timelineStatus==="revision_requested"?"Factory review":"Sale follow-up",
      detail:timelineStatus==="revision_requested"?"Factory can send a revised quote":timelineStatus==="revised"?"A newer quote has replaced this one":timelineStatus==="expired"?"Ask the factory for an updated quote":"Starts after buyer response",
      done:timelineStatus==="revised",
      current:timelineStatus==="revision_requested",
      muted:timelineStatus==="sent"||timelineStatus==="expired"
    }])
  ];
  async function copyLink(){
    try{await navigator.clipboard.writeText(window.location.href);setCopied(true);setTimeout(()=>setCopied(false),1400);}catch(e){}
  }
  async function copyQuoteSummary(){
    const text=[
      `Epistable quote: ${quote.id}`,
      `Factory: ${quote.factory_name||"Verified factory"}`,
      `Slab: ${quote.slab_id||"-"} | ${quote.stone} | ${quote.grade}`,
      `Area: ${Number(quote.area_sq_ft||0).toLocaleString("en-IN")} sq ft`,
      `Rate: Rs ${Number(quote.price_per_sq_ft||0).toLocaleString("en-IN")}/sq ft`,
      `Total: Rs ${Number(quote.total_amount||0).toLocaleString("en-IN")}`,
      `Valid until: ${validUntil}`,
      window.location.href
    ].join("\n");
    try{await navigator.clipboard.writeText(text);setSummaryCopied(true);setTimeout(()=>setSummaryCopied(false),1400);}catch(e){window.prompt("Copy quote summary",text);}
  }
  async function submitDecision(decision){
    if(!canDecide||decisionBusy)return;
    setDecisionBusy(decision);setDecisionError("");
    const {data,error}=await supabase.rpc("respond_to_quote",{quote_id:quoteId,decision,message:buyerMessage});
    setDecisionBusy("");
    if(error){setDecisionError(error.message||"Could not update quote.");return;}
    const row=Array.isArray(data)?data[0]:data;
    if(row)setQuote(row);
  }
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',sans-serif",color:C.text}}>
      <div style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary},${C.teal})`,padding:"22px 18px 90px"}}>
        <div style={{maxWidth:820,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16}}>
          <div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.65)",fontWeight:800,letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:8}}>Epistable Quote</div>
            <div style={{fontSize:28,fontWeight:900,color:C.white,lineHeight:1.1,marginBottom:6}}>Proforma quote</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.72)"}}>{quote.factory_name||"Verified factory"} - {quote.stone}</div>
          </div>
          <button onClick={copyLink} style={{background:"rgba(255,255,255,0.14)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:10,color:C.white,padding:"9px 13px",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"sans-serif",whiteSpace:"nowrap"}}>{copied?"Copied":"Copy link"}</button>
        </div>
      </div>
      <div style={{maxWidth:820,margin:"-62px auto 0",padding:"0 14px 40px"}}>
        <Card style={{overflow:"hidden"}}>
          <div style={{padding:18,borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:12,color:C.textDim,fontWeight:800,marginBottom:4}}>Quote ID</div>
              <div style={{fontSize:14,fontFamily:"monospace",fontWeight:900,color:C.text}}>{quote.id}</div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              {expired&&<span style={{background:C.redBg,border:`1px solid ${C.redBorder}`,color:C.red,borderRadius:20,padding:"5px 11px",fontSize:11,fontWeight:900}}>Expired</span>}
              {expiringSoon&&<span style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,color:C.amber,borderRadius:20,padding:"5px 11px",fontSize:11,fontWeight:900}}>Expires in {daysLeft} day{daysLeft===1?"":"s"}</span>}
              <span style={{background:C.surface,border:`1px solid ${C.border}`,color:statusColor,borderRadius:20,padding:"5px 11px",fontSize:11,fontWeight:900,textTransform:"capitalize"}}>{statusLabel}</span>
              {quote.status==="accepted"&&<span style={{background:fulfillment.bg,border:`1px solid ${fulfillment.border}`,color:fulfillment.color,borderRadius:20,padding:"5px 11px",fontSize:11,fontWeight:900}}>{fulfillment.label}</span>}
            </div>
          </div>
          <div style={{padding:18,borderBottom:`1px solid ${C.border}`,background:expiringSoon?C.amberBg:C.greenBg}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10}}>
              {[["Verified slab",quote.slab_id||"-"],["Factory issued",quote.factory_name||"Verified factory"],["Buyer action",canDecide?"Accept or request changes":statusLabel],["Validity",expired?"Expired":quote.validity_ts?`${daysLeft} day${daysLeft===1?"":"s"} left`:"Not specified"]].map(([label,value])=>(
                <div key={label} style={{background:C.white,border:`1px solid ${expiringSoon?C.amberBorder:C.greenBorder}`,borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontSize:10,color:C.textDim,fontWeight:900,marginBottom:4}}>{label}</div>
                  <div style={{fontSize:13,color:C.text,fontWeight:900}}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{padding:18,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,borderBottom:`1px solid ${C.border}`}}>
            {[["Buyer",quote.buyer_company||quote.buyer_name||"Buyer"],["Email",quote.buyer_email||"Not provided"],["Factory",quote.factory_name||"Factory"],["Valid Until",validUntil]].map(([label,value])=>(
              <div key={label} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
                <div style={{fontSize:11,color:C.textDim,fontWeight:800,marginBottom:5}}>{label}</div>
                <div style={{fontSize:13,fontWeight:800,wordBreak:"break-word"}}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{padding:18,borderBottom:`1px solid ${C.border}`}}>
            <div style={{fontSize:15,fontWeight:900,marginBottom:12}}>Quote timeline</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10}}>
              {quoteTimeline.map((step,i)=>(
                <div key={step.label} style={{display:"flex",gap:10,alignItems:"flex-start",background:step.current?C.primaryBg:step.done?C.greenBg:C.surface,border:`1px solid ${step.current?C.primaryBorder:step.done?C.greenBorder:C.border}`,borderRadius:10,padding:12,opacity:step.muted?0.72:1}}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:step.done?C.green:step.current?C.primary:C.border,color:step.done||step.current?C.white:C.textDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,flexShrink:0}}>{step.done?"✓":i+1}</div>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:900,color:step.done?C.green:step.current?C.primary:C.text}}>{step.label}</div>
                    <div style={{fontSize:11,color:C.textMid,lineHeight:1.45,marginTop:3}}>{step.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{padding:18}}>
            <div style={{fontSize:15,fontWeight:900,marginBottom:12}}>Slab details</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:16}}>
              {[["Slab",quote.slab_id],["Stone",quote.stone],["Grade",quote.grade],["Area",`${Number(quote.area_sq_ft||0).toLocaleString("en-IN")} sq ft`]].map(([label,value])=>(
                <div key={label} style={{borderBottom:`1px solid ${C.border}`,padding:"0 0 10px"}}>
                  <div style={{fontSize:11,color:C.textDim,fontWeight:800,marginBottom:4}}>{label}</div>
                  <div style={{fontSize:13,fontWeight:900}}>{value||"-"}</div>
                </div>
              ))}
            </div>
            <div style={{background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:12,padding:16,marginBottom:16}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"center"}}>
                <div>
                  <div style={{fontSize:12,color:C.primary,fontWeight:900,marginBottom:4}}>Total quote value</div>
                  <div style={{fontSize:28,fontWeight:900,color:C.green}}>Rs {Number(quote.total_amount||0).toLocaleString("en-IN")}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:11,color:C.textDim,fontWeight:800}}>Rate</div>
                  <div style={{fontSize:15,fontWeight:900}}>Rs {Number(quote.price_per_sq_ft||0).toLocaleString("en-IN")}/sq ft</div>
                </div>
              </div>
            </div>
            {quote.notes&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:13,marginBottom:16}}>
              <div style={{fontSize:12,color:C.textDim,fontWeight:900,marginBottom:5}}>Notes</div>
              <div style={{fontSize:13,lineHeight:1.6}}>{quote.notes}</div>
            </div>}
            {quote.status==="accepted"&&<div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:12,padding:14,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:900,color:C.green,marginBottom:4}}>Quote accepted</div>
              <div style={{fontSize:12,color:C.textMid}}>Current next step: {fulfillment.buyer}. Keep this link for order tracking.</div>
              {quote.buyer_message&&<div style={{fontSize:12,color:C.text,marginTop:8,lineHeight:1.5}}>Buyer note: {quote.buyer_message}</div>}
            </div>}
            {quote.status==="revision_requested"&&<div style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:12,padding:14,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:900,color:C.amber,marginBottom:4}}>Changes requested</div>
              <div style={{fontSize:12,color:C.textMid}}>We sent your note to the factory. They can respond with a revised quote link.</div>
              {quote.buyer_message&&<div style={{fontSize:12,color:C.text,marginTop:8,lineHeight:1.5}}>Buyer note: {quote.buyer_message}</div>}
            </div>}
            {quote.status==="revised"&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:900,color:C.textMid,marginBottom:4}}>Revised quote sent</div>
              <div style={{fontSize:12,color:C.textMid}}>This quote has been replaced by a newer quote. Please use the latest revised quote link from the factory.</div>
            </div>}
            {canDecide&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:900,marginBottom:8}}>Respond to this quote</div>
              <textarea value={buyerMessage} onChange={e=>setBuyerMessage(e.target.value)} rows={3} placeholder="Add a note for the factory, such as delivery terms, quantity, or pricing questions (optional)" style={{width:"100%",padding:"11px 12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:"sans-serif",resize:"none",outline:"none",boxSizing:"border-box",marginBottom:10}}/>
              {decisionError&&<div style={{fontSize:12,color:C.red,background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 10px",marginBottom:10}}>{decisionError}</div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <button onClick={()=>submitDecision("revision_requested")} disabled={!!decisionBusy} style={{background:C.white,border:`1px solid ${C.amberBorder}`,borderRadius:10,color:C.amber,padding:"11px 12px",fontSize:13,fontWeight:900,cursor:decisionBusy?"not-allowed":"pointer",fontFamily:"sans-serif",opacity:decisionBusy?0.65:1}}>{decisionBusy==="revision_requested"?"Sending...":"Request Changes"}</button>
                <button onClick={()=>submitDecision("accepted")} disabled={!!decisionBusy} style={{background:C.green,border:"none",borderRadius:10,color:C.white,padding:"11px 12px",fontSize:13,fontWeight:900,cursor:decisionBusy?"not-allowed":"pointer",fontFamily:"sans-serif",opacity:decisionBusy?0.65:1}}>{decisionBusy==="accepted"?"Accepting...":"Accept Quote"}</button>
              </div>
            </div>}
            {!canDecide&&quote.status==="sent"&&expired&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:12,padding:14,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:900,color:C.red,marginBottom:4}}>Quote expired</div>
              <div style={{fontSize:12,color:C.textMid}}>Please ask the factory for an updated quote.</div>
            </div>}
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {quote.slab_id&&<button onClick={()=>window.location.assign(`/slab/${encodeURIComponent(quote.slab_id)}`)} style={{background:C.primary,border:"none",borderRadius:10,color:C.white,padding:"11px 16px",fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"sans-serif"}}>View slab certificate</button>}
              <button onClick={copyQuoteSummary} style={{background:C.white,border:`1px solid ${C.primaryBorder}`,borderRadius:10,color:C.primary,padding:"11px 16px",fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"sans-serif"}}>{summaryCopied?"Copied summary":"Copy summary"}</button>
              <button onClick={()=>window.print()} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:10,color:C.textMid,padding:"11px 16px",fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"sans-serif"}}>Print quote</button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function App() {
  const slabMatch=window.location.pathname.match(/^\/slab\/([^/?#]+)/);
  const quoteMatch=window.location.pathname.match(/^\/quote\/([^/?#]+)/);
  const inviteMatch=window.location.pathname==="/invite";
  const [session,setSession]=useState(null);
  const [booting,setBooting]=useState(true);
  function normalizeProfile(profile){
    if(!profile)return profile;
    const factoryId=profile.factory_id||profile.factoryId||null;
    const factoryName=profile.factory_name||profile.factoryName||"";
    return {...profile,factory_id:factoryId,factoryId,factory_name:factoryName,factoryName};
  }
  function profileSession(profile){
    profile=normalizeProfile(profile);
    if(profile.role==="owner")return {type:"owner"};
    if(profile.role==="buyer")return {type:"buyer",buyer:profile};
    return {type:"factory",user:profile};
  }
  useEffect(()=>{
    let active=true;
    getSessionProfile()
      .then(profile=>{if(active&&profile)setSession(profileSession(profile));})
      .catch(e=>console.error("Session restore failed",e))
      .finally(()=>{if(active)setBooting(false);});
    return ()=>{active=false;};
  },[]);
  async function logout(){try{await signOut();}catch(e){}setSession(null);}
  if(slabMatch)return <SlabCertificate slabId={decodeURIComponent(slabMatch[1])}/>;
  if(quoteMatch)return <PublicQuotePage quoteId={decodeURIComponent(quoteMatch[1])}/>;
  if(inviteMatch)return <InviteAccept onAccepted={profile=>{window.history.replaceState(null,"","/");setSession(profileSession(profile));}}/>;
  if(booting)return <Loader/>;
  return session?.type==="owner"?<Owner onLogout={logout}/>
    :session?.type==="factory"?<FactoryApp user={session.user} onLogout={logout}/>
    :session?.type==="buyer"?(session.showQuotes?<BuyerQuotesPage buyer={session.buyer} onLogout={logout} onBack={()=>setSession({...session,showQuotes:false})} onViewPortal={factoryId=>setSession(prev=>{const nextFactoryId=factoryId||prev?.buyer?.factory_id||prev?.buyer?.factoryId;return {...prev,buyer:{...prev.buyer,factory_id:nextFactoryId,factoryId:nextFactoryId},showQuotes:false,showPortal:true};})}/>:session.showPortal?<BuyerPortal factoryId={session.buyer.factory_id||session.buyer.factoryId} buyer={session.buyer} onBack={()=>setSession({...session,showPortal:false})}/>:<BuyerHome buyer={session.buyer} onLogout={logout} onViewQuotes={()=>setSession({...session,showQuotes:true})} onViewPortal={factoryId=>setSession(prev=>{const nextFactoryId=factoryId||prev?.buyer?.factory_id||prev?.buyer?.factoryId;return {...prev,buyer:{...prev.buyer,factory_id:nextFactoryId,factoryId:nextFactoryId},showPortal:true};})}/>)
    :<Login onOwner={()=>setSession({type:"owner"})} onFactory={u=>setSession({type:"factory",user:u})} onBuyer={b=>setSession({type:"buyer",buyer:b})}/>;
}
