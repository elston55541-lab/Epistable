import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { C, gradeConf } from "../lib/domain";
import { useBP } from "../hooks/useBP";
import { Btn, Card, Loader, PBar } from "./ui";

const asList = value => Array.isArray(value) ? value : [];
const asObject = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const normalizePhoto = (photo,idx) => typeof photo === "string" ? {src:photo,label:idx===0?"Primary photo":`Evidence ${idx+1}`} : photo;
const invConf = status => ({
  available:{label:"Available",color:C.green,bg:C.greenBg,border:C.greenBorder},
  reserved:{label:"Reserved",color:C.amber,bg:C.amberBg,border:C.amberBorder},
  sold:{label:"Sold",color:C.red,bg:C.redBg,border:C.redBorder},
}[status]||{label:"Available",color:C.green,bg:C.greenBg,border:C.greenBorder});

function Field({label,value}) {
  return (
    <div style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
      <div style={{fontSize:11,fontWeight:700,color:C.textDim,textTransform:"uppercase",marginBottom:3}}>{label}</div>
      <div style={{fontSize:14,fontWeight:700,color:C.text}}>{value || "Not recorded"}</div>
    </div>
  );
}

function CertificateError({title,msg}) {
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:18}}>
      <Card style={{padding:24,maxWidth:460,textAlign:"center"}}>
        <div style={{fontSize:18,fontWeight:700,marginBottom:8,color:C.text}}>{title}</div>
        <div style={{fontSize:13,color:C.textMid,lineHeight:1.6,marginBottom:16}}>{msg}</div>
        <Btn onClick={()=>window.location.assign("/")}>Go to Epistable</Btn>
      </Card>
    </div>
  );
}

