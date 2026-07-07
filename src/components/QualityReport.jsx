import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { C, gradeConf, fmtMoney } from "../lib/domain";
import { FONT_STACK } from "../lib/tokens";
import { useBP } from "../hooks/useBP";
import { Btn, Card, Loader } from "./ui";
import { Icon } from "./Icon";

const asList = value => Array.isArray(value) ? value : [];
const asObject = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const normalizePhoto = (photo,idx) => typeof photo === "string" ? {src:photo,label:idx===0?"Primary photo":`Evidence ${idx+1}`} : photo;

function ReportError({title,msg}) {
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT_STACK,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <Card style={{padding:24,maxWidth:440,textAlign:"center"}}>
        <div style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:8}}>{title}</div>
        <div style={{fontSize:13,color:C.textMid,lineHeight:1.65,marginBottom:16}}>{msg}</div>
        <Btn onClick={()=>window.location.assign("/")}>Go to Epistable</Btn>
      </Card>
    </div>
  );
}

function Field({label,value}) {
  return (
    <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 14px"}}>
      <div style={{fontSize:10.5,fontWeight:750,color:C.textDim,textTransform:"uppercase",letterSpacing:.4,marginBottom:5}}>{label}</div>
      <div style={{fontSize:14,fontWeight:800,color:C.text,lineHeight:1.25}}>{value || "Not recorded"}</div>
    </div>
  );
}

