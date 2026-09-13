import { useState } from "react";
import { signInWithEmail, friendlyAuthError } from "../lib/auth";
import { C } from "../lib/domain";
import { Btn } from "../components/ui";
import { Icon } from "../components/Icon";
import { FONT_STACK, TYPE } from "../lib/tokens";
import { useBP } from "../hooks/useBP";

// Layout restored from main before 12 September 2026 (0a0afb2, 2 August).
// Keep marketplace authentication and Food & Agri copy independent of the legacy role router.
export function Login({onSignedIn}) {
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [showP,setShowP]=useState(false);
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const [focus,setFocus]=useState("");
  const {isDesktop}=useBP();

  async function submit(e) {
    e.preventDefault();
    const cleanEmail=email.trim().toLowerCase();
    if(!cleanEmail||!pass){setErr("Please enter email and password.");return;}
    setLoading(true);setErr("");
    try { await signInWithEmail(cleanEmail,pass);await onSignedIn(); }
    catch(e){setErr(friendlyAuthError(e,"login"));}
    finally{setLoading(false);}
  }

  const fieldStyle=name=>({
    width:"100%",padding:isDesktop?"15px 16px":"13px 14px",background:C.white,border:`1px solid ${C.border}`,
    borderRadius:6,color:C.text,fontSize:isDesktop?16:15,outline:"none",boxSizing:"border-box",fontFamily:FONT_STACK,
    boxShadow:focus===name?"0 0 0 3px rgba(0, 87, 168, 0.12)":"none"
  });
  const loginFields=(
    <form onSubmit={submit} aria-label="Sign in">
      <div style={{display:"flex",flexDirection:"column",gap:15,marginBottom:20}}>
        <div>
          <label htmlFor="epistable-login-email" style={{display:"block",fontSize:13,fontWeight:600,color:C.text,marginBottom:7}}>Email</label>
          <input id="epistable-login-email" aria-label="Email" required disabled={loading} type="email" value={email} onChange={e=>{setEmail(e.target.value);if(err)setErr("");}} onFocus={()=>setFocus("email")} onBlur={()=>setFocus("")} autoComplete="email" placeholder="you@example.com" style={fieldStyle("email")}/>
        </div>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
            <label htmlFor="epistable-login-password" style={{fontSize:13,fontWeight:600,color:C.text}}>Password</label>
            <button type="button" onClick={()=>setShowP(p=>!p)} style={{background:"none",border:"none",padding:0,color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>{showP?"Hide":"Show"}</button>
          </div>
          <input id="epistable-login-password" aria-label="Password" required disabled={loading} type={showP?"text":"password"} value={pass} onChange={e=>{setPass(e.target.value);if(err)setErr("");}} onFocus={()=>setFocus("password")} onBlur={()=>setFocus("")} autoComplete="current-password" placeholder="Enter password" style={fieldStyle("password")}/>
        </div>
      </div>
      <Btn full size="lg" disabled={loading} style={{borderRadius:6,padding:isDesktop?"15px 20px":"13px 20px",fontWeight:700,fontSize:isDesktop?15:14}}>{loading?"Signing in...":"Log In"}</Btn>
      <div style={{textAlign:"center",marginTop:16}}><a href="/forgot-password" style={{color:C.primary,fontSize:TYPE.label.size}}>Forgot password?</a></div>
    </form>
  );
  if(isDesktop)return (
    <div style={{minHeight:"100vh",background:C.bg,display:"grid",gridTemplateColumns:"minmax(360px,40%) minmax(0,1fr)",fontFamily:FONT_STACK,lineHeight:1.5}}>
      <div style={{background:`linear-gradient(160deg,${C.primary},${C.primaryD} 60%,#001f3d)`,padding:"0 56px",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",minHeight:"100vh",boxSizing:"border-box",textAlign:"center"}}>
        <div style={{marginBottom:58,width:"100%",maxWidth:360}}>
          <div style={{fontSize:34,fontWeight:700,color:C.white,lineHeight:1.1,marginBottom:14}}>Epistable <span style={{color:"#7ec8f0"}}>AI</span></div>
          <div style={{fontSize:18,fontWeight:500,color:"rgba(255,255,255,0.95)",letterSpacing:"1px",fontFamily:FONT_STACK,marginBottom:18}}>Quality, quantified</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14}}>
            <div style={{height:1,width:30,background:"rgba(255,255,255,0.25)",borderRadius:1}}/>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.85)"}}>Verified partners · Food & Agri trade</div>
          </div>
        </div>
        {["Verified seller profiles","Processed-food catalogue","Compliance evidence","Buyer discovery and RFQs","Seller quote responses","Epistable verification"].map(text=>(
          <div key={text} style={{display:"flex",alignItems:"center",gap:14,marginTop:17,width:"100%",maxWidth:290,textAlign:"left"}}>
            <div style={{width:36,height:36,borderRadius:9,background:"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.82)",flexShrink:0}}><Icon name="check" size={16}/></div>
            <span style={{fontSize:14,color:"rgba(255,255,255,0.85)",fontWeight:400}}>{text}</span>
          </div>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"40px"}}>
        <div style={{width:"100%",maxWidth:460}}>
          <div style={{marginBottom:30,textAlign:"center"}}><div style={{fontSize:30,fontWeight:600,color:C.text,marginBottom:8}}>Welcome back</div><div style={{fontSize:15,color:C.textDim}}>Sign in with your assigned credentials</div></div>
          {err&&<div role="alert" style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"11px 14px",fontSize:13,color:C.red,marginBottom:16,fontWeight:500}}>{err}</div>}
          {loginFields}
          <div style={{marginTop:16,textAlign:"center",fontSize:12,color:C.textDim}}>Contact your administrator for credentials</div>
        </div>
      </div>
    </div>
  );
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT_STACK,lineHeight:1.5,color:C.text,display:"flex",flexDirection:"column",boxSizing:"border-box"}}>
      <div style={{background:`linear-gradient(160deg,${C.primary},${C.primaryD} 62%,#001f3d)`,padding:"58px 24px 40px",color:C.white}}>
        <div style={{maxWidth:390,margin:"0 auto",textAlign:"center"}}>
          <div style={{fontSize:26,fontWeight:700,lineHeight:1.15,marginBottom:14}}>Epistable <span style={{color:"#7ec8f0"}}>AI</span></div>
          <div style={{fontSize:15,fontWeight:500,color:"rgba(255,255,255,0.95)",letterSpacing:"1px",fontFamily:FONT_STACK,marginBottom:16}}>Quality, quantified</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14}}>
            <div style={{height:1,width:24,background:"rgba(255,255,255,0.25)",borderRadius:1}}/>
            <div style={{fontSize:12,lineHeight:1.65,color:"rgba(255,255,255,0.85)"}}>Verified partners · Food & Agri trade</div>
          </div>
        </div>
      </div>

      <div style={{width:"100%",maxWidth:390,margin:"0 auto",padding:"24px 20px 28px",boxSizing:"border-box",flex:1}}>
        <div style={{marginBottom:18,textAlign:"center"}}>
          <div style={{fontSize:24,fontWeight:600,color:C.text,marginBottom:5}}>Welcome back</div>
          <div style={{fontSize:14,color:C.textDim}}>Sign in with your assigned credentials</div>
        </div>
        <div style={{width:"100%",background:C.white,border:`1px solid ${C.border}`,borderRadius:8,boxShadow:"0 8px 24px rgba(26,37,51,0.08)",padding:22,boxSizing:"border-box"}}>
          {err&&<div role="alert" style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:6,padding:"13px 14px",fontSize:13,color:C.red,marginBottom:16,fontWeight:500}}>{err}</div>}
          {loginFields}
        </div>

        <div style={{width:"100%",marginTop:18,textAlign:"center"}}>
          <div style={{fontSize:12,color:C.textDim,marginBottom:18}}>Need access? Contact your administrator.</div>
          <div style={{fontSize:TYPE.caption.size,lineHeight:TYPE.caption.lineHeight,letterSpacing:TYPE.caption.letterSpacing,color:C.textDim}}>Built for cross-border Food & Agri trade</div>
        </div>
      </div>
    </div>
  );
}
