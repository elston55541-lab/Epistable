# Epistable DeepSeek Code Bundle — Part 04: Tests, Screens & Styles
Snapshot: 31d78c0ee3bd70f7a934b44140549048a41e6a01


===== FILE: src/marketplace/marketplace.css =====
```css
.mp-root {font-family:var(--mp-font);color:var(--mp-text);background:var(--mp-bg);min-height:100vh;font-size:var(--mp-type-body);line-height:1.65}
.mp-root * {box-sizing:border-box}
.mp-root h1 {font-size:var(--mp-type-display);line-height:1.3;margin:0 0 var(--mp-space-sm);font-weight:var(--mp-bold)}
.mp-root h2,.mp-root legend {font-size:var(--mp-type-heading);line-height:1.4;font-weight:var(--mp-bold)}
.mp-root h2 {margin:var(--mp-space-sm) 0}
.mp-root p {margin:var(--mp-space-sm) 0;color:var(--mp-textMid);overflow-wrap:anywhere}
.mp-root small {font-size:var(--mp-type-label);color:var(--mp-textMid)}
.mp-root a {color:var(--mp-primary)}
.mp-root button,.mp-root input,.mp-root textarea,.mp-root select {font:inherit}
.mp-root :focus-visible {outline:3px solid var(--mp-primary);outline-offset:3px}
.mp-button {display:inline-flex;gap:var(--mp-space-sm);align-items:center;justify-content:center;border:1px solid transparent;min-height:44px;padding:var(--mp-space-sm) var(--mp-space-base);border-radius:var(--mp-radius-sm);font-weight:var(--mp-medium);cursor:pointer}
.mp-button-primary {background:var(--mp-primary);color:var(--mp-white)}
.mp-button-primary:hover {background:var(--mp-primaryMid)}
.mp-button-secondary {background:var(--mp-white);color:var(--mp-primaryMid);border-color:var(--mp-primaryBorder)}
.mp-button:disabled {opacity:.6;cursor:wait}
.mp-header {position:sticky;top:0;z-index:10;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:var(--mp-space-base);padding:var(--mp-space-base) var(--mp-space-xl);background:var(--mp-white);border-bottom:1px solid var(--mp-border);min-height:80px}
.mp-brand,.mp-header-right,.mp-row,.mp-actions {display:flex;align-items:center;gap:var(--mp-space-md);flex-wrap:wrap}
.mp-brand {color:var(--mp-primaryMid)}
.mp-brand strong {font-size:var(--mp-type-display)}
.mp-brand span {font-size:var(--mp-type-label);color:var(--mp-textMid)}
.mp-account {max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mp-sidebar {position:absolute;width:232px;padding:var(--mp-space-xl) var(--mp-space-base)}
.mp-eyebrow {font-size:var(--mp-type-label);font-weight:var(--mp-medium);color:var(--mp-textMid);text-transform:uppercase;letter-spacing:.5px}
.mp-sidebar nav {display:grid;gap:var(--mp-space-xs)}
.mp-sidebar nav a {display:flex;align-items:center;gap:var(--mp-space-md);min-height:44px;padding:var(--mp-space-md);border-radius:var(--mp-radius-sm);color:var(--mp-textMid);text-decoration:none;font-weight:var(--mp-medium)}
.mp-sidebar nav a:hover {background:var(--mp-white)}
.mp-sidebar nav a[aria-current=page] {background:var(--mp-primaryBg);color:var(--mp-primaryMid)}
.mp-sidebar-note {border-top:1px solid var(--mp-border);margin-top:var(--mp-space-xl);padding:var(--mp-space-base) var(--mp-space-md);display:flex;align-items:center;gap:var(--mp-space-md);color:var(--mp-primary)}
.mp-content {margin-left:232px;padding:var(--mp-space-xxl);max-width:1600px;min-width:0}
.mp-heading {display:flex;align-items:flex-start;justify-content:space-between;gap:var(--mp-space-base);margin-bottom:var(--mp-space-xl);flex-wrap:wrap}
.mp-card {background:var(--mp-white);border:1px solid var(--mp-border);border-radius:var(--mp-radius-md);padding:var(--mp-space-xl);min-width:0;overflow-wrap:anywhere;box-shadow:var(--mp-shadow)}
.mp-grid {display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:var(--mp-space-base)}
.mp-list {display:grid;gap:var(--mp-space-md)}
.mp-row {justify-content:space-between}
.mp-empty {padding:var(--mp-space-xxl);text-align:center;color:var(--mp-primaryMid)}
.mp-empty p {max-width:560px;margin:var(--mp-space-md) auto var(--mp-space-xl)}
.mp-form {max-width:900px}
.mp-form fieldset {border:0;padding:0;margin:0;min-width:0}
.mp-form legend {margin-bottom:var(--mp-space-base)}
.mp-form-grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:var(--mp-space-base)}
.mp-field {display:flex;flex-direction:column;gap:var(--mp-space-xs);margin-bottom:var(--mp-space-base);min-width:0}
.mp-field label {font-weight:var(--mp-medium);font-size:var(--mp-type-label)}
.mp-field input,.mp-field select,.mp-field textarea {width:100%;min-height:44px;border:1px solid var(--mp-textDim);border-radius:var(--mp-radius-sm);padding:var(--mp-space-sm) var(--mp-space-md);color:var(--mp-text);background:var(--mp-white)}
.mp-field textarea {resize:vertical}
.mp-details {display:grid;gap:var(--mp-space-md);margin:var(--mp-space-xl) 0}
.mp-details>div {display:grid;grid-template-columns:minmax(100px,1fr) minmax(0,3fr);gap:var(--mp-space-base);border-bottom:1px solid var(--mp-border);padding-bottom:var(--mp-space-sm)}
.mp-details dt {font-weight:var(--mp-medium);color:var(--mp-textMid)}
.mp-details dd {margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
.mp-notice {padding:var(--mp-space-base);border:1px solid var(--mp-primaryBorder);background:var(--mp-primaryBg);border-radius:var(--mp-radius-sm);margin-bottom:var(--mp-space-base)}
.mp-error {border-color:var(--mp-redBorder);background:var(--mp-redBg);color:var(--mp-red)}
.mp-login {min-height:100vh;display:grid;place-items:center;padding:var(--mp-space-xl)}
.mp-login>section {width:100%;max-width:460px}
.mp-login .mp-brand {margin-bottom:var(--mp-space-xl)}
.mp-login .mp-button-primary {width:100%}
.mp-skip {position:absolute;top:-100px;left:16px;padding:var(--mp-space-base);background:var(--mp-white);z-index:20}
.mp-skip:focus {top:8px}
.mp-mobile .mp-header {padding:var(--mp-space-base);flex-wrap:wrap}
.mp-mobile .mp-brand span,.mp-mobile .mp-account {display:none}
.mp-mobile .mp-header-right {gap:var(--mp-space-sm)}
.mp-mobile .mp-content {margin-left:0;padding:var(--mp-space-base)}
.mp-mobile .mp-sidebar {position:static;width:100%;background:var(--mp-white);border-bottom:1px solid var(--mp-border);padding:var(--mp-space-base)}
.mp-mobile .mp-sidebar-note {display:none}
@media(max-width:639px) {.mp-form-grid {grid-template-columns:1fr}.mp-card {padding:var(--mp-space-base)}.mp-login {padding:var(--mp-space-base)}}

.mp-header-right {flex-shrink:0}
.mp-nav-logout {margin-top:var(--mp-space-xl)}
.mp-nav-logout .mp-button {width:100%}

.mp-product-images {margin:0 0 var(--mp-space-xl);padding:var(--mp-space-base);border:1px dashed var(--mp-primaryBorder);border-radius:var(--mp-radius-md);background:var(--mp-primaryBg)}
.mp-product-images input[type=file] {width:100%;margin:var(--mp-space-sm) 0 var(--mp-space-base)}
.mp-image-grid {display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:var(--mp-space-md)}
.mp-image-item {margin:0;border:1px solid var(--mp-border);border-radius:var(--mp-radius-sm);overflow:hidden;background:var(--mp-white)}
.mp-image-item img {display:block;width:100%;aspect-ratio:1/1;object-fit:cover}
.mp-image-item figcaption {display:flex;justify-content:space-between;gap:var(--mp-space-sm);align-items:center;padding:var(--mp-space-sm);font-size:var(--mp-type-label);color:var(--mp-textMid)}
.mp-image-item button {border:0;background:none;color:var(--mp-red);cursor:pointer;padding:4px}
.mp-product-cover {display:block;width:calc(100% + (2 * var(--mp-space-xl)));height:190px;object-fit:cover;margin:calc(-1 * var(--mp-space-xl)) calc(-1 * var(--mp-space-xl)) var(--mp-space-base);border-radius:var(--mp-radius-md) var(--mp-radius-md) 0 0}
.mp-detail-images {display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:var(--mp-space-md);margin-bottom:var(--mp-space-xl)}
.mp-detail-images img {display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--mp-radius-sm);border:1px solid var(--mp-border)}
@media(max-width:639px) {.mp-product-cover {width:calc(100% + (2 * var(--mp-space-base)));margin:calc(-1 * var(--mp-space-base)) calc(-1 * var(--mp-space-base)) var(--mp-space-base);height:170px}.mp-image-grid {grid-template-columns:repeat(2,minmax(0,1fr))}}

```

