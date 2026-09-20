-- Finance-readiness foundation for future BRICS/emerging-market trade-finance integrations.
-- No marketplace UI changes: current order actions automatically build a transaction history
-- that can later support payment protection, PO/invoice finance and insurance partners.

alter table public.trade_orders
  add column if not exists confirmed_at bigint,
  add column if not exists production_started_at bigint,
  add column if not exists inspection_started_at bigint,
  add column if not exists ready_to_dispatch_at bigint,
  add column if not exists dispatched_at bigint,
  add column if not exists delivered_at bigint,
  add column if not exists completed_at bigint,
  add column if not exists cancelled_at bigint,
  add column if not exists purchase_order_number text,
  add column if not exists purchase_order_issued_at bigint,
  add column if not exists purchase_order_value numeric,
  add column if not exists payment_terms_days integer,
  add column if not exists payment_terms_text text,
  add column if not exists invoice_number text,
  add column if not exists invoice_amount numeric,
  add column if not exists invoice_issued_at bigint,
  add column if not exists invoice_due_at bigint,
  add column if not exists invoice_status text not null default 'not_issued',
  add column if not exists payment_status text not null default 'not_recorded',
  add column if not exists amount_paid numeric not null default 0,
  add column if not exists paid_at bigint,
  add column if not exists finance_metadata jsonb not null default '{}'::jsonb;

update public.trade_orders
set confirmed_at=coalesce(confirmed_at,created_at)
where status<>'cancelled';

alter table public.trade_orders drop constraint if exists trade_orders_purchase_order_value_check;
alter table public.trade_orders add constraint trade_orders_purchase_order_value_check
  check (purchase_order_value is null or purchase_order_value>0);

alter table public.trade_orders drop constraint if exists trade_orders_payment_terms_days_check;
alter table public.trade_orders add constraint trade_orders_payment_terms_days_check
  check (payment_terms_days is null or payment_terms_days between 0 and 3650);

alter table public.trade_orders drop constraint if exists trade_orders_invoice_amount_check;
alter table public.trade_orders add constraint trade_orders_invoice_amount_check
  check (invoice_amount is null or invoice_amount>0);

alter table public.trade_orders drop constraint if exists trade_orders_amount_paid_check;
alter table public.trade_orders add constraint trade_orders_amount_paid_check
  check (amount_paid>=0);

alter table public.trade_orders drop constraint if exists trade_orders_invoice_dates_check;
alter table public.trade_orders add constraint trade_orders_invoice_dates_check
  check (invoice_due_at is null or invoice_issued_at is null or invoice_due_at>=invoice_issued_at);

alter table public.trade_orders drop constraint if exists trade_orders_invoice_status_check;
alter table public.trade_orders add constraint trade_orders_invoice_status_check
  check (invoice_status in ('not_issued','issued','partially_paid','paid','overdue','cancelled','disputed'));

alter table public.trade_orders drop constraint if exists trade_orders_payment_status_check;
alter table public.trade_orders add constraint trade_orders_payment_status_check
  check (payment_status in ('not_recorded','pending','partially_paid','paid','overdue','disputed','refunded'));

create index if not exists trade_orders_po_number_idx
  on public.trade_orders(purchase_order_number)
  where purchase_order_number is not null;

create index if not exists trade_orders_invoice_number_idx
  on public.trade_orders(invoice_number)
  where invoice_number is not null;

create index if not exists trade_orders_invoice_due_idx
  on public.trade_orders(invoice_due_at)
  where invoice_due_at is not null and invoice_status not in ('paid','cancelled');

create table if not exists public.trade_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.trade_orders(id) on delete cascade,
  event_type text not null check (event_type in (
    'order_confirmed','production_started','inspection_started','ready_to_dispatch',
    'dispatched','delivered','completed','cancelled',
    'purchase_order_recorded','invoice_recorded','payment_recorded'
  )),
  actor_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists trade_order_events_order_created_idx
  on public.trade_order_events(order_id,created_at desc);

alter table public.trade_order_events enable row level security;
revoke all on public.trade_order_events from public,anon,authenticated;
grant select on public.trade_order_events to authenticated;

