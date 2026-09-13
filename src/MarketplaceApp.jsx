import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { friendlyAuthError, getSessionProfile, signOut } from "./lib/auth";
import { marketplace } from "./lib/marketplace";
import { Login } from "./marketplace/Login";
import { Shell, pageFromHash, portalFor } from "./marketplace/Shell";
import { AccessManagement, Organisations, OwnOrganisation } from "./marketplace/Organisations";
import { Workflows, Verification } from "./marketplace/Workflows";
import { Button, Field, Heading, Notice, theme } from "./marketplace/ui";
import "./marketplace/marketplace.css";

export { Login };

export function Workspace({profile,access,api=marketplace,onLogout,signingOut}) {
  const mode=portalFor(access),[page,setPage]=useState(()=>pageFromHash(mode)),[data,setData]=useState(null),[error,setError]=useState("");
  const generation=useRef(0);
  const reload=useCallback(async()=>{
    const current=++generation.current;setError("");setData(null);
    try {
      const [organizations,products,rfqs,quotes,documents,reviews]=await Promise.all([api.organizations(),api.products(mode==="buyer"?{verified:true,status:"active"}:mode==="seller"?{sellerOrgId:access.org}:{}),api.rfqs(mode==="buyer"?{buyerOrgId:access.org}:{}),api.quotes(),mode==="buyer"?Promise.resolve([]):api.documents(mode==="seller"?access.org:undefined),mode==="admin"?api.reviews():Promise.resolve([])]);
      if(current===generation.current)setData({organizations,products,rfqs,quotes,documents,reviews});
    }catch(e){if(current===generation.current)setError(e.message||"Could not load your workspace.");}
  },[api,mode,access.org]);
  useEffect(()=>{reload();return()=>{generation.current++;};},[reload]);
  useEffect(()=>{const change=()=>setPage(pageFromHash(mode));window.addEventListener("hashchange",change);return()=>window.removeEventListener("hashchange",change);},[mode]);
  function navigate(next){window.location.hash="/"+mode+"/"+next;setPage(next);}
  let content;
  if(error)content=<><Heading title="Workspace unavailable"/><Notice error>{error}</Notice><Button onClick={reload}>Retry loading</Button></>;
  else if(!data)content=<p role="status">Loading your workspace…</p>;
  else if(page==="organizations")content=<Organisations organizations={data.organizations} api={api} onSaved={reload}/>;
  else if(page==="access")content=<AccessManagement organizations={data.organizations} api={api} onSaved={reload}/>;
  else if(page==="organization")content=<OwnOrganisation access={access} organizations={data.organizations} api={api} onSaved={reload}/>;
  else if(page==="overview")content=<><Heading title={mode==="admin"?"Trade overview":"Your trade workspace"} description={mode==="admin"?"Manage participation and review readiness across Epistable.":"Manage your organisation, catalogue and buyer enquiries."}/><div className="mp-grid">{[["Organisations",data.organizations.length,mode==="admin"?"organizations":"organization"],["Products",data.products.length,"products"],["RFQs",data.rfqs.length,"rfqs"]].map(([label,count,target])=><article className="mp-card" key={label}><p className="mp-eyebrow">{label}</p><h2>{count}</h2><Button variant="secondary" onClick={()=>navigate(target)}>View {label.toLowerCase()}</Button></article>)}</div></>;
  else if(page==="verification")content=<Verification data={data} api={api} onSaved={reload}/>;
  else content=<Workflows key={page} page={page} mode={mode} access={access} data={data} api={api} onSaved={reload}/>;
  return <Shell profile={profile} mode={mode} page={page} onNavigate={navigate} onLogout={onLogout} signingOut={signingOut}>{content}</Shell>;
}

export default function MarketplaceApp() {
  const [state,setState]=useState({loading:true}),[signingOut,setSigningOut]=useState(false),[logoutError,setLogoutError]=useState("");
  const generation=useRef(0);
  const refresh=useCallback(async(background=false)=>{
    const current=++generation.current;if(background!==true)setState({loading:true});
    try{const profile=await getSessionProfile();const access=profile?await marketplace.context():null;if(current===generation.current)setState(previous=>background===true&&previous.profile?.auth_user_id===profile?.auth_user_id&&previous.access?.role===access?.role&&previous.access?.org===access?.org?previous:{profile,access});}
    catch(e){if(current===generation.current)setState({error:friendlyAuthError(e)});}
  },[]);
  useEffect(()=>{
    refresh();let timer;
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{
      // Defer Supabase calls until its auth callback has released the session lock.
      if(["SIGNED_IN","SIGNED_OUT","USER_UPDATED"].includes(event)){generation.current++;if(event==="SIGNED_OUT")setState({loading:true});clearTimeout(timer);timer=setTimeout(()=>refresh(true),0);}
    });
    const focused=()=>refresh(true);
    window.addEventListener("focus",focused);
    return()=>{generation.current++;clearTimeout(timer);subscription.unsubscribe();window.removeEventListener("focus",focused);};
  },[refresh]);
  async function logout(){setSigningOut(true);setLogoutError("");try{await signOut();generation.current++;setState({profile:null,access:null});}catch(e){setLogoutError(friendlyAuthError(e));}finally{setSigningOut(false);}}
  const mode=portalFor(state.access);
  return <div className="mp-root" style={theme}>{logoutError&&<Notice error>{logoutError}</Notice>}{state.loading?<div className="mp-login"><p role="status">Loading Epistable…</p></div>:state.error?<div className="mp-login"><section className="mp-card"><h1>Unable to open workspace</h1><Notice error>{state.error}</Notice><div className="mp-actions"><Button onClick={refresh}>Retry</Button><Button variant="secondary" onClick={logout} disabled={signingOut}>Sign out</Button></div></section></div>:!state.profile?<Login onSignedIn={refresh}/>:!mode?<div className="mp-login"><section className="mp-card"><h1>Marketplace access needed</h1><p>Your account is signed in. An Epistable administrator needs to assign your organisation and marketplace role.</p><div className="mp-actions"><Button onClick={refresh}>Refresh access</Button><Button variant="secondary" onClick={logout} disabled={signingOut}>Sign out</Button></div><p><a href="/legacy">Open existing workspace</a></p></section></div>:<Workspace key={state.profile.auth_user_id+":"+state.access.role+":"+state.access.org} profile={state.profile} access={state.access} onLogout={logout} signingOut={signingOut}/>}</div>;
}