===== FILE: src/marketplace/portal.test.jsx =====
```jsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Shell, portalFor } from './Shell';
import { OrganisationForm } from './Organisations';
import MarketplaceApp, { Workspace, Login } from '../MarketplaceApp';
import { getSessionProfile, signInWithEmail, signOut } from '../lib/auth';
import { marketplace } from '../lib/marketplace';

vi.mock('../lib/auth',()=>({getSessionProfile:vi.fn(),signInWithEmail:vi.fn(),signOut:vi.fn(),friendlyAuthError:e=>e.message}));
vi.mock('../lib/marketplace',()=>({FOOD_CATEGORIES:['Spices & Seasonings'],FOOD_CERTIFICATIONS:['FSSAI','FSSC 22000'],TRADE_DOCUMENT_TYPES:[{value:'certificate_of_analysis',label:'Certificate of Analysis (COA)'}],productRequiresReview:()=>false,marketplace:{context:vi.fn(),organizations:vi.fn().mockResolvedValue([]),products:vi.fn().mockResolvedValue([]),rfqs:vi.fn().mockResolvedValue([]),quotes:vi.fn().mockResolvedValue([]),documents:vi.fn().mockResolvedValue([]),reviews:vi.fn().mockResolvedValue([]),orders:vi.fn().mockResolvedValue([])}}));
vi.mock('../lib/supabase',()=>({supabase:{auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe:vi.fn()}}})}}}));
beforeEach(()=>vi.clearAllMocks());
const profile={name:'Test User',email:'qa@example.invalid',auth_user_id:'user-1',role:'owner'};
const api=()=>({organizations:vi.fn().mockResolvedValue([]),products:vi.fn().mockResolvedValue([]),rfqs:vi.fn().mockResolvedValue([]),quotes:vi.fn().mockResolvedValue([]),documents:vi.fn().mockResolvedValue([]),orders:vi.fn().mockResolvedValue([])});

describe.each([375,1280])('portal navigation at %ipx',width=>{
  it.each(['admin','buyer','seller'])('%s exposes navigation and sign out',async mode=>{
    Object.defineProperty(window,'innerWidth',{configurable:true,value:width});
    const onNavigate=vi.fn(),onLogout=vi.fn();
    render(<Shell profile={profile} mode={mode} page={mode==='buyer'?'discover':'overview'} onNavigate={onNavigate} onLogout={onLogout}><h1 id="marketplace-title" tabIndex={-1}>Content</h1></Shell>);
    const user=userEvent.setup();
    if(width<640){expect(screen.queryByRole('navigation')).toBeNull();await user.click(screen.getByRole('button',{name:'Menu'}));}
    expect(screen.getByRole('navigation')).toBeTruthy();
    await user.click(screen.getByRole('button',{name:'Log out from navigation'}));
    expect(onLogout).toHaveBeenCalledOnce();onLogout.mockClear();
    await user.click(screen.getByRole('link',{name:mode==='admin'?'Trade organisations':mode==='buyer'?'Sourcing RFQs':'Processed-food catalogue'}));
    expect(onNavigate).toHaveBeenCalledOnce();
    if(width<640)expect(screen.queryByRole('navigation')).toBeNull();
    await user.click(screen.getByRole('button',{name:'Log out'}));expect(onLogout).toHaveBeenCalledOnce();
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
  await userEvent.click(screen.getByRole('button',{name:'Retry loading'}));expect(await screen.findByRole('heading',{name:'Processed-food seller overview'})).toBeTruthy();
  expect(client.products).toHaveBeenLastCalledWith({sellerOrgId:'seller-1'});
});
it('buyer workspace uses the restored catalog shell and published products',async()=>{
  Object.defineProperty(window,'innerWidth',{configurable:true,value:375});
  const client=api();render(<Workspace profile={profile} access={{role:'buyer_member',org:'buyer-1'}} api={client} onLogout={()=>{}}/>);
  await screen.findByRole('heading',{name:'Catalog'});
  expect(client.products).toHaveBeenCalledWith({published:true});expect(client.rfqs).toHaveBeenCalledWith({buyerOrgId:'buyer-1'});
  const buyerNav=screen.getByRole('navigation',{name:'Buyer navigation'});
  expect(buyerNav).toBeTruthy();
  expect(buyerNav.style.position).toBe('absolute');
  expect(buyerNav.style.bottom).toBe('0px');
  expect(buyerNav.style.left).toBe('0px');
  expect(buyerNav.style.right).toBe('0px');
  const topbar=document.querySelector('.buyer-topbar');
  const scrollArea=document.querySelector('.buyer-mobile-scroll');
  expect(topbar.style.position).toBe('relative');
  expect(scrollArea.style.overflowY).toBe('auto');
  expect(scrollArea.style.overscrollBehavior).toBe('contain');
  expect(screen.getByRole('button',{name:'Catalog'}).style.transform).toBe('none');
  await userEvent.click(screen.getByRole('button',{name:'GPT'}));
  expect(screen.getByText('Trade GPT')).toBeTruthy();
  expect(screen.getByLabelText('Trade GPT request')).toBeTruthy();
});
it('failed organisation save keeps entered values and supports retry',async()=>{
  const save=vi.fn().mockRejectedValueOnce(new Error('Save failed')).mockResolvedValueOnce({});
  render(<OrganisationForm onSave={save}/>);const user=userEvent.setup();
  await user.type(screen.getByLabelText('Organisation name *'),'Food Company');await user.type(screen.getByLabelText('Country *'),'India');
  await user.click(screen.getByRole('button',{name:'Save organisation'}));expect(await screen.findByRole('alert')).toHaveProperty('textContent','Save failed');expect(screen.getByLabelText('Organisation name *').value).toBe('Food Company');
  await user.click(screen.getByRole('button',{name:'Save organisation'}));await waitFor(()=>expect(save).toHaveBeenCalledTimes(2));
});
it.each([375,1280])('login at %ipx submits by Enter and retains a readable failure',async width=>{
  Object.defineProperty(window,'innerWidth',{configurable:true,value:width});
  signInWithEmail.mockRejectedValue(new Error('Email or password is incorrect.'));
  render(<Login onSignedIn={vi.fn()}/>);const user=userEvent.setup();await user.type(screen.getByLabelText('Email'),'qa@example.invalid');await user.type(screen.getByLabelText('Password'),'test-only{Enter}');
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','Email or password is incorrect.');expect(signInWithEmail).toHaveBeenCalledWith('qa@example.invalid','test-only');
});

it('admin logout ends the session and returns to login',async()=>{
  getSessionProfile.mockResolvedValue(profile);marketplace.context.mockResolvedValue({role:'platform_admin',org:null});signOut.mockResolvedValue(undefined);
  render(<MarketplaceApp/>);await screen.findByRole('heading',{name:'Food trade marketplace overview'});
  await userEvent.click(screen.getByRole('button',{name:'Log out',exact:true}));
  expect(signOut).toHaveBeenCalledOnce();expect(await screen.findByRole('form',{name:'Sign in'})).toBeTruthy();expect(screen.queryByRole('navigation')).toBeNull();
});
it('failed admin logout keeps the session visible with an error',async()=>{
  getSessionProfile.mockResolvedValue(profile);marketplace.context.mockResolvedValue({role:'platform_admin',org:null});signOut.mockRejectedValue(new Error('Unable to sign out. Try again.'));
  render(<MarketplaceApp/>);await screen.findByRole('heading',{name:'Food trade marketplace overview'});
  await userEvent.click(screen.getByRole('button',{name:'Log out',exact:true}));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','Unable to sign out. Try again.');expect(screen.getByRole('navigation')).toBeTruthy();
});

```

===== FILE: src/marketplace/recovery.test.jsx =====
```jsx
import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordRecovery } from './PasswordRecovery';

it('does not expose password update without a validated session',async()=>{
  const auth={getUser:vi.fn().mockResolvedValue({data:{user:null},error:new Error('Expired')}),updateUser:vi.fn()};
  render(<PasswordRecovery reset auth={auth}/>);
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','This reset link is invalid or expired. Request a new link below.');
  expect(screen.queryByLabelText('New password *')).toBeNull();expect(auth.updateUser).not.toHaveBeenCalled();
});
it('requests recovery with the app callback and a neutral success message',async()=>{
  const auth={resetPasswordForEmail:vi.fn().mockResolvedValue({error:null})};
  render(<PasswordRecovery auth={auth}/>);const user=userEvent.setup();
  await user.type(screen.getByLabelText('Email *'),'Owner@example.invalid');
  await user.click(screen.getByRole('button',{name:'Send reset link'}));
  expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('owner@example.invalid',{redirectTo:window.location.origin+'/reset-password'});
  expect(await screen.findByRole('status')).toHaveProperty('textContent',expect.stringContaining('If this email has an account'));
});
it('validates confirmation and retains the form when Supabase rejects a password',async()=>{
  const auth={getUser:vi.fn().mockResolvedValue({data:{user:{id:'test'}}}),updateUser:vi.fn().mockResolvedValue({error:new Error('Password does not meet requirements')})};
  render(<PasswordRecovery reset auth={auth}/>);const user=userEvent.setup();
  await user.type(await screen.findByLabelText('New password *'),'test-only-password');
  await user.type(screen.getByLabelText('Confirm password *'),'different-password');
  await user.click(screen.getByRole('button',{name:'Save new password'}));
  expect(auth.updateUser).not.toHaveBeenCalled();expect(screen.getByRole('alert').textContent).toBe('Passwords do not match.');
  await user.clear(screen.getByLabelText('Confirm password *'));await user.type(screen.getByLabelText('Confirm password *'),'test-only-password');
  await user.click(screen.getByRole('button',{name:'Save new password'}));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','Password does not meet requirements');
  expect(screen.getByRole('button',{name:'Save new password'})).toBeTruthy();
});

```

===== FILE: src/marketplace/test-setup.js =====
```javascript
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(()=>{cleanup();window.location.hash='';});

```

