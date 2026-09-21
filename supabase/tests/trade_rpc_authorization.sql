-- Run as postgres against the complete application schema, with stop-on-error.
-- Each case rolls back its writes; the enclosing transaction rolls back fixtures.
-- epistable.tests.observe_failures=on is ONLY for recording the pre-fix red baseline.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
create temporary table actors(label text primary key,id uuid default gen_random_uuid());
insert into actors(label) values ('platform'),('seller_admin'),('seller_member'),('buyer_admin'),('buyer_member'),('other_seller'),('other_buyer'),('unassigned'),('pending'),('suspended'),('removed'),('reassigned'),('downgraded'),('legacy_owner'),('legacy_admin'),('legacy_other'),('legacy_buyer');
insert into auth.users(id,email) select id,'guard-'||id||'@example.invalid' from actors;
insert into public.factories(id,name) values ('guard_fa','Guard factory A'),('guard_fb','Guard factory B');
insert into public.profiles(id,auth_user_id,name,email,role,status,factory_id)
select id::text,id,'Guard fixture','guard-'||id||'@example.invalid',
case when label='legacy_owner' then 'owner' when label='legacy_buyer' then 'buyer' else 'admin' end,
case when label='pending' then 'pending' when label='suspended' then 'suspended' else 'active' end,
case when label='legacy_other' then 'guard_fb' when label in ('legacy_admin','legacy_buyer') then 'guard_fa' end from actors;
insert into public.organizations(id,type,name,country,verification_status) values
('guard_sa','seller','Seller A','India','verified'),('guard_sb','seller','Seller B','India','verified'),('guard_ba','buyer','Buyer A','India','verified'),('guard_bb','buyer','Buyer B','India','verified');
insert into epistable_private.marketplace_access(auth_user_id,organization_id,access_role)
select id,case when label='platform' then null when label in ('buyer_admin','buyer_member') then 'guard_ba' when label='other_buyer' then 'guard_bb' when label='other_seller' then 'guard_sb' else 'guard_sa' end,
case when label='platform' then 'platform_admin' when label='other_buyer' then 'buyer_admin' when label='buyer_member' then 'buyer_member' when label='buyer_admin' then 'buyer_admin' when label='seller_member' then 'seller_member' else 'seller_admin' end
from actors where label in ('platform','seller_admin','seller_member','buyer_admin','buyer_member','other_seller','other_buyer','pending','suspended','removed','reassigned','downgraded');
-- Real lifecycle changes while the user retains the same known target ID.
delete from epistable_private.marketplace_access where auth_user_id=(select id from actors where label='removed');
update epistable_private.marketplace_access set organization_id='guard_sb' where auth_user_id=(select id from actors where label='reassigned');
update epistable_private.marketplace_access set access_role='seller_member' where auth_user_id=(select id from actors where label='downgraded');
insert into public.rfqs(id,buyer_org_id,seller_org_id,quantity,quantity_unit,destination_country,status)
values('guard_r','guard_ba','guard_sa',1,'kg','India','open');
insert into public.trade_quotes(id,rfq_id,seller_org_id,currency,unit_price,quantity,quantity_unit,total_amount,incoterm,validity_ts,status)
values('guard_q','guard_r','guard_sa','USD',100,1,'kg',100,'FOB',(extract(epoch from now()+interval '1 day')*1000)::bigint,'sent');
insert into public.trade_orders(id,rfq_id,quote_id,buyer_org_id,seller_org_id,currency,total_amount,quantity,quantity_unit,status,updated_at)
values('guard_order','guard_r','guard_q','guard_ba','guard_sa','USD',100,1,'kg','confirmed',1);
insert into public.quotes(id,factory_id,buyer_email,status,created_at,validity_ts)
values('guard_legacy','guard_fa',(select 'guard-'||id||'@example.invalid' from actors where label='legacy_buyer'),'accepted',1,null),
('guard_sent','guard_fa',(select 'guard-'||id||'@example.invalid' from actors where label='legacy_buyer'),'sent',1,null);
create temporary table cases(label text,actor text,command text,expected_state text,expected_message text,event_delta int default 0,verify_sql text default 'select true');
create function pg_temp.snapshot() returns jsonb language sql as $$
select jsonb_build_object(
'orders',(select jsonb_agg(to_jsonb(o) order by id) from public.trade_orders o where id='guard_order'),
'events',(select jsonb_agg(to_jsonb(e) order by id) from public.trade_order_events e where order_id='guard_order'),
'quotes',(select jsonb_agg(to_jsonb(q) order by id) from public.quotes q where id like 'guard_%'),
'notifications',(select jsonb_agg(to_jsonb(n) order by id) from public.notifications n where user_id in(select id::text from actors)))
$$;
insert into cases values('status allows seller_admin','seller_admin','select public.update_trade_order_status(''guard_order'',''production'',''test note'')',null,null,1,'select status=''production'' and status_note=''test note'' from public.trade_orders where id=''guard_order''');
insert into cases values('status allows seller_member','seller_member','select public.update_trade_order_status(''guard_order'',''production'',''test note'')',null,null,1,'select status=''production'' and status_note=''test note'' from public.trade_orders where id=''guard_order''');
insert into cases values('status allows downgraded','downgraded','select public.update_trade_order_status(''guard_order'',''production'',''test note'')',null,null,1,'select status=''production'' and status_note=''test note'' from public.trade_orders where id=''guard_order''');
insert into cases values('status allows platform','platform','select public.update_trade_order_status(''guard_order'',''production'',''test note'')',null,null,1,'select status=''production'' and status_note=''test note'' from public.trade_orders where id=''guard_order''');
insert into cases values('status denies unassigned','unassigned','select public.update_trade_order_status(''guard_order'',''production'',''test note'')','42501','Marketplace context required',0,'select true');
insert into cases values('status denies pending','pending','select public.update_trade_order_status(''guard_order'',''production'',''test note'')','42501','Marketplace context required',0,'select true');
insert into cases values('status denies suspended','suspended','select public.update_trade_order_status(''guard_order'',''production'',''test note'')','42501','Marketplace context required',0,'select true');
insert into cases values('status denies removed','removed','select public.update_trade_order_status(''guard_order'',''production'',''test note'')','42501','Marketplace context required',0,'select true');
insert into cases values('status denies other_seller','other_seller','select public.update_trade_order_status(''guard_order'',''production'',''test note'')','42501','Seller or platform administrator access required',0,'select true');
insert into cases values('status denies other_buyer','other_buyer','select public.update_trade_order_status(''guard_order'',''production'',''test note'')','42501','Seller or platform administrator access required',0,'select true');
insert into cases values('status denies reassigned','reassigned','select public.update_trade_order_status(''guard_order'',''production'',''test note'')','42501','Seller or platform administrator access required',0,'select true');
insert into cases values('status denies anon','anon','select public.update_trade_order_status(''guard_order'',''production'',''test note'')','42501','permission denied for function',0,'select true');
insert into cases values('po allows buyer_admin','buyer_admin','select public.record_trade_order_purchase_order(''guard_order'',''PO-1'',1,100,30,''Net 30'')',null,null,1,'select purchase_order_number=''PO-1'' and payment_terms_days=30 from public.trade_orders where id=''guard_order''');
insert into cases values('po allows platform','platform','select public.record_trade_order_purchase_order(''guard_order'',''PO-1'',1,100,30,''Net 30'')',null,null,1,'select purchase_order_number=''PO-1'' and payment_terms_days=30 from public.trade_orders where id=''guard_order''');
insert into cases values('po denies unassigned','unassigned','select public.record_trade_order_purchase_order(''guard_order'',''PO-1'',1,100,30,''Net 30'')','42501','Marketplace context required',0,'select true');
insert into cases values('po denies pending','pending','select public.record_trade_order_purchase_order(''guard_order'',''PO-1'',1,100,30,''Net 30'')','42501','Marketplace context required',0,'select true');
insert into cases values('po denies suspended','suspended','select public.record_trade_order_purchase_order(''guard_order'',''PO-1'',1,100,30,''Net 30'')','42501','Marketplace context required',0,'select true');
insert into cases values('po denies removed','removed','select public.record_trade_order_purchase_order(''guard_order'',''PO-1'',1,100,30,''Net 30'')','42501','Marketplace context required',0,'select true');
insert into cases values('po denies other_seller','other_seller','select public.record_trade_order_purchase_order(''guard_order'',''PO-1'',1,100,30,''Net 30'')','42501','Buyer administrator or platform administrator access required',0,'select true');
insert into cases values('po denies other_buyer','other_buyer','select public.record_trade_order_purchase_order(''guard_order'',''PO-1'',1,100,30,''Net 30'')','42501','Buyer administrator or platform administrator access required',0,'select true');
insert into cases values('po denies reassigned','reassigned','select public.record_trade_order_purchase_order(''guard_order'',''PO-1'',1,100,30,''Net 30'')','42501','Buyer administrator or platform administrator access required',0,'select true');
insert into cases values('po denies anon','anon','select public.record_trade_order_purchase_order(''guard_order'',''PO-1'',1,100,30,''Net 30'')','42501','permission denied for function',0,'select true');
insert into cases values('invoice allows seller_admin','seller_admin','select public.record_trade_order_invoice(''guard_order'',''INV-1'',100,1,2)',null,null,1,'select invoice_number=''INV-1'' and invoice_amount=100 from public.trade_orders where id=''guard_order''');
insert into cases values('invoice allows platform','platform','select public.record_trade_order_invoice(''guard_order'',''INV-1'',100,1,2)',null,null,1,'select invoice_number=''INV-1'' and invoice_amount=100 from public.trade_orders where id=''guard_order''');
insert into cases values('invoice denies unassigned','unassigned','select public.record_trade_order_invoice(''guard_order'',''INV-1'',100,1,2)','42501','Marketplace context required',0,'select true');
insert into cases values('invoice denies pending','pending','select public.record_trade_order_invoice(''guard_order'',''INV-1'',100,1,2)','42501','Marketplace context required',0,'select true');
insert into cases values('invoice denies suspended','suspended','select public.record_trade_order_invoice(''guard_order'',''INV-1'',100,1,2)','42501','Marketplace context required',0,'select true');
insert into cases values('invoice denies removed','removed','select public.record_trade_order_invoice(''guard_order'',''INV-1'',100,1,2)','42501','Marketplace context required',0,'select true');
insert into cases values('invoice denies other_seller','other_seller','select public.record_trade_order_invoice(''guard_order'',''INV-1'',100,1,2)','42501','Seller administrator or platform administrator access required',0,'select true');
insert into cases values('invoice denies other_buyer','other_buyer','select public.record_trade_order_invoice(''guard_order'',''INV-1'',100,1,2)','42501','Seller administrator or platform administrator access required',0,'select true');
insert into cases values('invoice denies reassigned','reassigned','select public.record_trade_order_invoice(''guard_order'',''INV-1'',100,1,2)','42501','Seller administrator or platform administrator access required',0,'select true');
insert into cases values('invoice denies anon','anon','select public.record_trade_order_invoice(''guard_order'',''INV-1'',100,1,2)','42501','permission denied for function',0,'select true');
insert into cases values('payment allows platform','platform','select public.record_trade_order_payment(''guard_order'',''paid'',100,2,''{}'')',null,null,1,'select payment_status=''paid'' and amount_paid=100 from public.trade_orders where id=''guard_order''');
insert into cases values('payment denies unassigned','unassigned','select public.record_trade_order_payment(''guard_order'',''paid'',100,2,''{}'')','42501','Marketplace context required',0,'select true');
insert into cases values('payment denies pending','pending','select public.record_trade_order_payment(''guard_order'',''paid'',100,2,''{}'')','42501','Marketplace context required',0,'select true');
insert into cases values('payment denies suspended','suspended','select public.record_trade_order_payment(''guard_order'',''paid'',100,2,''{}'')','42501','Marketplace context required',0,'select true');
insert into cases values('payment denies removed','removed','select public.record_trade_order_payment(''guard_order'',''paid'',100,2,''{}'')','42501','Marketplace context required',0,'select true');
insert into cases values('payment denies other_seller','other_seller','select public.record_trade_order_payment(''guard_order'',''paid'',100,2,''{}'')','42501','Platform administrator access required',0,'select true');
insert into cases values('payment denies other_buyer','other_buyer','select public.record_trade_order_payment(''guard_order'',''paid'',100,2,''{}'')','42501','Platform administrator access required',0,'select true');
insert into cases values('payment denies reassigned','reassigned','select public.record_trade_order_payment(''guard_order'',''paid'',100,2,''{}'')','42501','Platform administrator access required',0,'select true');
insert into cases values('payment denies anon','anon','select public.record_trade_order_payment(''guard_order'',''paid'',100,2,''{}'')','42501','permission denied for function',0,'select true');
insert into cases values('status insufficient role buyer_admin','buyer_admin','select public.update_trade_order_status(''guard_order'',''production'',''test note'')','42501','Seller or platform administrator access required',0,'select true');
insert into cases values('po insufficient role buyer_member','buyer_member','select public.record_trade_order_purchase_order(''guard_order'',''PO-1'',1,100,30,''Net 30'')','42501','Buyer administrator or platform administrator access required',0,'select true');
insert into cases values('invoice insufficient role seller_member','seller_member','select public.record_trade_order_invoice(''guard_order'',''INV-1'',100,1,2)','42501','Seller administrator or platform administrator access required',0,'select true');
insert into cases values('invoice insufficient role downgraded','downgraded','select public.record_trade_order_invoice(''guard_order'',''INV-1'',100,1,2)','42501','Seller administrator or platform administrator access required',0,'select true');
insert into cases values('payment insufficient role seller_admin','seller_admin','select public.record_trade_order_payment(''guard_order'',''paid'',100,2,''{}'')','42501','Platform administrator access required',0,'select true');
insert into cases values('payment insufficient role buyer_admin','buyer_admin','select public.record_trade_order_payment(''guard_order'',''paid'',100,2,''{}'')','42501','Platform administrator access required',0,'select true');
insert into cases values('same status updates note without transition event','seller_member','select public.update_trade_order_status(''guard_order'',''confirmed'',''new note'')',null,null,0,'select status=''confirmed'' and status_note=''new note'' and updated_at>1 from public.trade_orders where id=''guard_order''');
insert into cases values('closed order rejects removed user','removed','select public.update_trade_order_status(''guard_order'',''production'',''test note'')','42501','Marketplace context required',0,'select true');
insert into cases values('legacy fulfillment rejects anon','anon','select public.update_quote_fulfillment(''guard_legacy'',''payment_received'')','42501','permission denied for function',0,'select true');
insert into cases values('legacy fulfillment rejects unassigned','unassigned','select public.update_quote_fulfillment(''guard_legacy'',''payment_received'')','42501','Not allowed',0,'select true');
insert into cases values('legacy fulfillment rejects pending','pending','select public.update_quote_fulfillment(''guard_legacy'',''payment_received'')','42501','Active authenticated profile required',0,'select true');
insert into cases values('legacy fulfillment rejects suspended','suspended','select public.update_quote_fulfillment(''guard_legacy'',''payment_received'')','42501','Active authenticated profile required',0,'select true');
insert into cases values('legacy fulfillment rejects other factory','legacy_other','select public.update_quote_fulfillment(''guard_legacy'',''payment_received'')','42501','Not allowed',0,'select true');
insert into cases values('legacy fulfillment permits legacy_owner','legacy_owner','select public.update_quote_fulfillment(''guard_legacy'',''payment_received'')',null,null,0,'select fulfillment_status=''payment_received'' from public.quotes where id=''guard_legacy''');
insert into cases values('legacy fulfillment permits legacy_admin','legacy_admin','select public.update_quote_fulfillment(''guard_legacy'',''payment_received'')',null,null,0,'select fulfillment_status=''payment_received'' from public.quotes where id=''guard_legacy''');
insert into cases values('buyer notification rejects anon','anon','select public.notify_buyer_revised_quote(''guard_legacy'')','42501','permission denied for function',0,'select true');
insert into cases values('buyer notification rejects unassigned','unassigned','select public.notify_buyer_revised_quote(''guard_legacy'')','42501','Not allowed',0,'select true');
insert into cases values('buyer notification rejects pending','pending','select public.notify_buyer_revised_quote(''guard_legacy'')','42501','Active authenticated profile required',0,'select true');
insert into cases values('buyer notification rejects suspended','suspended','select public.notify_buyer_revised_quote(''guard_legacy'')','42501','Active authenticated profile required',0,'select true');
insert into cases values('buyer notification rejects other factory','legacy_other','select public.notify_buyer_revised_quote(''guard_legacy'')','42501','Not allowed',0,'select true');
insert into cases values('buyer notification permits legacy_owner','legacy_owner','select public.notify_buyer_revised_quote(''guard_legacy'')',null,null,0,'select count(*)=1 from public.notifications where user_id=(select id::text from actors where label=''legacy_buyer'')');
insert into cases values('buyer notification permits legacy_admin','legacy_admin','select public.notify_buyer_revised_quote(''guard_legacy'')',null,null,0,'select count(*)=1 from public.notifications where user_id=(select id::text from actors where label=''legacy_buyer'')');
insert into cases values('factory helper denies direct anon','anon','select public.notify_factory_quote_decision(''guard_legacy'',''accepted'',null)','42501','permission denied for function',0,'select true');
insert into cases values('factory helper denies direct seller_admin','seller_admin','select public.notify_factory_quote_decision(''guard_legacy'',''accepted'',null)','42501','permission denied for function',0,'select true');
insert into cases values('factory helper denies direct legacy_admin','legacy_admin','select public.notify_factory_quote_decision(''guard_legacy'',''accepted'',null)','42501','permission denied for function',0,'select true');
insert into cases values('factory helper denies direct legacy_owner','legacy_owner','select public.notify_factory_quote_decision(''guard_legacy'',''accepted'',null)','42501','permission denied for function',0,'select true');
insert into cases values('factory helper denies direct platform','platform','select public.notify_factory_quote_decision(''guard_legacy'',''accepted'',null)','42501','permission denied for function',0,'select true');
insert into cases values('anonymous decision still invokes internal helper','anon','select * from public.respond_to_quote(''guard_sent'',''accepted'',''agreed'')',null,null,0,'select (select status=''accepted'' and buyer_message=''agreed'' from public.quotes where id=''guard_sent'') and (select count(*)=1 from public.notifications where user_id=(select id::text from actors where label=''legacy_admin''))');
insert into cases values('oversized note rolls back decision and notification','anon','select * from public.respond_to_quote(''guard_sent'',''accepted'',repeat(''x'',4001))','23514','Buyer note is too long',0,'select true');
insert into cases values('helper rejects invalid decision','postgres','select public.notify_factory_quote_decision(''guard_legacy'',''fake'',null)','23514','Invalid quote decision',0,'select true');
insert into cases values('helper rejects mismatched persisted state','postgres','select public.notify_factory_quote_decision(''guard_sent'',''accepted'',null)','23514','Notification must match persisted quote decision',0,'select true');
insert into cases values('helper rejects mismatched persisted note','postgres','select public.notify_factory_quote_decision(''guard_legacy'',''accepted'',''invented note'')','23514','Notification must match persisted quote decision',0,'select true');

