-- Fail closed on absent authority; retain current role tiers and public quote-link semantics.
-- No UI, read projections, publication rules, or table grants change.

CREATE OR REPLACE FUNCTION public.update_trade_order_status(target_order_id text, new_status text, note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare ctx jsonb := epistable_private.context();
declare current_order public.trade_orders%rowtype;
declare now_ms bigint := ((extract(epoch from now())*1000)::bigint);
declare event_name text;
begin
 if auth.uid() is null or ctx is null then
  raise exception 'Marketplace context required' using errcode='42501';
 end if;
 if new_status not in ('confirmed','production','inspection','ready_to_dispatch','dispatched','delivered','completed','cancelled') then
  raise exception 'Invalid order status' using errcode='23514';
 end if;
 if note is not null and length(note)>4000 then raise exception 'Order note is too long' using errcode='23514'; end if;

 select * into current_order from public.trade_orders where id=target_order_id for update;
 if current_order.id is null then raise exception 'Order not found' using errcode='23514'; end if;
 if (ctx->>'role'='platform_admin' or (ctx->>'role' in ('seller_admin','seller_member') and current_order.seller_org_id=ctx->>'org')) is not true then
  raise exception 'Seller or platform administrator access required' using errcode='42501';
 end if;
 if current_order.status in ('completed','cancelled') and (ctx->>'role'='platform_admin') is not true then
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
end $function$;

CREATE OR REPLACE FUNCTION public.record_trade_order_purchase_order(target_order_id text, po_number text, po_issued_at bigint, po_value numeric, terms_days integer DEFAULT NULL::integer, terms_text text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare ctx jsonb := epistable_private.context();
declare o public.trade_orders%rowtype;
begin
 if auth.uid() is null or ctx is null then
  raise exception 'Marketplace context required' using errcode='42501';
 end if;
 select * into o from public.trade_orders where id=target_order_id for update;
 if o.id is null then raise exception 'Order not found' using errcode='23514'; end if;
 if (ctx->>'role'='platform_admin' or (ctx->>'role'='buyer_admin' and o.buyer_org_id=ctx->>'org')) is not true then
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
end $function$;

CREATE OR REPLACE FUNCTION public.record_trade_order_invoice(target_order_id text, target_invoice_number text, target_invoice_amount numeric, target_invoice_issued_at bigint, target_invoice_due_at bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare ctx jsonb := epistable_private.context();
declare o public.trade_orders%rowtype;
begin
 if auth.uid() is null or ctx is null then
  raise exception 'Marketplace context required' using errcode='42501';
 end if;
 select * into o from public.trade_orders where id=target_order_id for update;
 if o.id is null then raise exception 'Order not found' using errcode='23514'; end if;
 if (ctx->>'role'='platform_admin' or (ctx->>'role'='seller_admin' and o.seller_org_id=ctx->>'org')) is not true then
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
end $function$;

CREATE OR REPLACE FUNCTION public.record_trade_order_payment(target_order_id text, target_payment_status text, target_amount_paid numeric, target_paid_at bigint DEFAULT NULL::bigint, reference_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare ctx jsonb := epistable_private.context();
declare o public.trade_orders%rowtype;
begin
 if auth.uid() is null or ctx is null then
  raise exception 'Marketplace context required' using errcode='42501';
 end if;
 if (ctx->>'role'='platform_admin') is not true then
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
end $function$;

CREATE OR REPLACE FUNCTION public.update_quote_fulfillment(quote_id text, next_fulfillment_status text)
 RETURNS TABLE(id text, inquiry_id text, slab_id text, factory_id text, factory_name text, buyer_name text, buyer_company text, buyer_email text, stone text, grade text, price_per_sq_ft numeric, area_sq_ft numeric, total_amount numeric, validity_ts bigint, notes text, status text, fulfillment_status text, buyer_message text, buyer_decided_at bigint, created_at bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  q public.quotes;
  stage_label text;
  stage_message text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p where p.auth_user_id=auth.uid() and p.status='active'
  ) then
    raise exception 'Active authenticated profile required' using errcode='42501';
  end if;
  if next_fulfillment_status not in (
    'payment_pending',
    'payment_received',
    'dispatch_scheduled',
    'dispatched',
    'delivered',
    'sold'
  ) then
    raise exception 'Invalid fulfillment status';
  end if;

  select * into q
  from public.quotes
  where quotes.id = quote_id;

  if not found then
    raise exception 'Quote not found';
  end if;

  if (public.is_owner() or public.same_factory(q.factory_id)) is not true then
    raise exception 'Not allowed' using errcode='42501';
  end if;

  if q.status <> 'accepted' then
    raise exception 'Only accepted quotes can enter fulfillment';
  end if;

  stage_label := case next_fulfillment_status
    when 'payment_pending' then 'Payment pending'
    when 'payment_received' then 'Payment received'
    when 'dispatch_scheduled' then 'Dispatch scheduled'
    when 'dispatched' then 'Dispatched'
    when 'delivered' then 'Delivered'
    when 'sold' then 'Sold'
    else 'Quote updated'
  end;

  stage_message := concat(
    coalesce(q.factory_name, 'Factory'),
    ' updated quote ',
    q.id,
    ' for ',
    coalesce(q.stone, 'your slab'),
    ': ',
    stage_label,
    '.'
  );

  update public.quotes
  set
    fulfillment_status = next_fulfillment_status,
    updated_at = (extract(epoch from now()) * 1000)::bigint
  where quotes.id = quote_id;

  insert into public.notifications (id, user_id, title, msg, icon, ts, read)
  select
    'N-' || upper(substr(md5(random()::text || clock_timestamp()::text || p.id), 1, 12)),
    p.id,
    concat('Quote update: ', stage_label),
    stage_message,
    case
      when next_fulfillment_status = 'payment_received' then 'Paid'
      when next_fulfillment_status in ('dispatch_scheduled', 'dispatched') then 'Ship'
      when next_fulfillment_status in ('delivered', 'sold') then 'Done'
      else 'Quote'
    end,
    (extract(epoch from now()) * 1000)::bigint,
    false
  from public.profiles p
  where p.factory_id = q.factory_id
    and lower(p.email) = lower(q.buyer_email)
    and p.role = 'buyer'
    and p.status = 'active';

  return query
    select *
    from public.get_public_quote(quote_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.notify_buyer_revised_quote(quote_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  q public.quotes;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p where p.auth_user_id=auth.uid() and p.status='active'
  ) then
    raise exception 'Active authenticated profile required' using errcode='42501';
  end if;
  select * into q
  from public.quotes
  where id = quote_id;

  if not found then
    return;
  end if;

  if (public.is_owner() or public.same_factory(q.factory_id)) is not true then
    raise exception 'Not allowed' using errcode='42501';
  end if;

  insert into public.notifications (id, user_id, title, msg, icon, ts, read)
  select
    'N-' || upper(substr(md5(random()::text || clock_timestamp()::text || p.id), 1, 12)),
    p.id,
    'Revised quote sent',
    concat(coalesce(q.factory_name, 'Factory'), ' sent a revised quote ', q.id, ' for ', coalesce(q.stone, 'your slab'), '.'),
    'Quote',
    (extract(epoch from now()) * 1000)::bigint,
    false
  from public.profiles p
  where p.factory_id = q.factory_id
    and lower(p.email) = lower(q.buyer_email)
    and p.role = 'buyer'
    and p.status = 'active';
end;
$function$;

CREATE OR REPLACE FUNCTION public.notify_factory_quote_decision(quote_id text, decision text, buyer_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  q public.quotes;
  notification_title text;
  notification_msg text;
begin
  if decision is null or decision not in ('accepted','revision_requested') then
    raise exception 'Invalid quote decision' using errcode='23514';
  end if;
  if buyer_note is not null and length(buyer_note)>4000 then
    raise exception 'Buyer note is too long' using errcode='23514';
  end if;
  select * into q
  from public.quotes
  where id = quote_id;

  if not found then
    return;
  end if;

  if q.status is distinct from decision or q.buyer_message is distinct from nullif(trim(buyer_note),'') then
    raise exception 'Notification must match persisted quote decision' using errcode='23514';
  end if;

  notification_title := case
    when decision = 'accepted' then 'Quote accepted'
    when decision = 'revision_requested' then 'Quote changes requested'
    else 'Quote updated'
  end;

  notification_msg := concat(
    coalesce(q.buyer_company, q.buyer_name, 'Buyer'),
    case
      when decision = 'accepted' then ' accepted '
      when decision = 'revision_requested' then ' requested changes to '
      else ' updated '
    end,
    'quote ',
    q.id,
    ' for ',
    coalesce(q.stone, 'a slab'),
    '.',
    case when nullif(trim(buyer_note), '') is not null then concat(' Note: ', trim(buyer_note)) else '' end
  );

  insert into public.notifications (id, user_id, title, msg, icon, ts, read)
  select
    'N-' || upper(substr(md5(random()::text || clock_timestamp()::text || p.id), 1, 12)),
    p.id,
    notification_title,
    notification_msg,
    case when decision = 'accepted' then 'Won' else 'Edit' end,
    (extract(epoch from now()) * 1000)::bigint,
    false
  from public.profiles p
  where p.factory_id = q.factory_id
    and p.role in ('admin', 'manager')
    and p.status = 'active';
end;
$function$;

-- Default function ACLs can retain explicit browser grants after PUBLIC revocation.
revoke execute on function public.notify_factory_quote_decision(text,text,text) from public,anon,authenticated;
-- Internal SECURITY DEFINER owner calls remain permitted; service_role retains its existing grant.
revoke execute on function public.notify_buyer_revised_quote(text),public.update_quote_fulfillment(text,text) from public,anon;
grant execute on function public.notify_buyer_revised_quote(text),public.update_quote_fulfillment(text,text) to authenticated;
