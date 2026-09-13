import { useEffect, useState } from "react";
import { Button, Empty, Field, Heading, Notice, Status } from "./ui";

const blank={name:"",type:"seller",country:"",city:"",website:"",description:""};
export function OrganisationForm({initial=blank,onSave,onCancel}) {
  const [form,setForm]=useState({...blank,...initial});
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const change=key=>e=>setForm(f=>({...f,[key]:e.target.value}));
  async function submit(e){
    e.preventDefault();setError("");setBusy(true);
    try {
      const values=Object.fromEntries(Object.keys(blank).map(k=>[k,String(form[k]||"").trim()]));
      if(!values.name||!values.country)throw new Error("Organisation name and country are required.");
      if(values.website){const url=new URL(values.website);if(!["https:","http:"].includes(url.protocol))throw new Error("Use an http or https website address.");}
      await onSave(values);
    }catch(err){setError(err.message||"Could not save the organisation.");}
    finally{setBusy(false);}
  }
  return <form className="mp-card mp-form" onSubmit={submit} aria-label="Organisation details">
    <fieldset disabled={busy}><legend>Organisation details</legend>
      <div className="mp-form-grid">
        <Field label="Organisation name" required maxLength={200} value={form.name} onChange={change("name")}/>
        <Field label="Organisation type" options={[{value:"seller",label:"Seller organisation"},{value:"buyer",label:"Buyer organisation"}]} disabled={!!initial.id} value={form.type} onChange={change("type")}/>
        <Field label="Country" required maxLength={100} placeholder="e.g. India" value={form.country} onChange={change("country")}/>
        <Field label="City" maxLength={100} value={form.city} onChange={change("city")}/>
        <Field label="Website" type="url" placeholder="https://company.com" maxLength={500} value={form.website} onChange={change("website")}/>
      </div>
      <Field label="About your organisation" multiline maxLength={3000} value={form.description} onChange={change("description")} hint="Describe your business, products and export experience."/>
      {initial.verification_status==="verified"&&<Notice>Saving profile changes returns this organisation to review. Its products will be hidden from buyers until the organisation is verified again.</Notice>}
      {error&&<Notice error>{error}</Notice>}
      <div className="mp-actions"><Button type="submit">{busy?"Saving…":"Save organisation"}</Button>{onCancel&&<Button variant="secondary" onClick={onCancel}>Cancel</Button>}</div>
    </fieldset>
  </form>;
}
export function Organisations({organizations,api,onSaved}) {
  const [creating,setCreating]=useState(false);
  async function save(values){await api.createOrganization(values);setCreating(false);await onSaved();}
  return <><Heading title="Organisations" description="Manage the businesses participating in food and agri trade." action={!creating&&<Button icon="add" onClick={()=>setCreating(true)}>Add organisation</Button>}/>
    {creating?<OrganisationForm onSave={save} onCancel={()=>setCreating(false)}/>:!organizations.length?
      <Empty title="Start with your first organisation" icon="building">Add a seller or buyer, then assign an existing account from Team access.</Empty>:
      <div className="mp-grid">{organizations.map(o=><article key={o.id} className="mp-card"><div className="mp-row"><span className="mp-eyebrow">{o.type}</span><Status value={o.verification_status}/></div><h2>{o.name}</h2><p>{[o.city,o.country].filter(Boolean).join(", ")||"Location not provided"}</p><p>{o.description||"Profile details have not been added yet."}</p></article>)}</div>}
  </>;
}
export function OwnOrganisation({access,organizations,api,onSaved}) {
  const org=organizations.find(o=>o.id===access.org);
  const [saved,setSaved]=useState(false);
  if(!org)return <Empty title="Organisation unavailable" icon="building">Your organisation could not be loaded. Contact an Epistable administrator.</Empty>;
  const admin=access.role.endsWith("_admin");
  return <><Heading title="Organisation profile" description="Keep your company details accurate for trade partners."/>
    {saved&&<Notice>Organisation saved and submitted for review.</Notice>}
    {admin?<OrganisationForm key={org.id} initial={org} onSave={async values=>{await api.updateOrganization(org.id,{...values,verification_status:"pending"});setSaved(true);await onSaved();}}/>:
      <article className="mp-card"><Status value={org.verification_status}/><h2>{org.name}</h2><p>{org.country}</p><p>{org.description}</p><Notice>Your organisation administrator can update this profile.</Notice></article>}
  </>;
}
export function AccessManagement({organizations,api,onSaved}) {
  const [accounts,setAccounts]=useState(null),[error,setError]=useState(""),[message,setMessage]=useState("");
  const [target,setTarget]=useState(""),[org,setOrg]=useState(""),[role,setRole]=useState("member"),[busy,setBusy]=useState(false);
  const selected=organizations.find(o=>o.id===org);
  async function load(){setError("");try{setAccounts(await api.accounts());}catch(e){setError(e.message);}}
  useEffect(()=>{let live=true;api.accounts().then(a=>{if(live)setAccounts(a);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[api]);
  async function submit(e){e.preventDefault();setBusy(true);setError("");setMessage("");try{
    if(!selected||!target)throw new Error("Choose an account and an organisation.");
    await api.assignAccess(target,org,selected.type+"_"+role);await load();await onSaved();
    setMessage("Marketplace access saved. The user can refresh their workspace to load the assignment.");
  }catch(e){setError(e.message||"Could not assign access.");}finally{setBusy(false);}}
  return <><Heading title="Team access" description="Assign an active existing account to a buyer or seller organisation."/>
    {error&&<Notice error>{error} <Button variant="secondary" onClick={load}>Retry</Button></Notice>}{message&&<Notice>{message}</Notice>}
    {!organizations.length?<Empty title="Add an organisation first" icon="building">Create a buyer or seller organisation before assigning access.</Empty>:
    <form className="mp-card mp-form" onSubmit={submit}><fieldset disabled={busy||!accounts}><legend>Assign organisation access</legend>
      <Field label="Account" required value={target} onChange={e=>{setTarget(e.target.value);setMessage("");}} options={[{value:"",label:"Choose an active account"},...(accounts||[]).filter(a=>a.status==="active"&&a.access_role!=="platform_admin").map(a=>({value:a.id,label:a.name+" · "+a.email}))]}/>
      <Field label="Organisation" required value={org} onChange={e=>setOrg(e.target.value)} options={[{value:"",label:"Choose an organisation"},...organizations.map(o=>({value:o.id,label:o.name+" · "+o.type}))]}/>
      <Field label="Access level" value={role} onChange={e=>setRole(e.target.value)} options={[{value:"member",label:"Team member"},{value:"admin",label:"Organisation administrator"}]}/>
      <p>Assigning a different organisation replaces this account’s previous marketplace assignment. Existing login credentials stay the same.</p>
      <Button type="submit">{busy?"Saving…":"Save access"}</Button>
    </fieldset></form>}
    <h2>Linked accounts</h2>{accounts?<div className="mp-list">{accounts.map(a=><article className="mp-card mp-row" key={a.id}><div><strong>{a.name}</strong><p>{a.email}</p><small>{organizations.find(o=>o.id===a.organization_id)?.name||"No organisation"}</small></div><div><Status value={a.status}/><p>{a.access_role?.replaceAll("_"," ")||"Not assigned"}</p></div></article>)}</div>:!error&&<p role="status">Loading accounts…</p>}
  </>;
}