drop policy if exists marketplace_order_event_read on public.trade_order_events;
create policy marketplace_order_event_read on public.trade_order_events
for select to authenticated using (
  (select epistable_private.context()->>'role')='platform_admin'
  or exists (
    select 1
    from public.trade_orders o
    where o.id=trade_order_events.order_id
      and (
        o.buyer_org_id=(select epistable_private.context()->>'org')
        or o.seller_org_id=(select epistable_private.context()->>'org')
      )
  )
);

create or replace function public.decide_trade_quote(target_quote_id text, decision text, message text default null)
returns text language plpgsql security definer set search_path=''
as $$
declare ctx jsonb := epistable_private.context();
declare q public.trade_quotes%rowtype;
declare r public.rfqs%rowtype;
declare new_order_id text;
declare now_ms bigint := ((extract(epoch from now())*1000)::bigint);
begin
 if auth.uid() is null or ctx->>'role' not like 'buyer_%' then
  raise exception 'Buyer access required' using errcode='42501';
 end if;
 if decision not in ('accepted','revision_requested','rejected') then
  raise exception 'Invalid quote decision' using errcode='23514';
 end if;
 if message is not null and length(message)>4000 then
  raise exception 'Decision message is too long' using errcode='23514';
 end if;

 select * into q from public.trade_quotes where id=target_quote_id for update;
 if q.id is null or q.status not in ('sent','revised') then
  raise exception 'This quote is no longer awaiting a buyer decision' using errcode='23514';
 end if;
 select * into r from public.rfqs where id=q.rfq_id for update;
 if r.buyer_org_id is distinct from ctx->>'org' then
  raise exception 'This quote does not belong to your organisation' using errcode='42501';
 end if;
 if q.validity_ts is not null and q.validity_ts<=now_ms then
  raise exception 'This quote has expired' using errcode='23514';
 end if;

 update public.trade_quotes set
  status=decision,
  buyer_message=nullif(trim(message),''),
  buyer_decided_at=now_ms,
  updated_at=now_ms
 where id=q.id;

 if decision='accepted' then
  update public.trade_quotes set status='rejected',updated_at=now_ms
   where rfq_id=q.rfq_id and id<>q.id and status in ('sent','revised','revision_requested');
  update public.rfqs set status='accepted' where id=q.rfq_id;
  new_order_id := 'ORD_'||gen_random_uuid()::text;
  insert into public.trade_orders(
    id,rfq_id,quote_id,buyer_org_id,seller_org_id,product_id,
    currency,total_amount,quantity,quantity_unit,incoterm,status,confirmed_at
  )
  values(
    new_order_id,q.rfq_id,q.id,r.buyer_org_id,q.seller_org_id,r.product_id,
    q.currency,q.total_amount,q.quantity,q.quantity_unit,q.incoterm,'confirmed',now_ms
  )
  on conflict(quote_id) do update set updated_at=now_ms
  returning id into new_order_id;

  if not exists (
    select 1 from public.trade_order_events e
    where e.order_id=new_order_id and e.event_type='order_confirmed'
  ) then
    insert into public.trade_order_events(order_id,event_type,actor_id,metadata)
    values(new_order_id,'order_confirmed',auth.uid(),jsonb_build_object(
      'quote_id',q.id,
      'rfq_id',q.rfq_id,
      'currency',q.currency,
      'order_value',q.total_amount
    ));
  end if;
 elsif decision='revision_requested' then
  if r.seller_org_id is not null then update public.rfqs set status='negotiating' where id=q.rfq_id; end if;
 end if;
 return new_order_id;
end $$;

revoke all on function public.decide_trade_quote(text,text,text) from public,anon;
grant execute on function public.decide_trade_quote(text,text,text) to authenticated;

