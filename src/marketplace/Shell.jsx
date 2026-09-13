import { useEffect, useRef, useState } from "react";
import { useBP } from "../hooks/useBP";
import { Icon } from "../components/Icon";
import { Button } from "./ui";

export const portals = {
  admin:{title:"Epistable Admin",nav:[["overview","Overview","chart"],["organizations","Organisations","building"],["access","Team access","users"],["products","Products","package"],["rfqs","RFQs","mail"],["verification","Verification","verified"]]},
  seller:{title:"Seller workspace",nav:[["overview","Overview","chart"],["organization","Organisation profile","building"],["products","Product catalogue","package"],["documents","Trade documents","file"],["rfqs","Buyer RFQs","mail"],["quotes","Your quotes","message"]]},
  buyer:{title:"Buyer workspace",nav:[["discover","Discover products","search"],["suppliers","Suppliers","building"],["organization","Organisation profile","user"],["rfqs","Your RFQs","mail"],["quotes","Received quotes","message"]]},
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
      <div className="mp-brand"><Icon name="verified" size={24}/><strong>Epistable</strong><span>Food & Agri Trade</span></div>
      <div className="mp-header-right"><span className="mp-account" title={profile.email}>{profile.name||profile.email}</span>
        <Button variant="secondary" disabled={signingOut} onClick={onLogout}>{signingOut?"Signing out…":"Sign out"}</Button>
        {isMobile&&<button type="button" className="mp-button mp-button-secondary" ref={menu} aria-expanded={open} aria-controls="marketplace-nav" onClick={()=>setOpen(!open)}><Icon name={open?"close":"list"}/>{open?"Close menu":"Menu"}</button>}
      </div>
    </header>
    {(!isMobile||open)&&<aside className="mp-sidebar"><p className="mp-eyebrow">{config.title}</p><nav id="marketplace-nav" aria-label={config.title}>
      {config.nav.map(([id,label,icon])=><a key={id} href={"#/"+mode+"/"+id} aria-current={id===page?"page":undefined} onClick={e=>{e.preventDefault();navigate(id);}}><Icon name={icon}/>{label}</a>)}
    </nav><div className="mp-sidebar-note"><Icon name="verified"/><p>Processed Foods<br/><small>Launch vertical</small></p></div></aside>}
    <main id="marketplace-content" tabIndex={-1} className="mp-content">{children}</main>
  </div>;
}