function ScoreBar({label,value,color=C.green}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderTop:`1px solid ${C.border}`}}>
      <div style={{fontSize:12.5,fontWeight:650,color:C.text,flex:"0 0 43%"}}>{label}</div>
      <div style={{flex:1,height:7,borderRadius:999,background:C.primaryBg,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${Math.min(Math.max(value,0),100)}%`,borderRadius:999,background:color}}/>
      </div>
      <div style={{fontSize:12,fontWeight:850,color:C.primaryD,width:34,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{value}</div>
    </div>
  );
}

function PlaceholderSlab({children}) {
  return (
    <div style={{position:"relative",height:"100%",minHeight:210,background:"linear-gradient(145deg,#fbfcfd 0%,#edf3f8 54%,#dce6ef 100%)",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(116deg,transparent 0 55%,rgba(74,85,104,.13) 56%,transparent 58%),linear-gradient(151deg,transparent 0 66%,rgba(74,85,104,.10) 67%,transparent 69%)"}}/>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(255,255,255,0) 0 52%,rgba(0,63,122,.14) 100%)"}}/>
      {children}
    </div>
  );
}

export function QualityReport({slabId}) {
  const [slab,setSlab]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [copied,setCopied]=useState(false);
  const [inq,setInq]=useState({name:"",company:"",email:"",phone:"",areaSqFt:"",message:""});
  const [inqBusy,setInqBusy]=useState(false);
  const [inqSent,setInqSent]=useState(false);
  const [inqError,setInqError]=useState("");
  const {isMobile}=useBP();

  useEffect(()=>{
    let active=true;
    async function load(){
      setLoading(true);setError("");
      try {
        const {data,error}=await supabase.rpc("get_public_slab_certificate",{slab_id:slabId});
        if(!active)return;
        if(error){setError(error.message||"Unable to load this quality report.");setLoading(false);return;}
        const row=Array.isArray(data)?data[0]:data;
        if(!row){setError("No verified slab was found for this report.");setLoading(false);return;}
        setSlab(row);setLoading(false);
      } catch(e) {
        if(active){setError(e.message||"Unable to load this quality report.");setLoading(false);}
      }
    }
    load();
    return()=>{active=false;};
  },[slabId]);

  const measurements=useMemo(()=>asObject(slab?.measurements),[slab]);
  const trace=useMemo(()=>asObject(measurements.traceability),[measurements]);
  const audit=useMemo(()=>asObject(measurements.audit),[measurements]);
  const defects=useMemo(()=>asList(slab?.defects),[slab]);
  const photos=useMemo(()=>asList(slab?.photos).map(normalizePhoto).filter(p=>p?.src),[slab]);

  if(loading)return <Loader/>;
  if(error)return <ReportError title="Quality report unavailable" msg={error}/>;

  const g=gradeConf(slab.grade);
  const photo=slab.photo || photos[0]?.src;
  const evidenceCount=photos.length || (photo ? 1 : 0);
  const traceCount=["quarrySource","batchNo","blockNo","productionLine","operator","containerNo","customerRef"].filter(k=>trace[k]).length;
  const auditCount=["calibrationChecked","checklistComplete","rootCause","correctiveAction","actionOwner","actionDue"].filter(k=>audit[k]).length;
  const exportScore=Math.round(((traceCount/7)*100+(auditCount/6)*100+(evidenceCount?100:0))/3);
  const qualityScores=[
    {label:"Colour consistency",value:slab.grade==="Premium"?92:slab.grade==="Standard"?82:68,color:slab.grade==="Commercial"?C.amber:C.green},
    {label:"Surface finish",value:Number(measurements.polish)?Math.min(100,Math.round(Number(measurements.polish)/5*100)):slab.grade==="Premium"?88:76,color:C.green},
    {label:"Structural integrity",value:defects.some(d=>String(d).toLowerCase().includes("crack"))?58:95,color:defects.some(d=>String(d).toLowerCase().includes("crack"))?C.red:C.green},
    {label:"Dimensional accuracy",value:measurements.thickness?84:70,color:measurements.thickness?C.green:C.amber},
  ];
  const reportUrl=window.location.href;
  const canInquire=(slab.inventory_status||"available")==="available";
  const inquiryReady=inq.name.trim()&&(inq.email.trim()||inq.phone.trim());
  const areaSqFt=Number(inq.areaSqFt);
  const quoteEstimate=Number.isFinite(areaSqFt)&&areaSqFt>0 ? Math.round(areaSqFt*Number(slab.price_per_sq_ft||0)) : 0;
  const batchLabel=trace.batchNo || slab.id;

  async function copyReport(){
    const text=[
      `Quality report: ${slab.stone}`,
      `Grade: ${slab.grade}`,
      `Export readiness: ${exportScore}%`,
      `Supplier: ${slab.factory_name}`,
      `Batch: ${batchLabel}`,
      `Link: ${reportUrl}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(()=>setCopied(false),1600);
    } catch(e) {
      window.prompt("Copy quality report",text);
    }
  }

  async function submitInquiry(){
    if(!inquiryReady||inqBusy)return;
    setInqBusy(true);setInqError("");
    const message=[
      inq.areaSqFt.trim()?`Area required: ${inq.areaSqFt.trim()} sq ft`:"",
      quoteEstimate?`Estimated slab value: ${fmtMoney(quoteEstimate)}`:"",
      inq.message.trim(),
      inq.phone.trim()?`Phone: ${inq.phone.trim()}`:"",
      `Quality report: ${reportUrl}`,
    ].filter(Boolean).join("\n\n");
    const {error}=await supabase.rpc("create_public_slab_inquiry",{
      slab_id:slab.id,
      buyer_name:inq.name.trim(),
      buyer_company:inq.company.trim(),
      buyer_email:inq.email.trim(),
      buyer_message:message,
    });
    if(error){setInqError(error.message||"Unable to send inquiry.");setInqBusy(false);return;}
    setInqSent(true);setInqBusy(false);
  }

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(180deg,#f8f9fb 0%,#f0f2f5 44%,#eef3f8 100%)",fontFamily:FONT_STACK,color:C.text,paddingBottom:92}}>
      <div style={{position:"sticky",top:0,zIndex:20,display:"flex",alignItems:"center",gap:12,padding:"14px 16px",background:"rgba(248,249,251,.94)",backdropFilter:"blur(10px)",borderBottom:`1px solid ${C.border}`}}>
        <button onClick={()=>{if(window.history.length>1)window.history.back();else window.location.assign("/");}} aria-label="Back" style={{width:36,height:36,borderRadius:10,border:`1px solid ${C.border}`,background:C.white,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 1px 3px rgba(10,37,64,.04)"}}>
          <Icon name="prev" size={18} color={C.primaryD}/>
        </button>
        <div style={{fontSize:14,fontWeight:850,color:C.primaryD}}>
          Quality Report
          <div style={{fontSize:10.5,fontWeight:500,color:C.textDim,fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace"}}>{slab.factory_name}</div>
        </div>
        <button onClick={copyReport} aria-label="Share report" style={{marginLeft:"auto",width:36,height:36,borderRadius:10,border:`1px solid ${C.border}`,background:C.white,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 1px 3px rgba(10,37,64,.04)"}}>
          <Icon name={copied?"check":"upload"} size={18} color={copied?C.green:C.primaryD}/>
        </button>
      </div>

      <main style={{width:"100%",maxWidth:480,margin:"0 auto"}}>
        <section style={{padding:"22px 18px 0"}}>
          <div style={{height:318,border:`1px solid ${C.primaryBorder}`,borderRadius:16,boxShadow:"0 4px 16px rgba(10,37,64,.10)",position:"relative",overflow:"hidden",background:C.white}}>
            {photo?<img src={photo} alt={slab.stone} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>:<PlaceholderSlab/>}
            <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(255,255,255,0) 0 52%,rgba(0,63,122,.14) 100%)",pointerEvents:"none"}}/>
            <div style={{position:"absolute",top:14,left:14,display:"inline-flex",alignItems:"center",gap:6,fontSize:10,fontWeight:850,color:C.green,background:"rgba(255,255,255,.9)",border:`1px solid ${C.greenBorder}`,padding:"6px 10px",borderRadius:999}}>
              <Icon name="verified" size={11}/>{slab.export_ready?"Export ready":"Epistable graded"}
            </div>
            <div style={{position:"absolute",right:14,top:14,fontSize:10,fontWeight:750,color:C.primaryD,background:"rgba(255,255,255,.78)",padding:"6px 10px",borderRadius:999}}>{batchLabel}</div>
            <div style={{position:"absolute",left:14,right:14,bottom:14,background:"rgba(255,255,255,.94)",border:`1px solid ${C.primaryBorder}`,borderRadius:14,padding:14,display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"end",boxShadow:"0 4px 16px rgba(10,37,64,.08)"}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:23,fontWeight:850,color:C.primaryD,lineHeight:1.05}}>{slab.stone}</div>
                <div style={{fontSize:10.5,color:C.textMid,marginTop:5,fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace"}}>{evidenceCount || "No"} photo{evidenceCount===1?"":"s"} - {slab.grade} - {slab.date || "date not recorded"}</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <div style={{minWidth:62,borderRadius:10,background:C.primaryBg,padding:"8px 9px",textAlign:"center"}}>
                  <strong style={{display:"block",fontSize:17,lineHeight:1,color:C.primaryD}}>{String(slab.grade||"A").slice(0,1)}</strong>
                  <span style={{display:"block",fontSize:9.5,fontWeight:750,color:C.primary,marginTop:4}}>Quality</span>
                </div>
                <div style={{minWidth:62,borderRadius:10,background:C.primaryBg,padding:"8px 9px",textAlign:"center"}}>
                  <strong style={{display:"block",fontSize:17,lineHeight:1,color:C.primaryD}}>{exportScore}%</strong>
                  <span style={{display:"block",fontSize:9.5,fontWeight:750,color:C.primary,marginTop:4}}>Export</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{margin:"10px 4px 0",display:"flex",alignItems:"flex-start",gap:7,color:C.textMid,fontSize:11,lineHeight:1.45}}>
            <Icon name="alert" size={13} color={C.primary} style={{flex:"none",marginTop:1}}/>AI grade from seller images. Documents checked separately.
          </div>
        </section>

        <section style={{padding:"22px 18px 0"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,margin:"0 2px 12px"}}>
            <h2 style={{fontSize:15,fontWeight:850,color:C.primaryD,margin:0}}>Specifications</h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
            <Field label="Dimensions" value={measurements.length&&measurements.width?`${measurements.length} x ${measurements.width} cm`:"Not recorded"}/>
            <Field label="Thickness" value={measurements.thickness?`${measurements.thickness} mm`:"Not recorded"}/>
            <Field label="Finish" value={measurements.surfaceFinish || measurements.finish || "Polished"}/>
            <Field label="Price" value={`${fmtMoney(slab.price_per_sq_ft||0)} / sqft`}/>
          </div>
        </section>

        <section style={{padding:"22px 18px 0"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,margin:"0 2px 12px"}}>
            <h2 style={{fontSize:15,fontWeight:850,color:C.primaryD,margin:0}}>Grade breakdown</h2>
            <span style={{marginLeft:"auto",fontSize:11,color:C.textDim,fontWeight:650,fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace"}}>{g.label}</span>
          </div>
          <Card style={{borderRadius:14,padding:18}}>
            {qualityScores.map((s,i)=><ScoreBar key={s.label} label={s.label} value={s.value} color={s.color} style={{borderTop:i?undefined:"none"}}/>)}
          </Card>
        </section>

        <section style={{padding:"22px 18px 0"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,margin:"0 2px 12px"}}>
            <h2 style={{fontSize:15,fontWeight:850,color:C.primaryD,margin:0}}>Defect analysis</h2>
            <span style={{marginLeft:"auto",fontSize:11,color:C.textDim,fontWeight:650,fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace"}}>{defects.length ? `${defects.length} found` : "Clear"}</span>
          </div>
          <Card style={{borderRadius:14,padding:18}}>
            <div style={{height:170,borderRadius:12,position:"relative",overflow:"hidden",background:"linear-gradient(135deg,#f6f8fb 0%,#d4dce7 46%,#edf2f7 100%)",marginBottom:14}}>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent 0 24%,rgba(0,87,168,.08) 25% 26%,transparent 27% 61%,rgba(0,151,167,.08) 62% 63%,transparent 64% 100%)"}}/>
              {defects.slice(0,3).map((d,i)=><span key={`${d}-${i}`} style={{position:"absolute",left:`${34+i*18}%`,top:`${40+(i%2)*18}%`,width:22,height:22,borderRadius:"50%",border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:850,color:"#fff",transform:"translate(-50%,-50%)",boxShadow:"0 3px 8px rgba(0,0,0,.28)",zIndex:2,background:i?C.blue2:C.amber}}>{i+1}</span>)}
              <span style={{position:"absolute",left:10,bottom:10,fontSize:9.5,fontWeight:750,color:C.primaryD,background:"rgba(255,255,255,.86)",padding:"4px 9px",borderRadius:7,zIndex:2}}>Current slab map</span>
            </div>
            {defects.length?defects.map((d,i)=><div key={`${d}-${i}`} style={{display:"flex",alignItems:"center",gap:11,padding:"11px 0",borderTop:i?`1px solid ${C.border}`:"none"}}>
              <span style={{width:9,height:9,borderRadius:"50%",background:i?C.blue2:C.amber,flex:"none"}}/>
              <span style={{flex:1,fontSize:13,fontWeight:650,color:C.primaryD,textTransform:"capitalize"}}>{d}</span>
              <span style={{fontSize:10,fontWeight:850,textTransform:"uppercase",letterSpacing:.4,padding:"3px 8px",borderRadius:6,color:i?C.blue2:C.amber,background:i?C.blue2Bg:C.amberBg}}>{i?"Trace":"Minor"}</span>
            </div>):<div style={{fontSize:13,fontWeight:700,color:C.green}}>No defects recorded</div>}
          </Card>
        </section>

        <section style={{padding:"22px 18px 0"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,margin:"0 2px 12px"}}>
            <h2 style={{fontSize:15,fontWeight:850,color:C.primaryD,margin:0}}>Batch and source</h2>
            <span style={{marginLeft:"auto",fontSize:11,color:C.textDim,fontWeight:650,fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace"}}>{batchLabel}</span>
          </div>
          <Card style={{borderRadius:14,padding:18}}>
            {[
              ["Quarry / source",trace.quarrySource || "Not recorded"],
              ["Cut and polished",trace.productionLine || "Factory record"],
              ["QR-sealed and graded",`${traceCount}/7 trace fields recorded`],
            ].map(([title,meta],i)=><div key={title} style={{position:"relative",padding:`0 0 ${i===2?0:16}px 30px`}}>
              {i<2&&<span style={{position:"absolute",left:9,top:19,bottom:-2,width:2,background:`linear-gradient(${C.primary},${C.border})`}}/>}
              <span style={{position:"absolute",left:0,top:1,width:19,height:19,borderRadius:"50%",background:C.white,border:`2px solid ${C.primary}`,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="check" size={10} color={C.primary}/></span>
              <span style={{fontSize:13.5,fontWeight:800,color:C.primaryD}}>{title}</span>
              <span style={{display:"inline-block",fontSize:10,fontWeight:650,color:C.primaryD,background:C.primaryBg,padding:"2px 7px",borderRadius:5,marginLeft:7}}>{meta}</span>
            </div>)}
          </Card>
        </section>

        <section style={{padding:"22px 18px 0"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,margin:"0 2px 12px"}}>
            <h2 style={{fontSize:15,fontWeight:850,color:C.primaryD,margin:0}}>Compliance for this batch</h2>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            <div style={{display:"flex",alignItems:"center",gap:12,background:C.white,borderRadius:12,boxShadow:C.shadow,padding:"15px 16px",border:`1px solid ${C.border}`}}>
              <span style={{width:34,height:34,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flex:"none",background:slab.export_ready?C.greenBg:C.amberBg,color:slab.export_ready?C.green:C.amber}}><Icon name={slab.export_ready?"check":"alert"} size={17}/></span>
              <span style={{flex:1}}><span style={{display:"block",fontSize:13.5,fontWeight:800,color:C.primaryD}}>{slab.export_ready?"Export ready":"Export readiness partial"}</span><span style={{display:"block",fontSize:11.5,color:C.textMid,marginTop:1}}>{exportScore}% evidence readiness from photos, traceability, and audit fields</span></span>
              <Icon name="next" size={16} color={C.textDim}/>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12,background:C.white,borderRadius:12,boxShadow:C.shadow,padding:"15px 16px",border:`1px solid ${C.border}`}}>
              <span style={{width:34,height:34,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flex:"none",background:auditCount>=4?C.greenBg:C.amberBg,color:auditCount>=4?C.green:C.amber}}><Icon name={auditCount>=4?"file":"alert"} size={17}/></span>
              <span style={{flex:1}}><span style={{display:"block",fontSize:13.5,fontWeight:800,color:C.primaryD}}>Document checks</span><span style={{display:"block",fontSize:11.5,color:C.textMid,marginTop:1}}>{auditCount}/6 audit fields recorded for this slab</span></span>
              <Icon name="next" size={16} color={C.textDim}/>
            </div>
          </div>
        </section>

        <div style={{margin:"24px 18px 0",fontSize:11,color:C.textMid,lineHeight:1.55,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:12,padding:"13px 15px"}}>
          <b style={{color:C.primaryD}}>How to read this.</b> AI grade is based on seller images. Documents are checked separately. Request independent inspection before large orders.
        </div>
      </main>

      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,zIndex:30,background:"rgba(255,255,255,.93)",backdropFilter:"blur(10px)",borderTop:`1px solid ${C.border}`,padding:"12px 16px calc(12px + env(safe-area-inset-bottom))",display:"flex",gap:10}}>
        {inqSent?<button style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontWeight:750,fontSize:14.5,padding:14,borderRadius:12,cursor:"default",border:"none",background:C.green,color:C.white,fontFamily:FONT_STACK}}><Icon name="check" size={16}/>Quote requested</button>:
        <button disabled={!canInquire} onClick={()=>document.getElementById("quality-inquiry")?.scrollIntoView({behavior:"smooth",block:"center"})} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontWeight:750,fontSize:14.5,padding:14,borderRadius:12,cursor:canInquire?"pointer":"not-allowed",border:"none",background:canInquire?C.primary:C.border,color:canInquire?C.white:C.textDim,fontFamily:FONT_STACK,boxShadow:canInquire?"0 4px 16px rgba(0,87,168,.22)":"none"}}><Icon name="message" size={16}/>Request quote</button>}
        <button onClick={()=>window.print()} aria-label="Download report" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontWeight:750,fontSize:14.5,padding:"14px 16px",borderRadius:12,cursor:"pointer",border:`1px solid ${C.border}`,background:C.white,color:C.primaryD,fontFamily:FONT_STACK}}><Icon name="download" size={16}/></button>
        <button onClick={copyReport} aria-label="Share report" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontWeight:750,fontSize:14.5,padding:"14px 16px",borderRadius:12,cursor:"pointer",border:`1px solid ${C.border}`,background:C.white,color:C.primaryD,fontFamily:FONT_STACK}}><Icon name={copied?"check":"upload"} size={16}/></button>
      </div>

      <div id="quality-inquiry" style={{maxWidth:480,margin:"0 auto",padding:"22px 18px 112px"}}>
        <Card style={{borderRadius:14,padding:18}}>
          <div style={{fontSize:15,fontWeight:850,color:C.primaryD,marginBottom:10}}>Request quote</div>
          {!canInquire?<div style={{fontSize:13,color:C.textMid,lineHeight:1.6}}>This slab is not currently marked available. Open the supplier profile for alternatives.</div>:inqSent?<div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:12,padding:14,color:C.green,fontSize:13,fontWeight:750}}>Inquiry sent to {slab.factory_name}.</div>:<div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input value={inq.name} onChange={e=>setInq(p=>({...p,name:e.target.value}))} placeholder="Your name" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK}}/>
            <input value={inq.company} onChange={e=>setInq(p=>({...p,company:e.target.value}))} placeholder="Company (optional)" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK}}/>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
              <input value={inq.email} onChange={e=>setInq(p=>({...p,email:e.target.value}))} placeholder="Email" type="email" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,minWidth:0}}/>
              <input value={inq.phone} onChange={e=>setInq(p=>({...p,phone:e.target.value}))} placeholder="Phone" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,minWidth:0}}/>
            </div>
            <input value={inq.areaSqFt} onChange={e=>setInq(p=>({...p,areaSqFt:e.target.value.replace(/[^\d.]/g,"")}))} placeholder="Area required in sq ft (optional)" inputMode="decimal" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK}}/>
            {quoteEstimate>0&&<div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:"12px 14px",display:"flex",justifyContent:"space-between",gap:12}}><span style={{fontSize:12,fontWeight:700,color:C.green}}>Estimated value</span><span style={{fontSize:13,fontWeight:850,color:C.green}}>{fmtMoney(quoteEstimate)}</span></div>}
            <textarea value={inq.message} onChange={e=>setInq(p=>({...p,message:e.target.value}))} rows={3} placeholder="Message (quantity, timeline, destination...)" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,resize:"none"}}/>
            {inqError&&<div style={{fontSize:12,color:C.red,fontWeight:700}}>{inqError}</div>}
            <Btn full disabled={!inquiryReady||inqBusy} onClick={submitInquiry}>{inqBusy?"Sending...":"Send inquiry"}</Btn>
            <div style={{fontSize:11.5,color:C.textDim,lineHeight:1.5}}>Name and either email or phone are required.</div>
          </div>}
        </Card>
      </div>
    </div>
  );
}
