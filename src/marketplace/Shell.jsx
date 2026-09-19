import { useEffect, useRef, useState } from "react";
import { useBP } from "../hooks/useBP";
import { Icon } from "../components/Icon";
import { Button } from "./ui";

export const portals = {
  admin:{title:"Epistable Admin",nav:[["overview","Marketplace overview","chart"],["organizations","Trade organisations","building"],["access","Team access","users"],["products","Processed-food products","package"],["rfqs","Sourcing RFQs","mail"],["verification","Verification queue","verified"]]},
  seller:{title:"Processed Food Seller",nav:[["overview","Seller overview","chart"],["organization","Company & export profile","building"],["products","Processed-food catalogue","package"],["documents","Certifications & documents","file"],["rfqs","Buyer sourcing RFQs","mail"],["quotes","Supplier quotes","message"]]},
  buyer:{title:"Food Trade Buyer",nav:[["discover","Discover processed foods","search"],["suppliers","Verified food suppliers","building"],["organization","Buyer profile","user"],["rfqs","Sourcing RFQs","mail"],["quotes","Supplier quotes","message"]]},
};
export function portalFor(access) {
  if(access?.role==="platform_admin")return "admin";
  if(["seller_admin","seller_member"].includes(access?.role))return "seller";
  if(["buyer_admin","buyer_member"].includes(access?.role))return "buyer";
  return null;
}
export function pageFromHash(mode) {
  const [prefix,portal,page]=window.location.hash.split("/");
  return prefix==="#"&&portal===mode&&portals[mode].nav.some(n=>n[0]===page)?page:portals[mode].nav[0][0];
}
export function Shell({profile,mode,page,onNavigate,onLogout,signingOut,children}) {
  const {isMobile}=useBP();
  const [open,setOpen]=useState(false);
  const menu=useRef(null);
  useEffect(()=>{
    function escape(e){if(e.key==="Escape"){setOpen(false);menu.current?.focus();}}
    window.addEventListener("keydown",escape);
    return ()=>window.removeEventListener("keydown",escape);
  },[]);
  const config=portals[mode];
  function navigate(id){onNavigate(id);setOpen(false);requestAnimationFrame(()=>document.getElementById("marketplace-title")?.focus());}
  return <div className={"mp-shell"+(isMobile?" mp-mobile":"")}>
    <a href="#marketplace-content" className="mp-skip" onClick={e=>{e.preventDefault();document.getElementById("marketplace-content")?.focus();}}>Skip to content</a>
    <header className="mp-header">
      <div className="mp-brand"><Icon name="verified" size={24}/><strong>Epistable</strong><span>{config.title}</span></div>
      <div className="mp-header-right"><span className="mp-account" title={profile.email}>{profile.name==="Epistable Owner"&&mode==="admin"?"Epistable Admin":profile.name||profile.email}</span>
        <Button variant="secondary" disabled={signingOut} onClick={onLogout}>{signingOut?"Logging out…":"Log out"}</Button>
        {isMobile&&<button type="button" className="mp-button mp-button-secondary" ref={menu} aria-expanded={open} aria-controls="marketplace-nav" onClick={()=>setOpen(!open)}><Icon name={open?"close":"list"}/>{open?"Close menu":"Menu"}</button>}
      </div>
    </header>
    {(!isMobile||open)&&<aside className="mp-sidebar"><p className="mp-eyebrow">{config.title}</p><nav id="marketplace-nav" aria-label={config.title}>
      {config.nav.map(([id,label,icon])=><a key={id} href={"#/"+mode+"/"+id} aria-current={id===page?"page":undefined} onClick={e=>{e.preventDefault();navigate(id);}}><Icon name={icon}/>{label}</a>)}
    </nav><div className="mp-nav-logout"><Button variant="secondary" aria-label="Log out from navigation" disabled={signingOut} onClick={onLogout}>{signingOut?"Logging out…":"Log out"}</Button></div><div className="mp-sidebar-note"><Icon name="verified"/><p>Processed Foods<br/><small>Verified cross-border trade</small></p></div></aside>}
    <main id="marketplace-content" tabIndex={-1} className="mp-content">{children}</main>
  </div>;
}
