import { useState } from "react";
import { C } from "../lib/domain";
import { FONT_STACK, SPACE } from "../lib/tokens";
import { Btn, Inp, Modal, Sel, T } from "./ui";

export function EvidenceUploadModal({req,evidence,bodies,onClose,onSave,saving}) {
  const [form,setForm]=useState({
    certificateNumber:evidence?.certificate_number||"",
    issuingBodyId:evidence?.issuing_body_id||"",
    issuedAt:evidence?.issued_at?new Date(evidence.issued_at).toISOString().slice(0,10):"",
    expiresAt:evidence?.expires_at?new Date(evidence.expires_at).toISOString().slice(0,10):"",
    fileUrl:evidence?.file_url||"",
    notes:evidence?.notes||"",
  });
  const bodyOptions=[{value:"",label:"Select issuing body"},...bodies.map(b=>({value:b.id,label:b.name}))];
  const toTs=v=>v?new Date(`${v}T00:00:00`).getTime():null;
  return (
    <Modal title={`Submit evidence - ${req.shortName||req.requirementName}`} onClose={onClose} closeOnBackdrop={false}>
      <div style={{display:"grid",gap:14}}>
        <div style={{fontSize:13,lineHeight:1.65,color:C.textMid}}>{req.evidence_instructions||"Add the certificate, report, document link, or reference number you already have. This is submitted evidence, not an Epistable-issued certification."}</div>
        <Inp label="Certificate / document number" value={form.certificateNumber} onChange={v=>setForm(p=>({...p,certificateNumber:v}))} placeholder="e.g. IEC number, certificate ID, test report no."/>
        <Sel label="Issuing body" value={form.issuingBodyId} onChange={v=>setForm(p=>({...p,issuingBodyId:v}))} options={bodyOptions}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="Issued date" type="date" value={form.issuedAt} onChange={v=>setForm(p=>({...p,issuedAt:v}))}/>
          <Inp label="Valid until" type="date" value={form.expiresAt} onChange={v=>setForm(p=>({...p,expiresAt:v}))}/>
        </div>
        <Inp label="File link" value={form.fileUrl} onChange={v=>setForm(p=>({...p,fileUrl:v}))} placeholder="Paste document URL for now"/>
        <div>
          <label style={{display:"block",color:C.text,marginBottom:SPACE.sm,...T.label}}>Notes</label>
          <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={3} placeholder="Scope, product covered, or what an auditor should know" style={{width:"100%",padding:12,border:`1.5px solid ${C.border}`,borderRadius:10,boxSizing:"border-box",fontFamily:FONT_STACK,fontSize:14,color:C.text,resize:"vertical"}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancel</Btn>
          <Btn onClick={()=>onSave({status:"submitted",certificateNumber:form.certificateNumber,issuingBodyId:form.issuingBodyId||null,issuedAt:toTs(form.issuedAt),expiresAt:toTs(form.expiresAt),fileUrl:form.fileUrl||null,notes:form.notes})} disabled={saving}>Submit evidence</Btn>
        </div>
      </div>
    </Modal>
  );
}