===== FILE: src/marketplace/trade.test.jsx =====
```jsx
import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductForm, RfqForm, QuoteForm, DocumentForm } from './TradeForms';
import { quoteTotal, positive } from './validation';
import { Verification, Workflows } from './Workflows';

it('calculates quote totals with exact decimal rounding',()=>{
  expect(quoteTotal('1.005','1')).toBe('1.01');expect(quoteTotal('0.1','0.2')).toBe('0.02');expect(quoteTotal('12.34','1000')).toBe('12340.00');
  expect(()=>positive('-1','Quantity')).toThrow();expect(()=>positive('NaN','Quantity')).toThrow();expect(()=>positive('1e9','Quantity')).toThrow();
});
it('seller can save an incomplete named product draft',async()=>{
  const save=vi.fn().mockResolvedValue({});render(<ProductForm onSave={save} onCancel={()=>{}}/>);const user=userEvent.setup();
  await user.type(screen.getByLabelText('Product name *'),'Mango chutney');
  // jsdom does not implement submitter.formNoValidate; dispatch the browser's SubmitEvent.
  const draft=screen.getByRole('button',{name:'Save draft'});expect(draft.formNoValidate).toBe(true);
  fireEvent(draft.form,new SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:draft}));
  await waitFor(()=>expect(save).toHaveBeenCalledOnce());expect(save.mock.calls[0][0]).toMatchObject({name:'Mango chutney',status:'draft',verification_status:'unverified',moq:null});
});
it('complete processed food publishes with structured fields and an image',async()=>{
  const save=vi.fn();render(<ProductForm onSave={save} onCancel={()=>{}}/>);const user=userEvent.setup();
  for(const [label,value] of [['Product name *','Chilli sauce'],['Country of origin *','India'],['Minimum order quantity (MOQ) *','100'],['Packaging formats *','500ml bottle, 12 bottle carton'],['Shelf life *','12 months'],['Storage requirements *','Store in a cool dry place']])await user.type(screen.getByLabelText(label),value);
  const file=new File(['image'],'sauce.jpg',{type:'image/jpeg'});await user.upload(screen.getByLabelText('Product images'),file);
  await user.click(screen.getByRole('button',{name:'Publish product'}));await waitFor(()=>expect(save).toHaveBeenCalledOnce());
  expect(save.mock.calls[0][0]).toMatchObject({verification_status:'unverified',status:'active',packaging:['500ml bottle','12 bottle carton'],moq:'100'});
  expect(save.mock.calls[0][0].__newImages).toHaveLength(1);
});
it('higher-risk health claims are held for Epistable review',async()=>{
  const save=vi.fn();render(<ProductForm onSave={save} onCancel={()=>{}}/>);const user=userEvent.setup();
  for(const [label,value] of [['Product name *','Herbal drink'],['Country of origin *','India'],['Minimum order quantity (MOQ) *','100'],['Packaging formats *','500ml bottle'],['Shelf life *','12 months'],['Storage requirements *','Store cool'],['Product description','A medicinal drink to cure cancer']])await user.type(screen.getByLabelText(label),value);
  const file=new File(['image'],'drink.jpg',{type:'image/jpeg'});await user.upload(screen.getByLabelText('Product images'),file);
  await user.click(screen.getByRole('button',{name:'Send for review'}));await waitFor(()=>expect(save).toHaveBeenCalledOnce());
  expect(save.mock.calls[0][0]).toMatchObject({verification_status:'pending',status:'draft',risk_status:'review_required'});
});
it('buyer RFQ preserves the selected product and seller',async()=>{
  const save=vi.fn();render(<RfqForm product={{id:'p1',seller_org_id:'seller1',name:'Sauce',category:'Sauces & Condiments',moq_unit:'carton'}} onSave={save} onCancel={()=>{}}/>);const user=userEvent.setup();
  await user.type(screen.getByLabelText('Required quantity *'),'200');await user.type(screen.getByLabelText('Destination country *'),'Brazil');await user.click(screen.getByRole('button',{name:'Send RFQ'}));
  await waitFor(()=>expect(save).toHaveBeenCalledOnce());expect(save.mock.calls[0][0]).toMatchObject({product_id:'p1',seller_org_id:'seller1',quantity:'200',quantity_unit:'carton',destination_country:'Brazil',status:'open'});
});
it('seller sends exact commercial terms and handles a failed send',async()=>{
  const save=vi.fn().mockRejectedValue(new Error('RFQ is no longer open'));render(<QuoteForm rfq={{id:'r1',quantity:100,quantity_unit:'kg',destination_country:'Brazil'}} onSave={save} onCancel={()=>{}}/>);const user=userEvent.setup();
  await user.type(screen.getByLabelText('Unit price *'),'1.005');await user.type(screen.getByLabelText('Valid through *'),'2099-12-01');await user.click(screen.getByRole('button',{name:'Send quote'}));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','RFQ is no longer open');expect(save.mock.calls[0][0]).toMatchObject({total_amount:'100.50',rfq_id:'r1',status:'sent'});expect(screen.getByLabelText('Unit price *').value).toBe('1.005');
});
it('evidence rejects an insecure source without writing',async()=>{
  const save=vi.fn();render(<DocumentForm products={[]} onSave={save} onCancel={()=>{}}/>);const user=userEvent.setup();await user.type(screen.getByLabelText('Document title *'),'Food safety certificate');await user.type(screen.getByLabelText('External evidence source (optional)'),'http://example.invalid/doc');await user.click(screen.getByRole('button',{name:'Submit evidence for verification'}));expect(await screen.findByRole('alert')).toHaveProperty('textContent','Use an HTTPS evidence source.');expect(save).not.toHaveBeenCalled();
});
it('admin review requires a reason and records the selected target',async()=>{
  const api={review:vi.fn()},saved=vi.fn();render(<Verification data={{organizations:[],documents:[],reviews:[],products:[{id:'p1',name:'Sauce',verification_status:'pending'}]}} api={api} onSaved={saved}/>);const user=userEvent.setup();await user.click(screen.getByRole('button',{name:'Review'}));await user.click(screen.getByRole('button',{name:'Save decision'}));expect(api.review).not.toHaveBeenCalled();await user.type(screen.getByLabelText('Review reason *'),'Checked specification');await user.click(screen.getByRole('button',{name:'Save decision'}));await waitFor(()=>expect(api.review).toHaveBeenCalledWith('product','p1','verified','Checked specification'));
});

it('buyer discovery keeps the previous compact marketplace card layout',()=>{
  const data={
    products:[{id:'p1',name:'Turmeric Powder',category:'Spices & Seasonings',country_of_origin:'India',moq:500,moq_unit:'kg',status:'active',cover_image_url:'https://example.invalid/turmeric.jpg',organizations:{name:'Demo Foods',verification_status:'verified'}}],
    organizations:[],documents:[],rfqs:[],quotes:[]
  };
  render(<Workflows page="discover" mode="buyer" access={{org:'buyer-1',role:'buyer_member'}} data={data} api={{}} onSaved={()=>{}}/>);
  expect(screen.getByRole('heading',{name:'Turmeric Powder'})).toBeTruthy();
  expect(screen.queryByRole('img',{name:'Turmeric Powder'})).toBeNull();
  expect(screen.getByText('Demo Foods')).toBeTruthy();
  expect(screen.getByText('verified')).toBeTruthy();
  expect(screen.getByRole('button',{name:'View details'})).toBeTruthy();
  expect(screen.getByRole('button',{name:'Request a quote'})).toBeTruthy();
});

```

===== FILE: src/marketplace/validation.js =====
```javascript
export const UNITS=['kg','tonne','carton','unit','litre'];
export const INCOTERMS=['EXW','FCA','CPT','CIP','DAP','DPU','DDP','FAS','FOB','CFR','CIF'];
export const list=value=>String(value||'').split(',').map(v=>v.trim()).filter(Boolean);
export function positive(value,label) {
  const raw=String(value).trim();
  if(!/^\d+(\.\d{1,6})?$/.test(raw)||Number(raw)<=0||Number(raw)>=1e12)throw new Error(label+' must be greater than zero, below one trillion, with at most six decimal places.');
  return raw;
}
export function quoteTotal(price,quantity) {
  const scaled=value=>{const [whole,fraction='']=positive(value,'Amount').split('.');return BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,'0'));};
  const cents=(scaled(price)*scaled(quantity)+5000000000n)/10000000000n;
  return (cents/100n).toString()+'.'+(cents%100n).toString().padStart(2,'0');
}
export function futureDate(value,label) {
  const timestamp=Date.parse(value+'T23:59:59.999Z');
  if(!Number.isFinite(timestamp)||timestamp<=Date.now())throw new Error(label+' must be in the future.');
  return timestamp;
}
export function days(value) {
  if(value==='')return null;
  const n=Number(value);if(!Number.isInteger(n)||n<0||n>3650)throw new Error('Lead time must be a whole number from 0 to 3650 days.');return n;
}

```

