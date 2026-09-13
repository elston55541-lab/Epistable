import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Shell, portalFor } from './Shell';
import { OrganisationForm } from './Organisations';
import MarketplaceApp, { Workspace, Login } from '../MarketplaceApp';
import { getSessionProfile, signInWithEmail } from '../lib/auth';
import { marketplace } from '../lib/marketplace';

vi.mock('../lib/auth',()=>({getSessionProfile:vi.fn(),signInWithEmail:vi.fn(),signOut:vi.fn(),friendlyAuthError:e=>e.message}));
vi.mock('../lib/marketplace',()=>({marketplace:{context:vi.fn()}}));
vi.mock('../lib/supabase',()=>({supabase:{auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe:vi.fn()}}})}}}));
beforeEach(()=>vi.clearAllMocks());
const profile={name:'Test User',email:'qa@example.invalid',auth_user_id:'user-1',role:'owner'};
const api=()=>({organizations:vi.fn().mockResolvedValue([]),products:vi.fn().mockResolvedValue([]),rfqs:vi.fn().mockResolvedValue([]),quotes:vi.fn().mockResolvedValue([]),documents:vi.fn().mockResolvedValue([])});

describe.each([375,1280])('portal navigation at %ipx',width=>{
  it.each(['admin','buyer','seller'])('%s exposes navigation and sign out',async mode=>{
    Object.defineProperty(window,'innerWidth',{configurable:true,value:width});
    const onNavigate=vi.fn(),onLogout=vi.fn();
    render(<Shell profile={profile} mode={mode} page={mode==='buyer'?'discover':'overview'} onNavigate={onNavigate} onLogout={onLogout}><h1 id="marketplace-title" tabIndex={-1}>Content</h1></Shell>);
    const user=userEvent.setup();
    if(width<640){expect(screen.queryByRole('navigation')).toBeNull();await user.click(screen.getByRole('button',{name:'Menu'}));}
    expect(screen.getByRole('navigation')).toBeTruthy();
    await user.click(screen.getByRole('link',{name:mode==='admin'?'Organisations':mode==='buyer'?'Your RFQs':'Product catalogue'}));
    expect(onNavigate).toHaveBeenCalledOnce();
    if(width<640)expect(screen.queryByRole('navigation')).toBeNull();
    await user.click(screen.getByRole('button',{name:'Sign out'}));expect(onLogout).toHaveBeenCalledOnce();
  });
});
it('Escape closes the mobile menu and restores focus',async()=>{
  Object.defineProperty(window,'innerWidth',{configurable:true,value:375});
  render(<Shell profile={profile} mode="seller" page="overview" onNavigate={()=>{}} onLogout={()=>{}}/>);
  const user=userEvent.setup();await user.click(screen.getByRole('button',{name:'Menu'}));await user.keyboard('{Escape}');
  expect(screen.queryByRole('navigation')).toBeNull();expect(document.activeElement).toBe(screen.getByRole('button',{name:'Menu'}));
});
it('legacy roles never grant marketplace access',async()=>{
  expect(portalFor({role:'owner'})).toBeNull();expect(portalFor({role:'admin'})).toBeNull();
  getSessionProfile.mockResolvedValue(profile);marketplace.context.mockResolvedValue(null);
  render(<MarketplaceApp/>);expect(await screen.findByText('Marketplace access needed')).toBeTruthy();expect(screen.queryByRole('navigation')).toBeNull();
});
it('database failure is distinct from an empty dashboard and can retry',async()=>{
  const client=api();client.products.mockRejectedValueOnce(new Error('Connection failed'));
  render(<Workspace profile={profile} access={{role:'seller_admin',org:'seller-1'}} api={client} onLogout={()=>{}}/>);
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','Connection failed');expect(screen.queryByText('No records yet')).toBeNull();
  await userEvent.click(screen.getByRole('button',{name:'Retry loading'}));expect(await screen.findByRole('heading',{name:'Your trade workspace'})).toBeTruthy();
  expect(client.products).toHaveBeenLastCalledWith({sellerOrgId:'seller-1'});
});
it('buyer discovery explicitly requests active verified products',async()=>{
  const client=api();render(<Workspace profile={profile} access={{role:'buyer_member',org:'buyer-1'}} api={client} onLogout={()=>{}}/>);
  await screen.findByRole('heading',{name:'Discover products'});expect(client.products).toHaveBeenCalledWith({verified:true,status:'active'});expect(client.rfqs).toHaveBeenCalledWith({buyerOrgId:'buyer-1'});
});
it('failed organisation save keeps entered values and supports retry',async()=>{
  const save=vi.fn().mockRejectedValueOnce(new Error('Save failed')).mockResolvedValueOnce({});
  render(<OrganisationForm onSave={save}/>);const user=userEvent.setup();
  await user.type(screen.getByLabelText('Organisation name *'),'Food Company');await user.type(screen.getByLabelText('Country *'),'India');
  await user.click(screen.getByRole('button',{name:'Save organisation'}));expect(await screen.findByRole('alert')).toHaveProperty('textContent','Save failed');expect(screen.getByLabelText('Organisation name *').value).toBe('Food Company');
  await user.click(screen.getByRole('button',{name:'Save organisation'}));await waitFor(()=>expect(save).toHaveBeenCalledTimes(2));
});
it('login submits by Enter and retains a readable failure',async()=>{
  signInWithEmail.mockRejectedValue(new Error('Email or password is incorrect.'));
  render(<Login onSignedIn={vi.fn()}/>);const user=userEvent.setup();await user.type(screen.getByLabelText('Email'),'qa@example.invalid');await user.type(screen.getByLabelText('Password'),'test-only{Enter}');
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','Email or password is incorrect.');expect(signInWithEmail).toHaveBeenCalledWith('qa@example.invalid','test-only');
});
