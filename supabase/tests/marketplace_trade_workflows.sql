-- Run after the marketplace access migration, as postgres. All fixtures roll back.
begin;

-- Complete trade fixtures; these defaults and all records are rolled back.
alter table public.products alter country_of_origin set default 'India', alter moq set default 1, alter moq_unit set default 'kg', alter packaging set default '["1kg pouch"]'::jsonb, alter shelf_life set default '12 months', alter storage_requirements set default 'Cool and dry';
alter table public.rfqs alter quantity set default 1, alter quantity_unit set default 'kg', alter destination_country set default 'India';
alter table public.trade_quotes alter quantity set default 1, alter quantity_unit set default 'kg', alter unit_price set default 1, alter total_amount set default 1, alter incoterm set default 'FOB', alter validity_ts set default (extract(epoch from now()+interval '30 days')*1000)::bigint;


create temporary table test_actors(label text,id uuid default gen_random_uuid());
insert into test_actors(label) values ('seller_a'),('seller_b'),('buyer_a'),('buyer_b'),('legacy_admin'),('pending'),('suspended'),('platform');
insert into auth.users(id,email) select id,'phase0-'||id||'@example.invalid' from test_actors;
insert into public.profiles(id,auth_user_id,name,email,role,status)
select id::text,id,'Phase 0 test','phase0-'||id||'@example.invalid','admin',
case label when 'pending' then 'pending' when 'suspended' then 'suspended' else 'active' end from test_actors;
insert into public.organizations(id,type,name,verification_status) values
('phase0_sa','seller','Test seller A','verified'),('phase0_sb','seller','Test seller B','unverified'),
('phase0_ba','buyer','Test buyer A','unverified'),('phase0_bb','buyer','Test buyer B','unverified');
insert into epistable_private.marketplace_access(auth_user_id,organization_id,access_role)
select id,case when label in ('seller_a','pending','suspended') then 'phase0_sa' when label='seller_b' then 'phase0_sb' when label='buyer_a' then 'phase0_ba' when label='buyer_b' then 'phase0_bb' end,
case when label='platform' then 'platform_admin' when label like 'buyer%' then 'buyer_admin' else 'seller_admin' end
from test_actors where label<>'legacy_admin';
insert into public.products(id,seller_org_id,name,category,status,verification_status) values
('phase0_pa','phase0_sa','Verified','Spices','active','verified'),
('phase0_draft','phase0_sa','Draft','Spices','draft','unverified'),
('phase0_pb','phase0_sb','Other seller','Spices','active','verified');
insert into public.trade_documents(id,organization_id,product_id,document_type,title,visibility,verification_status,expires_at) values
('phase0_doc','phase0_sa','phase0_pa','coa','Verified','buyers','verified',null),
('phase0_private','phase0_sa','phase0_pa','coa','Private','private','verified',null),
('phase0_expired','phase0_sa','phase0_pa','coa','Expired','buyers','verified',1);
insert into public.rfqs(id,buyer_org_id,seller_org_id,product_id,status) values
('phase0_r','phase0_ba','phase0_sa','phase0_pa','open'),
('phase0_r2','phase0_bb','phase0_sb','phase0_pb','open'),
('phase0_rd','phase0_ba','phase0_sa','phase0_pa','draft'),
('phase0_ro','phase0_ba',null,null,'open');
insert into public.trade_quotes(id,rfq_id,seller_org_id,status) values
('phase0_q','phase0_r','phase0_sa','sent'),('phase0_qd','phase0_r','phase0_sa','draft'),
('phase0_qb','phase0_ro','phase0_sb','sent');

create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; end $$;
create function pg_temp.denied(stmt text) returns boolean language plpgsql as $$
begin execute stmt; return false; exception when insufficient_privilege or check_violation or unique_violation then return true; end $$;
grant select on test_actors to authenticated,anon;


reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='seller_a'),true);
set local role authenticated;
select pg_temp.assert_true(pg_temp.denied($q$insert into public.products(id,seller_org_id,name,category,moq) values('phase0_negative','phase0_sa','Invalid','Spices',-1)$q$),'negative minimum order blocked');
select pg_temp.assert_true(pg_temp.denied($q$update public.products set country_of_origin=null,verification_status='pending',status='draft' where id='phase0_draft'$q$),'incomplete product submission blocked');
update public.products set verification_status='pending',review_note='I verified myself' where id='phase0_draft';
select pg_temp.assert_true((select review_note from public.products where id='phase0_draft') is null,'member cannot forge review reason');
select pg_temp.assert_true((select count(*) from public.marketplace_reviews where target_id='phase0_draft' and decision='pending')=1,'submission history recorded');
select pg_temp.assert_true(pg_temp.denied($q$select public.review_marketplace_record('product','phase0_draft','verified','Self approval')$q$),'seller review RPC denied');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.trade_quotes(id,rfq_id,seller_org_id,status,total_amount) values('phase0_badtotal','phase0_ro','phase0_sa','sent',900)$q$),'incorrect quote total blocked');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.trade_quotes(id,rfq_id,seller_org_id,status,total_amount) values('phase0_nulltotal','phase0_ro','phase0_sa','sent',null)$q$),'missing quote total blocked');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.trade_quotes(id,rfq_id,seller_org_id,status,validity_ts) values('phase0_oldquote','phase0_ro','phase0_sa','sent',1)$q$),'expired quote submission blocked');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.trade_quotes(id,rfq_id,seller_org_id,status) values('phase0_duplicate','phase0_r','phase0_sa','sent')$q$),'duplicate submitted seller quote blocked');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.trade_documents(id,organization_id,document_type,title,file_url) values('phase0_badurl','phase0_sa','coa','Unsafe','javascript:alert(1)')$q$),'unsafe evidence URL blocked');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='buyer_a'),true);
set local role authenticated;
select pg_temp.assert_true(pg_temp.denied($q$insert into public.rfqs(id,buyer_org_id,status,quantity) values('phase0_zero','phase0_ba','open',0)$q$),'zero RFQ quantity blocked');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.rfqs(id,buyer_org_id,status,destination_country) values('phase0_missingdest','phase0_ba','open',null)$q$),'missing destination blocked');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.rfqs(id,buyer_org_id,seller_org_id,product_id,status) values('phase0_hiddenproduct','phase0_ba','phase0_sb','phase0_pb','open')$q$),'buyer cannot target hidden product');
select pg_temp.assert_true((select count(*) from public.marketplace_reviews where target_id='phase0_draft')=0,'buyer cannot read seller review history');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='platform'),true);
set local role authenticated;
select pg_temp.assert_true(pg_temp.denied($q$select public.review_marketplace_record('product','phase0_draft','verified',' ')$q$),'review reason required');
select public.review_marketplace_record('product','phase0_draft','verified','Checked product specification and supporting evidence');
select pg_temp.assert_true((select status='active' and verification_status='verified' from public.products where id='phase0_draft'),'approval publishes product');
select pg_temp.assert_true((select count(*) from public.marketplace_reviews where target_id='phase0_draft' and decision='verified' and reason='Checked product specification and supporting evidence')=1,'approval history persisted');
select pg_temp.assert_true(pg_temp.denied($q$select public.review_marketplace_record('product','phase0_draft','rejected','Stale decision')$q$),'stale review rejected');
select pg_temp.assert_true(pg_temp.denied($q$update public.marketplace_reviews set reason='Tampered' where target_id='phase0_draft'$q$),'review history immutable even for platform client');
select pg_temp.assert_true(pg_temp.denied($q$select public.review_marketplace_record('document','phase0_expired','verified','Expired evidence')$q$),'expired document approval blocked');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='seller_a'),true);
set local role authenticated;
update public.products set name='Edited food',status='draft',verification_status='pending' where id='phase0_draft';
select pg_temp.assert_true((select review_note from public.products where id='phase0_draft') is null,'editing clears old review reason');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='buyer_a'),true);
set local role authenticated;
select pg_temp.assert_true((select count(*) from public.products where id='phase0_draft')=0,'edited product hidden until reviewed again');
reset role;
set local role anon;
select pg_temp.assert_true(pg_temp.denied('select * from public.marketplace_reviews'),'anonymous history denied');
select pg_temp.assert_true(pg_temp.denied($q$select public.review_marketplace_record('product','phase0_draft','verified','Anonymous')$q$),'anonymous review denied');
reset role;
rollback;
