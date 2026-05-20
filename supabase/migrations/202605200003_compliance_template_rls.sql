-- RLS for compliance templates.
-- Active templates are readable by authenticated users; owners can manage templates.

alter table public.compliance_templates enable row level security;

create policy "compliance templates read active" on public.compliance_templates
  for select using (
    status = 'active'
    or public.is_owner()
  );

create policy "compliance templates owner writes" on public.compliance_templates
  for all using (public.is_owner())
  with check (public.is_owner());
