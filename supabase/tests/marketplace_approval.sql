-- Run as postgres on a test database after the approval migration. All fixtures roll back.
begin;
set local lock_timeout='3s';
set local statement_timeout='15s';
create temporary table approval_actors(label text primary key,id uuid default gen_random_uuid());
insert into approval_actors(label) values ('platform'),('seller'),('buyer'),('reject'),('spoof'),('conflict'),('mismatch');
insert into auth.users(id,email,raw_user_meta_data)
select id,'approval-'||id||'@example.invalid',
 case when label='platform' then '{}'::jsonb else jsonb_build_object(
 'marketplace_onboarding',true,'marketplace_type',case when label='buyer' then 'buyer' else 'seller' end,
 'name','Approval test','organization_name','Approval regression '||label,'country','India',
 'role','platform_admin','organization_role','platform_admin') end from approval_actors;
insert into public.profiles(id,auth_user_id,name,email,role,status)
select id::text,id,'Platform test','approval-'||id||'@example.invalid','owner','active' from approval_actors where label='platform';
insert into epistable_private.marketplace_access(auth_user_id,access_role)
select id,'platform_admin' from approval_actors where label in ('platform','conflict');
create temporary table approval_orgs as
 select t.label,a.organization_id as id from approval_actors t join epistable_private.marketplace_applications a on a.auth_user_id=t.id;
grant select on approval_actors,approval_orgs to authenticated,anon;
-- Even privileged edits to public profile presentation fields must not grant authority.
update public.profiles set role='owner',organization_role='platform_admin' where auth_user_id=(select id from approval_actors where label='spoof');
update epistable_private.marketplace_applications set requested_role='buyer_admin' where auth_user_id=(select id from approval_actors where label='mismatch');
create function pg_temp.check_true(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; end $$;
create function pg_temp.expect_denied(stmt text) returns boolean language plpgsql as $$
begin execute stmt; return false; exception when insufficient_privilege or check_violation then return true; end $$;
select set_config('request.jwt.claim.sub',(select id::text from approval_actors where label='spoof'),true);
select set_config('request.jwt.claims','{"user_metadata":{"role":"platform_admin"},"app_metadata":{"role":"platform_admin"}}',true);
set local role authenticated;
select pg_temp.check_true(public.marketplace_context() is null,'profile/JWT cannot grant marketplace access');
select pg_temp.check_true(pg_temp.expect_denied(format('select public.review_marketplace_record(''organization'',%L,''verified'',''test'')',(select id from approval_orgs where label='seller'))),'spoofed admin cannot approve');
select pg_temp.check_true(pg_temp.expect_denied(format('select epistable_private.complete_marketplace_application(%L,''verified'')',(select id from approval_orgs where label='seller'))),'private helper checks authority directly');
select pg_temp.check_true(not has_table_privilege('authenticated','epistable_private.marketplace_access','INSERT'),'private access table stays inaccessible');
select pg_temp.check_true(not has_table_privilege('authenticated','epistable_private.marketplace_applications','UPDATE'),'private applications stay inaccessible');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from approval_actors where label='platform'),true);
set local role authenticated;
select public.review_marketplace_record('organization',id,'verified','Regression approval') from approval_orgs where label in ('seller','buyer');
select public.review_marketplace_record('organization',id,'rejected','Regression rejection') from approval_orgs where label='reject';
select pg_temp.check_true(pg_temp.expect_denied(format('select public.review_marketplace_record(''organization'',%L,''verified'',''test'')',(select id from approval_orgs where label='conflict'))),'existing platform access cannot be overwritten');
select pg_temp.check_true(pg_temp.expect_denied(format('select public.review_marketplace_record(''organization'',%L,''verified'',''test'')',(select id from approval_orgs where label='mismatch'))),'mismatched buyer role on seller organisation denied');
select pg_temp.check_true(pg_temp.expect_denied(format('select public.review_marketplace_record(''organization'',%L,''verified'',''test'')',(select id from approval_orgs where label='seller'))),'repeated approval fails closed');
reset role;
select pg_temp.check_true((select access_role='seller_admin' and organization_id=(select id from approval_orgs where label='seller') from epistable_private.marketplace_access where auth_user_id=(select id from approval_actors where label='seller')),'seller receives only own seller admin');
select pg_temp.check_true((select access_role='buyer_admin' and organization_id=(select id from approval_orgs where label='buyer') from epistable_private.marketplace_access where auth_user_id=(select id from approval_actors where label='buyer')),'buyer receives only own buyer admin');
select pg_temp.check_true((select count(*)=2 from epistable_private.marketplace_applications where status='approved' and auth_user_id in(select id from approval_actors)),'two applications approved atomically');
select pg_temp.check_true(not exists(select 1 from epistable_private.marketplace_access where auth_user_id=(select id from approval_actors where label='reject')),'rejection grants no access');
select pg_temp.check_true((select verification_status='pending' from public.organizations where id=(select id from approval_orgs where label='conflict')),'conflicting approval rolls back organisation change');
select set_config('request.jwt.claim.sub',(select id::text from approval_actors where label='seller'),true);
set local role authenticated;
select pg_temp.check_true((select count(*)=0 from public.organizations where id=(select id from approval_orgs where label='buyer')),'seller cannot read buyer tenant');
update public.organizations set description='forbidden' where id=(select id from approval_orgs where label='buyer');
select pg_temp.check_true(pg_temp.expect_denied(format('select public.review_marketplace_record(''organization'',%L,''verified'',''test'')',(select id from approval_orgs where label='spoof'))),'seller cannot approve another tenant');
reset role;
select pg_temp.check_true((select description is distinct from 'forbidden' from public.organizations where id=(select id from approval_orgs where label='buyer')),'cross tenant update denied');
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
set local role anon;
select pg_temp.check_true(pg_temp.expect_denied('select public.review_marketplace_record(''organization'',''invalid'',''verified'',''test'')'),'anonymous approval denied');
reset role;
select 'approval regression assertions passed; fixtures rolled back' as result;
rollback;
