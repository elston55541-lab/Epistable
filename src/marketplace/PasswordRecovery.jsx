import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button, Field, Notice, theme } from './ui';
import './marketplace.css';

export function PasswordRecovery({ reset=false, auth=supabase.auth }) {
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
  useEffect(()=>{
    if(!reset)return;
    let active=true;
    auth.getUser().then(({data,error})=>{
      if(!active)return;
      if(error||!data.user)setError('This reset link is invalid or expired. Request a new link below.');
      else setReady(true);
    }).catch(()=>{if(active)setError('Could not verify your reset link. Request a new link below.');});
    return()=>{active=false;};
  },[auth,reset]);
  async function submit(e){
    e.preventDefault();setError('');
    if(reset&&password!==confirm){setError('Passwords do not match.');return;}
    setBusy(true);
    try{
      const result=reset?await auth.updateUser({password}):await auth.resetPasswordForEmail(email.trim().toLowerCase(),{redirectTo:window.location.origin+'/reset-password'});
      if(result.error)throw result.error;
      setPassword('');setConfirm('');setDone(true);
    }catch(e){setError(e.message||'Unable to complete the request. Please try again.');}
    finally{setBusy(false);}
  }
  return <div className="mp-root" style={theme}><div className="mp-login"><section className="mp-card">
    <h1>{reset?'Choose a new password':'Reset your password'}</h1>
    {error&&<Notice error>{error}</Notice>}
    {done?<Notice>{reset?'Your password has been updated. You can open Epistable.':'If this email has an account, a password-reset link has been sent. Check your inbox and spam folder.'}</Notice>:
      reset&&!ready?<p>Open the latest password-reset email to continue.</p>:
      <form className="mp-form" onSubmit={submit}><fieldset disabled={busy}>
        <legend>{reset?'Set your Epistable password':'Receive a secure recovery link'}</legend>
        {reset?<><Field label="New password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} hint="Use at least 8 characters."/><Field label="Confirm password" type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)}/></>:
          <Field label="Email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/>}
        <Button type="submit">{busy?'Please wait…':reset?'Save new password':'Send reset link'}</Button>
      </fieldset></form>}
    {reset&&!done&&<p><a href="/forgot-password">Request a new reset link</a></p>}
    <p><a href="/">{reset&&done?'Open Epistable':'Back to Epistable'}</a></p>
  </section></div></div>;
}