create or replace function public.update_trade_order_status(target_order_id text,new_status text,note text default null)
returns void language plpgsql security definer set search_path=''
as $$
declare ctx jsonb := epistable_private.context();
declare current_order public.trade_orders%rowtype;
declare now_ms bigint := ((extract(epoch from now())*1000)::bigint);
declare event_name text;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if new_status not in ('confirmed','production','inspection','ready_to_dispatch','dispatched','delivered','completed','cancelled') then
  raise exception 'Invalid order status' using errcode='23514';
 end if;
 if note is not null and length(note)>4000 then raise exception 'Order note is too long' using errcode='23514'; end if;

 select * into current_order from public.trade_orders where id=target_order_id for update;
 if current_order.id is null then raise exception 'Order not found' using errcode='23514'; end if;
 if ctx->>'role'<>'platform_admin'
   and not (ctx->>'role' like 'seller_%' and current_order.seller_org_id=ctx->>'org') then
  raise exception 'Seller or platform administrator access required' using errcode='42501';
 end if;
 if current_order.status in ('completed','cancelled') and ctx->>'role'<>'platform_admin' then
  raise exception 'Closed orders cannot be changed' using errcode='23514';
 end if;

 update public.trade_orders set
   status=new_status,
   status_note=nullif(trim(note),''),
   updated_at=now_ms,
   confirmed_at=case when new_status='confirmed' then coalesce(confirmed_at,now_ms) else confirmed_at end,
   production_started_at=case when new_status='production' then coalesce(production_started_at,now_ms) else production_started_at end,
   inspection_started_at=case when new_status='inspection' then coalesce(inspection_started_at,now_ms) else inspection_started_at end,
   ready_to_dispatch_at=case when new_status='ready_to_dispatch' then coalesce(ready_to_dispatch_at,now_ms) else ready_to_dispatch_at end,
   dispatched_at=case when new_status='dispatched' then coalesce(dispatched_at,now_ms) else dispatched_at end,
   delivered_at=case when new_status='delivered' then coalesce(delivered_at,now_ms) else delivered_at end,
   completed_at=case when new_status='completed' then coalesce(completed_at,now_ms) else completed_at end,
   cancelled_at=case when new_status='cancelled' then coalesce(cancelled_at,now_ms) else cancelled_at end
 where id=target_order_id;

 if new_status is distinct from current_order.status then
   event_name := case new_status
     when 'confirmed' then 'order_confirmed'
     when 'production' then 'production_started'
     when 'inspection' then 'inspection_started'
     when 'ready_to_dispatch' then 'ready_to_dispatch'
     when 'dispatched' then 'dispatched'
     when 'delivered' then 'delivered'
     when 'completed' then 'completed'
     when 'cancelled' then 'cancelled'
   end;
   insert into public.trade_order_events(order_id,event_type,actor_id,metadata)
   values(target_order_id,event_name,auth.uid(),jsonb_build_object('note',nullif(trim(note),'')));
 end if;
end $$;

revoke all on function public.update_trade_order_status(text,text,text) from public,anon;
grant execute on function public.update_trade_order_status(text,text,text) to authenticated;

-- Controlled backend hooks for future PO/invoice/payment integrations.
create or replace function public.record_trade_order_purchase_order(
  target_order_id text,
  po_number text,
  po_issued_at bigint,
  po_value numeric,
  terms_days integer default null,
  terms_text text default null
)
returns void language plpgsql security definer set search_path=''
as $$
declare ctx jsonb := epistable_private.context();
declare o public.trade_orders%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into o from public.trade_orders where id=target_order_id for update;
 if o.id is null then raise exception 'Order not found' using errcode='23514'; end if;
 if ctx->>'role'<>'platform_admin'
   and not (ctx->>'role'='buyer_admin' and o.buyer_org_id=ctx->>'org') then
  raise exception 'Buyer administrator or platform administrator access required' using errcode='42501';
 end if;
 if nullif(trim(po_number),'') is null or po_value is null or po_value<=0 then
  raise exception 'Purchase order number and positive value are required' using errcode='23514';
 end if;
 if terms_days is not null and (terms_days<0 or terms_days>3650) then
  raise exception 'Invalid payment terms' using errcode='23514';
 end if;
 update public.trade_orders set
   purchase_order_number=trim(po_number),
   purchase_order_issued_at=po_issued_at,
   purchase_order_value=po_value,
   payment_terms_days=terms_days,
   payment_terms_text=nullif(trim(terms_text),''),
   updated_at=((extract(epoch from now())*1000)::bigint)
 where id=target_order_id;
 insert into public.trade_order_events(order_id,event_type,actor_id,metadata)
 values(target_order_id,'purchase_order_recorded',auth.uid(),jsonb_build_object(
   'purchase_order_number',trim(po_number),
   'purchase_order_value',po_value,
   'payment_terms_days',terms_days
 ));
end $$;

revoke all on function public.record_trade_order_purchase_order(text,text,bigint,numeric,integer,text) from public,anon;
grant execute on function public.record_trade_order_purchase_order(text,text,bigint,numeric,integer,text) to authenticated;

