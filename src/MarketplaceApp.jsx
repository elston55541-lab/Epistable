import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { friendlyAuthError, getSessionProfile, signInWithEmail, signOut } from "./lib/auth";
import { marketplace } from "./lib/marketplace";
import { Icon } from "./components/Icon";
import { Shell, pageFromHash, portalFor, portals } from "./marketplace/Shell";
import { AccessManagement, Organisations, OwnOrganisation } from "./marketplace/Organisations";
import { Button, Empty, Field, Heading, Notice, Status, theme } from "./marketplace/ui";
import "./marketplace/marketplace.css";

export function Login({onSignedIn}) {
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function submit(e){e.preventDefault();setBusy(true);setError("");try{await signInWithEmail(email,password);await onSignedIn();}catch(e){setError(friendlyAuthError(e));}finally{setBusy(false);}}
  return <div className="mp-login"><section className="mp-card"><div className="mp-brand"><Icon name="verified" size={24}/><strong>Epistable</strong></div><h1>Food & Agri Trade</h1><p>Connect verified businesses across borders. Starting with Processed Foods.</p><form onSubmit={submit} className="mp-form"><fieldset disabled={busy}><legend>Sign in to your workspace</legend><Field label="Email" type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/><Field label="Password" type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/>{error&&<Notice error>{error}</Notice>}<Button type="submit">{busy?"Signing in…":"Sign in"}</Button></fieldset></form><p><small>Use your existing Epistable account. Your administrator assigns your buyer, seller or platform access.</small></p></section></div>;
}

export function ResourceList({page,mode,data}) {
  const [search,setSearch]=useState("");
  const products=page==="products"||page==="discover";
  const suppliers=page==="suppliers";
  const items=products?data.products:suppliers?data.organizations.filter(o=>o.type==="seller"):page==="verification"?data.documents.filter(d=>d.verification_status==="pending"):data[page]||[];
  const visible=items.filter(item=>[item.name,item.title,item.id,item.category,item.country_of_origin,item.country,item.product_category,item.destination_country].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase()));
  const title=portals[mode].nav.find(n=>n[0]===page)?.[1]||page;
  return <><Heading title={title} description={page==="discover"?"Explore verified products from verified seller organisations.":page==="verification"?"Trade documents awaiting Epistable review.":"Records available to your workspace."}/><Field label={"Search "+title.toLowerCase()} type="search" value={search} onChange={e=>setSearch(e.target.value)}/>{!visible.length?<Empty title={search?"No matching records":"No records yet"}>{search?"Try another product, category or country.":"Records will appear here when they are available to your organisation."}</Empty>:<div className="mp-grid">{visible.map(item=><article className="mp-card" key={item.id}><div className="mp-row"><span className="mp-eyebrow">{item.category||item.document_type||item.product_category||item.type||item.id}</span><Status value={item.verification_status||item.status}/></div><h2>{item.name||item.title||item.products?.name||item.id}</h2><p>{item.description||item.requirements||item.notes}</p>{(item.country_of_origin||item.country||item.destination_country)&&<p>{item.country_of_origin||item.country||item.destination_country}</p>}{item.moq!=null&&<p>Minimum order: {item.moq} {item.moq_unit}</p>}{item.quantity!=null&&<p>Quantity: {item.quantity} {item.quantity_unit}</p>}{item.total_amount!=null&&<p>{item.currency} {item.total_amount}</p>}{item.organizations?.name&&<p>Seller: {item.organizations.name}</p>}{item.status&&item.verification_status&&<Status value={item.status}/>}</article>)}</div>}</>;
}

export function Workspace({profile,access,api=marketplace,onLogout,signingOut}) {
  const mode=portalFor(access),[page,setPage]=useState(()=>pageFromHash(mode)),[data,setData]=useState(null),[error,setError]=useState("");
  const generation=useRef(0);
  const reload=useCallback(async()=>{
    const current=++generation.current;setError("");setData(null);
    try {
      const [organizations,products,rfqs,quotes,documents]=await Promise.all([api.organizations(),api.products(mode==="buyer"?{verified:true,status:"active"}:mode==="seller"?{sellerOrgId:access.org}:{}),api.rfqs(mode==="buyer"?{buyerOrgId:access.org}:{}),api.quotes(),mode==="buyer"?Promise.resolve([]):api.documents(mode==="seller"?access.org:undefined)]);
      if(current===generation.current)setData({organizations,products,rfqs,quotes,documents});
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
  else content=<ResourceList key={page} page={page} mode={mode} data={data}/>;
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
