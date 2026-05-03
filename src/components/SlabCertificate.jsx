import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { C, gradeConf } from "../lib/domain";
import { useBP } from "../hooks/useBP";
import { Btn, Card, Loader, PBar } from "./ui";

const asList = value => Array.isArray(value) ? value : [];
const asObject = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};

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
        <div style={{fontSize:18,fontWeight:800,marginBottom:8,color:C.text}}>{title}</div>
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
  const {isMobile}=useBP();

  useEffect(()=>{
    let active=true;
    async function load(){
      setLoading(true);setError("");
      const {data,error}=await supabase.rpc("get_public_slab_certificate",{slab_id:slabId});
      if(!active)return;
      if(error){setError(error.message||"Unable to load this slab certificate.");setLoading(false);return;}
      const row=Array.isArray(data)?data[0]:data;
      if(!row){setError("No verified slab was found for this QR code.");setLoading(false);return;}
      setSlab(row);setLoading(false);
    }
    load();
    return()=>{active=false;};
  },[slabId]);

  const measurements=useMemo(()=>asObject(slab?.measurements),[slab]);
  const defects=useMemo(()=>asList(slab?.defects),[slab]);
  const photos=useMemo(()=>asList(slab?.photos).filter(Boolean),[slab]);

  if(loading)return <Loader/>;
  if(error)return <CertificateError title="Certificate unavailable" msg={error}/>;

  const g=gradeConf(slab.grade);
  const inspectedAt=[slab.date,slab.time].filter(Boolean).join(" at ");
  const photo=slab.photo || photos[0];
  const polish=measurements.polish ? Number(measurements.polish) : 0;

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',sans-serif",color:C.text}}>
      <div style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary},${C.teal})`,color:C.white}}>
        <div style={{maxWidth:980,margin:"0 auto",padding:"18px 18px 24px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:18}}>
            <div>
              <div style={{fontSize:22,fontWeight:900,letterSpacing:0}}>Epistable AI</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.72)"}}>Verified slab certificate</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:999,padding:"6px 12px",fontSize:12,fontWeight:800}}>VERIFIED</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"minmax(0,1.2fr) minmax(220px,0.8fr)",gap:16,alignItems:"stretch"}}>
            <div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.72)",fontFamily:"monospace",marginBottom:7}}>{slab.id}</div>
              <div style={{fontSize:30,fontWeight:900,lineHeight:1.08,marginBottom:8}}>{slab.stone}</div>
              <div style={{fontSize:14,color:"rgba(255,255,255,0.78)",lineHeight:1.5}}>{slab.factory_name}{slab.factory_location ? `, ${slab.factory_location}` : ""}</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.18)",borderRadius:12,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:8}}>
                <div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.68)",textTransform:"uppercase",fontWeight:800}}>Grade</div>
                  <div style={{fontSize:24,fontWeight:900,color:C.white}}>{slab.grade}</div>
                </div>
                <div style={{background:g.bg,border:`1px solid ${g.border}`,color:g.color,borderRadius:10,padding:"8px 12px",fontSize:13,fontWeight:900}}>{g.label}</div>
              </div>
              <div style={{fontSize:26,fontWeight:900}}>Rs {slab.price_per_sq_ft || 0}<span style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.65)"}}> / sq ft</span></div>
            </div>
          </div>
        </div>
      </div>

      <main style={{maxWidth:980,margin:"0 auto",padding:"16px 18px 48px"}}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"minmax(0,1.1fr) minmax(280px,0.9fr)",gap:16}}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <Card style={{overflow:"hidden"}}>
              <div style={{aspectRatio:"16/9",background:g.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {photo?<img src={photo} alt={slab.stone} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>:<div style={{fontSize:18,fontWeight:800,color:g.color}}>No slab photo recorded</div>}
              </div>
            </Card>

            <Card style={{padding:18}}>
              <div style={{fontSize:16,fontWeight:900,marginBottom:8}}>Inspection Summary</div>
              <div style={{fontSize:14,lineHeight:1.7,color:C.textMid}}>{slab.reason || "No grading reason was recorded for this slab."}</div>
              {slab.notes&&<div style={{marginTop:12,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:12,fontSize:13,lineHeight:1.6,color:C.textMid}}>{slab.notes}</div>}
            </Card>

            {photos.length>1&&<Card style={{padding:18}}>
              <div style={{fontSize:16,fontWeight:900,marginBottom:12}}>Photo Evidence</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10}}>
                {photos.slice(1,7).map((src,idx)=><img key={idx} src={src} alt="" style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:10,border:`1px solid ${C.border}`}}/>)}
              </div>
            </Card>}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <Card style={{padding:18}}>
              <div style={{fontSize:16,fontWeight:900,marginBottom:8}}>Certificate Details</div>
              <Field label="Factory" value={slab.factory_name}/>
              <Field label="Supplier" value={slab.supplier}/>
              <Field label="Inspector" value={slab.inspector}/>
              <Field label="Inspected" value={inspectedAt}/>
              <Field label="Export ready" value={slab.export_ready ? "Yes" : "No"}/>
            </Card>

            <Card style={{padding:18}}>
              <div style={{fontSize:16,fontWeight:900,marginBottom:8}}>Measurements</div>
              <Field label="Thickness" value={measurements.thickness ? `${measurements.thickness} mm` : ""}/>
              <Field label="Size" value={measurements.length && measurements.width ? `${measurements.length} x ${measurements.width} cm` : ""}/>
              <Field label="Sound test" value={measurements.soundTest}/>
              <Field label="Edge condition" value={measurements.edgeCondition}/>
              <Field label="Surface finish" value={measurements.surfaceFinish}/>
              {polish>0&&<div style={{paddingTop:12}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:800,marginBottom:6}}><span>Polish level</span><span>{polish}/5</span></div>
                <PBar value={polish/5*100} color={C.primary} h={8}/>
              </div>}
            </Card>

            <Card style={{padding:18}}>
              <div style={{fontSize:16,fontWeight:900,marginBottom:10}}>Defects</div>
              {defects.length===0?<div style={{fontSize:13,color:C.green,fontWeight:800}}>No defects recorded</div>:
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {defects.map(d=><span key={d} style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:999,padding:"5px 10px",fontSize:12,fontWeight:800,color:C.amber,textTransform:"capitalize"}}>{d}</span>)}
              </div>}
            </Card>

            <Card style={{padding:18}}>
              <div style={{fontSize:16,fontWeight:900,marginBottom:8}}>Contact Factory</div>
              <div style={{fontSize:13,color:C.textMid,lineHeight:1.6,marginBottom:12}}>Use this certificate ID when contacting the factory about this slab.</div>
              {slab.factory_contact_email?<Btn full onClick={()=>window.location.href=`mailto:${slab.factory_contact_email}?subject=Inquiry about slab ${slab.id}`}>Email Factory</Btn>:<Btn full onClick={()=>window.print()}>Print Certificate</Btn>}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