create or replace function public.record_trade_order_invoice(
  target_order_id text,
  target_invoice_number text,
  target_invoice_amount numeric,
  target_invoice_issued_at bigint,
  target_invoice_due_at bigint
)
returns void language plpgsql security definer set search_path=''
as $$
declare ctx jsonb := epistable_private.context();
declare o public.trade_orders%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into o from public.trade_orders where id=target_order_id for update;
 if o.id is null then raise exception 'Order not found' using errcode='23514'; end if;
 if ctx->>'role'<>'platform_admin'
   and not (ctx->>'role'='seller_admin' and o.seller_org_id=ctx->>'org') then
  raise exception 'Seller administrator or platform administrator access required' using errcode='42501';
 end if;
 if nullif(trim(target_invoice_number),'') is null or target_invoice_amount is null or target_invoice_amount<=0 then
  raise exception 'Invoice number and positive amount are required' using errcode='23514';
 end if;
 if target_invoice_due_at is not null and target_invoice_issued_at is not null and target_invoice_due_at<target_invoice_issued_at then
  raise exception 'Invoice due date must follow issue date' using errcode='23514';
 end if;
 update public.trade_orders set
   invoice_number=trim(target_invoice_number),
   invoice_amount=target_invoice_amount,
   invoice_issued_at=target_invoice_issued_at,
   invoice_due_at=target_invoice_due_at,
   invoice_status='issued',
   payment_status=case when payment_status='not_recorded' then 'pending' else payment_status end,
   updated_at=((extract(epoch from now())*1000)::bigint)
 where id=target_order_id;
 insert into public.trade_order_events(order_id,event_type,actor_id,metadata)
 values(target_order_id,'invoice_recorded',auth.uid(),jsonb_build_object(
   'invoice_number',trim(target_invoice_number),
   'invoice_amount',target_invoice_amount,
   'invoice_due_at',target_invoice_due_at
 ));
end $$;

revoke all on function public.record_trade_order_invoice(text,text,numeric,bigint,bigint) from public,anon;
grant execute on function public.record_trade_order_invoice(text,text,numeric,bigint,bigint) to authenticated;

create or replace function public.record_trade_order_payment(
  target_order_id text,
  target_payment_status text,
  target_amount_paid numeric,
  target_paid_at bigint default null,
  reference_metadata jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path=''
as $$
declare ctx jsonb := epistable_private.context();
declare o public.trade_orders%rowtype;
begin
 if auth.uid() is null or ctx->>'role'<>'platform_admin' then
  raise exception 'Platform administrator access required' using errcode='42501';
 end if;
 if target_payment_status not in ('not_recorded','pending','partially_paid','paid','overdue','disputed','refunded') then
  raise exception 'Invalid payment status' using errcode='23514';
 end if;
 if target_amount_paid is null or target_amount_paid<0 then
  raise exception 'Amount paid cannot be negative' using errcode='23514';
 end if;
 select * into o from public.trade_orders where id=target_order_id for update;
 if o.id is null then raise exception 'Order not found' using errcode='23514'; end if;
 update public.trade_orders set
   payment_status=target_payment_status,
   amount_paid=target_amount_paid,
   paid_at=case when target_payment_status='paid' then coalesce(target_paid_at,((extract(epoch from now())*1000)::bigint)) else target_paid_at end,
   invoice_status=case
     when target_payment_status='paid' then 'paid'
     when target_payment_status='partially_paid' then 'partially_paid'
     when target_payment_status='overdue' then 'overdue'
     else invoice_status
   end,
   finance_metadata=coalesce(finance_metadata,'{}'::jsonb)||coalesce(reference_metadata,'{}'::jsonb),
   updated_at=((extract(epoch from now())*1000)::bigint)
 where id=target_order_id;
 insert into public.trade_order_events(order_id,event_type,actor_id,metadata)
 values(target_order_id,'payment_recorded',auth.uid(),jsonb_build_object(
   'payment_status',target_payment_status,
   'amount_paid',target_amount_paid,
   'paid_at',target_paid_at
 )||coalesce(reference_metadata,'{}'::jsonb));
end $$;

revoke all on function public.record_trade_order_payment(text,text,numeric,bigint,jsonb) from public,anon;
grant execute on function public.record_trade_order_payment(text,text,numeric,bigint,jsonb) to authenticated;
