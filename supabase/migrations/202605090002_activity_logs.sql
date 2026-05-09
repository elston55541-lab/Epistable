-- Activity log foundation for admin actions.

create table if not exists public.activity_logs (
  id text primary key,
  ts bigint not null,
  action text not null,
  actor_id text,
  actor_name text not null default '',
  factory_id text references public.factories(id),
  factory_name text default '',
  target_type text not null,
  target_id text not null,
  target_name text default '',
  details jsonb not null default '{}'::jsonb
);

create index if not exists activity_logs_ts_idx on public.activity_logs(ts desc);
create index if not exists activity_logs_factory_id_ts_idx on public.activity_logs(factory_id, ts desc);
create index if not exists activity_logs_target_idx on public.activity_logs(target_type, target_id);

alter table public.activity_logs enable row level security;

drop policy if exists "activity logs read own factory" on public.activity_logs;
drop policy if exists "activity logs create own factory" on public.activity_logs;

create policy "activity logs read own factory" on public.activity_logs
  for select
  using (public.is_owner() or public.same_factory(factory_id));

create policy "activity logs create own factory" on public.activity_logs
  for insert
  with check (
    public.is_owner()
    or (
      public.current_profile_role() in ('admin', 'manager')
      and public.same_factory(factory_id)
    )
  );
