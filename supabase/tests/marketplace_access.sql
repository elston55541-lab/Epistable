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
begin execute stmt; return false; exception when insufficient_privilege or check_violation then return true; end $$;
grant select on test_actors to authenticated,anon;

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='buyer_a'),true);
set local role authenticated;
select pg_temp.assert_true(((select count(*) from public.products where id like 'phase0_%')=1), 'buyer sees only verified active products of verified sellers');
select pg_temp.assert_true(((select count(*) from public.trade_documents where id like 'phase0_%')=1), 'private and expired documents hidden');
select pg_temp.assert_true(((select count(*) from public.rfqs where id like 'phase0_%')=3), 'buyer sees own RFQs');
select pg_temp.assert_true(((select count(*) from public.trade_quotes where id like 'phase0_%')=2), 'buyer sees received quotes but no drafts');
select pg_temp.assert_true((pg_temp.denied($q$insert into public.rfqs(id,buyer_org_id,status) values ('phase0_bad','phase0_bb','open')$q$)), 'cannot forge buyer');
select pg_temp.assert_true((pg_temp.denied($q$insert into public.products(id,seller_org_id,name,category) values ('phase0_badp','phase0_sa','Bad','Spices')$q$)), 'buyer cannot create seller product');
insert into public.rfqs(id,buyer_org_id,seller_org_id,product_id,status) values ('phase0_created','phase0_ba','phase0_sa','phase0_pa','open');
select pg_temp.assert_true(((select count(*) from public.rfqs where id='phase0_created')=1), 'own RFQ insert works');

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='seller_a'),true);
set local role authenticated;
select pg_temp.assert_true(((select count(*) from public.products where id like 'phase0_%')=2), 'seller sees own drafts only');
select pg_temp.assert_true(((select count(*) from public.trade_documents where id like 'phase0_%')=3), 'seller sees own private evidence');
select pg_temp.assert_true(((select count(*) from public.rfqs where id='phase0_r2')=0), 'other targeted RFQ hidden');
select pg_temp.assert_true(((select count(*) from public.rfqs where id='phase0_rd')=0), 'buyer draft hidden');
select pg_temp.assert_true(((select count(*) from public.trade_quotes where id='phase0_qb')=0), 'competitor quote hidden on open RFQ');
select pg_temp.assert_true((pg_temp.denied($q$insert into public.products(id,seller_org_id,name,category,verification_status) values ('phase0_fake','phase0_sa','Fake','Spices','verified')$q$)), 'seller cannot self verify');
select pg_temp.assert_true((pg_temp.denied($q$update public.organizations set verification_status='verified' where id='phase0_sa'$q$)), 'seller cannot approve organization');
select pg_temp.assert_true((pg_temp.denied($q$update public.products set seller_org_id='phase0_sb',status='draft',verification_status='pending' where id='phase0_pa'$q$)), 'seller cannot reassign product');
select pg_temp.assert_true((pg_temp.denied($q$insert into public.trade_quotes(id,rfq_id,seller_org_id,status) values ('phase0_badq','phase0_r2','phase0_sa','sent')$q$)), 'seller cannot quote another seller targeted RFQ');
select pg_temp.assert_true((pg_temp.denied($q$insert into public.trade_quotes(id,rfq_id,seller_org_id,status) values ('phase0_badq','phase0_r','phase0_sa','accepted')$q$)), 'seller cannot forge accepted quote');
insert into public.products(id,seller_org_id,name,category) values ('phase0_newp','phase0_sa','New','Spices');
select pg_temp.assert_true(((select count(*) from public.products where id='phase0_newp')=1), 'own product insert works');
insert into public.trade_quotes(id,rfq_id,seller_org_id,status) values ('phase0_newq','phase0_created','phase0_sa','draft');
update public.trade_quotes set status='sent' where id='phase0_newq';
select pg_temp.assert_true(((select status from public.trade_quotes where id='phase0_newq')='sent'), 'seller can submit draft quote');
update public.trade_quotes set notes='tampered' where id='phase0_newq';
select pg_temp.assert_true(((select notes from public.trade_quotes where id='phase0_newq') is null), 'sent quote immutable for seller');
select pg_temp.assert_true((pg_temp.denied($q$insert into epistable_private.marketplace_access(auth_user_id,access_role) values (auth.uid(),'platform_admin')$q$)), 'membership privilege escalation blocked');

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='legacy_admin'),true);
set local role authenticated;
select pg_temp.assert_true((public.marketplace_context() is null), 'legacy_admin no context');
select pg_temp.assert_true(((select count(*) from public.products where id like 'phase0_%')=0), 'legacy_admin no product access');

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='pending'),true);
set local role authenticated;
select pg_temp.assert_true((public.marketplace_context() is null), 'pending no context');
select pg_temp.assert_true(((select count(*) from public.products where id like 'phase0_%')=0), 'pending no product access');

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='suspended'),true);
set local role authenticated;
select pg_temp.assert_true((public.marketplace_context() is null), 'suspended no context');
select pg_temp.assert_true(((select count(*) from public.products where id like 'phase0_%')=0), 'suspended no product access');

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='buyer_b'),true);
set local role authenticated;
select pg_temp.assert_true(((select count(*) from public.rfqs where id='phase0_r')=0), 'buyer tenant isolation');
select pg_temp.assert_true(((select count(*) from public.trade_quotes where id='phase0_q')=0), 'buyer cannot read other quotes');

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='platform'),true);
set local role authenticated;
select pg_temp.assert_true(((select count(*) from public.products where id like 'phase0_%')=4), 'platform admin sees all products');
update public.products set status='active',verification_status='verified' where id='phase0_newp';
select pg_temp.assert_true(((select verification_status from public.products where id='phase0_newp')='verified'), 'platform admin verifies');
reset role;
set local role anon;
select pg_temp.assert_true((pg_temp.denied('select * from public.products')), 'anonymous table access denied');
select pg_temp.assert_true((pg_temp.denied('select public.marketplace_context()')), 'anonymous context denied');
reset role;


reset role;
update public.profiles set organization_id='phase0_sa',organization_role='platform_admin' where auth_user_id=(select id from test_actors where label='legacy_admin');
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='legacy_admin'),true);
select set_config('request.jwt.claims','{"user_metadata":{"role":"platform_admin","organization_id":"phase0_sa"}}',true);
set local role authenticated;
select pg_temp.assert_true(public.marketplace_context() is null,'profile fields and editable metadata cannot grant marketplace access');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='seller_a'),true);
set local role authenticated;
select pg_temp.assert_true(pg_temp.denied($q$update public.trade_documents set verification_status='verified' where id='phase0_private'$q$),'seller cannot verify evidence');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.trade_documents(id,organization_id,product_id,document_type,title) values ('phase0_crossdoc','phase0_sa','phase0_pb','coa','Invalid')$q$),'cross organization product document link blocked');
update public.products set name='tampered' where id='phase0_pb';
delete from public.products where id='phase0_newp';
select pg_temp.assert_true((select count(*) from public.products where id='phase0_newp')=1,'seller cannot delete evidence');
reset role;
select pg_temp.assert_true((select name from public.products where id='phase0_pb')='Other seller','cross tenant update affects zero rows');
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
set local role authenticated;
select pg_temp.assert_true(public.marketplace_context() is null,'authenticated database role without user identity has no authority');
reset role;

rollback;
