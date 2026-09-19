import { supabase } from './supabase';

const data = (r) => { if (r.error) throw r.error; return r.data; };
const id = (prefix) => `${prefix}_${crypto.randomUUID()}`;

export const FOOD_CATEGORIES = [
  'Spices & Seasonings','Snacks','Sauces & Condiments','Ready-to-Eat / Ready-to-Cook',
  'Beverages','Bakery & Confectionery','Frozen & Processed Produce','Food Ingredients','Other Processed Foods'
];

export const FOOD_CERTIFICATIONS = [
  'FSSAI','FSSC 22000','BRCGS Food Safety','ISO 22000','HACCP','IFS Food','SQF',
  'GMP','Organic - NPOP','Organic - USDA','Organic - EU','Halal','Kosher','Non-GMO'
];

const PRODUCT_REVIEW_PATTERN = /(cure|treat|prevent)\s+(cancer|diabetes|disease|infection)|medicinal|therapeutic|miracle\s+cure|guaranteed\s+weight\s+loss|fda\s+approved/i;

export function productRequiresReview(product={}) {
  const text=[product.name,product.description,product.dietary_attributes,product.certifications]
    .flatMap(value=>Array.isArray(value)?value:[value])
    .filter(Boolean).join(' ');
  return PRODUCT_REVIEW_PATTERN.test(text);
}

export const TRADE_DOCUMENT_TYPES = [
  {value:'certificate_of_analysis',label:'Certificate of Analysis (COA)'},
  {value:'food_safety',label:'Food safety certification'},
  {value:'haccp_plan',label:'HACCP plan / certificate'},
  {value:'organic_certificate',label:'Organic certificate'},
  {value:'halal_certificate',label:'Halal certificate'},
  {value:'kosher_certificate',label:'Kosher certificate'},
  {value:'allergen_declaration',label:'Allergen declaration'},
  {value:'lab_report',label:'Laboratory / microbiology report'},
  {value:'product_specification',label:'Product specification sheet'},
  {value:'nutrition_label',label:'Nutrition / label artwork'},
  {value:'health_certificate',label:'Health / sanitary certificate'},
  {value:'origin_certificate',label:'Certificate of origin'},
  {value:'export_license',label:'Export registration / licence'},
  {value:'business_registration',label:'Business registration'},
  {value:'other',label:'Other trade evidence'}
];

export const marketplace = {
  async reviews() { return data(await supabase.from('marketplace_reviews').select('*').order('created_at',{ascending:false}).limit(100)); },
  async review(kind,targetId,decision,reason) {
    return data(await supabase.rpc('review_marketplace_record',{target_kind:kind,target_id:targetId,decision,reason}));
  },
  async context() { return data(await supabase.rpc('marketplace_context')); },
  async accounts() { return data(await supabase.rpc('marketplace_accounts')); },
  async assignAccess(targetUser,targetOrg,targetRole) {
    return data(await supabase.rpc('assign_marketplace_access',{target_user:targetUser,target_org:targetOrg,target_role:targetRole}));
  },
  async updateOrganization(organizationId,updates) {
    return data(await supabase.from('organizations').update(updates).eq('id',organizationId).select().single());
  },
  async organizations(type) {
    let q=supabase.from('organizations').select('*').order('created_at',{ascending:false});
    if(type)q=q.eq('type',type);
    return data(await q);
  },
  async createOrganization(input) {
    return data(await supabase.from('organizations').insert({id:id(input.type==='buyer'?'BUYORG':'SELORG'),...input}).select().single());
  },
  async products(filters={}) {
    let q=supabase.from('products').select('*, organizations!products_seller_org_id_fkey(*)').order('created_at',{ascending:false});
    if(filters.sellerOrgId)q=q.eq('seller_org_id',filters.sellerOrgId);
    if(filters.category)q=q.eq('category',filters.category);
    if(filters.status)q=q.eq('status',filters.status);
    if(filters.verified)q=q.eq('verification_status','verified');
    if(filters.published)q=q.eq('status','active');
    return data(await q);
  },
  async createProduct(input) {
    return data(await supabase.from('products').insert({id:id('PRD'),...input}).select().single());
  },
  async updateProduct(productId,updates) {
    return data(await supabase.from('products').update(updates).eq('id',productId).select().single());
  },
  async uploadProductImages(sellerOrgId,productId,files=[]) {
    const uploaded=[];
    for(const file of files) {
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Use JPG, PNG or WebP product images.');
      if(file.size>5*1024*1024) throw new Error('Each product image must be 5 MB or smaller.');
      const ext=(file.name?.split('.').pop()||file.type.split('/')[1]||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
      const path=`${sellerOrgId}/${productId}/${crypto.randomUUID()}.${ext||'jpg'}`;
      const result=await supabase.storage.from('product-images').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
      if(result.error) throw result.error;
      const publicResult=supabase.storage.from('product-images').getPublicUrl(path);
      uploaded.push(publicResult.data.publicUrl);
    }
    return uploaded;
  },
  async removeProductImages(urls=[]) {
    const marker='/storage/v1/object/public/product-images/';
    const paths=urls.map(url=>{
      const index=String(url).indexOf(marker);
      return index<0?null:decodeURIComponent(String(url).slice(index+marker.length));
    }).filter(Boolean);
    if(!paths.length)return;
    const result=await supabase.storage.from('product-images').remove(paths);
    if(result.error) throw result.error;
  },
  async documents(organizationId,productId=null) {
    let q=supabase.from('trade_documents').select('*').order('created_at',{ascending:false});
    if(organizationId)q=q.eq('organization_id',organizationId);
    if(productId)q=q.eq('product_id',productId);
    return data(await q);
  },
  async addDocument(input) {
    return data(await supabase.from('trade_documents').insert({id:id('DOC'),...input}).select().single());
  },
  async updateDocument(documentId,updates) {
    return data(await supabase.from('trade_documents').update(updates).eq('id',documentId).select().single());
  },
  async rfqs({buyerOrgId,sellerOrgId}={}) {
    let q=supabase.from('rfqs').select('*, products(*)').order('created_at',{ascending:false});
    if(buyerOrgId)q=q.eq('buyer_org_id',buyerOrgId);
    if(sellerOrgId)q=q.eq('seller_org_id',sellerOrgId);
    return data(await q);
  },
  async createRfq(input) {
    return data(await supabase.from('rfqs').insert({id:id('RFQ'),...input}).select().single());
  },
  async updateRfq(rfqId,updates) {
    return data(await supabase.from('rfqs').update(updates).eq('id',rfqId).select().single());
  },
  async quotes(rfqId) {
    let q=supabase.from('trade_quotes').select('*').order('created_at',{ascending:false});
    if(rfqId)q=q.eq('rfq_id',rfqId);
    return data(await q);
  },
  async createQuote(input) {
    return data(await supabase.from('trade_quotes').insert({id:id('TQ'),...input}).select().single());
  },
  async updateQuote(quoteId,updates) {
    return data(await supabase.from('trade_quotes').update(updates).eq('id',quoteId).select().single());
  }
};
