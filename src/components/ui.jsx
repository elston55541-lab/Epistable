import { useState } from "react";
import { C } from "../lib/domain";
import { useBP } from "../hooks/useBP";
import { FONT_STACK, RADIUS, SHADOW, SPACE, TYPE, WEIGHT } from "../lib/tokens";
import { Icon } from "./Icon";
import { Pill } from "./Pill";

export const fontStack = FONT_STACK;

const typeStyle = key => ({
  fontFamily: FONT_STACK,
  fontSize: TYPE[key].size,
  lineHeight: TYPE[key].lineHeight,
  fontWeight: TYPE[key].weight,
  letterSpacing: TYPE[key].letterSpacing,
});

export const T = {
  body: typeStyle("body"),
  label: { ...typeStyle("label"), fontWeight: WEIGHT.bold },
  hint: typeStyle("caption"),
  control: { ...typeStyle("body"), lineHeight: 1.2, fontWeight: WEIGHT.bold },
  title: { ...typeStyle("heading"), fontWeight: WEIGHT.bold },
  pill: { ...typeStyle("caption"), lineHeight: 1.25, fontWeight: WEIGHT.bold },
};

const CONTROL_PAD = {
  sm: `${SPACE.sm}px ${SPACE.base}px`,
  md: `${SPACE.md}px ${SPACE.lg}px`,
  lg: `${SPACE.base - 1}px ${SPACE.xl}px`,
};

const CONTROL_FONT = {
  sm: TYPE.label.size,
  md: TYPE.body.size,
  lg: TYPE.body.size + 1,
};

export const Card = ({children,style={},onClick,className,...props}) =>
  <div
    {...props}
    className={className}
    onClick={onClick}
    style={{
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: RADIUS.lg - 2,
      boxShadow: C.shadow,
      ...style,
    }}
  >
    {children}
  </div>;

export const BillPill = ({status}) => {
  const m = {
    paid: { tone: "success", label: "Paid" },
    overdue: { tone: "danger", label: "Overdue" },
    pending: { tone: "warning", label: "Pending" },
  };
  const s = m[status] || m.pending;
  return <Pill tone={s.tone}>{s.label}</Pill>;
};

export const StatPill = ({status}) => {
  const m = {
    active: { tone: "success", label: "Active" },
    paused: { tone: "danger", label: "Paused" },
    suspended: { tone: "danger", label: "Suspended" },
    inactive: { tone: "warning", label: "Inactive" },
    flagged: { tone: "danger", label: "Flagged" },
  };
  const s = m[status] || m.inactive;
  return <Pill tone={s.tone}>{s.label}</Pill>;
};

export const DisputeStatusPill = ({status}) => {
  const m = {
    open: { tone: "danger", label: "Open" },
    reviewing: { tone: "warning", label: "Reviewing" },
    resolved: { tone: "success", label: "Resolved" },
    dismissed: { tone: "neutral", label: "Dismissed" },
  };
  const s = m[status] || m.open;
  return <Pill tone={s.tone}>{s.label}</Pill>;
};

export const InqPill = ({status}) => {
  const m = {
    reserved: { tone: "info", label: "Reserved" },
    new: { tone: "primary", label: "New" },
    contacted: { tone: "warning", label: "Contacted" },
    closed: { tone: "success", label: "Closed" },
  };
  const s = m[status] || m.new;
  return <Pill tone={s.tone}>{s.label}</Pill>;
};