===== FILE: src/screens/ExportReadiness.jsx =====
```jsx
﻿import { useEffect, useMemo, useState } from "react";
import { C, fmtD, fmtMoney } from "../lib/domain";
import { FONT_STACK, SPACE } from "../lib/tokens";
import { EXPORT_MARKETS, marketConf } from "../lib/markets";
import {
  EXPORT_CERTS,
  EXPORT_PRODUCTS,
  READINESS_SECTIONS,
  readinessStatusConf,
  scoreRequirements,
  sectionForRequirement,
} from "../lib/readiness";
import { EvidenceUploadModal } from "../components/EvidenceUploadModal";
import { ExportReadinessOnboarding } from "./ExportReadinessOnboarding";
import { Icon } from "../components/Icon";
import { OverflowMenu } from "../components/OverflowMenu";
import { Pill } from "../components/Pill";
import { Btn, Card, KpiGrid, Loader, Modal, Sel, T } from "../components/ui";

const TEXT = {
  pageTitle: {...T.title,marginBottom:18,fontWeight:700},
  pageHeader: {...T.title,fontWeight:700},
  heroTitle: {fontSize:20,lineHeight:1.2,fontWeight:700,letterSpacing:0},
  panelTitle: {fontSize:14,lineHeight:1.55,fontWeight:700,letterSpacing:0},
  itemTitle: {fontSize:13,lineHeight:1.55,fontWeight:600,letterSpacing:0},
  meta: {...T.hint,color:C.textDim},
  tinyMeta: {fontSize:12,lineHeight:1.55,color:C.textDim,letterSpacing:0},
  emptyTitle: {fontSize:15,lineHeight:1.55,fontWeight:700,letterSpacing:0},
};

export function ExportReadiness({fac,user,DB}) {
  const [profile,setProfile]=useState(null);
  const [requirements,setRequirements]=useState([]);
  const [requirementsByMarket,setRequirementsByMarket]=useState({});
  const [bodiesByReq,setBodiesByReq]=useState({});
  const [evidence,setEvidence]=useState([]);
  const [activeMarket,setActiveMarket]=useState("EU");
  const [showAddMarket,setShowAddMarket]=useState(false);
  const [uploadReq,setUploadReq]=useState(null);
  const [naReq,setNaReq]=useState(null);
  const [naReason,setNaReason]=useState("");
  const [form,setForm]=useState({
    sector:"stone",
    productType:"any",
    markets:["EU"],
    exportStatus:"planning",
    companySize:"",
    currentCertifications:[],
  });
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState("");
  const [usageStats,setUsageStats]=useState({inspectionsLast90Days:0,registeredSuppliers:0,inspectionsWithBatchNo:0});

  const evidenceByReq=useMemo(()=>{
    const map={};
    evidence.forEach(e=>{map[e.requirement_id]=e;});
    return map;
  },[evidence]);
  const markets=form.markets?.length?form.markets:["EU"];
  const activeRequirements=requirementsByMarket[activeMarket]||requirements;
  const scored=activeRequirements.map(r=>{
    const status=evidenceByReq[r.id]?.status || "missing";
    const conf=readinessStatusConf(status);
    return {...r,status,score:conf.score};
  });
  const missing=scored.filter(r=>["missing","rejected","expired"].includes(r.status));
  const working=scored.filter(r=>["pending","uploaded","submitted"].includes(r.status));
  const complete=scored.filter(r=>["verified","not_applicable"].includes(r.status));
  const activeStats=scoreRequirements(activeRequirements,evidence);
  const readinessScore=activeStats.score;
  const marketScores=useMemo(()=>{
    const out={};
    markets.forEach(m=>{out[m]=scoreRequirements(requirementsByMarket[m]||[],evidence).score;});
    return out;
  },[markets,requirementsByMarket,evidence]);
  const grouped=useMemo(()=>{
    const groups=Object.fromEntries(READINESS_SECTIONS.map(s=>[s.id,[]]));
    scored.forEach(r=>{groups[sectionForRequirement(r)]?.push(r);});
    return groups;
  },[scored]);

  async function fetchRequirements(next) {
    const targetMarkets=next.markets?.length?next.markets:["EU"];
    const pairs=await Promise.all(targetMarkets.map(async market=>[market,await DB.exportRequirements({sector:next.sector,productType:next.productType,market})]));
    const byMarket=Object.fromEntries(pairs);
    setRequirementsByMarket(byMarket);
    setRequirements(byMarket[targetMarkets[0]] || []);
    const ids=[...new Set(pairs.flatMap(([,reqs])=>reqs.map(r=>r.id)))];
    setBodiesByReq(await DB.readinessBodies(ids));
  }

  async function load(nextForm=form) {
    if(!fac?.id)return;
    setLoading(true);setErr("");
    try {
      const p=await DB.getExportReadinessProfile(fac.id);
      const destinationMarkets=p?.destination_markets?.length?p.destination_markets:[nextForm.markets?.[0]||"EU"];
      const merged=p?{
        sector:p.sector||"stone",
        productType:p.product_type||"any",
        markets:destinationMarkets,
        exportStatus:p.export_status||"planning",
        companySize:p.company_size||"",
        currentCertifications:p.current_certifications||[],
      }:nextForm;
      setProfile(p);setForm(merged);setActiveMarket(destinationMarkets[0]||"EU");
      await fetchRequirements(merged);
      setEvidence(p?.id?await DB.readinessEvidence(p.id):[]);
      setUsageStats(await DB.factoryUsageStats(fac.id));
    } catch(e) {
      console.error("Export readiness load failed",e);
      setErr(e.message||"Could not load export readiness data.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(()=>{load();},[fac?.id]);

  async function saveProfile(next=form) {
    if(!fac?.id||saving)return null;
    setSaving(true);setErr("");
    const destinationMarkets=next.markets?.length?next.markets:[activeMarket||"EU"];
    try {
      const saved=await DB.saveExportReadinessProfile(profile,{
        factoryId:fac.id,
        userId:user.id,
        sector:next.sector,
        productType:next.productType,
        destinationMarkets,
        currentCertifications:next.currentCertifications,
        companySize:next.companySize,
        exportStatus:next.exportStatus,
        onboardingInputs:{markets:destinationMarkets,productType:next.productType,exportStatus:next.exportStatus,companySize:next.companySize},
      });
      const merged={...next,markets:destinationMarkets};
      setProfile(saved);setForm(merged);
      if(!destinationMarkets.includes(activeMarket))setActiveMarket(destinationMarkets[0]);
      await fetchRequirements(merged);
      setEvidence(await DB.readinessEvidence(saved.id));
      return saved;
    } catch(e) {
      console.error("Export readiness save failed",e);
      setErr(e.message||"Could not save readiness profile.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  function updateForm(patch) {
    setForm(prev=>({...prev,...patch}));
  }
  function toggleCert(id) {
    const set=new Set(form.currentCertifications);
    if(set.has(id))set.delete(id);else set.add(id);
    updateForm({currentCertifications:Array.from(set)});
  }
  async function addMarket(code) {
    const next={...form,markets:[...new Set([...(form.markets||[]),code])]};
    setForm(next);setActiveMarket(code);setShowAddMarket(false);
    await saveProfile(next);
  }
  async function removeMarket(code) {
    if(markets.length<=1)return;
    const nextMarkets=markets.filter(m=>m!==code);
    const next={...form,markets:nextMarkets};
    setForm(next);
    if(activeMarket===code)setActiveMarket(nextMarkets[0]);
    await saveProfile(next);
  }
  async function persistEvidence(req,patch) {
    let activeProfile=profile;
    if(!activeProfile?.id)activeProfile=await saveProfile(form);
    if(!activeProfile?.id)return;
    setSaving(true);setErr("");
    try {
      await DB.setReadinessEvidence({
        factoryId:fac.id,
        profileId:activeProfile.id,
        requirementId:req.id,
        evidenceType:req.evidenceType,
        evidenceLifecycleType:req.lifecycleType,
        userId:user.id,
        ...patch,
      });
      setEvidence(await DB.readinessEvidence(activeProfile.id));
      setUploadReq(null);setNaReq(null);setNaReason("");
    } catch(e) {
      console.error("Readiness evidence update failed",e);
      setErr(e.message||"Could not update requirement status.");
    } finally {
      setSaving(false);
    }
  }

  const scoreTone=readinessScore>=75?"success":readinessScore>=45?"warning":"danger";
  if(loading)return <Loader/>;
  if(!profile || !profile.onboarding_completed_at) {
    return <ExportReadinessOnboarding profile={profile} onSave={saveProfile} onComplete={()=>load()} saving={saving}/>;
  }
  return (
    <div>
      {uploadReq&&<EvidenceUploadModal req={uploadReq} evidence={evidenceByReq[uploadReq.id]} bodies={bodiesByReq[uploadReq.id]||[]} factoryId={fac?.id} saving={saving} onClose={()=>setUploadReq(null)} onSave={patch=>persistEvidence(uploadReq,patch)}/>}
      {naReq&&<Modal title="Mark not applicable" onClose={()=>setNaReq(null)}>
        <div style={{display:"grid",gap:14}}>
          <div style={{fontSize:13,lineHeight:1.65,color:C.textMid}}>Use this only when the requirement genuinely does not apply to your product, market, or shipment route.</div>
          <textarea value={naReason} onChange={e=>setNaReason(e.target.value)} rows={3} placeholder="Why does this not apply?" style={{width:"100%",padding:12,border:`1.5px solid ${C.border}`,borderRadius:10,boxSizing:"border-box",fontFamily:FONT_STACK,fontSize:14,color:C.text,resize:"vertical"}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Btn variant="secondary" onClick={()=>setNaReq(null)} disabled={saving}>Cancel</Btn>
            <Btn onClick={()=>persistEvidence(naReq,{status:"not_applicable",notes:`Not applicable: ${naReason}`})} disabled={saving||!naReason.trim()}>Save reason</Btn>
          </div>
        </div>
      </Modal>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,marginBottom:18,flexWrap:"wrap"}}>
        <div>
          <div style={TEXT.pageHeader}>Export Readiness</div>
          <div style={{...TEXT.tinyMeta,marginTop:4,maxWidth:680}}>Track what each market needs, submit third-party evidence, and build a buyer-audit-ready profile. Epistable organises evidence; it does not issue certifications.</div>
        </div>
        <Pill tone={scoreTone} style={{fontSize:13,padding:"6px 12px"}}>{readinessScore}% ready for {marketConf(activeMarket).short}</Pill>
      </div>
      {err&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:10,padding:"12px 14px",fontSize:13,color:C.red,marginBottom:16}}>{err}</div>}
      <KpiGrid items={[
        {label:"Requirements",value:activeStats.total,icon:"Trace",color:C.primary},
        {label:"Complete",value:activeStats.complete,icon:"Won",color:C.green},
        {label:"Submitted / Working",value:activeStats.working,icon:"Now",color:C.amber},
        {label:"Missing",value:activeStats.missing,icon:"Risk",color:C.red},
      ]}/>
      <Card style={{padding:20,marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:16}}>
          <div>
            <div style={TEXT.panelTitle}>Readiness profile</div>
            <div style={TEXT.tinyMeta}>Pick the markets you are targeting. Each market gets its own readiness score.</div>
          </div>
          <Btn size="sm" onClick={()=>saveProfile(form)} disabled={saving}>{profile?"Save":"Create profile"}</Btn>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:16}}>
          <Sel label="Product" value={form.productType} onChange={v=>updateForm({productType:v})} options={EXPORT_PRODUCTS}/>
          <Sel label="Current Status" value={form.exportStatus} onChange={v=>updateForm({exportStatus:v})} options={[
            {value:"planning",label:"Planning first export"},
            {value:"first_export",label:"Preparing first shipment"},
            {value:"active_exporter",label:"Already exporting"},
            {value:"expanding_markets",label:"Expanding markets"},
          ]}/>
          <Sel label="Company Size" value={form.companySize} onChange={v=>updateForm({companySize:v})} options={[
            {value:"",label:"Select size"},
            {value:"small",label:"Small factory"},
            {value:"mid",label:"Mid-size exporter"},
            {value:"large",label:"Large exporter"},
          ]}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,overflowX:"auto",paddingBottom:4,marginBottom:14}}>
          {markets.map(code=>{
            const m=marketConf(code);
            const active=code===activeMarket;
            const s=marketScores[code]||0;
            const tone=s>=75?"success":s>=45?"warning":"danger";
            return <button key={code} onClick={()=>setActiveMarket(code)} style={{display:"inline-flex",alignItems:"center",gap:8,background:active?C.primaryBg:C.white,border:`1px solid ${active?C.primaryBorder:C.border}`,borderRadius:999,padding:"8px 10px",cursor:"pointer",fontFamily:FONT_STACK,color:active?C.primary:C.textMid,whiteSpace:"nowrap",boxShadow:active?C.shadow:"none"}}>
              <span style={{fontSize:13,fontWeight:700}}>{m.short}</span><Pill tone={tone} size="sm">{s}%</Pill>
              {markets.length>1&&<span onClick={e=>{e.stopPropagation();removeMarket(code);}} style={{display:"inline-flex",color:C.textDim}}><Icon name="close" size={13}/></span>}
            </button>;
          })}
          <button onClick={()=>setShowAddMarket(v=>!v)} style={{display:"inline-flex",alignItems:"center",gap:6,background:C.surface,border:`1px dashed ${C.primaryBorder}`,borderRadius:999,padding:"8px 11px",cursor:"pointer",fontFamily:FONT_STACK,color:C.primary,fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}><Icon name="add" size={14}/> Add market</button>
        </div>
        {showAddMarket&&<div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 0 14px"}}>
          {EXPORT_MARKETS.filter(m=>!markets.includes(m.value)).map(m=><Btn key={m.value} size="sm" variant="secondary" onClick={()=>addMarket(m.value)}>{m.label}</Btn>)}
          {EXPORT_MARKETS.filter(m=>!markets.includes(m.value)).length===0&&<div style={TEXT.tinyMeta}>All available markets are already selected.</div>}
        </div>}
        <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:8}}>What do you already have?</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {EXPORT_CERTS.map(cert=>{
            const active=form.currentCertifications.includes(cert.id);
            return <button key={cert.id} onClick={()=>toggleCert(cert.id)} style={{border:`1px solid ${active?C.greenBorder:C.border}`,background:active?C.greenBg:C.white,color:active?C.green:C.textMid,borderRadius:999,padding:"7px 11px",fontFamily:FONT_STACK,fontSize:12,fontWeight:600,cursor:"pointer"}}>{active?"âœ“ ":""}{cert.label}</button>;
          })}
        </div>
      </Card>
      <Card style={{padding:16,marginBottom:18,borderColor:C.primaryBorder,background:C.primaryBg}}>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <Pill tone="primary">{marketConf(activeMarket).label}</Pill>
          <div style={{fontSize:13,lineHeight:1.6,color:C.textMid}}>{form.productType==="any"?"Mixed stone products":EXPORT_PRODUCTS.find(p=>p.value===form.productType)?.label} Â· {activeStats.complete} of {activeStats.total} items complete Â· Submitted evidence should be reviewed before it is shown as verified to buyers.</div>
        </div>
      </Card>
      <Card style={{padding:20,marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:14}}>
          <div>
            <div style={TEXT.panelTitle}>Roadmap sections for {marketConf(activeMarket).label}</div>
            <div style={TEXT.tinyMeta}>Grouped by buyer-audit theme. Submit evidence against each requirement as you collect it.</div>
          </div>
          {!profile&&<Pill tone="warning">Save profile first</Pill>}
        </div>
        {activeRequirements.length===0?<div style={{padding:"30px 12px",textAlign:"center",color:C.textDim,fontSize:13}}>No configured requirements found for this selection yet.</div>:
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {READINESS_SECTIONS.map(section=>{
            const sectionReqs=grouped[section.id]||[];
            if(!sectionReqs.length)return null;
            const sectionStats=scoreRequirements(sectionReqs,evidence);
            return (
              <div key={section.id} style={{border:`1px solid ${C.border}`,borderRadius:14,padding:14,background:C.surface}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",marginBottom:10}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:C.text}}>{section.label}</div>
                    <div style={TEXT.tinyMeta}>{section.hint}</div>
                  </div>
                  <Pill tone={sectionStats.complete===sectionStats.total?"success":"neutral"}>{sectionStats.complete} of {sectionStats.total}</Pill>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {section.id==="quality_evidence"&&usageStats.inspectionsLast90Days>10&&(
                    <Card style={{padding:SPACE.md,background:C.surface,display:"flex",gap:SPACE.sm,alignItems:"flex-start"}}>
                      <Icon name="check" size={16} color={C.green}/>
                      <div style={{fontSize:12,lineHeight:1.5,color:C.textMid}}>
                        You have <strong style={{color:C.text}}>{usageStats.inspectionsLast90Days} inspections</strong> recorded in the last 90 days. This counts as operational evidence of QC capability - share it alongside formal certifications.
                      </div>
                    </Card>
                  )}
                  {section.id==="origin_traceability"&&(usageStats.registeredSuppliers>0||usageStats.inspectionsWithBatchNo>5)&&(
                    <Card style={{padding:SPACE.md,background:C.surface,display:"flex",gap:SPACE.sm,alignItems:"flex-start"}}>
                      <Icon name="check" size={16} color={C.green}/>
                      <div style={{fontSize:12,lineHeight:1.5,color:C.textMid}}>
                        You're tracking {usageStats.registeredSuppliers>0?`${usageStats.registeredSuppliers} registered suppliers`:""}
                        {usageStats.registeredSuppliers>0&&usageStats.inspectionsWithBatchNo>5?" and ":""}
                        {usageStats.inspectionsWithBatchNo>5?`batch numbers on ${usageStats.inspectionsWithBatchNo} scans`:""}.
                        This strengthens your origin and traceability story.
                      </div>
                    </Card>
                  )}
                  {sectionReqs.map(req=>{
                    const conf=readinessStatusConf(req.status);
                    const ev=evidenceByReq[req.id];
                    const timeline=req.timelineMin||req.timelineMax?`${req.timelineMin||0}-${req.timelineMax||req.timelineMin} weeks`:"Timeline varies";
                    const cost=req.costMin||req.costMax?`${fmtMoney(req.costMin||0)}-${fmtMoney(req.costMax||req.costMin||0)}`:"Cost varies";
                    const bodies=bodiesByReq[req.id]||[];
                    const primaryAction=req.status==="expired"
                      ? {label:"Upload renewal",variant:"red",onClick:()=>setUploadReq(req)}
                      : req.status==="verified"
                        ? {label:"View evidence",variant:"secondary",onClick:()=>setUploadReq(req)}
                        : ["submitted","uploaded"].includes(req.status)
                          ? {label:"Edit evidence",variant:"secondary",onClick:()=>setUploadReq(req)}
                          : req.status==="not_applicable"
                            ? {label:"Restore",variant:"secondary",onClick:()=>persistEvidence(req,{status:"missing",notes:"Restored during readiness assessment."})}
                            : {label:"Submit evidence",variant:"secondary",onClick:()=>setUploadReq(req)};
                    const overflowItems=[
                      {label:"Mark as working on it",disabled:saving,onClick:()=>persistEvidence(req,{status:"pending",notes:"Work started during readiness assessment."})},
                      {label:"Mark as missing",disabled:saving,tone:"danger",onClick:()=>persistEvidence(req,{status:"missing",notes:"Marked missing during readiness assessment."})},
                      {label:"Mark not applicable",disabled:saving,onClick:()=>{setNaReq(req);setNaReason(ev?.notes?.replace(/^Not applicable:\s*/,"")||"");}},
                    ];
                    return (
                      <div key={req.id} style={{border:`1px solid ${C.border}`,borderRadius:12,padding:14,background:C.white}}>
                        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",marginBottom:8}}>
                          <div style={{minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                              <div style={{fontSize:14,fontWeight:700,color:C.text}}>{req.requirementName}</div>
                              <Pill tone={req.is_mandatory===false?"neutral":"primary"} size="sm">{req.is_mandatory===false?"Recommended":"Required"}</Pill>
                            </div>
                            <div style={{fontSize:12,lineHeight:1.6,color:C.textMid}}>{req.description}</div>
                          </div>
                          <Pill tone={conf.tone}>{conf.label}</Pill>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8,margin:"10px 0"}}>
                          <div style={{fontSize:12,color:C.textDim}}>Evidence: <strong style={{color:C.text}}>{(req.evidence_instructions||req.evidenceType||"Document").slice(0,70)}</strong></div>
                          <div style={{fontSize:12,color:C.textDim}}>Timeline: <strong style={{color:C.text}}>{timeline}</strong></div>
                          <div style={{fontSize:12,color:C.textDim}}>Cost: <strong style={{color:C.text}}>{cost}</strong></div>
                        </div>
                        {!!bodies.length&&<div style={{fontSize:12,color:C.textDim,marginBottom:10}}>Possible bodies: <strong style={{color:C.text}}>{bodies.slice(0,3).map(b=>b.name).join(", ")}</strong></div>}
                        {ev&&req.status!=="missing"&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:10,marginBottom:10,fontSize:12,lineHeight:1.6,color:C.textMid}}>
                          {ev.certificate_number&&<div>Reference: <strong style={{color:C.text}}>{ev.certificate_number}</strong></div>}
                          {ev.issued_at&&<div>Issued: <strong style={{color:C.text}}>{fmtD(ev.issued_at)}</strong></div>}
                          {ev.expires_at&&<div>Valid until: <strong style={{color:C.text}}>{fmtD(ev.expires_at)}</strong></div>}
                          {ev.file_url&&<div><button type="button" onClick={async()=>{const url=await DB.evidenceFileUrl(ev.file_url);if(url)window.open(url,"_blank","noopener,noreferrer");}} style={{background:"transparent",border:"none",color:C.primary,fontWeight:600,fontFamily:FONT_STACK,cursor:"pointer",padding:0,fontSize:12}}>Open evidence file</button></div>}
                          {ev.notes&&<div>{ev.notes}</div>}
                        </div>}
                        <div style={{display:"flex",gap:8,alignItems:"center",paddingTop:8,borderTop:`1px solid ${C.border}`}}>
                          <Btn size="sm" variant={primaryAction.variant} disabled={saving} onClick={primaryAction.onClick}>{primaryAction.label}</Btn>
                          <OverflowMenu items={overflowItems}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>}
      </Card>
      <Card style={{padding:20,borderColor:C.primaryBorder,background:C.primaryBg}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          <Icon name="verified" size={22} color={C.primary}/>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:C.primary,marginBottom:4}}>Next best action</div>
            <div style={{fontSize:13,lineHeight:1.65,color:C.textMid}}>
              {missing[0]?`Start with ${missing[0].requirementName}. It is the highest-priority missing item for ${marketConf(activeMarket).short}.`:"Keep the evidence fresh and prepare a buyer-ready packet before sending profiles to international buyers."}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}


```

