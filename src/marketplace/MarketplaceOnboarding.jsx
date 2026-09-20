import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Button, Field, Notice } from "./ui";

export function MarketplaceOnboarding() {
  const [values,setValues]=useState({type:"seller",name:"",organization_name:"",country:"",city:"",website:"",description:"",email:"",password:""});
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[submitted,setSubmitted]=useState(false);
  const change=key=>e=>setValues(v=>({...v,[key]:e.target.value}));
  async function submit(e){
    e.preventDefault();setBusy(true);setError("");
    try{
      const email=values.email.trim().toLowerCase();
      if(!email||values.password.length<8)throw new Error("Enter a valid email and a password of at least 8 characters.");
      if(!values.name.trim()||!values.organization_name.trim()||!values.country.trim())throw new Error("Name, organisation and country are required.");
      const {data,error:signupError}=await supabase.auth.signUp({
        email,
        password:values.password,
        options:{data:{
          marketplace_onboarding:"true",
          marketplace_type:values.type,
          name:values.name.trim(),
          organization_name:values.organization_name.trim(),
          country:values.country.trim(),
          city:values.city.trim(),
          website:values.website.trim(),
          description:values.description.trim()
        }}
      });
      if(signupError)throw signupError;
      setSubmitted(true);
      if(data.session)window.setTimeout(()=>window.location.assign("/"),700);
    }catch(err){setError(err.message||"Could not submit your Epistable application.");}
    finally{setBusy(false);}
  }
  if(submitted)return <div className="mp-login"><section className="mp-card" style={{maxWidth:680}}>
    <h1>Application submitted</h1>
    <p>Your organisation is now pending Epistable verification. If email confirmation is enabled, confirm your email first. Workspace access is granted automatically after the organisation is approved.</p>
    <div className="mp-actions"><Button onClick={()=>window.location.assign("/")}>Go to sign in</Button></div>
  </section></div>;

  return <div className="mp-login"><form className="mp-card mp-form" style={{maxWidth:760}} onSubmit={submit}>
    <fieldset disabled={busy}>
      <legend>Join Epistable</legend>
      <p>Create a Buyer or Seller organisation. Epistable verifies the organisation before marketplace access is activated.</p>
      <div className="mp-form-grid">
        <Field label="Account type" options={[{value:"seller",label:"Supplier / Seller"},{value:"buyer",label:"Buyer / Procurement"}]} value={values.type} onChange={change("type")}/>
        <Field label="Your name" required value={values.name} onChange={change("name")}/>
        <Field label="Organisation name" required value={values.organization_name} onChange={change("organization_name")}/>
        <Field label="Country" required value={values.country} onChange={change("country")}/>
        <Field label="City" value={values.city} onChange={change("city")}/>
        <Field label="Website" type="url" placeholder="https://…" value={values.website} onChange={change("website")}/>
        <Field label="Email" required type="email" autoComplete="email" value={values.email} onChange={change("email")}/>
        <Field label="Password" required type="password" minLength={8} autoComplete="new-password" value={values.password} onChange={change("password")}/>
      </div>
      <Field label="Organisation overview" multiline maxLength={2000} hint="Briefly describe what you manufacture, source or distribute." value={values.description} onChange={change("description")}/>
      {error&&<Notice error>{error}</Notice>}
      <div className="mp-actions"><Button type="submit" disabled={busy}>{busy?"Submitting…":"Submit for verification"}</Button><Button variant="secondary" onClick={()=>window.location.assign("/")}>Back to sign in</Button></div>
    </fieldset>
  </form></div>;
}
