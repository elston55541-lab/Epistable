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
    .select("id, role, status, factory_id")
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

  if (!body || Object.values(body).some(value => value != null && typeof value !== "string")) {
    return json({ error: "Invalid request body" }, 400);
  }
  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim() || "Epistable User";
  const role = body.role?.trim() || "buyer";
  const allowedRoles = ["owner", "admin", "manager", "inspector", "buyer"];

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Valid email is required" }, 400);
  if (!allowedRoles.includes(role)) return json({ error: "Invalid role" }, 400);

  // Only legacy owners may create owners or invite across factories.
  // This endpoint never writes marketplace_access.
  const isOwner = callerProfile.role === "owner";
  const factoryId = body.factory_id?.trim() || null;
  if (!isOwner && (role === "owner" || !callerProfile.factory_id || factoryId !== callerProfile.factory_id)) {
    return json({ error: "Forbidden invitation scope" }, 403);
  }
  if (["admin", "manager", "inspector"].includes(role) && !factoryId) {
    return json({ error: "Factory is required for this role" }, 400);
  }

  const { data: existingProfile, error: existingProfileError } = await admin
    .from("profiles")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (existingProfileError) return json({ error: existingProfileError.message }, 500);
  if (!isOwner && existingProfile && (existingProfile.role === "owner" || existingProfile.factory_id !== callerProfile.factory_id)) {
    return json({ error: "Forbidden invitation scope" }, 403);
  }
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
        factory_id: factoryId,
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
        factory_id: factoryId,
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