export function SlabCertificate({slabId}) {
  const [slab,setSlab]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [inq,setInq]=useState({name:"",company:"",email:"",phone:"",areaSqFt:"",message:""});
  const [inqBusy,setInqBusy]=useState(false);
  const [inqSent,setInqSent]=useState(false);
  const [inqError,setInqError]=useState("");
  const [dispute,setDispute]=useState({name:"",company:"",email:"",phone:"",category:"wrong_grade",details:""});
  const [disputeBusy,setDisputeBusy]=useState(false);
  const [disputeSent,setDisputeSent]=useState(false);
  const [disputeError,setDisputeError]=useState("");
  const [copied,setCopied]=useState(false);
  const [summaryCopied,setSummaryCopied]=useState(false);
  const [auditNoteCopied,setAuditNoteCopied]=useState(false);
  const {isMobile}=useBP();

  useEffect(()=>{
    let active=true;
    async function load(){
      setLoading(true);setError("");
      try {
        const {data,error}=await supabase.rpc("get_public_slab_certificate",{slab_id:slabId});
        if(!active)return;
        if(error){setError(error.message||"Unable to load this slab certificate.");setLoading(false);return;}
        const row=Array.isArray(data)?data[0]:data;
        if(!row){setError("No verified slab was found for this QR code.");setLoading(false);return;}
        setSlab(row);setLoading(false);
      } catch(e) {
        if(active){setError(e.message||"Unable to load this slab certificate.");setLoading(false);}
      }
    }
    load();
    return()=>{active=false;};
  },[slabId]);

  const measurements=useMemo(()=>asObject(slab?.measurements),[slab]);
  const traceability=useMemo(()=>asObject(measurements.traceability),[measurements]);
  const audit=useMemo(()=>asObject(measurements.audit),[measurements]);
  const defects=useMemo(()=>asList(slab?.defects),[slab]);
  const photos=useMemo(()=>asList(slab?.photos).map(normalizePhoto).filter(p=>p?.src),[slab]);

  if(loading)return <Loader/>;
  if(error)return <CertificateError title="Certificate unavailable" msg={error}/>;

  const g=gradeConf(slab.grade);
  const inspectedAt=[slab.date,slab.time].filter(Boolean).join(" at ");
  const photo=slab.photo || photos[0]?.src;
  const polish=measurements.polish ? Number(measurements.polish) : 0;
  const inquiryReady=inq.name.trim()&&(inq.email.trim()||inq.phone.trim());
  const disputeReady=dispute.name.trim()&&(dispute.email.trim()||dispute.phone.trim())&&dispute.details.trim();
  const certificateUrl=window.location.href;
  const inventory=invConf(slab.inventory_status||"available");
  const canInquire=(slab.inventory_status||"available")==="available";
  const areaSqFt=Number(inq.areaSqFt);
  const quoteEstimate=Number.isFinite(areaSqFt)&&areaSqFt>0 ? Math.round(areaSqFt*Number(slab.price_per_sq_ft||0)) : 0;
  const evidenceCount=photos.length || (photo ? 1 : 0);
  const traceabilityCount=["quarrySource","batchNo","blockNo","productionLine","operator","containerNo","customerRef"].filter(k=>traceability[k]).length;
  const auditCount=["calibrationChecked","checklistComplete","rootCause","correctiveAction","actionOwner","actionDue"].filter(k=>audit[k]).length;
  const readinessScore=Math.round(((traceabilityCount/7)*100+(auditCount/6)*100+(evidenceCount?100:0))/3);
  const auditReadinessLabel=readinessScore>=80?"Strong":readinessScore>=55?"Partial":"Needs attention";
  const auditGaps=[
    traceabilityCount<7&&`${7-traceabilityCount} traceability field${7-traceabilityCount===1?"":"s"} missing`,
    auditCount<6&&`${6-auditCount} audit field${6-auditCount===1?"":"s"} missing`,
    !evidenceCount&&"photo evidence missing",
    defects.length&&!audit.correctiveAction&&"defects recorded without corrective action",
  ].filter(Boolean);
  const verificationItems=[
    {label:"Live certificate",detail:"Use this page URL or QR code as the source of truth before buying."},
    {label:"Slab identity",detail:`Match certificate ID ${slab.id} with the physical slab, invoice, or factory record.`},
    {label:"Evidence trail",detail:`Review ${evidenceCount} photo${evidenceCount===1?"":"s"}, measurements, defects, inspector, and timestamp together.`},
  ];
  const certificateSummary=[
    `Epistable verified slab: ${slab.stone}`,
    `Certificate: ${slab.id}`,
    `Factory: ${slab.factory_name}${slab.factory_location ? `, ${slab.factory_location}` : ""}`,
    `Grade: ${slab.grade}`,
    `Price: Rs ${slab.price_per_sq_ft || 0}/sq ft`,
    `Status: ${inventory.label}`,
    `Evidence readiness: ${readinessScore}%`,
    `Traceability fields: ${traceabilityCount}/7`,
    `Audit fields: ${auditCount}/6`,
    traceability.quarrySource ? `Source: ${traceability.quarrySource}` : "",
    traceability.batchNo ? `Batch: ${traceability.batchNo}` : "",
    traceability.containerNo ? `Container: ${traceability.containerNo}` : "",
    audit.correctiveAction ? `Corrective action: ${audit.correctiveAction}` : "",
    defects.length ? `Defects recorded: ${defects.join(", ")}` : "Defects recorded: none",
    `Photo evidence: ${evidenceCount} photo${evidenceCount===1 ? "" : "s"}`,
    `Certificate link: ${certificateUrl}`,
  ].filter(Boolean).join("\n");
  const auditNote=[
    `Audit readiness note for ${slab.id}`,
    `Status: ${auditReadinessLabel} (${readinessScore}%)`,
    `Factory: ${slab.factory_name}`,
    `Slab: ${slab.stone} | Grade: ${slab.grade}`,
    `Traceability: ${traceabilityCount}/7 fields recorded`,
    `Audit evidence: ${auditCount}/6 fields recorded`,
    `Photo evidence: ${evidenceCount} photo${evidenceCount===1?"":"s"}`,
    defects.length?`Defects: ${defects.join(", ")}`:"Defects: none recorded",
    auditGaps.length?`Gaps: ${auditGaps.join("; ")}`:"Gaps: none flagged from current certificate data",
    `Certificate: ${certificateUrl}`,
  ].join("\n");
  const scrollTo=id=>document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});

  async function copyLink(){
    try {
      await navigator.clipboard.writeText(certificateUrl);
      setCopied(true);
      setTimeout(()=>setCopied(false),1600);
    } catch(e) {
      window.prompt("Copy certificate link",certificateUrl);
    }
  }

  async function copySummary(){
    try {
      await navigator.clipboard.writeText(certificateSummary);
      setSummaryCopied(true);
      setTimeout(()=>setSummaryCopied(false),1600);
    } catch(e) {
      window.prompt("Copy certificate summary",certificateSummary);
    }
  }

  async function copyAuditNote(){
    try {
      await navigator.clipboard.writeText(auditNote);
      setAuditNoteCopied(true);
      setTimeout(()=>setAuditNoteCopied(false),1600);
    } catch(e) {
      window.prompt("Copy audit readiness note",auditNote);
    }
  }

  async function submitInquiry(){
    if(!inquiryReady||inqBusy)return;
    setInqBusy(true);setInqError("");
    const message=[
      inq.areaSqFt.trim()?`Area required: ${inq.areaSqFt.trim()} sq ft`:"",
      quoteEstimate?`Estimated slab value: Rs ${quoteEstimate}`:"",
      inq.message.trim(),
      inq.phone.trim()?`Phone: ${inq.phone.trim()}`:"",
      `Certificate: ${certificateUrl}`,
    ].filter(Boolean).join("\n\n");
    const {error}=await supabase.rpc("create_public_slab_inquiry",{
      slab_id:slab.id,
      buyer_name:inq.name.trim(),
      buyer_company:inq.company.trim(),
      buyer_email:inq.email.trim(),
      buyer_message:message
    });
    if(error){setInqError(error.message||"Unable to send inquiry.");setInqBusy(false);return;}
    setInqSent(true);setInqBusy(false);
  }

  async function submitDispute(){
    if(!disputeReady||disputeBusy)return;
    setDisputeBusy(true);setDisputeError("");
    const details=[dispute.details.trim(),dispute.email.trim()?`Email: ${dispute.email.trim()}`:"",dispute.phone.trim()?`Phone: ${dispute.phone.trim()}`:""].filter(Boolean).join("\n\n");
    const {error}=await supabase.rpc("create_public_slab_dispute",{
      slab_id:slab.id,
      buyer_name:dispute.name.trim(),
      buyer_company:dispute.company.trim(),
      dispute_category:dispute.category,
      dispute_details:details
    });
    if(error){setDisputeError(error.message||"Unable to report this issue.");setDisputeBusy(false);return;}
    setDisputeSent(true);setDisputeBusy(false);
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',sans-serif",color:C.text}}>
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .cert-actions, .cert-interactive { display: none !important; }
          .cert-page { background: #fff !important; }
          .cert-hero { border-radius: 0 !important; margin: 0 !important; }
          .cert-main { max-width: none !important; padding: 12px 0 0 !important; }
          .cert-grid { grid-template-columns: 1.05fr 0.95fr !important; gap: 12px !important; }
          .cert-card { box-shadow: none !important; break-inside: avoid; page-break-inside: avoid; }
          .cert-photo { max-height: 250px; object-fit: cover; }
          .cert-print-footer { display: block !important; }
        }
      `}</style>
      <div className="cert-actions" style={{position:"sticky",top:0,zIndex:50,background:"rgba(255,255,255,0.96)",borderBottom:`1px solid ${C.border}`,backdropFilter:"blur(8px)"}}>
        <div style={{maxWidth:980,margin:"0 auto",padding:"10px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:12,fontWeight:700,color:C.text}}>Certificate {slab.id}</div>
            <div style={{fontSize:11,color:C.textDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{slab.stone} · {slab.factory_name}</div>
          </div>
          <div style={{display:"flex",gap:8,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
            <button onClick={copySummary} style={{padding:"9px 11px",border:`1px solid ${C.border}`,borderRadius:9,background:C.white,color:C.textMid,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"sans-serif"}}>{summaryCopied?"Summary Copied":"Copy Summary"}</button>
            <button onClick={copyAuditNote} style={{padding:"9px 11px",border:`1px solid ${C.border}`,borderRadius:9,background:C.white,color:C.textMid,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"sans-serif"}}>{auditNoteCopied?"Audit Copied":"Copy Audit Note"}</button>
            <button onClick={copyLink} style={{padding:"9px 11px",border:`1px solid ${C.border}`,borderRadius:9,background:C.white,color:C.textMid,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"sans-serif"}}>{copied?"Copied":"Copy Link"}</button>
            <button onClick={()=>window.print()} style={{padding:"9px 12px",border:"none",borderRadius:9,background:C.primary,color:C.white,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"sans-serif"}}>Print / Save PDF</button>
          </div>
        </div>
      </div>
      <div style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary},${C.teal})`,color:C.white}}>
        <div className="cert-hero" style={{maxWidth:980,margin:"0 auto",padding:"18px 18px 24px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:18}}>
            <div>
              <div style={{fontSize:22,fontWeight:700,letterSpacing:0}}>Epistable AI</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.72)"}}>Verified slab certificate</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:999,padding:"6px 12px",fontSize:12,fontWeight:700}}>VERIFIED</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"minmax(0,1.2fr) minmax(220px,0.8fr)",gap:16,alignItems:"stretch"}}>
            <div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.72)",fontFamily:"monospace",marginBottom:7}}>{slab.id}</div>
              <div style={{fontSize:30,fontWeight:700,lineHeight:1.08,marginBottom:8}}>{slab.stone}</div>
              <div style={{fontSize:14,color:"rgba(255,255,255,0.78)",lineHeight:1.5}}>{slab.factory_name}{slab.factory_location ? `, ${slab.factory_location}` : ""}</div>
              <div className="cert-interactive" style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:16}}>
                <button onClick={()=>scrollTo("certificate-inquiry")} disabled={!canInquire} style={{padding:"10px 14px",border:"none",borderRadius:10,background:canInquire?C.white:"rgba(255,255,255,0.18)",color:canInquire?C.primary:"rgba(255,255,255,0.62)",fontSize:13,fontWeight:700,cursor:canInquire?"pointer":"not-allowed",fontFamily:"sans-serif"}}>{canInquire?"Interested in this slab":inventory.label}</button>
                <button onClick={()=>scrollTo("certificate-dispute")} style={{padding:"10px 14px",border:"1px solid rgba(255,255,255,0.28)",borderRadius:10,background:"rgba(255,255,255,0.1)",color:C.white,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"sans-serif"}}>Report mismatch</button>
              </div>
            </div>
            <div style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.18)",borderRadius:12,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:8}}>
                <div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.68)",textTransform:"uppercase",fontWeight:700}}>Grade</div>
                  <div style={{fontSize:24,fontWeight:700,color:C.white}}>{slab.grade}</div>
                </div>
                <div style={{background:g.bg,border:`1px solid ${g.border}`,color:g.color,borderRadius:10,padding:"8px 12px",fontSize:13,fontWeight:700}}>{g.label}</div>
              </div>
              <div style={{fontSize:26,fontWeight:700}}>Rs {slab.price_per_sq_ft || 0}<span style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.65)"}}> / sq ft</span></div>
              <div style={{display:"inline-flex",marginTop:10,background:inventory.bg,border:`1px solid ${inventory.border}`,borderRadius:20,padding:"4px 10px",fontSize:12,fontWeight:700,color:inventory.color}}>{inventory.label}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:12}}>
                {[["Defects",defects.length||"None"],["Photos",evidenceCount],["Export",slab.export_ready ? "Ready" : "No"]].map(([label,value])=>(
                  <div key={label} style={{background:"rgba(255,255,255,0.11)",border:"1px solid rgba(255,255,255,0.16)",borderRadius:9,padding:"8px 6px",textAlign:"center"}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.white,lineHeight:1.1}}>{value}</div>
                    <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.62)",marginTop:3}}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="cert-main" style={{maxWidth:980,margin:"0 auto",padding:"16px 18px 48px"}}>
        <div className="cert-grid" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"minmax(0,1.1fr) minmax(280px,0.9fr)",gap:16}}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <Card style={{overflow:"hidden"}} className="cert-card">
              <div style={{aspectRatio:"16/9",background:g.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {photo?<img className="cert-photo" src={photo} alt={slab.stone} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>:<div style={{fontSize:18,fontWeight:700,color:g.color}}>No slab photo recorded</div>}
              </div>
            </Card>

            <Card className="cert-card" style={{padding:18}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Inspection Summary</div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:8,marginBottom:12}}>
                <div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:"9px 10px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.green,marginBottom:2}}>Trust Signal</div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{slab.export_ready ? "Export ready" : "Factory verified"}</div>
                </div>
                <div style={{background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:10,padding:"9px 10px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.primary,marginBottom:2}}>Evidence</div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{evidenceCount} photo{evidenceCount===1 ? "" : "s"}</div>
                </div>
                <div style={{background:defects.length?C.amberBg:C.greenBg,border:`1px solid ${defects.length?C.amberBorder:C.greenBorder}`,borderRadius:10,padding:"9px 10px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:defects.length?C.amber:C.green,marginBottom:2}}>Defects</div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{defects.length ? `${defects.length} recorded` : "None recorded"}</div>
                </div>
              </div>
              <div style={{fontSize:14,lineHeight:1.7,color:C.textMid}}>{slab.reason || "No grading reason was recorded for this slab."}</div>
              {slab.notes&&<div style={{marginTop:12,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:12,fontSize:13,lineHeight:1.6,color:C.textMid}}>{slab.notes}</div>}
            </Card>

            <Card className="cert-card cert-interactive" style={{padding:18}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Buyer verification checklist</div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:8}}>
                {[
                  ["Match slab ID",`Confirm ${slab.id} matches the physical slab or invoice.`],
                  ["Review evidence",`Check ${evidenceCount} photo${evidenceCount===1 ? "" : "s"}, defects, and measurements.`],
                  ["Request quote",canInquire?"Send area and delivery needs from this certificate.":"Ask the factory for alternatives."],
                ].map(([label,detail])=>(
                  <div key={label} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 11px"}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.primary,marginBottom:4}}>{label}</div>
                    <div style={{fontSize:12,lineHeight:1.45,color:C.textMid}}>{detail}</div>
                  </div>
                ))}
              </div>
            </Card>

            {photos.length>1&&<Card className="cert-card" style={{padding:18}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:12}}>Photo Evidence</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10}}>
                {photos.slice(1,7).map((p,idx)=><div key={idx} style={{position:"relative"}}>
                  <img src={p.src} alt="" style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:10,border:`1px solid ${C.border}`,display:"block"}}/>
                  {p.label&&<div style={{position:"absolute",left:6,bottom:6,right:6,background:"rgba(0,0,0,0.62)",borderRadius:6,padding:"4px 6px",fontSize:10,fontWeight:700,color:"#fff",textAlign:"center"}}>{p.label}</div>}
                </div>)}
              </div>
            </Card>}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <Card className="cert-card" style={{padding:18}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Certificate Details</div>
              <Field label="Factory" value={slab.factory_name}/>
              <Field label="Factory contact" value={slab.factory_contact_email}/>
              <Field label="Supplier" value={slab.supplier}/>
              <Field label="Inspector" value={slab.inspector}/>
              <Field label="Inspected" value={inspectedAt}/>
              <Field label="Export ready" value={slab.export_ready ? "Yes" : "No"}/>
              <Field label="Inventory status" value={inventory.label}/>
            </Card>

            <Card className="cert-card" style={{padding:18,borderColor:C.greenBorder,background:C.greenBg}}>
              <div style={{fontSize:16,fontWeight:700,color:C.green,marginBottom:8}}>How to verify this certificate</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {verificationItems.map(item=>(
                  <div key={item.label} style={{background:C.white,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:"9px 10px"}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.green,marginBottom:3}}>{item.label}</div>
                    <div style={{fontSize:12,lineHeight:1.45,color:C.textMid}}>{item.detail}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="cert-card" style={{padding:18}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Measurements</div>
              <Field label="Thickness" value={measurements.thickness ? `${measurements.thickness} mm` : ""}/>
              <Field label="Size" value={measurements.length && measurements.width ? `${measurements.length} x ${measurements.width} cm` : ""}/>
              <Field label="Sound test" value={measurements.soundTest}/>
              <Field label="Edge condition" value={measurements.edgeCondition}/>
              <Field label="Surface finish" value={measurements.surfaceFinish}/>
              {polish>0&&<div style={{paddingTop:12}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:700,marginBottom:6}}><span>Polish level</span><span>{polish}/5</span></div>
                <PBar value={polish/5*100} color={C.primary} h={8}/>
              </div>}
            </Card>

            <Card className="cert-card" style={{padding:18}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Traceability</div>
              <div style={{background:readinessScore>=70?C.greenBg:C.amberBg,border:`1px solid ${readinessScore>=70?C.greenBorder:C.amberBorder}`,borderRadius:10,padding:"10px 12px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:6}}>
                  <span style={{fontSize:12,fontWeight:700,color:readinessScore>=70?C.green:C.amber}}>Evidence readiness</span>
                  <span style={{fontSize:16,fontWeight:700,color:readinessScore>=70?C.green:C.amber}}>{readinessScore}%</span>
                </div>
                <div style={{fontSize:12,lineHeight:1.5,color:C.textMid}}>This score reflects recorded traceability, audit proof, and photo evidence for this slab. It is not a third-party certification.</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <div style={{background:traceabilityCount?C.primaryBg:C.surface,border:`1px solid ${traceabilityCount?C.primaryBorder:C.border}`,borderRadius:10,padding:"9px 10px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:traceabilityCount?C.primary:C.textDim,marginBottom:2}}>Trace fields</div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{traceabilityCount}/7 recorded</div>
                </div>
                <div style={{background:auditCount?C.greenBg:C.surface,border:`1px solid ${auditCount?C.greenBorder:C.border}`,borderRadius:10,padding:"9px 10px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:auditCount?C.green:C.textDim,marginBottom:2}}>Audit fields</div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{auditCount}/6 recorded</div>
                </div>
              </div>
              <Field label="Quarry / source" value={traceability.quarrySource}/>
              <Field label="Batch" value={traceability.batchNo}/>
              <Field label="Block" value={traceability.blockNo}/>
              <Field label="Production line" value={traceability.productionLine}/>
              <Field label="Operator" value={traceability.operator}/>
              <Field label="Container / shipment" value={traceability.containerNo}/>
              <Field label="Customer / order ref" value={traceability.customerRef}/>
            </Card>

            <Card className="cert-card" style={{padding:18}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Audit Readiness</div>
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:12,lineHeight:1.55,color:C.textMid,marginBottom:10}}>These fields help factories maintain inspection evidence for buyer QC programs, internal reviews, and certification preparation.</div>
              <div style={{background:readinessScore>=80?C.greenBg:readinessScore>=55?C.amberBg:C.redBg,border:`1px solid ${readinessScore>=80?C.greenBorder:readinessScore>=55?C.amberBorder:C.redBorder}`,borderRadius:10,padding:"10px 12px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:6}}>
                  <span style={{fontSize:12,fontWeight:700,color:readinessScore>=80?C.green:readinessScore>=55?C.amber:C.red}}>{auditReadinessLabel} evidence file</span>
                  <button onClick={copyAuditNote} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,color:C.primary,padding:"5px 9px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"sans-serif"}}>{auditNoteCopied?"Copied":"Copy note"}</button>
                </div>
                <div style={{fontSize:12,lineHeight:1.5,color:C.textMid}}>{auditGaps.length?auditGaps.join("; "):"No evidence gaps are flagged from the current certificate data."}</div>
              </div>
              <Field label="Calibration" value={audit.calibrationChecked ? "Checked" : ""}/>
              <Field label="Inspection checklist" value={audit.checklistComplete ? "Complete" : ""}/>
              <Field label="Root cause" value={audit.rootCause}/>
              <Field label="Corrective action" value={audit.correctiveAction}/>
              <Field label="Action owner" value={audit.actionOwner}/>
              <Field label="Action due" value={audit.actionDue}/>
            </Card>

            <Card className="cert-card" style={{padding:18}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:10}}>Defects</div>
              {defects.length===0?<div style={{fontSize:13,color:C.green,fontWeight:700}}>No defects recorded</div>:
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {defects.map(d=><span key={d} style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:999,padding:"5px 10px",fontSize:12,fontWeight:700,color:C.amber,textTransform:"capitalize"}}>{d}</span>)}
              </div>}
            </Card>

            <Card id="certificate-inquiry" className="cert-card cert-interactive" style={{padding:18}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Interested in this slab?</div>
              {!canInquire?<div style={{background:inventory.bg,border:`1px solid ${inventory.border}`,borderRadius:10,padding:14}}>
                <div style={{fontSize:14,fontWeight:700,color:inventory.color,marginBottom:4}}>{inventory.label}</div>
                <div style={{fontSize:13,color:C.textMid,lineHeight:1.6}}>This slab is not currently marked available. Contact the factory for alternatives.</div>
              </div>:inqSent?<div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:14}}>
                <div style={{fontSize:14,fontWeight:700,color:C.green,marginBottom:4}}>Inquiry sent</div>
                <div style={{fontSize:13,color:C.textMid,lineHeight:1.6}}>The factory has received your interest in slab {slab.id}.</div>
              </div>:<div style={{display:"flex",flexDirection:"column",gap:10}}>
                <input value={inq.name} onChange={e=>setInq(p=>({...p,name:e.target.value}))} placeholder="Your name" style={{padding:"11px 12px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif"}}/>
                <input value={inq.company} onChange={e=>setInq(p=>({...p,company:e.target.value}))} placeholder="Company (optional)" style={{padding:"11px 12px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif"}}/>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8}}>
                  <input value={inq.email} onChange={e=>setInq(p=>({...p,email:e.target.value}))} placeholder="Email" type="email" style={{padding:"11px 12px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif",minWidth:0}}/>
                  <input value={inq.phone} onChange={e=>setInq(p=>({...p,phone:e.target.value}))} placeholder="Phone" style={{padding:"11px 12px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif",minWidth:0}}/>
                </div>
                <input value={inq.areaSqFt} onChange={e=>setInq(p=>({...p,areaSqFt:e.target.value.replace(/[^\d.]/g,"")}))} placeholder="Area required in sq ft (optional)" inputMode="decimal" style={{padding:"11px 12px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif"}}/>
                {quoteEstimate>0&&<div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:"10px 12px",display:"flex",justifyContent:"space-between",gap:12}}>
                  <span style={{fontSize:12,fontWeight:700,color:C.green}}>Estimated value</span>
                  <span style={{fontSize:14,fontWeight:700,color:C.green}}>Rs {quoteEstimate}</span>
                </div>}
                <textarea value={inq.message} onChange={e=>setInq(p=>({...p,message:e.target.value}))} rows={3} placeholder="Message (quantity, timeline, destination...)" style={{padding:"11px 12px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif",resize:"none"}}/>
                {inqError&&<div style={{fontSize:12,color:C.red,fontWeight:700}}>{inqError}</div>}
                <Btn full disabled={!inquiryReady||inqBusy} onClick={submitInquiry}>{inqBusy?"Sending...":"Send Inquiry"}</Btn>
                <div style={{fontSize:11,color:C.textDim,lineHeight:1.5}}>Name and either email or phone are required.</div>
              </div>}
            </Card>

            <Card id="certificate-dispute" className="cert-card cert-interactive" style={{padding:18}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Report an issue</div>
              {disputeSent?<div style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:10,padding:14}}>
                <div style={{fontSize:14,fontWeight:700,color:C.amber,marginBottom:4}}>Issue reported</div>
                <div style={{fontSize:13,color:C.textMid,lineHeight:1.6}}>The factory can now review your concern for slab {slab.id}.</div>
              </div>:<div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{fontSize:12,color:C.textMid,lineHeight:1.5}}>Use this if the delivered slab does not match the certificate.</div>
                <input value={dispute.name} onChange={e=>setDispute(p=>({...p,name:e.target.value}))} placeholder="Your name" style={{padding:"11px 12px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif"}}/>
                <input value={dispute.company} onChange={e=>setDispute(p=>({...p,company:e.target.value}))} placeholder="Company (optional)" style={{padding:"11px 12px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif"}}/>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8}}>
                  <input value={dispute.email} onChange={e=>setDispute(p=>({...p,email:e.target.value}))} placeholder="Email" type="email" style={{padding:"11px 12px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif",minWidth:0}}/>
                  <input value={dispute.phone} onChange={e=>setDispute(p=>({...p,phone:e.target.value}))} placeholder="Phone" style={{padding:"11px 12px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif",minWidth:0}}/>
                </div>
                <select value={dispute.category} onChange={e=>setDispute(p=>({...p,category:e.target.value}))} style={{padding:"11px 12px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif",background:C.white}}>
                  <option value="wrong_grade">Wrong grade</option>
                  <option value="defect_missed">Defect missed</option>
                  <option value="measurement">Measurement issue</option>
                  <option value="other">Other</option>
                </select>
                <textarea value={dispute.details} onChange={e=>setDispute(p=>({...p,details:e.target.value}))} rows={3} placeholder="Describe what does not match..." style={{padding:"11px 12px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif",resize:"none"}}/>
                {disputeError&&<div style={{fontSize:12,color:C.red,fontWeight:700}}>{disputeError}</div>}
                <Btn full variant="secondary" disabled={!disputeReady||disputeBusy} onClick={submitDispute}>{disputeBusy?"Sending...":"Report Issue"}</Btn>
                <div style={{fontSize:11,color:C.textDim,lineHeight:1.5}}>Name, contact, and issue details are required.</div>
              </div>}
            </Card>
          </div>
        </div>
        <div className="cert-print-footer" style={{display:"none",marginTop:14,paddingTop:10,borderTop:`1px solid ${C.border}`,fontSize:10,color:C.textDim,lineHeight:1.5}}>
          Verified by Epistable AI · Certificate ID {slab.id} · Generated from {certificateUrl}
        </div>
      </main>
    </div>
  );
}