export const Avi = ({initials,size=36,color=C.primary,bg=C.primaryBg,border=C.primaryBorder}) =>
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: bg,
      border: `2px solid ${border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: Math.max(TYPE.caption.size, Math.round(size * 0.33)),
      fontWeight: WEIGHT.bold,
      lineHeight: 1,
      color,
      flexShrink: 0,
      fontFamily: FONT_STACK,
    }}
  >
    {initials}
  </div>;

export const PBar = ({value,color=C.primary,h=6}) => {
  const height = h || SPACE.xs + 2;
  return (
    <div style={{background:C.primaryBg,borderRadius:height,height,overflow:"hidden"}}>
      <div style={{background:color,width:`${Math.min(Math.max(value,0),100)}%`,height:"100%",borderRadius:height,transition:"width 0.4s"}}/>
    </div>
  );
};

const KPI_ICON = {
  "\u{1F4B3}": "billing",
  "\u{1F50D}": "search",
  "\u{1F3ED}": "factory",
  "\u{1F464}": "user",
  "\u{1F465}": "users",
  "\u{1F6A8}": "alert",
  "\u{23F8}": "pause",
  "\u{1F4E6}": "package",
  "\u{1F4C5}": "date",
  "\u{1F4C6}": "date",
  "\u{1F3C6}": "verified",
  Scan: "search",
  Stock: "box",
  Grade: "verified",
  Bill: "billing",
  Quote: "message",
  Won: "check",
  Reply: "message",
  New: "bell",
  Hot: "alert",
  Due: "date",
  Mill: "factory",
  Trace: "list",
  Audit: "verified",
  CAPA: "alert",
  Batch: "package",
  Vol: "chart",
  Risk: "alert",
  Sold: "check",
  Now: "alert",
};

function KpiIcon({icon,color}) {
  if (!icon) return null;
  const name = KPI_ICON[icon] || (typeof icon === "string" && icon.length < 14 ? "chart" : null);
  if (!name || typeof icon !== "string") return icon;
  return <Icon name={name} size={TYPE.display.size - 2} color={color || C.primary}/>;
}

const INPUT_ICON = {
  "\u{1F50D}": "search",
  "\u{2709}\uFE0F": "mail",
  search: "search",
  mail: "mail",
};

function InputIcon({icon}) {
  if (!icon) return null;
  const name = INPUT_ICON[icon] || icon;
  if (typeof name === "string") return <Icon name={name} size={TYPE.body.size + 1} color={C.textDim}/>;
  return name;
}

export function Btn({children,onClick,variant="primary",full,disabled,style={},size="md"}) {
  const pad = CONTROL_PAD[size] || CONTROL_PAD.md;
  const fs = CONTROL_FONT[size] || CONTROL_FONT.md;
  const vs = {
    primary: { bg: C.primary, color: C.white, border: "none" },
    secondary: { bg: C.white, color: C.textMid, border: `1px solid ${C.border}` },
    green: { bg: C.green, color: C.white, border: "none" },
    red: { bg: C.red, color: C.white, border: "none" },
    ghost: { bg: "transparent", color: C.primary, border: `1px solid ${C.primaryBorder}` },
  };
  const v = vs[variant] || vs.primary;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: pad,
        background: v.bg,
        border: v.border,
        borderRadius: RADIUS.md,
        color: v.color,
        fontSize: fs,
        cursor: disabled ? "not-allowed" : "pointer",
        width: full ? "100%" : "auto",
        opacity: disabled ? 0.5 : 1,
        WebkitTapHighlightColor: "transparent",
        ...T.control,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Inp({label,value,onChange,type="text",placeholder,required,icon,hint}) {
  const [f,setF]=useState(false);
  const inputPad = icon
    ? `${SPACE.md}px ${SPACE.base}px ${SPACE.md}px ${SPACE.xxl + SPACE.sm}px`
    : `${SPACE.md}px ${SPACE.base}px`;
  return (
    <div>
      {label&&<label style={{display:"block",color:C.text,marginBottom:SPACE.xs + 2,...T.label}}>{label}{required&&<span style={{color:C.red}}> *</span>}</label>}
      <div style={{position:"relative"}}>
        {icon&&<span style={{position:"absolute",left:SPACE.base - 2,top:"50%",transform:"translateY(-50%)",fontSize:TYPE.body.size + 1,pointerEvents:"none",display:"flex",alignItems:"center"}}><InputIcon icon={icon}/></span>}
        <input
          type={type}
          value={value}
          onChange={e=>onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width:"100%",
            padding: inputPad,
            background:C.white,
            border:`1.5px solid ${f?C.primary:C.border}`,
            borderRadius:RADIUS.md,
            color:C.text,
            outline:"none",
            boxSizing:"border-box",
            ...T.body,
          }}
          onFocus={()=>setF(true)}
          onBlur={()=>setF(false)}
        />
      </div>
      {hint&&<div style={{color:C.textDim,marginTop:SPACE.xs,...T.hint}}>{hint}</div>}
    </div>
  );
}

export function Sel({label,value,onChange,options,hint}) {
  return (
    <div>
      {label&&<label style={{display:"block",color:C.text,marginBottom:SPACE.xs + 2,...T.label}}>{label}</label>}
      <select
        value={value}
        onChange={e=>onChange(e.target.value)}
        style={{
          width:"100%",
          padding:`${SPACE.md}px ${SPACE.base}px`,
          background:C.white,
          border:`1.5px solid ${C.border}`,
          borderRadius:RADIUS.md,
          color:C.text,
          outline:"none",
          WebkitAppearance:"none",
          appearance:"none",
          backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238a8478' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
          backgroundRepeat:"no-repeat",
          backgroundPosition:`right ${SPACE.base - 2}px center`,
          ...T.body,
        }}
      >
        {options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint&&<div style={{color:C.textDim,marginTop:SPACE.xs,...T.hint}}>{hint}</div>}
    </div>
  );
}

export function Modal({title,onClose,children,closeOnBackdrop=true}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={closeOnBackdrop?onClose:undefined}>
      <div style={{background:C.white,borderRadius:`${RADIUS.lg + 6}px ${RADIUS.lg + 6}px 0 0`,width:"100%",maxWidth:560,maxHeight:"92vh",overflow:"auto",boxShadow:SHADOW.modal}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:`${SPACE.md - 2}px 0 0`,display:"flex",justifyContent:"center"}}><div style={{width:SPACE.xxl + SPACE.sm,height:SPACE.xs,borderRadius:SPACE.xs / 2,background:C.border}}/></div>
        <div style={{padding:`${SPACE.base - 2}px ${SPACE.lg}px`,display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${C.border}`}}>
          <div style={{color:C.text,...T.title}}>{title}</div>
          <button onClick={onClose} style={{background:C.surface,border:"none",borderRadius:"50%",color:C.textDim,width:SPACE.xxl,height:SPACE.xxl,cursor:"pointer",fontSize:TYPE.heading.size,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center",WebkitTapHighlightColor:"transparent",fontFamily:FONT_STACK}}>×</button>
        </div>
        <div style={{padding:SPACE.lg}}>{children}</div>
      </div>
    </div>
  );
}

