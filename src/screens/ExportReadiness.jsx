import { useEffect, useMemo, useState } from "react";
import { C, fmtD, fmtMoney } from "../lib/domain";
import { FONT_STACK, SPACE } from "../lib/tokens";
import { EXPORT_MARKETS, marketConf } from "../lib/markets";
import {
  EXPORT_CERTS,
  EXPORT_PRODUCTS,
  READINESS_SECTIONS,
  readinessStatusConf,
  scoreRequirements,
  sectionForRequirement,
} from "../lib/readiness";
import { EvidenceUploadModal } from "../components/EvidenceUploadModal";
import { ExportReadinessOnboarding } from "./ExportReadinessOnboarding";
import { Icon } from "../components/Icon";
import { OverflowMenu } from "../components/OverflowMenu";
import { Pill } from "../components/Pill";
import { Btn, Card, KpiGrid, Loader, Modal, Sel, T } from "../components/ui";

const TEXT = {
  pageTitle: {...T.title,marginBottom:18,fontWeight:700},
  pageHeader: {...T.title,fontWeight:700},
  heroTitle: {fontSize:20,lineHeight:1.2,fontWeight:700,letterSpacing:0},
  panelTitle: {fontSize:14,lineHeight:1.55,fontWeight:700,letterSpacing:0},
  itemTitle: {fontSize:13,lineHeight:1.55,fontWeight:600,letterSpacing:0},
  meta: {...T.hint,color:C.textDim},
  tinyMeta: {fontSize:12,lineHeight:1.55,color:C.textDim,letterSpacing:0},
  emptyTitle: {fontSize:15,lineHeight:1.55,fontWeight:700,letterSpacing:0},
};

