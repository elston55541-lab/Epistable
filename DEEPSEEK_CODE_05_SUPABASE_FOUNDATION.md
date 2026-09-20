# Epistable DeepSeek Code Bundle — Part 05: Supabase Foundation
Snapshot: 31d78c0ee3bd70f7a934b44140549048a41e6a01


===== FILE: supabase/config.toml =====
```toml
[functions.accept-invite]
verify_jwt = false

```

===== FILE: supabase/functions/accept-invite/index.ts =====
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type InviteBody = {
  email?: string;
  password?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Invite service is not configured" }, 500);

  let body: InviteBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password || "";
  if (!email || !password) return json({ error: "Email and password are required" }, 400);
  if (password.length < 6) return json({ error: "Password must be at least 6 characters" }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("*")
    .eq("email", email)
    .in("status", ["pending", "inactive", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (profileError) return json({ error: profileError.message }, 500);
  if (!profile) return json({ error: "No pending invite found for this email" }, 404);
  if (profile.status === "suspended") return json({ error: "Account suspended." }, 403);

  let authUserId = profile.auth_user_id as string | null;

  if (authUserId) {
    const { error: updateError } = await admin.auth.admin.updateUserById(authUserId, {
      password,
      email_confirm: true
    });
    if (updateError) return json({ error: updateError.message }, 400);
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        epistable_profile_id: profile.id,
        role: profile.role,
        factory_id: profile.factory_id
      }
    });

    if (createError) {
      return json({
        error: createError.message.includes("already")
          ? "A login already exists for this email. Choose 'I Have Login' instead."
          : createError.message
      }, 400);
    }

    authUserId = created.user?.id || null;
  }

  if (!authUserId) return json({ error: "Could not create login" }, 500);

  const { data: linkedProfile, error: linkError } = await admin
    .from("profiles")
    .update({
      auth_user_id: authUserId,
      status: "active",
      last_active: Date.now()
    })
    .eq("id", profile.id)
    .select()
    .single();

  if (linkError) return json({ error: linkError.message }, 500);

  return json({ profile: linkedProfile });
});

```

===== FILE: supabase/functions/admin-invite/index.ts =====
```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Invite service is not configured" }, 500);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const caller = userData?.user;
  if (userError || !caller) return json({ error: "Unauthorized" }, 401);

  const { data: callerProfile, error: callerProfileError } = await admin
    .from("profiles")
    .select("id, role, status")
    .eq("auth_user_id", caller.id)
    .maybeSingle();

  if (callerProfileError) return json({ error: "Unable to verify caller" }, 500);
  if (!callerProfile || callerProfile.status !== "active" || !["owner", "admin"].includes(callerProfile.role)) {
    return json({ error: "Forbidden" }, 403);
  }

  let body: { email?: string; name?: string; role?: string; factory_id?: string | null; factory_name?: string | null; redirect_to?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim() || "Epistable User";
  const role = body.role?.trim() || "buyer";
  const allowedRoles = ["owner", "admin", "manager", "inspector", "buyer"];

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Valid email is required" }, 400);
  if (!allowedRoles.includes(role)) return json({ error: "Invalid role" }, 400);

  const { data: existingProfile, error: existingProfileError } = await admin
    .from("profiles")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (existingProfileError) return json({ error: existingProfileError.message }, 500);
  if (existingProfile?.status === "suspended") return json({ error: "Account suspended" }, 403);
  if (existingProfile?.auth_user_id) return json({ error: "A login already exists for this email" }, 409);

  let profile = existingProfile;
  if (!profile) {
    const id = crypto.randomUUID();
    const { data, error } = await admin
      .from("profiles")
      .insert({
        id,
        name,
        email,
        role,
        factory_id: body.factory_id ?? null,
        factory_name: body.factory_name ?? null,
        status: "pending",
        created_at: Date.now(),
      })
      .select()
      .single();
    if (error) return json({ error: error.message }, 500);
    profile = data;
  } else {
    const { data, error } = await admin
      .from("profiles")
      .update({
        name,
        role,
        factory_id: body.factory_id ?? existingProfile.factory_id ?? null,
        factory_name: body.factory_name ?? existingProfile.factory_name ?? null,
        status: "pending",
      })
      .eq("id", existingProfile.id)
      .select()
      .single();
    if (error) return json({ error: error.message }, 500);
    profile = data;
  }

  const options: Record<string, unknown> = {
    data: {
      epistable_profile_id: profile.id,
      role: profile.role,
      factory_id: profile.factory_id,
    },
  };
  if (body.redirect_to) options.redirectTo = body.redirect_to;

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, options);
  if (inviteError) return json({ error: inviteError.message }, 400);

  const invitedUserId = inviteData?.user?.id;
  if (!invitedUserId) return json({ error: "Invite sent but user id was not returned" }, 500);

  const { data: linkedProfile, error: linkError } = await admin
    .from("profiles")
    .update({ auth_user_id: invitedUserId, status: "pending" })
    .eq("id", profile.id)
    .select()
    .single();

  if (linkError) return json({ error: linkError.message }, 500);

  return json({
    ok: true,
    invited: true,
    profile: {
      id: linkedProfile.id,
      email: linkedProfile.email,
      role: linkedProfile.role,
      status: linkedProfile.status,
      auth_user_id: linkedProfile.auth_user_id,
    },
  });
});

