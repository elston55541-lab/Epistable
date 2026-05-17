-- Speed up inspection reads used by factory dashboards, buyer inventory, and scan history.

create index if not exists inspections_factory_ts_idx
  on public.inspections (factory_id, ts desc);

create index if not exists inspections_user_ts_idx
  on public.inspections (user_id, ts desc);

create index if not exists inspections_factory_inventory_grade_ts_idx
  on public.inspections (factory_id, inventory_status, grade, ts desc);

create index if not exists inspections_supplier_ts_idx
  on public.inspections (supplier_id, ts desc)
  where supplier_id is not null;
