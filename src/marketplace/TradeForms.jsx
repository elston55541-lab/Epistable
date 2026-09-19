import { useEffect, useState } from 'react';
import { FOOD_CATEGORIES, FOOD_CERTIFICATIONS, TRADE_DOCUMENT_TYPES, productRequiresReview } from '../lib/marketplace';
import { Button, Field, Notice } from './ui';
import { days, futureDate, INCOTERMS, list, positive, quoteTotal, UNITS } from './validation';

function useForm(initial) {
  const [values,setValues]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const change=key=>e=>setValues(v=>({...v,[key]:e.target.value}));
  const run=action=>async e=>{e.preventDefault();setBusy(true);setError('');try{await action(e);}catch(err){setError(err.message||'Could not save. Please try again.');}finally{setBusy(false);}};
  return {values,change,busy,error,run};
}
function Actions({busy,onCancel,draft,label}) {
  return <div className="mp-actions">{draft&&<Button type="submit" name="intent" value="draft" formNoValidate variant="secondary">Save draft</Button>}<Button type="submit" name="intent" value="submit">{busy?'Saving…':label}</Button><Button variant="secondary" onClick={onCancel}>Cancel</Button></div>;
}

const productBlank={name:'',category:FOOD_CATEGORIES[0],description:'',ingredients:'',country_of_origin:'',moq:'',moq_unit:'kg',capacity:'',capacity_unit:'kg',packaging:'',shelf_life:'',storage_requirements:'',lead_time_days:'',export_markets:'',certifications:'',allergens:'',dietary_attributes:''};
const arrayFields=['packaging','export_markets','certifications','allergens','dietary_attributes'];
export function ProductForm({initial,onSave,onCancel}) {
  const start={...productBlank,...initial};for(const key of arrayFields)if(Array.isArray(start[key]))start[key]=start[key].join(', ');
  const {values:v,change,busy,error,run}=useForm(start);
  const originalImages=Array.isArray(initial?.image_urls)?initial.image_urls:[];
  const [existingImages,setExistingImages]=useState(originalImages);
  const [newImages,setNewImages]=useState([]);
  const [imageError,setImageError]=useState('');
  useEffect(()=>()=>newImages.forEach(item=>URL.revokeObjectURL(item.preview)),[newImages]);
  const risk=productRequiresReview({...v,certifications:list(v.certifications),dietary_attributes:list(v.dietary_attributes)});
  const totalImages=existingImages.length+newImages.length;

  function addImages(e) {
    const files=[...(e.target.files||[])];setImageError('');
    if(totalImages+files.length>6){setImageError('Add up to 6 product images.');e.target.value='';return;}
    const invalid=files.find(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024);
    if(invalid){setImageError('Use JPG, PNG or WebP images up to 5 MB each.');e.target.value='';return;}
    setNewImages(items=>[...items,...files.map(file=>({file,preview:URL.createObjectURL(file)}))]);e.target.value='';
  }
  function removeNew(index){setNewImages(items=>{URL.revokeObjectURL(items[index].preview);return items.filter((_,i)=>i!==index);});}
  const submit=run(async e=>{
    const publish=e.nativeEvent.submitter?.value!=='draft';
    const data=Object.fromEntries(Object.keys(productBlank).map(k=>[k,String(v[k]??'').trim()]));
    if(!data.name||!data.category)throw new Error('Product name and category are required.');
    for(const key of arrayFields)data[key]=list(v[key]);
    data.moq=v.moq?positive(v.moq,'Minimum order'):null;data.capacity=v.capacity?positive(v.capacity,'Capacity'):null;data.lead_time_days=days(v.lead_time_days);
    if(publish&&(!data.country_of_origin||!data.moq||!data.packaging.length||!data.shelf_life||!data.storage_requirements))throw new Error('Complete origin, minimum order, packaging, shelf life and storage before publishing.');
    if(publish&&totalImages===0)throw new Error('Add at least one product image before publishing.');
    const requiresReview=publish&&productRequiresReview(data);
    await onSave({
      ...data,
      status:publish&&!requiresReview?'active':'draft',
      verification_status:requiresReview?'pending':'unverified',
      risk_status:requiresReview?'review_required':'clear',
      risk_reason:requiresReview?'Health or regulated claim requires manual review before publication':null,
      __existingImages:existingImages,
      __newImages:newImages.map(item=>item.file),
      __removedImages:originalImages.filter(url=>!existingImages.includes(url))
    });
  });
  return <form className="mp-card mp-form" onSubmit={submit}><fieldset disabled={busy}><legend>{initial?'Edit processed-food product':'Create processed-food product'}</legend>
    <Notice>Product details are seller provided. Verified seller status and verified certification documents are shown separately to buyers.</Notice>
    {risk&&<Notice>One or more health or regulated claims need Epistable review before this listing can go live. You can still save a draft and submit it for review.</Notice>}
    <div className="mp-product-images">
      <div className="mp-row"><div><strong>Product images</strong><p>Add up to 6 clear product or packaging images. The first image is used as the cover.</p></div><small>{totalImages}/6 images</small></div>
      <input aria-label="Product images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addImages}/>
      {(existingImages.length>0||newImages.length>0)&&<div className="mp-image-grid">
        {existingImages.map((url,index)=><figure className="mp-image-item" key={url}><img src={url} alt={`${v.name||'Product'} image ${index+1}`}/><figcaption>{index===0?'Cover image':'Product image'} <button type="button" onClick={()=>setExistingImages(images=>images.filter(item=>item!==url))}>Remove</button></figcaption></figure>)}
        {newImages.map((item,index)=><figure className="mp-image-item" key={item.preview}><img src={item.preview} alt={item.file.name}/><figcaption>{existingImages.length===0&&index===0?'Cover image':'New image'} <button type="button" onClick={()=>removeNew(index)}>Remove</button></figcaption></figure>)}
      </div>}
      {imageError&&<Notice error>{imageError}</Notice>}
    </div>
    <div className="mp-form-grid"><Field label="Product name" required maxLength={200} placeholder="e.g. Ground turmeric powder" value={v.name} onChange={change('name')}/><Field label="Processed-food category" options={[...new Set([...FOOD_CATEGORIES,v.category])]} value={v.category} onChange={change('category')}/><Field label="Country of origin" required value={v.country_of_origin} onChange={change('country_of_origin')}/><Field label="Minimum order quantity (MOQ)" type="number" min="0.000001" step="any" required value={v.moq??''} onChange={change('moq')}/><Field label="MOQ unit" options={UNITS} value={v.moq_unit} onChange={change('moq_unit')}/><Field label="Monthly supply capacity" type="number" min="0.000001" step="any" value={v.capacity??''} onChange={change('capacity')}/><Field label="Capacity unit" options={UNITS} value={v.capacity_unit} onChange={change('capacity_unit')}/><Field label="Production / dispatch lead time (days)" type="number" min="0" max="3650" step="1" value={v.lead_time_days??''} onChange={change('lead_time_days')}/><Field label="Packaging formats" required hint="Separate formats with commas, e.g. 500 g pouch, 5 kg food-service pack, 25 kg export carton." value={v.packaging} onChange={change('packaging')}/><Field label="Shelf life" required placeholder="e.g. 18 months from manufacture" value={v.shelf_life} onChange={change('shelf_life')}/></div>
    <Field label="Storage requirements" required placeholder="e.g. Store below 25°C in a cool, dry place" value={v.storage_requirements} onChange={change('storage_requirements')}/><Field label="Product description" multiline maxLength={5000} hint="Include format, processing method, grade, intended use and private-label capability where relevant." value={v.description} onChange={change('description')}/><Field label="Ingredients / composition" multiline hint="List ingredients in descending order and note additives or preservatives where applicable." value={v.ingredients} onChange={change('ingredients')}/>
    <div className="mp-form-grid"><Field label="Allergens" hint="Comma-separated. Examples: milk, soy, peanuts, tree nuts, gluten, sesame. Use 'None declared' only when supported." value={v.allergens} onChange={change('allergens')}/><Field label="Dietary / product attributes" hint="Examples: vegan, vegetarian, gluten-free, non-GMO, no added sugar." value={v.dietary_attributes} onChange={change('dietary_attributes')}/><Field label="Food safety & market certifications" hint={'Comma-separated. Claims are seller provided until supporting evidence is verified. Common examples: '+FOOD_CERTIFICATIONS.join(', ')+'.'} value={v.certifications} onChange={change('certifications')}/><Field label="Current / target export markets" hint="Comma-separated countries or regions where the product is already sold or prepared for export." value={v.export_markets} onChange={change('export_markets')}/></div>
    {error&&<Notice error>{error}</Notice>}<Actions busy={busy} onCancel={onCancel} draft label={risk?'Send for review':'Publish product'}/>
  </fieldset></form>;
}
export function RfqForm({product,initial,onSave,onCancel}) {
  const {values:v,change,busy,error,run}=useForm({product_category:product?.category||FOOD_CATEGORIES[0],quantity:'',quantity_unit:product?.moq_unit||'kg',destination_country:'',destination_city:'',requirements:'',...initial,required_by:initial?.required_by?new Date(initial.required_by).toISOString().slice(0,10):''});
  const submit=run(async e=>{
    const open=e.nativeEvent.submitter?.value!=='draft';
    const quantity=v.quantity?positive(v.quantity,'Quantity'):null;
    if(open&&(!quantity||!v.destination_country.trim()))throw new Error('Quantity and destination country are required.');
    await onSave({product_id:product?.id||initial?.product_id||null,seller_org_id:product?.seller_org_id||initial?.seller_org_id||null,product_category:v.product_category,quantity,quantity_unit:v.quantity_unit,destination_country:v.destination_country.trim(),destination_city:v.destination_city.trim(),required_by:v.required_by?futureDate(v.required_by,'Required date'):null,requirements:v.requirements.trim(),status:open?'open':'draft'});
  });
  return <form className="mp-card mp-form" onSubmit={submit}><fieldset disabled={busy}><legend>{product?'Request a quote for '+product.name:'Create a processed-food sourcing RFQ'}</legend><p>{product?'This request goes to the verified supplier for this product.':'Open requests are visible to participating food suppliers. Include enough technical and commercial detail to receive comparable quotes.'}</p><div className="mp-form-grid"><Field label="Processed-food category" options={[...new Set([...FOOD_CATEGORIES,v.product_category])]} value={v.product_category} onChange={change('product_category')}/><Field label="Required quantity" type="number" min="0.000001" step="any" required value={v.quantity??''} onChange={change('quantity')}/><Field label="Quantity unit" options={[...new Set([...UNITS,v.quantity_unit])]} value={v.quantity_unit} onChange={change('quantity_unit')}/><Field label="Destination country" required value={v.destination_country} onChange={change('destination_country')}/><Field label="Destination city / port" value={v.destination_city} onChange={change('destination_city')}/><Field label="Required by" type="date" value={v.required_by} onChange={change('required_by')}/></div><Field label="Product, compliance & commercial requirements" multiline maxLength={5000} hint="Specify formulation or grade, pack size, private label, shelf life, allergen limits, certifications, test reports, labelling, Incoterm and any market-specific requirements." value={v.requirements} onChange={change('requirements')}/>{error&&<Notice error>{error}</Notice>}<Actions busy={busy} onCancel={onCancel} draft label="Send RFQ"/></fieldset></form>;
}
export function QuoteForm({rfq,initial,onSave,onCancel}) {
  const {values:v,change,busy,error,run}=useForm({currency:'USD',unit_price:'',quantity:String(rfq.quantity||''),quantity_unit:rfq.quantity_unit||'kg',incoterm:'FOB',lead_time_days:'',notes:'',...initial,validity_ts:initial?.validity_ts?new Date(initial.validity_ts).toISOString().slice(0,10):''});
  let total='—';try{total=quoteTotal(v.unit_price,v.quantity);}catch{}
  const submit=run(async e=>{
    const sent=e.nativeEvent.submitter?.value!=='draft';
    const price=v.unit_price?positive(v.unit_price,'Unit price'):null,quantity=v.quantity?positive(v.quantity,'Quantity'):null;
    if(sent&&(!price||!quantity||!v.validity_ts))throw new Error('Price, quantity and validity date are required.');
    if(!/^[A-Z]{3}$/.test(v.currency))throw new Error('Enter a three-letter currency code.');
    await onSave({rfq_id:rfq.id,currency:v.currency,unit_price:price,quantity,quantity_unit:v.quantity_unit,total_amount:price&&quantity?quoteTotal(price,quantity):null,incoterm:v.incoterm,lead_time_days:days(v.lead_time_days),validity_ts:v.validity_ts?futureDate(v.validity_ts,'Quote validity'):null,notes:v.notes.trim(),status:sent?'sent':'draft'});
  });
  return <form className="mp-card mp-form" onSubmit={submit}><fieldset disabled={busy}><legend>Supplier quote response</legend><p>{rfq.products?.name||rfq.product_category} · {rfq.quantity} {rfq.quantity_unit} to {rfq.destination_country}</p><div className="mp-form-grid"><Field label="Currency" required maxLength={3} pattern="[A-Z]{3}" value={v.currency} onChange={change('currency')}/><Field label="Unit price" type="number" min="0.000001" step="any" required value={v.unit_price??''} onChange={change('unit_price')}/><Field label="Quoted quantity" type="number" min="0.000001" step="any" required value={v.quantity??''} onChange={change('quantity')}/><Field label="Quoted unit" options={[...new Set([...UNITS,v.quantity_unit])]} value={v.quantity_unit} onChange={change('quantity_unit')}/><Field label="Incoterm" options={INCOTERMS} value={v.incoterm} onChange={change('incoterm')}/><Field label="Production / dispatch lead time (days)" type="number" min="0" max="3650" value={v.lead_time_days??''} onChange={change('lead_time_days')}/><Field label="Valid through" type="date" required value={v.validity_ts} onChange={change('validity_ts')}/></div><p><strong>Total: {v.currency} {total}</strong></p><Field label="Commercial terms & food-trade notes" multiline maxLength={5000} hint="Include named Incoterm place or port, pack format, minimum production run, payment terms, inspection/testing conditions and any certification assumptions." value={v.notes} onChange={change('notes')}/>{error&&<Notice error>{error}</Notice>}<Actions busy={busy} onCancel={onCancel} draft label="Send quote"/></fieldset></form>;
}
export function DocumentForm({products,initial,onSave,onCancel}) {
  const {values:v,change,busy,error,run}=useForm({title:'',document_type:'certificate_of_analysis',product_id:'',issuer:'',reference_number:'',file_url:'',visibility:'private',...initial,issued_at:initial?.issued_at?new Date(initial.issued_at).toISOString().slice(0,10):'',expires_at:initial?.expires_at?new Date(initial.expires_at).toISOString().slice(0,10):''});
  const submit=run(async()=>{
    const url=new URL(v.file_url);if(url.protocol!=='https:')throw new Error('Use an HTTPS evidence source.');
    const issued=v.issued_at?Date.parse(v.issued_at+'T00:00:00Z'):null,expires=v.expires_at?futureDate(v.expires_at,'Document expiry'):null;
    if(issued&&expires&&expires<=issued)throw new Error('Expiry must follow issue date.');
    await onSave({document_type:v.document_type,issuer:v.issuer.trim(),reference_number:v.reference_number.trim(),visibility:v.visibility,title:v.title.trim(),product_id:v.product_id||null,issued_at:issued,expires_at:expires,file_url:url.href,verification_status:'pending'});
  });
  return <form className="mp-card mp-form" onSubmit={submit}><fieldset disabled={busy}><legend>Add certification or trade evidence</legend><p>Upload or link evidence that helps buyers assess food safety, product quality and export readiness.</p><Field label="Document title" required placeholder="e.g. FSSC 22000 Certificate - 2026" value={v.title} onChange={change('title')}/><div className="mp-form-grid"><Field label="Evidence type" options={TRADE_DOCUMENT_TYPES} value={v.document_type} onChange={change('document_type')}/><Field label="Related processed-food product" options={[{value:'',label:'Organisation-level evidence'},...products.map(p=>({value:p.id,label:p.name}))]} value={v.product_id} onChange={change('product_id')}/><Field label="Issuing body / laboratory" value={v.issuer} onChange={change('issuer')}/><Field label="Certificate / report reference" value={v.reference_number} onChange={change('reference_number')}/><Field label="Issue date" type="date" value={v.issued_at} onChange={change('issued_at')}/><Field label="Expiry date" type="date" value={v.expires_at} onChange={change('expires_at')}/></div><Field label="Evidence source URL" required type="url" placeholder="https://…" value={v.file_url} onChange={change('file_url')} hint="Link to the certificate, COA, lab report or specification. Access to the source file is controlled by its host."/><Field label="Buyer visibility" options={[{value:'private',label:'Your organisation and Epistable only'},{value:'buyers',label:'Verified buyers after Epistable verification'},{value:'public',label:'Visible in signed-in buyer discovery after verification'}]} value={v.visibility} onChange={change('visibility')}/>{error&&<Notice error>{error}</Notice>}<Actions busy={busy} onCancel={onCancel} label="Submit evidence for verification"/></fieldset></form>;
}
