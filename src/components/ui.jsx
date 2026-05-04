import { useState } from "react";
import { C } from "../lib/domain";
import { useBP } from "../hooks/useBP";

export const Card = ({children,style={},onClick,className}) =>
  <div className={className} onClick={onClick} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,boxShadow:C.shadow,...style}}>{children}</div>;

export const BillPill = ({status}) => {
  const m={paid:{c:C.green,bg:C.greenBg,b:C.greenBorder,l:"✓ Paid"},overdue:{c:C.red,bg:C.redBg,b:C.redBorder,l:"⚠ Overdue"},pending:{c:C.amber,bg:C.amberBg,b:C.amberBorder,l:"● Pending"}};
  const s=m[status]||m.pending;
  return <span style={{background:s.bg,border:`1px solid ${s.b}`,color:s.c,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{s.l}</span>;
};

export const StatPill = ({status}) => {
  const m={active:{c:C.green,bg:C.greenBg,b:C.greenBorder,l:"Active"},paused:{c:C.red,bg:C.redBg,b:C.redBorder,l:"Paused"},suspended:{c:C.red,bg:C.redBg,b:C.redBorder,l:"Suspended"},inactive:{c:C.amber,bg:C.amberBg,b:C.amberBorder,l:"Inactive"},flagged:{c:C.red,bg:C.redBg,b:C.redBorder,l:"⚑ Flagged"}};
  const s=m[status]||m.inactive;
  return <span style={{background:s.bg,border:`1px solid ${s.b}`,color:s.c,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{s.l}</span>;
};

export const DisputeStatusPill = ({status}) => {
  const m={open:{c:C.red,bg:C.redBg,b:C.redBorder,l:"🔴 Open"},reviewing:{c:C.amber,bg:C.amberBg,b:C.amberBorder,l:"🔍 Reviewing"},resolved:{c:C.green,bg:C.greenBg,b:C.greenBorder,l:"✅ Resolved"},dismissed:{c:C.textDim,bg:C.surface,b:C.border,l:"✗ Dismissed"}};
  const s=m[status]||m.open;
  return <span style={{background:s.bg,border:`1px solid ${s.b}`,color:s.c,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{s.l}</span>;
};

export const InqPill = ({status}) => {
  const m={new:{c:C.primary,bg:C.primaryBg,b:C.primaryBorder,l:"🔔 New"},contacted:{c:C.amber,bg:C.amberBg,b:C.amberBorder,l:"📞 Contacted"},closed:{c:C.green,bg:C.greenBg,b:C.greenBorder,l:"✅ Closed"}};
  const s=m[status]||m.new;
  return <span style={{background:s.bg,border:`1px solid ${s.b}`,color:s.c,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{s.l}</span>;
};

export const Avi = ({initials,size=36,color=C.primary,bg=C.primaryBg,border=C.primaryBorder}) =>
  <div style={{width:size,height:size,borderRadius:"50%",background:bg,border:`2px solid ${border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.33,fontWeight:700,color,flexShrink:0}}>{initials}</div>;

export const PBar = ({value,color=C.primary,h=6}) =>
  <div style={{background:"#e9ecef",borderRadius:h,height:h,overflow:"hidden"}}>
    <div style={{background:color,width:`${Math.min(Math.max(value,0),100)}%`,height:"100%",borderRadius:h,transition:"width 0.4s"}}/>
  </div>;

export function Btn({children,onClick,variant="primary",full,disabled,style={},size="md"}) {
  const pad={sm:"8px 16px",md:"12px 20px",lg:"15px 24px"}[size];
  const fs={sm:12,md:14,lg:15}[size];
  const vs={primary:{bg:C.primary,color:C.white,border:"none"},secondary:{bg:C.white,color:C.textMid,border:`1px solid ${C.border}`},green:{bg:C.green,color:C.white,border:"none"},red:{bg:C.red,color:C.white,border:"none"},ghost:{bg:"transparent",color:C.primary,border:`1px solid ${C.primaryBorder}`}};
  const v=vs[variant]||vs.primary;
  return <button onClick={onClick} disabled={disabled} style={{padding:pad,background:v.bg,border:v.border,borderRadius:10,color:v.color,fontWeight:700,fontSize:fs,cursor:disabled?"not-allowed":"pointer",fontFamily:"sans-serif",width:full?"100%":"auto",opacity:disabled?0.5:1,WebkitTapHighlightColor:"transparent",...style}}>{children}</button>;
}

export function Inp({label,value,onChange,type="text",placeholder,required,icon,hint}) {
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

export function Sel({label,value,onChange,options,hint}) {
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

export function Modal({title,onClose,children}) {
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

export function KpiGrid({items}) {
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

export function Loader() {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",flexDirection:"column",gap:12,background:C.bg,fontFamily:"sans-serif"}}>
      <div style={{fontSize:36}}>🪨</div>
      <div style={{color:C.textDim,fontSize:14}}>Loading…</div>
    </div>
  );
}
