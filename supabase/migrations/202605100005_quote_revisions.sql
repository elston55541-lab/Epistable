-- Quote revision tracking.

alter table public.quotes
  add column if not exists parent_quote_id text references public.quotes(id) on delete set null,
  add column if not exists revision_number integer not null default 1;

alter table public.quotes
  drop constraint if exists quotes_status_check;

alter table public.quotes
  add constraint quotes_status_check
  check (status in ('draft', 'sent', 'accepted', 'revision_requested', 'revised', 'expired'));

create index if not exists quotes_parent_quote_idx
  on public.quotes (parent_quote_id, revision_number);
