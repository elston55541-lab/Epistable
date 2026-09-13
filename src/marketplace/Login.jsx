import { useId, useState } from "react";
import { friendlyAuthError, signInWithEmail } from "../lib/auth";
import { Icon } from "../components/Icon";
import { Btn, Card, T } from "../components/ui";
import { COLOR as C, FONT_STACK, RADIUS, SHADOW, SPACE, TYPE, WEIGHT } from "../lib/tokens";

function LoginInput({label,value,onChange,type,placeholder,autoComplete,disabled}) {
  const id=useId();
  const [focused,setFocused]=useState(false);
  return <div>
    <label htmlFor={id} style={{display:"block",color:C.text,marginBottom:SPACE.sm,...T.label}}>{label}</label>
    <input id={id} type={type} required autoComplete={autoComplete} disabled={disabled}
      value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
      style={{width:"100%",padding:`${SPACE.md+2}px ${SPACE.base}px`,background:C.white,
        border:`1.5px solid ${focused?C.primary:C.border}`,borderRadius:RADIUS.md,color:C.text,
        outline:"none",boxSizing:"border-box",...T.body}}/>
  </div>;
}

export function Login({onSignedIn}) {
  const [email,setEmail]=useState(""),[password,setPassword]=useState("");
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  async function submit(e) {
    e.preventDefault();setBusy(true);setError("");
    try {await signInWithEmail(email,password);await onSignedIn();}
    catch(e){setError(friendlyAuthError(e));}
    finally{setBusy(false);}
  }
  return <div style={{minHeight:"100vh",background:C.bg,display:"grid",placeItems:"center",padding:SPACE.xl,fontFamily:FONT_STACK,lineHeight:1.5}}>
    <Card style={{width:"100%",maxWidth:440+SPACE.xxl*2+2,padding:SPACE.xxl,boxShadow:SHADOW.raised}}>
      <div style={{display:"flex",alignItems:"center",gap:SPACE.md,marginBottom:SPACE.xl}}>
        <div style={{width:44,height:44,flexShrink:0,borderRadius:RADIUS.md,background:C.primary,display:"grid",placeItems:"center"}}><Icon name="verified" size={22} color={C.white}/></div>
        <div><div role="heading" aria-level={1} style={{fontSize:TYPE.display.size,fontWeight:WEIGHT.bold,color:C.text}}>Epistable</div><div style={{fontSize:TYPE.label.size,color:C.textDim}}>Verified cross-border food trade</div></div>
      </div>
      <form onSubmit={submit} aria-label="Sign in" style={{display:"flex",flexDirection:"column",gap:SPACE.base}}>
        <LoginInput label="Email" value={email} onChange={setEmail} type="email" placeholder="name@company.com" autoComplete="username" disabled={busy}/>
        <LoginInput label="Password" value={password} onChange={setPassword} type="password" autoComplete="current-password" disabled={busy}/>
        {error&&<div role="alert" style={{padding:SPACE.md,borderRadius:RADIUS.md,background:C.redBg,border:`1px solid ${C.redBorder}`,color:C.red,fontSize:TYPE.label.size}}>{error}</div>}
        <Btn full disabled={busy}>{busy?"Signing in...":"Sign in"}</Btn>
      </form>
    </Card>
  </div>;
}