```

===== FILE: supabase/migrations/202605030001_auth_rls_hardening.sql =====
```sql
-- Epistable Auth/RLS hardening draft
-- Review in Supabase SQL editor before applying. This is intentionally additive first.

create table if not exists public.profiles (
  id text primary key,
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('owner', 'admin', 'manager', 'inspector', 'buyer')),
  factory_id text references public.factories(id),
  factory_name text,
  company text,
  avatar text,
  status text not null default 'active',
  scans_total integer not null default 0,
  last_active bigint,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists profiles_factory_id_idx on public.profiles(factory_id);
create index if not exists profiles_auth_user_id_idx on public.profiles(auth_user_id);

alter table public.factories enable row level security;
alter table public.inspections enable row level security;
alter table public.suppliers enable row level security;
alter table public.disputes enable row level security;
alter table public.inquiries enable row level security;
alter table public.notifications enable row level security;
alter table public.profiles enable row level security;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where auth_user_id = auth.uid() limit 1
$$;

create or replace function public.current_profile_factory_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select factory_id from public.profiles where auth_user_id = auth.uid() limit 1
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() = 'owner'
$$;

create or replace function public.same_factory(factory_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_owner() or public.current_profile_factory_id() = factory_id
$$;

-- Profiles
create policy "profiles read own factory" on public.profiles
  for select using (public.is_owner() or auth_user_id = auth.uid() or public.same_factory(factory_id));

create policy "profiles owner writes" on public.profiles
  for all using (public.is_owner()) with check (public.is_owner());

-- Factories
create policy "factories read own" on public.factories
  for select using (public.is_owner() or public.same_factory(id));

create policy "factories owner writes" on public.factories
  for all using (public.is_owner()) with check (public.is_owner());

create policy "factories admins update own" on public.factories
  for update using (public.current_profile_role() in ('admin', 'manager') and public.same_factory(id))
  with check (public.current_profile_role() in ('admin', 'manager') and public.same_factory(id));

-- Inspections
create policy "inspections read own factory" on public.inspections
  for select using (public.is_owner() or public.same_factory(factory_id));

create policy "inspections create own factory" on public.inspections
  for insert with check (public.current_profile_role() in ('admin', 'manager', 'inspector') and public.same_factory(factory_id));

create policy "inspections update own factory" on public.inspections
  for update using (public.current_profile_role() in ('admin', 'manager') and public.same_factory(factory_id))
  with check (public.current_profile_role() in ('admin', 'manager') and public.same_factory(factory_id));

-- Factory-scoped tables
create policy "suppliers own factory" on public.suppliers
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create policy "disputes own factory" on public.disputes
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create policy "inquiries own factory" on public.inquiries
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create policy "notifications own user" on public.notifications
  for all using (public.is_owner() or user_id in (select id from public.profiles where auth_user_id = auth.uid()))
  with check (public.is_owner() or user_id in (select id from public.profiles where auth_user_id = auth.uid()));

-- After creating Supabase Auth users and migrating rows into profiles, remove plaintext password columns:
-- alter table public.users drop column if exists password;
-- alter table public.buyers drop column if exists password;

```

===== FILE: supabase/migrations/202605030002_public_slab_certificate.sql =====
```sql
-- Public one-slab certificate lookup for QR codes.
-- This keeps table RLS closed while allowing anonymous visitors to view a single scanned slab by ID.

create or replace function public.get_public_slab_certificate(slab_id text)
returns table (
  id text,
  factory_id text,
  factory_name text,
  factory_location text,
  factory_contact_email text,
  inspector text,
  stone text,
  supplier text,
  grade text,
  reason text,
  price_per_sq_ft numeric,
  export_ready boolean,
  measurements jsonb,
  defects jsonb,
  notes text,
  photo text,
  photos jsonb,
  ts bigint,
  date text,
  "time" text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id,
    i.factory_id,
    coalesce(i.factory_name, f.name) as factory_name,
    f.location as factory_location,
    f.contact_email as factory_contact_email,
    i.inspector,
    i.stone,
    i.supplier,
    i.grade,
    i.reason,
    i.price_per_sq_ft::numeric,
    i.export_ready,
    coalesce(to_jsonb(i.measurements), '{}'::jsonb) as measurements,
    coalesce(to_jsonb(i.defects), '[]'::jsonb) as defects,
    i.notes,
    i.photo,
    coalesce(to_jsonb(i.photos), '[]'::jsonb) as photos,
    i.ts,
    i.date,
    i."time"
  from public.inspections i
  left join public.factories f on f.id = i.factory_id
  where i.id = slab_id
  limit 1
$$;

grant execute on function public.get_public_slab_certificate(text) to anon, authenticated;

```

===== FILE: supabase/migrations/202605040001_public_slab_inquiry.sql =====
```sql
-- Public slab inquiry creation for certificate pages.
-- Keeps inquiries RLS closed while allowing anonymous QR viewers to submit interest for a real slab.

create or replace function public.create_public_slab_inquiry(
  slab_id text,
  buyer_name text,
  buyer_company text default '',
  buyer_email text default '',
  buyer_message text default ''
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  slab record;
  new_id text;
  clean_name text := nullif(trim(buyer_name), '');
  clean_email text := lower(nullif(trim(buyer_email), ''));
begin
  if clean_name is null then
    raise exception 'Buyer name is required';
  end if;

  select
    i.id,
    i.factory_id,
    coalesce(i.factory_name, f.name) as factory_name,
    i.stone,
    i.grade,
    i.price_per_sq_ft
  into slab
  from public.inspections i
  left join public.factories f on f.id = i.factory_id
  where i.id = slab_id
  limit 1;

  if slab.id is null then
    raise exception 'Slab not found';
  end if;

  new_id := 'INQ-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));

  insert into public.inquiries (
    id,
    slab_id,
    stone,
    grade,
    price_per_sq_ft,
    factory_id,
    factory_name,
    buyer_name,
    buyer_company,
    buyer_email,
    message,
    created_at,
    status
  ) values (
    new_id,
    slab.id,
    slab.stone,
    slab.grade,
    slab.price_per_sq_ft,
    slab.factory_id,
    slab.factory_name,
    clean_name,
    coalesce(nullif(trim(buyer_company), ''), ''),
    coalesce(clean_email, ''),
    coalesce(nullif(trim(buyer_message), ''), ''),
    (extract(epoch from now()) * 1000)::bigint,
    'new'
  );

  return new_id;
end;
$$;

grant execute on function public.create_public_slab_inquiry(text, text, text, text, text) to anon, authenticated;

```

===== FILE: supabase/migrations/202605050001_public_slab_dispute.sql =====
```sql
-- Public slab dispute creation for certificate pages.
-- Keeps disputes RLS closed while allowing anonymous QR viewers to report a problem with a real slab.

create or replace function public.create_public_slab_dispute(
  slab_id text,
  buyer_name text,
  buyer_company text default '',
  dispute_category text default 'other',
  dispute_details text default ''
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  slab record;
  new_id text;
  clean_name text := nullif(trim(buyer_name), '');
  clean_details text := nullif(trim(dispute_details), '');
  clean_category text := coalesce(nullif(trim(dispute_category), ''), 'other');
begin
  if clean_name is null then
    raise exception 'Buyer name is required';
  end if;

  if clean_details is null then
    raise exception 'Dispute details are required';
  end if;

  if clean_category not in ('wrong_grade', 'defect_missed', 'measurement', 'other') then
    clean_category := 'other';
  end if;

  select
    i.id,
    i.factory_id,
    coalesce(i.factory_name, f.name) as factory_name,
    i.stone,
    i.grade
  into slab
  from public.inspections i
  left join public.factories f on f.id = i.factory_id
  where i.id = slab_id
  limit 1;

  if slab.id is null then
    raise exception 'Slab not found';
  end if;

  new_id := 'DSP-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));

  insert into public.disputes (
    id,
    slab_id,
    stone,
    grade,
    category,
    details,
    factory_id,
    factory_name,
    buyer_name,
    buyer_company,
    created_at,
    status
  ) values (
    new_id,
    slab.id,
    slab.stone,
    slab.grade,
    clean_category,
    clean_details,
    slab.factory_id,
    slab.factory_name,
    clean_name,
    coalesce(nullif(trim(buyer_company), ''), ''),
    (extract(epoch from now()) * 1000)::bigint,
    'open'
  );

  return new_id;
end;
$$;

grant execute on function public.create_public_slab_dispute(text, text, text, text, text) to anon, authenticated;

```

===== FILE: supabase/migrations/202605090001_profile_access_management.sql =====
```sql
-- Allow factory admins/managers to manage access for profiles in their own factory.
-- Owners keep full profile access through the existing owner policy.

drop policy if exists "profiles factory admins insert own" on public.profiles;
drop policy if exists "profiles factory admins update own" on public.profiles;

create policy "profiles factory admins insert own" on public.profiles
  for insert
  with check (
    public.current_profile_role() in ('admin', 'manager')
    and public.same_factory(factory_id)
    and role in ('admin', 'manager', 'inspector', 'buyer')
  );

create policy "profiles factory admins update own" on public.profiles
  for update
  using (
    public.current_profile_role() in ('admin', 'manager')
    and public.same_factory(factory_id)
    and role <> 'owner'
  )
  with check (
    public.current_profile_role() in ('admin', 'manager')
    and public.same_factory(factory_id)
    and role in ('admin', 'manager', 'inspector', 'buyer')
  );

```

===== FILE: supabase/migrations/202605090002_activity_logs.sql =====
```sql
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

```

===== FILE: supabase/migrations/202605090003_invite_acceptance.sql =====
```sql
-- Let invited users link their Supabase Auth account to a pending Epistable profile.

create or replace function public.accept_profile_invite()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  invited_profile public.profiles;
  user_email text := lower(auth.email());
begin
  if auth.uid() is null or user_email is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set
    auth_user_id = auth.uid(),
    status = 'active',
    last_active = extract(epoch from now())::bigint * 1000
  where lower(email) = user_email
    and coalesce(status, 'pending') in ('pending', 'inactive', 'active')
    and (auth_user_id is null or auth_user_id = auth.uid())
  returning * into invited_profile;

  if invited_profile.id is null then
    raise exception 'No pending invite found for this email';
  end if;

  return invited_profile;
end;
$$;

grant execute on function public.accept_profile_invite() to authenticated;

```

===== FILE: supabase/migrations/202605100001_inventory_status.sql =====
```sql
-- Track whether a verified slab is available to buyers.

alter table public.inspections
  add column if not exists inventory_status text not null default 'available';

alter table public.inspections
  drop constraint if exists inspections_inventory_status_check;

alter table public.inspections
  add constraint inspections_inventory_status_check
  check (inventory_status in ('available', 'reserved', 'sold'));

create or replace function public.get_public_slab_certificate(slab_id text)
returns table (
  id text,
  factory_id text,
  factory_name text,
  factory_location text,
  factory_contact_email text,
  inspector text,
  stone text,
  supplier text,
  grade text,
  reason text,
  price_per_sq_ft numeric,
  export_ready boolean,
  inventory_status text,
  measurements jsonb,
  defects jsonb,
  notes text,
  photo text,
  photos jsonb,
  ts bigint,
  date text,
  "time" text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id,
    i.factory_id,
    coalesce(i.factory_name, f.name) as factory_name,
    f.location as factory_location,
    f.contact_email as factory_contact_email,
    i.inspector,
    i.stone,
    i.supplier,
    i.grade,
    i.reason,
    i.price_per_sq_ft::numeric,
    i.export_ready,
    coalesce(i.inventory_status, 'available') as inventory_status,
    coalesce(to_jsonb(i.measurements), '{}'::jsonb) as measurements,
    coalesce(to_jsonb(i.defects), '[]'::jsonb) as defects,
    i.notes,
    i.photo,
    coalesce(to_jsonb(i.photos), '[]'::jsonb) as photos,
    i.ts,
    i.date,
    i."time"
  from public.inspections i
  left join public.factories f on f.id = i.factory_id
  where i.id = slab_id
  limit 1
$$;

grant execute on function public.get_public_slab_certificate(text) to anon, authenticated;

create or replace function public.create_public_slab_inquiry(
  slab_id text,
  buyer_name text,
  buyer_company text default '',
  buyer_email text default '',
  buyer_message text default ''
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  slab record;
  new_id text;
  clean_name text := nullif(trim(buyer_name), '');
  clean_email text := lower(nullif(trim(buyer_email), ''));
begin
  if clean_name is null then
    raise exception 'Buyer name is required';
  end if;

  select
    i.id,
    i.factory_id,
    coalesce(i.factory_name, f.name) as factory_name,
    i.stone,
    i.grade,
    i.price_per_sq_ft,
    coalesce(i.inventory_status, 'available') as inventory_status
  into slab
  from public.inspections i
  left join public.factories f on f.id = i.factory_id
  where i.id = slab_id
  limit 1;

  if slab.id is null then
    raise exception 'Slab not found';
  end if;

  if slab.inventory_status <> 'available' then
    raise exception 'This slab is not currently available';
  end if;

  new_id := 'INQ-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));

  insert into public.inquiries (
    id,
    slab_id,
    stone,
    grade,
    price_per_sq_ft,
    factory_id,
    factory_name,
    buyer_name,
    buyer_company,
    buyer_email,
    message,
    created_at,
    status
  ) values (
    new_id,
    slab.id,
    slab.stone,
    slab.grade,
    slab.price_per_sq_ft,
    slab.factory_id,
    slab.factory_name,
    clean_name,
    coalesce(nullif(trim(buyer_company), ''), ''),
    coalesce(clean_email, ''),
    coalesce(nullif(trim(buyer_message), ''), ''),
    (extract(epoch from now()) * 1000)::bigint,
    'new'
  );

  return new_id;
end;
$$;

grant execute on function public.create_public_slab_inquiry(text, text, text, text, text) to anon, authenticated;

```

===== FILE: supabase/migrations/202605100002_inquiry_followups.sql =====
```sql
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

```

===== FILE: supabase/migrations/202605100003_quotes.sql =====
```sql
-- Quotes/proforma records generated from buyer inquiries.

create table if not exists public.quotes (
  id text primary key,
  inquiry_id text references public.inquiries(id) on delete set null,
  slab_id text references public.inspections(id) on delete set null,
  factory_id text references public.factories(id) on delete cascade,
  factory_name text,
  buyer_name text,
  buyer_company text,
  buyer_email text,
  stone text,
  grade text,
  price_per_sq_ft numeric,
  area_sq_ft numeric,
  total_amount numeric,
  validity_ts bigint,
  notes text,
  status text not null default 'sent',
  created_at bigint not null,
  updated_at bigint
);

alter table public.quotes enable row level security;

alter table public.quotes
  drop constraint if exists quotes_status_check;

alter table public.quotes
  add constraint quotes_status_check
  check (status in ('draft', 'sent', 'accepted', 'expired'));

drop policy if exists "quotes own factory" on public.quotes;

create policy "quotes own factory" on public.quotes
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create index if not exists quotes_factory_created_idx
  on public.quotes (factory_id, created_at desc);

create or replace function public.get_public_quote(quote_id text)
returns table (
  id text,
  inquiry_id text,
  slab_id text,
  factory_id text,
  factory_name text,
  buyer_name text,
  buyer_company text,
  buyer_email text,
  stone text,
  grade text,
  price_per_sq_ft numeric,
  area_sq_ft numeric,
  total_amount numeric,
  validity_ts bigint,
  notes text,
  status text,
  created_at bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    q.id,
    q.inquiry_id,
    q.slab_id,
    q.factory_id,
    q.factory_name,
    q.buyer_name,
    q.buyer_company,
    q.buyer_email,
    q.stone,
    q.grade,
    q.price_per_sq_ft,
    q.area_sq_ft,
    q.total_amount,
    q.validity_ts,
    q.notes,
    q.status,
    q.created_at
  from public.quotes q
  where q.id = quote_id
  limit 1
$$;

grant execute on function public.get_public_quote(text) to anon, authenticated;

```
