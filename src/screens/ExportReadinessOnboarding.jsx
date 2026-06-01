import { useState } from "react";
import { C } from "../lib/domain";
import { EXPORT_MARKETS } from "../lib/markets";
import { EXPORT_PRODUCTS } from "../lib/readiness";
import { SPACE } from "../lib/tokens";
import { Btn, Card, Sel, T } from "../components/ui";
import { Pill } from "../components/Pill";

const STATUS_OPTIONS = [
  {value:"planning",label:"Planning my first export"},
  {value:"first_export",label:"Preparing my first shipment"},
  {value:"active_exporter",label:"Already exporting"},
  {value:"expanding_markets",label:"Expanding to new markets"},
];

export function ExportReadinessOnboarding({profile,onComplete,onSave,saving=false}) {
  const [step,setStep]=useState(0);
  const [form,setForm]=useState({
    markets:profile?.destination_markets?.length?profile.destination_markets:["EU"],
    productType:profile?.product_type||"granite",
    exportStatus:profile?.export_status||"planning",
  });
  const [err,setErr]=useState("");
  const canContinue=step>0 || form.markets.length>0;

  const toggleMarket=code=>{
    setForm(prev=>{
      const set=new Set(prev.markets);
      if(set.has(code))set.delete(code);else set.add(code);
      return {...prev,markets:Array.from(set)};
    });
  };
  const submit=async()=>{
    if(!form.markets.length){setErr("Pick at least one market to continue.");return;}
    setErr("");
    const saved=await onSave?.({
      sector:"stone",
      productType:form.productType,
      markets:form.markets,
      exportStatus:form.exportStatus,
      companySize:profile?.company_size||"",
      currentCertifications:profile?.current_certifications||[],
    });
    if(saved)onComplete?.();
  };

  return (
    <div style={{display:"grid",gap:SPACE.lg,maxWidth:760,margin:"0 auto"}}>
      <div>
        <div style={{...T.title,fontWeight:700,marginBottom:SPACE.xs}}>Export Readiness</div>
        <div style={{...T.hint,color:C.textDim}}>Let's set up your first readiness view around the markets you care about.</div>
      </div>
      <Card style={{padding:SPACE.xl}}>
        {step===0&&(
          <div style={{display:"grid",gap:SPACE.lg}}>
            <div>
              <div style={{fontSize:20,fontWeight:700,color:C.text,marginBottom:SPACE.xs}}>Let's get started.</div>
              <div style={{fontSize:14,lineHeight:1.65,color:C.textMid}}>Which markets are you currently targeting, or want to target?</div>
            </div>
            <div style={{display:"flex",gap:SPACE.sm,flexWrap:"wrap"}}>
              {EXPORT_MARKETS.map(m=>{
                const active=form.markets.includes(m.value);
                return (
                  <button key={m.value} type="button" onClick={()=>toggleMarket(m.value)} style={{background:active?C.primaryBg:C.white,border:`1.5px solid ${active?C.primary:C.border}`,borderRadius:999,padding:"9px 13px",fontSize:13,fontWeight:600,color:active?C.primary:C.textMid,cursor:"pointer"}}>
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {step===1&&(
          <div style={{display:"grid",gap:SPACE.lg}}>
            <div>
              <div style={{fontSize:20,fontWeight:700,color:C.text,marginBottom:SPACE.xs}}>What's your primary product?</div>
              <div style={{fontSize:14,lineHeight:1.65,color:C.textMid}}>You can adjust this later as your export plan changes.</div>
            </div>
            <Sel label="Primary product" value={form.productType} onChange={v=>setForm(p=>({...p,productType:v}))} options={EXPORT_PRODUCTS}/>
          </div>
        )}
        {step===2&&(
          <div style={{display:"grid",gap:SPACE.lg}}>
            <div>
              <div style={{fontSize:20,fontWeight:700,color:C.text,marginBottom:SPACE.xs}}>Where are you today?</div>
              <div style={{fontSize:14,lineHeight:1.65,color:C.textMid}}>This helps us order the readiness work around your current stage.</div>
            </div>
            <div style={{display:"grid",gap:SPACE.sm}}>
              {STATUS_OPTIONS.map(opt=>{
                const active=form.exportStatus===opt.value;
                return (
                  <button key={opt.value} type="button" onClick={()=>setForm(p=>({...p,exportStatus:opt.value}))} style={{textAlign:"left",background:active?C.primaryBg:C.white,border:`1.5px solid ${active?C.primary:C.border}`,borderRadius:10,padding:"12px 14px",fontSize:14,fontWeight:600,color:active?C.primary:C.text,cursor:"pointer"}}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {err&&<div style={{marginTop:SPACE.md,color:C.red,fontSize:13}}>{err}</div>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:SPACE.md,marginTop:SPACE.xl}}>
          <Pill tone="neutral">Step {step+1} of 3</Pill>
          <div style={{display:"flex",gap:SPACE.sm}}>
            {step>0&&<Btn variant="secondary" onClick={()=>setStep(s=>s-1)} disabled={saving}>Back</Btn>}
            {step<2&&<Btn onClick={()=>setStep(s=>s+1)} disabled={!canContinue||saving}>Continue</Btn>}
            {step===2&&<Btn onClick={submit} disabled={saving}>Create readiness view</Btn>}
          </div>
        </div>
      </Card>
    </div>
  );
}