insert into cases values ('malformed empty status','seller_admin','select public.update_trade_order_status(''guard_order'',''production'',''test note'')','42501','Seller or platform administrator access required',0,'select true');
insert into cases values ('malformed empty po','seller_admin','select public.record_trade_order_purchase_order(''guard_order'',''PO-1'',1,100,30,''Net 30'')','42501','Buyer administrator or platform administrator access required',0,'select true');
insert into cases values ('malformed empty invoice','seller_admin','select public.record_trade_order_invoice(''guard_order'',''INV-1'',100,1,2)','42501','Seller administrator or platform administrator access required',0,'select true');
insert into cases values ('malformed empty payment','seller_admin','select public.record_trade_order_payment(''guard_order'',''paid'',100,2,''{}'')','42501','Platform administrator access required',0,'select true');
insert into cases values ('malformed null_role status','seller_admin','select public.update_trade_order_status(''guard_order'',''production'',''test note'')','42501','Seller or platform administrator access required',0,'select true');
insert into cases values ('malformed null_role po','seller_admin','select public.record_trade_order_purchase_order(''guard_order'',''PO-1'',1,100,30,''Net 30'')','42501','Buyer administrator or platform administrator access required',0,'select true');
insert into cases values ('malformed null_role invoice','seller_admin','select public.record_trade_order_invoice(''guard_order'',''INV-1'',100,1,2)','42501','Seller administrator or platform administrator access required',0,'select true');
insert into cases values ('malformed null_role payment','seller_admin','select public.record_trade_order_payment(''guard_order'',''paid'',100,2,''{}'')','42501','Platform administrator access required',0,'select true');
insert into cases values ('malformed missing_org status','seller_admin','select public.update_trade_order_status(''guard_order'',''production'',''test note'')','42501','Seller or platform administrator access required',0,'select true');
insert into cases values ('malformed missing_org po','seller_admin','select public.record_trade_order_purchase_order(''guard_order'',''PO-1'',1,100,30,''Net 30'')','42501','Buyer administrator or platform administrator access required',0,'select true');
insert into cases values ('malformed missing_org invoice','seller_admin','select public.record_trade_order_invoice(''guard_order'',''INV-1'',100,1,2)','42501','Seller administrator or platform administrator access required',0,'select true');
insert into cases values ('malformed missing_org payment','seller_admin','select public.record_trade_order_payment(''guard_order'',''paid'',100,2,''{}'')','42501','Platform administrator access required',0,'select true');

