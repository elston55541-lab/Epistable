-- Lightweight sales follow-up fields for buyer inquiries.

alter table public.inquiries
  add column if not exists priority text not null default 'warm',
  add column if not exists factory_notes text,
  add column if not exists follow_up_at bigint;

alter table public.inquiries
  drop constraint if exists inquiries_priority_check;

alter table public.inquiries
  add constraint inquiries_priority_check
  check (priority in ('hot', 'warm', 'low'));

create index if not exists inquiries_factory_follow_up_idx
  on public.inquiries (factory_id, follow_up_at)
  where follow_up_at is not null;
