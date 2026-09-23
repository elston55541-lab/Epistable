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
it('protected evidence is file-only and does not expose an external URL field',async()=>{
  const save=vi.fn();render(<DocumentForm products={[]} onSave={save} onCancel={()=>{}}/>);const user=userEvent.setup();
  expect(screen.queryByLabelText('External evidence source (optional)')).toBeNull();
  await user.type(screen.getByLabelText('Document title *'),'Food safety certificate');
  await user.click(screen.getByRole('button',{name:'Submit evidence for verification'}));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','Upload a certificate or evidence file.');
  expect(save).not.toHaveBeenCalled();
});
it('admin review requires a reason and records the selected target',async()=>{
  const api={review:vi.fn()},saved=vi.fn();render(<Verification data={{organizations:[],documents:[],reviews:[],products:[{id:'p1',name:'Sauce',verification_status:'pending'}]}} api={api} onSaved={saved}/>);const user=userEvent.setup();await user.click(screen.getByRole('button',{name:'Review'}));await user.click(screen.getByRole('button',{name:'Save decision'}));expect(api.review).not.toHaveBeenCalled();await user.type(screen.getByLabelText('Review reason *'),'Checked specification');await user.click(screen.getByRole('button',{name:'Save decision'}));await waitFor(()=>expect(api.review).toHaveBeenCalledWith('product','p1','verified','Checked specification',null));
});
it('document review requires preview and submits the bound receipt',async()=>{
  const open=vi.spyOn(window,'open').mockImplementation(()=>null);
  const api={
    downloadEvidence:vi.fn().mockResolvedValue(undefined),
    prepareDocumentReview:vi.fn().mockResolvedValue({receipt_id:'receipt-1',document_version:3}),
    review:vi.fn().mockResolvedValue(undefined)
  },saved=vi.fn();
  render(<Verification data={{organizations:[],products:[],reviews:[],documents:[{id:'d1',title:'COA',verification_status:'pending',storage_path:'seller/d1/file.pdf'}]}} api={api} onSaved={saved}/>);
  const user=userEvent.setup();
  await user.click(screen.getByRole('button',{name:'Review'}));
  expect(screen.getByRole('button',{name:'Save decision'}).disabled).toBe(true);
  await user.click(screen.getByRole('button',{name:'Open evidence file'}));
  await waitFor(()=>expect(api.prepareDocumentReview).toHaveBeenCalledWith('d1'));
  expect(screen.getByRole('button',{name:'Save decision'}).disabled).toBe(false);
  await user.type(screen.getByLabelText('Review reason *'),'Reviewed exact bytes');
  await user.click(screen.getByRole('button',{name:'Save decision'}));
  await waitFor(()=>expect(api.review).toHaveBeenCalledWith('document','d1','verified','Reviewed exact bytes','receipt-1'));
  open.mockRestore();
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
