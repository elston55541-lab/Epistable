import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductForm, RfqForm, QuoteForm, DocumentForm } from './TradeForms';
import { quoteTotal, positive } from './validation';
import { Verification } from './Workflows';

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
it('complete processed food submits for review with structured fields',async()=>{
  const save=vi.fn();render(<ProductForm onSave={save} onCancel={()=>{}}/>);const user=userEvent.setup();
  for(const [label,value] of [['Product name *','Chilli sauce'],['Country of origin *','India'],['Minimum order *','100'],['Packaging formats *','500ml bottle, 12 bottle carton'],['Shelf life *','12 months'],['Storage requirements *','Store in a cool dry place']])await user.type(screen.getByLabelText(label),value);
  await user.click(screen.getByRole('button',{name:'Submit for review'}));await waitFor(()=>expect(save).toHaveBeenCalledOnce());expect(save.mock.calls[0][0]).toMatchObject({verification_status:'pending',status:'draft',packaging:['500ml bottle','12 bottle carton'],moq:'100'});
});
it('buyer RFQ preserves the selected product and seller',async()=>{
  const save=vi.fn();render(<RfqForm product={{id:'p1',seller_org_id:'seller1',name:'Sauce',category:'Sauces & Condiments',moq_unit:'carton'}} onSave={save} onCancel={()=>{}}/>);const user=userEvent.setup();
  await user.type(screen.getByLabelText('Quantity *'),'200');await user.type(screen.getByLabelText('Destination country *'),'Brazil');await user.click(screen.getByRole('button',{name:'Send RFQ'}));
  await waitFor(()=>expect(save).toHaveBeenCalledOnce());expect(save.mock.calls[0][0]).toMatchObject({product_id:'p1',seller_org_id:'seller1',quantity:'200',quantity_unit:'carton',destination_country:'Brazil',status:'open'});
});
it('seller sends exact commercial terms and handles a failed send',async()=>{
  const save=vi.fn().mockRejectedValue(new Error('RFQ is no longer open'));render(<QuoteForm rfq={{id:'r1',quantity:100,quantity_unit:'kg',destination_country:'Brazil'}} onSave={save} onCancel={()=>{}}/>);const user=userEvent.setup();
  await user.type(screen.getByLabelText('Unit price *'),'1.005');await user.type(screen.getByLabelText('Valid through *'),'2099-12-01');await user.click(screen.getByRole('button',{name:'Send quote'}));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','RFQ is no longer open');expect(save.mock.calls[0][0]).toMatchObject({total_amount:'100.50',rfq_id:'r1',status:'sent'});expect(screen.getByLabelText('Unit price *').value).toBe('1.005');
});
it('evidence rejects an insecure source without writing',async()=>{
  const save=vi.fn();render(<DocumentForm products={[]} onSave={save} onCancel={()=>{}}/>);const user=userEvent.setup();await user.type(screen.getByLabelText('Document title *'),'Food safety certificate');await user.type(screen.getByLabelText('Evidence source URL *'),'http://example.invalid/doc');await user.click(screen.getByRole('button',{name:'Submit evidence'}));expect(await screen.findByRole('alert')).toHaveProperty('textContent','Use an HTTPS evidence source.');expect(save).not.toHaveBeenCalled();
});
it('admin review requires a reason and records the selected target',async()=>{
  const api={review:vi.fn()},saved=vi.fn();render(<Verification data={{organizations:[],documents:[],reviews:[],products:[{id:'p1',name:'Sauce',verification_status:'pending'}]}} api={api} onSaved={saved}/>);const user=userEvent.setup();await user.click(screen.getByRole('button',{name:'Review'}));await user.click(screen.getByRole('button',{name:'Save decision'}));expect(api.review).not.toHaveBeenCalled();await user.type(screen.getByLabelText('Review reason *'),'Checked specification');await user.click(screen.getByRole('button',{name:'Save decision'}));await waitFor(()=>expect(api.review).toHaveBeenCalledWith('product','p1','verified','Checked specification'));
});