export function KpiGrid({items}) {
  const {isMobile}=useBP();
  return (
    <div style={{display:"grid",gridTemplateColumns:`repeat(${isMobile?2:Math.min(items.length,4)},1fr)`,gap:SPACE.md,marginBottom:TYPE.heading.size}}>
      {items.map(({label,value,color,icon})=>(
        <Card key={label} style={{padding:`${SPACE.base}px ${SPACE.base - 2}px`}}>
          <div style={{fontSize:TYPE.display.size - 2,marginBottom:SPACE.xs + 2,lineHeight:1}}><KpiIcon icon={icon} color={color}/></div>
          <div style={{fontSize:TYPE.display.size - 2,fontWeight:WEIGHT.bold,color:color||C.text,lineHeight:1.1,marginBottom:SPACE.xs - 1,letterSpacing:0}}>{value}</div>
          <div style={{color:C.textMid,fontWeight:WEIGHT.bold,...T.hint}}>{label}</div>
        </Card>
      ))}
    </div>
  );
}

export function Loader() {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",flexDirection:"column",gap:SPACE.md,background:C.bg,fontFamily:FONT_STACK}}>
      <div style={{...typeStyle("display"),fontWeight:WEIGHT.bold,color:C.primary}}>Epistable</div>
      <div style={{color:C.textDim,...T.body}}>Loading...</div>
    </div>
  );
}
