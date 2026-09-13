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
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='legacy_admin'),true);
set local role authenticated;
select pg_temp.assert_true(pg_temp.denied('select public.marketplace_accounts()'),'legacy admin cannot list accounts');
select pg_temp.assert_true(pg_temp.denied($q$select public.assign_marketplace_access(auth.uid(),'phase0_sa','seller_admin')$q$),'legacy admin cannot self assign');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='seller_a'),true);
set local role authenticated;
select pg_temp.assert_true(pg_temp.denied('select public.marketplace_accounts()'),'seller cannot list accounts');
select pg_temp.assert_true(pg_temp.denied($q$select public.assign_marketplace_access(auth.uid(),'phase0_sb','seller_admin')$q$),'seller cannot move self');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='platform'),true);
set local role authenticated;
select pg_temp.assert_true(jsonb_array_length(public.marketplace_accounts())>=8,'platform can list linked accounts');
select pg_temp.assert_true(pg_temp.denied($q$select public.assign_marketplace_access((select id from test_actors where label='legacy_admin'),'phase0_sa','buyer_admin')$q$),'mismatched org role blocked');
select pg_temp.assert_true(pg_temp.denied($q$select public.assign_marketplace_access((select id from test_actors where label='legacy_admin'),'phase0_sa','platform_admin')$q$),'cannot grant platform role');
select pg_temp.assert_true(pg_temp.denied($q$select public.assign_marketplace_access((select id from test_actors where label='pending'),'phase0_sa','seller_member')$q$),'pending account blocked');
select pg_temp.assert_true(pg_temp.denied($q$select public.assign_marketplace_access(auth.uid(),'phase0_sa','seller_admin')$q$),'platform assignment protected');
select public.assign_marketplace_access((select id from test_actors where label='legacy_admin'),'phase0_sa','seller_member');
reset role;
select pg_temp.assert_true((select role from public.profiles where auth_user_id=(select id from test_actors where label='legacy_admin'))='admin','legacy role unchanged');
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='legacy_admin'),true);
set local role authenticated;
select pg_temp.assert_true(public.marketplace_context()->>'role'='seller_member','assigned member gets context');
select pg_temp.assert_true(pg_temp.denied($q$update public.organizations set name='Tampered',verification_status='pending' where id='phase0_sa'$q$) or (select name from public.organizations where id='phase0_sa')='Test seller A','member cannot edit org');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='platform'),true);
set local role authenticated;
select public.assign_marketplace_access((select id from test_actors where label='legacy_admin'),'phase0_ba','buyer_admin');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='legacy_admin'),true);
set local role authenticated;
select pg_temp.assert_true(public.marketplace_context()->>'org'='phase0_ba','reassignment replaces old org');
select pg_temp.assert_true((select count(*) from public.products where id='phase0_draft')=0,'old seller draft access revoked');
reset role;
set local role anon;
select pg_temp.assert_true(pg_temp.denied('select public.marketplace_accounts()'),'anonymous list denied');
select pg_temp.assert_true(pg_temp.denied($q$select public.assign_marketplace_access(null,null,null)$q$),'anonymous assignment denied');
reset role;
rollback;