export function ExportReadiness({fac,user,DB}) {
  const [profile,setProfile]=useState(null);
  const [requirements,setRequirements]=useState([]);
  const [requirementsByMarket,setRequirementsByMarket]=useState({});
  const [bodiesByReq,setBodiesByReq]=useState({});
  const [evidence,setEvidence]=useState([]);
  const [activeMarket,setActiveMarket]=useState("EU");
  const [showAddMarket,setShowAddMarket]=useState(false);
  const [uploadReq,setUploadReq]=useState(null);
  const [naReq,setNaReq]=useState(null);
  const [naReason,setNaReason]=useState("");
  const [form,setForm]=useState({
    sector:"stone",
    productType:"any",
    markets:["EU"],
    exportStatus:"planning",
    companySize:"",
    currentCertifications:[],
  });
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState("");

  const evidenceByReq=useMemo(()=>{
    const map={};
    evidence.forEach(e=>{map[e.requirement_id]=e;});
    return map;
  },[evidence]);
  const markets=form.markets?.length?form.markets:["EU"];
  const activeRequirements=requirementsByMarket[activeMarket]||requirements;
  const scored=activeRequirements.map(r=>{
    const status=evidenceByReq[r.id]?.status || "missing";
    const conf=readinessStatusConf(status);
    return {...r,status,score:conf.score};
  });
  const missing=scored.filter(r=>["missing","rejected","expired"].includes(r.status));
  const working=scored.filter(r=>["pending","uploaded","submitted"].includes(r.status));
  const complete=scored.filter(r=>["verified","not_applicable"].includes(r.status));
  const activeStats=scoreRequirements(activeRequirements,evidence);
  const readinessScore=activeStats.score;
  const marketScores=useMemo(()=>{
    const out={};
    markets.forEach(m=>{out[m]=scoreRequirements(requirementsByMarket[m]||[],evidence).score;});
    return out;
  },[markets,requirementsByMarket,evidence]);
  const grouped=useMemo(()=>{
    const groups=Object.fromEntries(READINESS_SECTIONS.map(s=>[s.id,[]]));
    scored.forEach(r=>{groups[sectionForRequirement(r)]?.push(r);});
    return groups;
  },[scored]);

  async function fetchRequirements(next) {
    const targetMarkets=next.markets?.length?next.markets:["EU"];
    const pairs=await Promise.all(targetMarkets.map(async market=>[market,await DB.exportRequirements({sector:next.sector,productType:next.productType,market})]));
    const byMarket=Object.fromEntries(pairs);
    setRequirementsByMarket(byMarket);
    setRequirements(byMarket[targetMarkets[0]] || []);
    const ids=[...new Set(pairs.flatMap(([,reqs])=>reqs.map(r=>r.id)))];
    setBodiesByReq(await DB.readinessBodies(ids));
  }

  async function load(nextForm=form) {
    if(!fac?.id)return;
    setLoading(true);setErr("");
    try {
      const p=await DB.getExportReadinessProfile(fac.id);
      const destinationMarkets=p?.destination_markets?.length?p.destination_markets:[nextForm.markets?.[0]||"EU"];
      const merged=p?{
        sector:p.sector||"stone",
        productType:p.product_type||"any",
        markets:destinationMarkets,
        exportStatus:p.export_status||"planning",
        companySize:p.company_size||"",
        currentCertifications:p.current_certifications||[],
      }:nextForm;
      setProfile(p);setForm(merged);setActiveMarket(destinationMarkets[0]||"EU");
      await fetchRequirements(merged);
      setEvidence(p?.id?await DB.readinessEvidence(p.id):[]);
    } catch(e) {
      console.error("Export readiness load failed",e);
      setErr(e.message||"Could not load export readiness data.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(()=>{load();},[fac?.id]);

  async function saveProfile(next=form) {
    if(!fac?.id||saving)return null;
    setSaving(true);setErr("");
    const destinationMarkets=next.markets?.length?next.markets:[activeMarket||"EU"];
    try {
      const saved=await DB.saveExportReadinessProfile(profile,{
        factoryId:fac.id,
        userId:user.id,
        sector:next.sector,
        productType:next.productType,
        destinationMarkets,
        currentCertifications:next.currentCertifications,
        companySize:next.companySize,
        exportStatus:next.exportStatus,
        onboardingInputs:{markets:destinationMarkets,productType:next.productType,exportStatus:next.exportStatus,companySize:next.companySize},
      });
      const merged={...next,markets:destinationMarkets};
      setProfile(saved);setForm(merged);
      if(!destinationMarkets.includes(activeMarket))setActiveMarket(destinationMarkets[0]);
      await fetchRequirements(merged);
      setEvidence(await DB.readinessEvidence(saved.id));
      return saved;
    } catch(e) {
      console.error("Export readiness save failed",e);
      setErr(e.message||"Could not save readiness profile.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  function updateForm(patch) {
    setForm(prev=>({...prev,...patch}));
  }
  function toggleCert(id) {
    const set=new Set(form.currentCertifications);
    if(set.has(id))set.delete(id);else set.add(id);
    updateForm({currentCertifications:Array.from(set)});
  }
  async function addMarket(code) {
    const next={...form,markets:[...new Set([...(form.markets||[]),code])]};
    setForm(next);setActiveMarket(code);setShowAddMarket(false);
    await saveProfile(next);
  }
  async function removeMarket(code) {
    if(markets.length<=1)return;
    const nextMarkets=markets.filter(m=>m!==code);
    const next={...form,markets:nextMarkets};
    setForm(next);
    if(activeMarket===code)setActiveMarket(nextMarkets[0]);
    await saveProfile(next);
  }
  async function persistEvidence(req,patch) {
    let activeProfile=profile;
    if(!activeProfile?.id)activeProfile=await saveProfile(form);
    if(!activeProfile?.id)return;
    setSaving(true);setErr("");
    try {
      await DB.setReadinessEvidence({
        factoryId:fac.id,
        profileId:activeProfile.id,
        requirementId:req.id,
        evidenceType:req.evidenceType,
        evidenceLifecycleType:req.lifecycleType,
        userId:user.id,
        ...patch,
      });
      setEvidence(await DB.readinessEvidence(activeProfile.id));
      setUploadReq(null);setNaReq(null);setNaReason("");
    } catch(e) {
      console.error("Readiness evidence update failed",e);
      setErr(e.message||"Could not update requirement status.");
    } finally {
      setSaving(false);
    }
  }

  const scoreTone=readinessScore>=75?"success":readinessScore>=45?"warning":"danger";
  if(loading)return <Loader/>;
  if(!profile || !profile.onboarding_completed_at) {
    return <ExportReadinessOnboarding profile={profile} onSave={saveProfile} onComplete={()=>load()} saving={saving}/>;
  }
  return (
    <div>
      {uploadReq&&<EvidenceUploadModal req={uploadReq} evidence={evidenceByReq[uploadReq.id]} bodies={bodiesByReq[uploadReq.id]||[]} saving={saving} onClose={()=>setUploadReq(null)} onSave={patch=>persistEvidence(uploadReq,patch)}/>}
      {naReq&&<Modal title="Mark not applicable" onClose={()=>setNaReq(null)}>
        <div style={{display:"grid",gap:14}}>
          <div style={{fontSize:13,lineHeight:1.65,color:C.textMid}}>Use this only when the requirement genuinely does not apply to your product, market, or shipment route.</div>
          <textarea value={naReason} onChange={e=>setNaReason(e.target.value)} rows={3} placeholder="Why does this not apply?" style={{width:"100%",padding:12,border:`1.5px solid ${C.border}`,borderRadius:10,boxSizing:"border-box",fontFamily:FONT_STACK,fontSize:14,color:C.text,resize:"vertical"}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Btn variant="secondary" onClick={()=>setNaReq(null)} disabled={saving}>Cancel</Btn>
            <Btn onClick={()=>persistEvidence(naReq,{status:"not_applicable",notes:`Not applicable: ${naReason}`})} disabled={saving||!naReason.trim()}>Save reason</Btn>
          </div>
        </div>
      </Modal>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,marginBottom:18,flexWrap:"wrap"}}>
        <div>
          <div style={TEXT.pageHeader}>Export Readiness</div>
          <div style={{...TEXT.tinyMeta,marginTop:4,maxWidth:680}}>Track what each market needs, submit third-party evidence, and build a buyer-audit-ready profile. Epistable organises evidence; it does not issue certifications.</div>
        </div>
        <Pill tone={scoreTone} style={{fontSize:13,padding:"6px 12px"}}>{readinessScore}% ready for {marketConf(activeMarket).short}</Pill>
      </div>
      {err&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:10,padding:"12px 14px",fontSize:13,color:C.red,marginBottom:16}}>{err}</div>}
      <KpiGrid items={[
        {label:"Requirements",value:activeStats.total,icon:"Trace",color:C.primary},
        {label:"Complete",value:activeStats.complete,icon:"Won",color:C.green},
        {label:"Submitted / Working",value:activeStats.working,icon:"Now",color:C.amber},
        {label:"Missing",value:activeStats.missing,icon:"Risk",color:C.red},
      ]}/>
      <Card style={{padding:20,marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:16}}>
          <div>
            <div style={TEXT.panelTitle}>Readiness profile</div>
            <div style={TEXT.tinyMeta}>Pick the markets you are targeting. Each market gets its own readiness score.</div>
          </div>
          <Btn size="sm" onClick={()=>saveProfile(form)} disabled={saving}>{profile?"Save":"Create profile"}</Btn>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:16}}>
          <Sel label="Product" value={form.productType} onChange={v=>updateForm({productType:v})} options={EXPORT_PRODUCTS}/>
          <Sel label="Current Status" value={form.exportStatus} onChange={v=>updateForm({exportStatus:v})} options={[
            {value:"planning",label:"Planning first export"},
            {value:"first_export",label:"Preparing first shipment"},
            {value:"active_exporter",label:"Already exporting"},
            {value:"expanding_markets",label:"Expanding markets"},
          ]}/>
          <Sel label="Company Size" value={form.companySize} onChange={v=>updateForm({companySize:v})} options={[
            {value:"",label:"Select size"},
            {value:"small",label:"Small factory"},
            {value:"mid",label:"Mid-size exporter"},
            {value:"large",label:"Large exporter"},
          ]}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,overflowX:"auto",paddingBottom:4,marginBottom:14}}>
          {markets.map(code=>{
            const m=marketConf(code);
            const active=code===activeMarket;
            const s=marketScores[code]||0;
            const tone=s>=75?"success":s>=45?"warning":"danger";
            return <button key={code} onClick={()=>setActiveMarket(code)} style={{display:"inline-flex",alignItems:"center",gap:8,background:active?C.primaryBg:C.white,border:`1px solid ${active?C.primaryBorder:C.border}`,borderRadius:999,padding:"8px 10px",cursor:"pointer",fontFamily:FONT_STACK,color:active?C.primary:C.textMid,whiteSpace:"nowrap",boxShadow:active?C.shadow:"none"}}>
              <span style={{fontSize:13,fontWeight:700}}>{m.short}</span><Pill tone={tone} size="sm">{s}%</Pill>
              {markets.length>1&&<span onClick={e=>{e.stopPropagation();removeMarket(code);}} style={{display:"inline-flex",color:C.textDim}}><Icon name="close" size={13}/></span>}
            </button>;
          })}
          <button onClick={()=>setShowAddMarket(v=>!v)} style={{display:"inline-flex",alignItems:"center",gap:6,background:C.surface,border:`1px dashed ${C.primaryBorder}`,borderRadius:999,padding:"8px 11px",cursor:"pointer",fontFamily:FONT_STACK,color:C.primary,fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}><Icon name="add" size={14}/> Add market</button>
        </div>
        {showAddMarket&&<div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 0 14px"}}>
          {EXPORT_MARKETS.filter(m=>!markets.includes(m.value)).map(m=><Btn key={m.value} size="sm" variant="secondary" onClick={()=>addMarket(m.value)}>{m.label}</Btn>)}
          {EXPORT_MARKETS.filter(m=>!markets.includes(m.value)).length===0&&<div style={TEXT.tinyMeta}>All available markets are already selected.</div>}
        </div>}
        <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:8}}>What do you already have?</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {EXPORT_CERTS.map(cert=>{
            const active=form.currentCertifications.includes(cert.id);
            return <button key={cert.id} onClick={()=>toggleCert(cert.id)} style={{border:`1px solid ${active?C.greenBorder:C.border}`,background:active?C.greenBg:C.white,color:active?C.green:C.textMid,borderRadius:999,padding:"7px 11px",fontFamily:FONT_STACK,fontSize:12,fontWeight:600,cursor:"pointer"}}>{active?"âœ“ ":""}{cert.label}</button>;
          })}
        </div>
      </Card>
      <Card style={{padding:16,marginBottom:18,borderColor:C.primaryBorder,background:C.primaryBg}}>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <Pill tone="primary">{marketConf(activeMarket).label}</Pill>
          <div style={{fontSize:13,lineHeight:1.6,color:C.textMid}}>{form.productType==="any"?"Mixed stone products":EXPORT_PRODUCTS.find(p=>p.value===form.productType)?.label} Â· {activeStats.complete} of {activeStats.total} items complete Â· Submitted evidence should be reviewed before it is shown as verified to buyers.</div>
        </div>
      </Card>
      <Card style={{padding:20,marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:14}}>
          <div>
            <div style={TEXT.panelTitle}>Roadmap sections for {marketConf(activeMarket).label}</div>
            <div style={TEXT.tinyMeta}>Grouped by buyer-audit theme. Submit evidence against each requirement as you collect it.</div>
          </div>
          {!profile&&<Pill tone="warning">Save profile first</Pill>}
        </div>
        {activeRequirements.length===0?<div style={{padding:"30px 12px",textAlign:"center",color:C.textDim,fontSize:13}}>No configured requirements found for this selection yet.</div>:
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {READINESS_SECTIONS.map(section=>{
            const sectionReqs=grouped[section.id]||[];
            if(!sectionReqs.length)return null;
            const sectionStats=scoreRequirements(sectionReqs,evidence);
            return (
              <div key={section.id} style={{border:`1px solid ${C.border}`,borderRadius:14,padding:14,background:C.surface}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",marginBottom:10}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:C.text}}>{section.label}</div>
                    <div style={TEXT.tinyMeta}>{section.hint}</div>
                  </div>
                  <Pill tone={sectionStats.complete===sectionStats.total?"success":"neutral"}>{sectionStats.complete} of {sectionStats.total}</Pill>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {sectionReqs.map(req=>{
                    const conf=readinessStatusConf(req.status);
                    const ev=evidenceByReq[req.id];
                    const timeline=req.timelineMin||req.timelineMax?`${req.timelineMin||0}-${req.timelineMax||req.timelineMin} weeks`:"Timeline varies";
                    const cost=req.costMin||req.costMax?`${fmtMoney(req.costMin||0)}-${fmtMoney(req.costMax||req.costMin||0)}`:"Cost varies";
                    const bodies=bodiesByReq[req.id]||[];
                    const primaryAction=req.status==="expired"
                      ? {label:"Upload renewal",variant:"red",onClick:()=>setUploadReq(req)}
                      : req.status==="verified"
                        ? {label:"View evidence",variant:"secondary",onClick:()=>setUploadReq(req)}
                        : ["submitted","uploaded"].includes(req.status)
                          ? {label:"Edit evidence",variant:"secondary",onClick:()=>setUploadReq(req)}
                          : req.status==="not_applicable"
                            ? {label:"Restore",variant:"secondary",onClick:()=>persistEvidence(req,{status:"missing",notes:"Restored during readiness assessment."})}
                            : {label:"Submit evidence",variant:"secondary",onClick:()=>setUploadReq(req)};
                    const overflowItems=[
                      {label:"Mark as working on it",disabled:saving,onClick:()=>persistEvidence(req,{status:"pending",notes:"Work started during readiness assessment."})},
                      {label:"Mark as missing",disabled:saving,tone:"danger",onClick:()=>persistEvidence(req,{status:"missing",notes:"Marked missing during readiness assessment."})},
                      {label:"Mark not applicable",disabled:saving,onClick:()=>{setNaReq(req);setNaReason(ev?.notes?.replace(/^Not applicable:\s*/,"")||"");}},
                    ];
                    return (
                      <div key={req.id} style={{border:`1px solid ${C.border}`,borderRadius:12,padding:14,background:C.white}}>
                        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",marginBottom:8}}>
                          <div style={{minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                              <div style={{fontSize:14,fontWeight:700,color:C.text}}>{req.requirementName}</div>
                              <Pill tone={req.is_mandatory===false?"neutral":"primary"} size="sm">{req.is_mandatory===false?"Recommended":"Required"}</Pill>
                            </div>
                            <div style={{fontSize:12,lineHeight:1.6,color:C.textMid}}>{req.description}</div>
                          </div>
                          <Pill tone={conf.tone}>{conf.label}</Pill>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8,margin:"10px 0"}}>
                          <div style={{fontSize:12,color:C.textDim}}>Evidence: <strong style={{color:C.text}}>{(req.evidence_instructions||req.evidenceType||"Document").slice(0,70)}</strong></div>
                          <div style={{fontSize:12,color:C.textDim}}>Timeline: <strong style={{color:C.text}}>{timeline}</strong></div>
                          <div style={{fontSize:12,color:C.textDim}}>Cost: <strong style={{color:C.text}}>{cost}</strong></div>
                        </div>
                        {!!bodies.length&&<div style={{fontSize:12,color:C.textDim,marginBottom:10}}>Possible bodies: <strong style={{color:C.text}}>{bodies.slice(0,3).map(b=>b.name).join(", ")}</strong></div>}
                        {ev&&req.status!=="missing"&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:10,marginBottom:10,fontSize:12,lineHeight:1.6,color:C.textMid}}>
                          {ev.certificate_number&&<div>Reference: <strong style={{color:C.text}}>{ev.certificate_number}</strong></div>}
                          {ev.issued_at&&<div>Issued: <strong style={{color:C.text}}>{fmtD(ev.issued_at)}</strong></div>}
                          {ev.expires_at&&<div>Valid until: <strong style={{color:C.text}}>{fmtD(ev.expires_at)}</strong></div>}
                          {ev.file_url&&<div><a href={ev.file_url} target="_blank" rel="noreferrer" style={{color:C.primary,fontWeight:600}}>Open evidence file</a></div>}
                          {ev.notes&&<div>{ev.notes}</div>}
                        </div>}
                        <div style={{display:"flex",gap:8,alignItems:"center",paddingTop:8,borderTop:`1px solid ${C.border}`}}>
                          <Btn size="sm" variant={primaryAction.variant} disabled={saving} onClick={primaryAction.onClick}>{primaryAction.label}</Btn>
                          <OverflowMenu items={overflowItems}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>}
      </Card>
      <Card style={{padding:20,borderColor:C.primaryBorder,background:C.primaryBg}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          <Icon name="verified" size={22} color={C.primary}/>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:C.primary,marginBottom:4}}>Next best action</div>
            <div style={{fontSize:13,lineHeight:1.65,color:C.textMid}}>
              {missing[0]?`Start with ${missing[0].requirementName}. It is the highest-priority missing item for ${marketConf(activeMarket).short}.`:"Keep the evidence fresh and prepare a buyer-ready packet before sending profiles to international buyers."}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

