import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const token = req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return json({ error: "Open your invitation email to authenticate first." }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return json({ error: "Invite service is not configured" }, 500);
  // Caller-scoped only: no service role, createUser or administrative password reset.
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  const user = data?.user;
  if (error || !user || !user.email_confirmed_at || !user.email) return json({ error: "Unauthorized" }, 401);
  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid request body" }, 400); }
  if (!body || typeof body.email !== "string" || typeof body.password !== "string" || body.password.length < 6) {
    return json({ error: "Email and a password of at least 6 characters are required" }, 400);
  }
  if (body.email.trim().toLowerCase() !== user.email.toLowerCase()) return json({ error: "Invitation does not match this login" }, 403);
  const { data: profile, error: profileError } = await client.from("profiles")
    .select("id,auth_user_id,status,email").eq("auth_user_id", user.id).maybeSingle();
  if (profileError) return json({ error: "Unable to verify invitation" }, 500);
  if (!profile || profile.status !== "pending" || profile.email.toLowerCase() !== user.email.toLowerCase()) {
    return json({ error: "No pending invite for this login. Use sign in or password recovery." }, 403);
  }
  // Supabase Auth validates the bearer token again on this caller-scoped update.
  // The SDK updateUser requires a persisted session; this stateless handler has
  // only an access token. Use the same caller-authenticated Auth API directly.
  const passwordResult = await fetch(`${url}/auth/v1/user`, {
    method: "PUT",
    headers: { apikey: anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ password: body.password }),
  });
  if (!passwordResult.ok) return json({ error: "Could not set password. Reopen the invitation or use password recovery." }, 400);
  const { data: linked, error: linkError } = await client.rpc("accept_profile_invite");
  if (linkError) return json({ error: "Could not activate invitation. Sign in and retry." }, 400);
  return json({ profile: Array.isArray(linked) ? linked[0] : linked });
});
