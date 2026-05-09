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