===== FILE: src/screens/ExportReadinessOnboarding.jsx =====
```jsx
import { useState } from "react";
import { C } from "../lib/domain";
import { EXPORT_MARKETS } from "../lib/markets";
import { EXPORT_PRODUCTS } from "../lib/readiness";
import { SPACE } from "../lib/tokens";
import { Btn, Card, Sel, T } from "../components/ui";
import { Pill } from "../components/Pill";

const STATUS_OPTIONS = [
  {value:"planning",label:"Planning my first export"},
  {value:"first_export",label:"Preparing my first shipment"},
  {value:"active_exporter",label:"Already exporting"},
  {value:"expanding_markets",label:"Expanding to new markets"},
];

export function ExportReadinessOnboarding({profile,onComplete,onSave,saving=false}) {
  const [step,setStep]=useState(0);
  const [form,setForm]=useState({
    markets:profile?.destination_markets?.length?profile.destination_markets:["EU"],
    productType:profile?.product_type||"granite",
    exportStatus:profile?.export_status||"planning",
  });
  const [err,setErr]=useState("");
  const canContinue=step>0 || form.markets.length>0;

  const toggleMarket=code=>{
    setForm(prev=>{
      const set=new Set(prev.markets);
      if(set.has(code))set.delete(code);else set.add(code);
      return {...prev,markets:Array.from(set)};
    });
  };
  const submit=async()=>{
    if(!form.markets.length){setErr("Pick at least one market to continue.");return;}
    setErr("");
    const saved=await onSave?.({
      sector:"stone",
      productType:form.productType,
      markets:form.markets,
      exportStatus:form.exportStatus,
      companySize:profile?.company_size||"",
      currentCertifications:profile?.current_certifications||[],
    });
    if(saved)onComplete?.();
  };

  return (
    <div style={{display:"grid",gap:SPACE.lg,maxWidth:760,margin:"0 auto"}}>
      <div>
        <div style={{...T.title,fontWeight:700,marginBottom:SPACE.xs}}>Export Readiness</div>
        <div style={{...T.hint,color:C.textDim}}>Let's set up your first readiness view around the markets you care about.</div>
      </div>
      <Card style={{padding:SPACE.xl}}>
        {step===0&&(
          <div style={{display:"grid",gap:SPACE.lg}}>
            <div>
              <div style={{fontSize:20,fontWeight:700,color:C.text,marginBottom:SPACE.xs}}>Let's get started.</div>
              <div style={{fontSize:14,lineHeight:1.65,color:C.textMid}}>Which markets are you currently targeting, or want to target?</div>
            </div>
            <div style={{display:"flex",gap:SPACE.sm,flexWrap:"wrap"}}>
              {EXPORT_MARKETS.map(m=>{
                const active=form.markets.includes(m.value);
                return (
                  <button key={m.value} type="button" onClick={()=>toggleMarket(m.value)} style={{background:active?C.primaryBg:C.white,border:`1.5px solid ${active?C.primary:C.border}`,borderRadius:999,padding:"9px 13px",fontSize:13,fontWeight:600,color:active?C.primary:C.textMid,cursor:"pointer"}}>
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {step===1&&(
          <div style={{display:"grid",gap:SPACE.lg}}>
            <div>
              <div style={{fontSize:20,fontWeight:700,color:C.text,marginBottom:SPACE.xs}}>What's your primary product?</div>
              <div style={{fontSize:14,lineHeight:1.65,color:C.textMid}}>You can adjust this later as your export plan changes.</div>
            </div>
            <Sel label="Primary product" value={form.productType} onChange={v=>setForm(p=>({...p,productType:v}))} options={EXPORT_PRODUCTS}/>
          </div>
        )}
        {step===2&&(
          <div style={{display:"grid",gap:SPACE.lg}}>
            <div>
              <div style={{fontSize:20,fontWeight:700,color:C.text,marginBottom:SPACE.xs}}>Where are you today?</div>
              <div style={{fontSize:14,lineHeight:1.65,color:C.textMid}}>This helps us order the readiness work around your current stage.</div>
            </div>
            <div style={{display:"grid",gap:SPACE.sm}}>
              {STATUS_OPTIONS.map(opt=>{
                const active=form.exportStatus===opt.value;
                return (
                  <button key={opt.value} type="button" onClick={()=>setForm(p=>({...p,exportStatus:opt.value}))} style={{textAlign:"left",background:active?C.primaryBg:C.white,border:`1.5px solid ${active?C.primary:C.border}`,borderRadius:10,padding:"12px 14px",fontSize:14,fontWeight:600,color:active?C.primary:C.text,cursor:"pointer"}}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {err&&<div style={{marginTop:SPACE.md,color:C.red,fontSize:13}}>{err}</div>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:SPACE.md,marginTop:SPACE.xl}}>
          <Pill tone="neutral">Step {step+1} of 3</Pill>
          <div style={{display:"flex",gap:SPACE.sm}}>
            {step>0&&<Btn variant="secondary" onClick={()=>setStep(s=>s-1)} disabled={saving}>Back</Btn>}
            {step<2&&<Btn onClick={()=>setStep(s=>s+1)} disabled={!canContinue||saving}>Continue</Btn>}
            {step===2&&<Btn onClick={submit} disabled={saving}>Create readiness view</Btn>}
          </div>
        </div>
      </Card>
    </div>
  );
}

```

