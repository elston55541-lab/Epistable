-- Break the RFQ <-> trade_quotes RLS recursion introduced by the negotiation access rule.
-- The private helper performs the ownership lookup as the function owner, so the RFQ
-- policy no longer queries trade_quotes through its own RLS policy.

create or replace function epistable_private.current_seller_has_quote(target_rfq text)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select
    (epistable_private.context()->>'role') like 'seller_%'
    and exists (
      select 1
      from public.trade_quotes tq
      where tq.rfq_id=target_rfq
        and tq.seller_org_id=(epistable_private.context()->>'org')
    )
$$;

revoke all on function epistable_private.current_seller_has_quote(text) from public,anon;
grant execute on function epistable_private.current_seller_has_quote(text) to authenticated;

drop policy if exists marketplace_rfq_read on public.rfqs;
create policy marketplace_rfq_read on public.rfqs for select to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or buyer_org_id=(select epistable_private.context()->>'org')
 or (
   (select epistable_private.context()->>'role') like 'seller_%'
   and status not in ('draft','cancelled')
   and (
     seller_org_id=(select epistable_private.context()->>'org')
     or (seller_org_id is null and status='open')
     or epistable_private.current_seller_has_quote(id)
   )
 )
);
