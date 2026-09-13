import { supabase } from './supabase';

const data = (r) => { if (r.error) throw r.error; return r.data; };
const id = (prefix) => `${prefix}_${crypto.randomUUID()}`;

export const FOOD_CATEGORIES = [
  'Spices & Seasonings','Snacks','Sauces & Condiments','Ready-to-Eat / Ready-to-Cook',
  'Beverages','Bakery & Confectionery','Frozen & Processed Produce','Food Ingredients','Other Processed Foods'
];

export const marketplace = {
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
    return data(await q);
  },
  async createProduct(input) {
    return data(await supabase.from('products').insert({id:id('PRD'),...input}).select().single());
  },
  async updateProduct(productId,updates) {
    return data(await supabase.from('products').update(updates).eq('id',productId).select().single());
  },
  async documents(organizationId,productId=null) {
    let q=supabase.from('trade_documents').select('*').eq('organization_id',organizationId).order('created_at',{ascending:false});
    if(productId)q=q.eq('product_id',productId);
    return data(await q);
  },
  async addDocument(input) {
    return data(await supabase.from('trade_documents').insert({id:id('DOC'),...input}).select().single());
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
    return data(await supabase.from('trade_quotes').select('*').eq('rfq_id',rfqId).order('created_at',{ascending:false}));
  },
  async createQuote(input) {
    return data(await supabase.from('trade_quotes').insert({id:id('TQ'),...input}).select().single());
  },
  async updateQuote(quoteId,updates) {
    return data(await supabase.from('trade_quotes').update(updates).eq('id',quoteId).select().single());
  }
};