===== FILE: src/screens/SellerDocuments.jsx =====
```jsx
import { useEffect, useMemo, useState } from "react";
import { C, fmtD } from "../lib/domain";
import { SPACE } from "../lib/tokens";
import { EXPORT_PRODUCTS, readinessStatusConf, scoreRequirements, sectionForRequirement } from "../lib/readiness";
import { EXPORT_MARKETS, marketConf } from "../lib/markets";
import { EvidenceUploadModal } from "../components/EvidenceUploadModal";
import { Icon } from "../components/Icon";
import { Pill } from "../components/Pill";
import { Btn, Card, Loader, Sel, T } from "../components/ui";

const DOC_SECTIONS = [
  { id: "business", label: "Business documents", readinessIds: ["market_entry"], hint: "Start here. These are the registrations buyers expect before export conversations get serious." },
  { id: "product", label: "Product test reports", readinessIds: ["product_standards"], hint: "Lab reports, CE/EN/ASTM evidence, and technical product documents." },
  { id: "factory", label: "Factory certificates", readinessIds: ["quality_evidence", "responsible_sourcing"], hint: "Factory-level certificates, social audit evidence, safety, and environmental records." },
  { id: "shipment", label: "Shipment documents", readinessIds: ["packaging_shipment"], hint: "Origin, packing, labelling, fumigation, and shipment proof." },
  { id: "slab", label: "Slab evidence", readinessIds: ["origin_traceability"], hint: "Auto-filled from scans where possible: slab certificates, inspection photos, supplier and batch data." },
];

const DEFAULT_FORM = {
  sector: "stone",
  productType: "any",
  markets: ["EU"],
  exportStatus: "planning",
  companySize: "",
  currentCertifications: [],
};

const TEXT = {
  title: { ...T.title, fontWeight: 700 },
  meta: { ...T.hint, color: C.textDim },
};

function docSectionForRequirement(req) {
  const section = sectionForRequirement(req);
  const found = DOC_SECTIONS.find(s => s.readinessIds.includes(section));
  return found?.id || "business";
}

function evidenceSummary(ev) {
  if (!ev) return null;
  const parts = [];
  if (ev.certificate_number) parts.push(`Ref ${ev.certificate_number}`);
  if (ev.expires_at) parts.push(`Valid until ${fmtD(ev.expires_at)}`);
  if (ev.file_url) parts.push("File added");
  if (!parts.length && ev.notes) parts.push(ev.notes.slice(0, 90));
  return parts.join(" · ");
}

export function SellerDocuments({ fac, user, DB, insps = [] }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [market, setMarket] = useState("EU");
  const [requirements, setRequirements] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [bodiesByReq, setBodiesByReq] = useState({});
  const [uploadReq, setUploadReq] = useState(null);
  const [showAllSections, setShowAllSections] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const evidenceByReq = useMemo(() => {
    const out = {};
    evidence.forEach(e => { out[e.requirement_id] = e; });
    return out;
  }, [evidence]);

  const scored = useMemo(() => requirements.map(r => ({
    ...r,
    status: evidenceByReq[r.id]?.status || "missing",
  })), [requirements, evidenceByReq]);

  const stats = scoreRequirements(requirements, evidence);
  const firstMissing = scored.find(r => ["missing", "expired", "rejected"].includes(r.status));
  const scanStats = useMemo(() => {
    const withPhoto = insps.filter(i => i.photo || (Array.isArray(i.photos) && i.photos.length)).length;
    const withBatch = insps.filter(i => i.measurements?.traceability?.batchNo).length;
    const exportReady = insps.filter(i => i.exportReady).length;
    return { total: insps.length, withPhoto, withBatch, exportReady };
  }, [insps]);

  async function fetchRequirements(nextForm, nextMarket) {
    const reqs = await DB.exportRequirements({
      sector: nextForm.sector,
      productType: nextForm.productType,
      market: nextMarket,
    });
    setRequirements(reqs);
    setBodiesByReq(await DB.readinessBodies(reqs.map(r => r.id)));
  }

  async function load() {
    if (!fac?.id) return;
    setLoading(true); setErr("");
    try {
      const p = await DB.getExportReadinessProfile(fac.id);
      const next = p ? {
        sector: p.sector || "stone",
        productType: p.product_type || "any",
        markets: p.destination_markets?.length ? p.destination_markets : ["EU"],
        exportStatus: p.export_status || "planning",
        companySize: p.company_size || "",
        currentCertifications: p.current_certifications || [],
      } : DEFAULT_FORM;
      const nextMarket = next.markets[0] || "EU";
      setProfile(p);
      setForm(next);
      setMarket(nextMarket);
      await fetchRequirements(next, nextMarket);
      setEvidence(p?.id ? await DB.readinessEvidence(p.id) : []);
    } catch (e) {
      console.error("Seller documents load failed", e);
      setErr(e.message || "Could not load seller documents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [fac?.id]);

  async function saveProfile(nextForm = form) {
    setSaving(true); setErr("");
    try {
      const saved = await DB.saveExportReadinessProfile(profile, {
        factoryId: fac.id,
        userId: user.id,
        sector: nextForm.sector,
        productType: nextForm.productType,
        destinationMarkets: nextForm.markets?.length ? nextForm.markets : [market],
        currentCertifications: nextForm.currentCertifications,
        companySize: nextForm.companySize,
        exportStatus: nextForm.exportStatus,
        onboardingInputs: { source: "seller_documents", productType: nextForm.productType, markets: nextForm.markets },
      });
      setProfile(saved);
      setEvidence(await DB.readinessEvidence(saved.id));
      return saved;
    } catch (e) {
      console.error("Seller documents profile save failed", e);
      setErr(e.message || "Could not prepare document profile.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function changeProfile(patch) {
    const next = { ...form, ...patch };
    setForm(next);
    if (patch.markets?.length) setMarket(patch.markets[0]);
    await saveProfile(next);
    await fetchRequirements(next, patch.markets?.[0] || market);
  }

  async function saveEvidence(req, patch) {
    let activeProfile = profile;
    if (!activeProfile?.id) activeProfile = await saveProfile(form);
    if (!activeProfile?.id) return;
    setSaving(true); setErr("");
    try {
      await DB.setReadinessEvidence({
        factoryId: fac.id,
        profileId: activeProfile.id,
        requirementId: req.id,
        evidenceType: req.evidenceType,
        evidenceLifecycleType: req.lifecycleType,
        userId: user.id,
        ...patch,
      });
      setEvidence(await DB.readinessEvidence(activeProfile.id));
      setUploadReq(null);
    } catch (e) {
      console.error("Seller document save failed", e);
      setErr(e.message || "Could not save document.");
    } finally {
      setSaving(false);
    }
  }

  async function markWorking(req) {
    await saveEvidence(req, { status: "pending", notes: "Working on this document." });
  }

  async function openEvidence(ev) {
    const url = await DB.evidenceFileUrl(ev?.file_url);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  const grouped = useMemo(() => {
    const out = Object.fromEntries(DOC_SECTIONS.map(s => [s.id, []]));
    scored.forEach(req => { out[docSectionForRequirement(req)].push(req); });
    return out;
  }, [scored]);
  const nextSectionId = firstMissing ? docSectionForRequirement(firstMissing) : null;
  const visibleSections = useMemo(() => {
    if (showAllSections || !nextSectionId) return DOC_SECTIONS;
    return DOC_SECTIONS.filter(section =>
      section.id === nextSectionId ||
      (grouped[section.id] || []).some(req => evidenceByReq[req.id])
    );
  }, [showAllSections, nextSectionId, grouped, evidenceByReq]);

  if (loading) return <Loader />;

  return (
    <div>
      {uploadReq && (
        <EvidenceUploadModal
          req={uploadReq}
          evidence={evidenceByReq[uploadReq.id]}
          bodies={bodiesByReq[uploadReq.id] || []}
          factoryId={fac?.id}
          saving={saving}
          onClose={() => setUploadReq(null)}
          onSave={patch => saveEvidence(uploadReq, patch)}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", gap: SPACE.base, alignItems: "flex-start", marginBottom: SPACE.lg, flexWrap: "wrap" }}>
        <div>
          <div style={TEXT.title}>Documents</div>
          <div style={{ ...TEXT.meta, marginTop: 4, maxWidth: 680 }}>
            Add the proof buyers ask for. Start with the missing items, one file or number at a time.
          </div>
        </div>
        <Pill tone={stats.score >= 75 ? "success" : stats.score >= 45 ? "warning" : "danger"} style={{ fontSize: 13, padding: "6px 12px" }}>
          {marketConf(market).short} ready: {stats.complete} of {stats.total}
        </Pill>
      </div>

      {err && (
        <div style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 10, padding: "12px 14px", fontSize: 13, color: C.red, marginBottom: SPACE.base }}>
          {err}
        </div>
      )}

      <Card style={{ padding: SPACE.lg, marginBottom: SPACE.base }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: SPACE.md, alignItems: "end" }}>
          <Sel
            label="Market"
            value={market}
            onChange={async v => {
              setMarket(v);
              const next = { ...form, markets: [v] };
              setForm(next);
              await saveProfile(next);
              await fetchRequirements(next, v);
            }}
            options={EXPORT_MARKETS}
          />
          <Sel
            label="Product"
            value={form.productType}
            onChange={v => changeProfile({ productType: v })}
            options={EXPORT_PRODUCTS}
          />
          <div style={{ display: "flex", gap: SPACE.sm, alignItems: "center", flexWrap: "wrap" }}>
            <Pill tone="success">{stats.complete} added</Pill>
            <Pill tone="warning">{stats.working} working</Pill>
            <Pill tone="danger">{stats.missing} missing</Pill>
          </div>
        </div>
      </Card>

      <Card style={{ padding: SPACE.lg, marginBottom: SPACE.base, background: firstMissing ? C.primaryBg : C.greenBg, borderColor: firstMissing ? C.primaryBorder : C.greenBorder }}>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.md, flexWrap: "wrap" }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name={firstMissing ? "upload" : "check"} size={20} color={firstMissing ? C.primary : C.green} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>
              {firstMissing ? `Next: add ${firstMissing.requirementName}` : "Core documents added"}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: C.textMid }}>
              {firstMissing ? firstMissing.evidence_instructions || "Upload the document or add the reference number when you have it." : "Keep expiry dates current before sharing evidence with buyers."}
            </div>
          </div>
          {firstMissing && <Btn size="sm" onClick={() => setUploadReq(firstMissing)}>Add document</Btn>}
        </div>
      </Card>

      {!showAllSections && nextSectionId && visibleSections.length < DOC_SECTIONS.length && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: SPACE.md, alignItems: "center", marginBottom: SPACE.base, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, lineHeight: 1.55, color: C.textMid }}>
            Showing the next useful section first. The full readiness checklist is still available when needed.
          </div>
          <Btn size="sm" variant="secondary" onClick={() => setShowAllSections(true)}>View all document sections</Btn>
        </div>
      )}

      <div style={{ display: "grid", gap: SPACE.base }}>
        {visibleSections.map(section => {
          const rows = grouped[section.id] || [];
          const sectionStats = scoreRequirements(rows, evidence);
          return (
            <Card key={section.id} style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: SPACE.lg, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", gap: SPACE.md, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{section.label}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.55, color: C.textMid, marginTop: 2 }}>{section.hint}</div>
                </div>
                <Pill tone={sectionStats.complete === sectionStats.total && sectionStats.total ? "success" : "neutral"}>
                  {sectionStats.complete} of {sectionStats.total}
                </Pill>
              </div>

              {section.id === "slab" && (
                <div style={{ padding: `${SPACE.md}px ${SPACE.lg}px`, background: C.surface, borderBottom: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: SPACE.sm }}>
                  {[
                    ["Scans", scanStats.total],
                    ["With photos", scanStats.withPhoto],
                    ["With batch no.", scanStats.withBatch],
                    ["Export ready", scanStats.exportReady],
                  ].map(([label, value]) => (
                    <div key={label} style={{ fontSize: 12, color: C.textMid }}>
                      <strong style={{ display: "block", fontSize: 18, color: C.text, lineHeight: 1.1 }}>{value}</strong>
                      {label}
                    </div>
                  ))}
                </div>
              )}

              {!rows.length ? (
                <div style={{ padding: SPACE.lg, color: C.textDim, fontSize: 13 }}>No required documents in this section for the selected market.</div>
              ) : rows.map((req, index) => {
                const ev = evidenceByReq[req.id];
                const conf = readinessStatusConf(req.status);
                const summary = evidenceSummary(ev);
                return (
                  <div key={req.id} style={{ padding: SPACE.lg, borderTop: index ? `1px solid ${C.border}` : "none", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: SPACE.md, alignItems: "center" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", gap: SPACE.sm, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                        <div style={{ fontSize: 14, lineHeight: 1.35, fontWeight: 700, color: C.text }}>{req.requirementName}</div>
                        {req.is_mandatory === false && <Pill tone="neutral" size="sm">Optional</Pill>}
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.55, color: C.textMid, maxWidth: 760 }}>
                        {req.evidence_instructions || req.description || "Add the document, certificate number, or supporting note."}
                      </div>
                      {summary && (
                        <div style={{ fontSize: 12, lineHeight: 1.5, color: C.textDim, marginTop: 6 }}>
                          {summary}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: SPACE.sm, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <Pill tone={conf.tone}>{conf.label}</Pill>
                      {ev?.file_url && <Btn size="sm" variant="ghost" onClick={() => openEvidence(ev)}>Open</Btn>}
                      <Btn size="sm" variant={ev ? "secondary" : "primary"} disabled={saving} onClick={() => setUploadReq(req)}>
                        {ev ? "Edit" : "Add document"}
                      </Btn>
                      {!ev && <Btn size="sm" variant="ghost" disabled={saving} onClick={() => markWorking(req)}>Working on it</Btn>}
                    </div>
                  </div>
                );
              })}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

```