create function pg_temp.run_cases() returns table(label text,passed boolean,detail text) language plpgsql as $$
declare c record; before_state jsonb; after_state jsonb; err text; msg text; before_events int; after_events int; verified boolean;
begin
 for c in select * from cases loop
  label:=c.label; passed:=false; detail:=null;
  begin
   if c.label='closed order rejects removed user' then update public.trade_orders set status='completed' where id='guard_order'; end if;
   -- Synthetic malformed-context variants exercise predicate totality, not only
   -- today's NULL-returning helper. Replacement is undone by the case savepoint.
   if c.label like 'malformed %' then
    execute format('create or replace function epistable_private.context() returns jsonb language sql stable security definer set search_path='''' as %L',
     'select '||quote_literal(case when c.label like 'malformed empty %' then '{}' when c.label like 'malformed null_role %' then '{"role":null,"org":"guard_sa"}' else '{"role":"seller_admin"}' end)||'::jsonb');
   end if;
   before_state:=pg_temp.snapshot();
   select count(*) into before_events from public.trade_order_events where order_id='guard_order';
   perform set_config('request.jwt.claim.sub',coalesce((select id::text from actors where actors.label=c.actor),''),true);
   perform set_config('request.jwt.claims','{}',true);
   err:=null; msg:=null;
   begin
    if c.actor='anon' then set local role anon;
    elsif c.actor<>'postgres' then set local role authenticated; end if;
    execute c.command;
   exception when others then get stacked diagnostics err=returned_sqlstate,msg=message_text;
   end;
   reset role;
   after_state:=pg_temp.snapshot();
   select count(*) into after_events from public.trade_order_events where order_id='guard_order';
   if c.expected_state is not null then
    passed:=err is not distinct from c.expected_state and position(c.expected_message in coalesce(msg,''))>0 and before_state=after_state;
   else
    execute c.verify_sql into verified;
    passed:=err is null and after_events-before_events=c.event_delta and verified is true;
   end if;
   detail:=case when passed then 'ok' else format('expected %s/%s; got %s/%s; events delta=%s; unchanged=%s',c.expected_state,c.expected_message,err,msg,after_events-before_events,before_state=after_state) end;
   -- Roll back successful AND unsuccessful case side effects before the next case.
   raise exception using errcode='Z0001',message='case rollback';
  exception when sqlstate 'Z0001' then null;
  end;
  return next;
 end loop;
end $$;
create temporary table results as select * from pg_temp.run_cases();
do $$ declare failures text; begin
 select string_agg(label||': '||detail,E'\n') into failures from results where not passed;
 if failures is not null and current_setting('epistable.tests.observe_failures',true) is distinct from 'on' then
  raise exception 'Authorization regression failures: %',failures;
 end if;
end $$;
select count(*) as total,count(*) filter(where passed) as passed,
 coalesce(jsonb_agg(jsonb_build_object('case',label,'detail',detail)) filter(where not passed),'[]') as failures from results;
rollback;