===== FILE: src/styles.css =====
```css
:root {
  font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Roboto", "Helvetica Neue", Arial, sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

html {
  line-height: 1.5;
  text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  font-family: inherit;
  line-height: 1.5;
  letter-spacing: 0;
}

button,
input,
textarea,
select {
  font: inherit;
  letter-spacing: 0;
}

button {
  line-height: 1.2;
}

input,
textarea,
select {
  line-height: 1.35;
}

.buyer-app {
  --buyer-accent: #0057a8;
  --buyer-ink: #06122d;
  --buyer-muted: #667085;
  --buyer-panel: #ffffff;
  --buyer-line: #e3e8f1;
  --buyer-soft: #f6f8fc;
  background: #f6f8fc;
}

.buyer-button,
.buyer-chip,
.buyer-featured-card,
.buyer-product-card,
.buyer-trade-sheet {
  -webkit-tap-highlight-color: transparent;
}

.buyer-sidebar {
  background: #ffffff;
  border-right: 1px solid var(--buyer-line);
}

.buyer-topbar,
.buyer-filter-panel,
.buyer-product-card,
.buyer-surface-card {
  box-shadow: 0 10px 28px rgba(16, 24, 40, 0.05);
}

.buyer-hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background-color: #121826;
  background-size: cover;
  background-position: center;
}

.buyer-enter {
  animation: buyer-enter 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--i, 0) * 24ms);
}

.buyer-skeleton {
  background: linear-gradient(90deg, #f4f7fb 0%, #e9eef6 42%, #f4f7fb 84%);
  background-size: 220% 100%;
  animation: buyer-skeleton 1100ms ease-in-out infinite;
}

@keyframes buyer-enter {
  from {
    opacity: 0;
    transform: translateY(10px);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

@keyframes buyer-skeleton {
  from {
    background-position: 120% 0;
  }
  to {
    background-position: -80% 0;
  }
}

@keyframes buyer-results-focus {
  from {
    opacity: 0.92;
    transform: translateY(4px);
    filter: blur(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

@keyframes buyer-evidence-in {
  from {
    transform: scaleX(0.08);
  }
  to {
    transform: scaleX(var(--buyer-readiness-scale));
  }
}

.buyer-product-card,
.buyer-action-card,
.buyer-chip,
.buyer-button,
.buyer-evidence-fill {
  transition:
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 180ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
    background 180ms cubic-bezier(0.22, 1, 0.36, 1),
    color 180ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 180ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.buyer-button:focus-visible,
.buyer-chip:focus-visible,
.buyer-product-card:focus-visible,
.buyer-topbar input:focus-visible,
.buyer-filter-panel select:focus-visible {
  outline: 2px solid rgba(17, 24, 95, 0.45);
  outline-offset: 2px;
}

.buyer-button:active,
.buyer-chip:active,
.buyer-action-card:active {
  transform: scale(0.98);
}

.buyer-image {
  transition: transform 520ms cubic-bezier(0.22, 1, 0.36, 1);
}

.buyer-results-grid {
  animation: buyer-results-focus 210ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.buyer-evidence-fill {
  transform-origin: left center;
  animation: buyer-evidence-in 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
  will-change: transform;
}

.buyer-mobile-nav {
  isolation: isolate;
}

.buyer-mobile-nav-indicator {
  position: absolute;
  left: 8px;
  top: 8px;
  bottom: 7px;
  width: calc((100% - 37px) / 4);
  border-radius: 999px;
  background: linear-gradient(135deg, #0067c5, #004987);
  box-shadow: 0 12px 26px rgba(0, 87, 168, 0.28);
  transition:
    transform 220ms cubic-bezier(0.32, 0.72, 0, 1),
    box-shadow 220ms cubic-bezier(0.32, 0.72, 0, 1);
  z-index: 0;
  pointer-events: none;
}

.buyer-mobile-nav-item {
  position: relative;
  z-index: 1;
}

.buyer-mobile-nav-item.is-active svg,
.buyer-mobile-nav-item.is-active span {
  transform: translateY(-1px);
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.buyer-app-trade-open main > .buyer-topbar,
.buyer-app-trade-open main > div {
  filter: blur(1px);
  opacity: 0.68;
  transform: translateY(-2px);
  transition:
    opacity 180ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 180ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.buyer-sheet {
  animation: buyer-sheet 320ms cubic-bezier(0.32, 0.72, 0, 1) both;
}

.buyer-trade-overlay {
  animation: buyer-overlay-in 160ms cubic-bezier(0.23, 1, 0.32, 1) both;
}

.buyer-trade-sheet {
  transform-origin: bottom center;
  animation: buyer-trade-sheet-in 230ms cubic-bezier(0.32, 0.72, 0, 1) both;
}

@keyframes buyer-sheet {
  from {
    opacity: 0;
    transform: translateY(18px);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

@keyframes buyer-overlay-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes buyer-trade-sheet-in {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.98);
    filter: blur(3px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@media (max-width: 900px) {
  .buyer-sidebar {
    display: none !important;
  }

  .buyer-topbar {
    padding-top: calc(12px + env(safe-area-inset-top)) !important;
  }
}

@media (hover: hover) and (pointer: fine) {
  .buyer-product-card:hover,
  .buyer-action-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 44px rgba(16, 24, 40, 0.12);
  }

  .buyer-product-card:hover .buyer-image {
    transform: scale(1.035);
  }

}

@media (prefers-reduced-motion: reduce) {
  .buyer-enter,
  .buyer-results-grid,
  .buyer-evidence-fill,
  .buyer-skeleton,
  .buyer-sheet,
  .buyer-trade-overlay,
  .buyer-trade-sheet {
    animation-duration: 0.01ms !important;
    animation-delay: 0ms !important;
    animation-iteration-count: 1 !important;
  }

  .buyer-product-card,
  .buyer-action-card,
  .buyer-chip,
  .buyer-button,
  .buyer-image,
  .buyer-evidence-fill {
    transition-duration: 0.01ms !important;
  }

  .buyer-mobile-nav-indicator,
  .buyer-mobile-nav-item,
  .buyer-mobile-nav-item.is-active svg,
  .buyer-mobile-nav-item.is-active span,
  .buyer-app-trade-open main > .buyer-topbar,
  .buyer-app-trade-open main > div {
    transition-duration: 0.01ms !important;
  }

  .buyer-product-card:hover,
  .buyer-action-card:hover,
  .buyer-product-card:hover .buyer-image,
  .buyer-app-trade-open main > .buyer-topbar,
  .buyer-app-trade-open main > div {
    transform: none !important;
    filter: none !important;
    opacity: 1 !important;
  }
}

```
