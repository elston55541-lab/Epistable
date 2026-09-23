import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "content-disposition, x-evidence-content-type, x-evidence-file-name",
};

const allowedTypes = new Set(["application/pdf","image/jpeg","image/png","image/webp"]);

function safeName(value: string) {
  return (value || "evidence").replace(/[\r\n"\\]/g, "_").slice(0, 180);
}

function reply(body: BodyInit | null, status: number, headers: Record<string,string> = {}) {
  return new Response(body, { status, headers: { ...corsHeaders, ...headers } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return reply("ok", 200);
  if (req.method !== "POST") return reply("Method not allowed", 405);

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return reply("Unauthorized", 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return reply("Evidence service unavailable", 503);

  let body: { document_id?: string } = {};
  try { body = await req.json(); } catch { return reply("Invalid request", 400); }
  if (!body.document_id) return reply("Document is required", 400);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false }
  });
  const serviceClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return reply("Unauthorized", 401);

  const { data: context, error: contextError } = await userClient.rpc("authorize_evidence_delivery", {
    target_document_id: body.document_id
  });
  if (contextError || !context?.storage_path) {
    const rateLimited = contextError?.message?.includes("Too many");
    return reply(rateLimited ? "Too many evidence requests" : "Evidence unavailable", rateLimited ? 429 : 403);
  }

  const leaseToken = context.lease_token;
  try {
    const { data: blob, error: downloadError } = await serviceClient.storage
      .from("trade-evidence")
      .download(context.storage_path);
    if (downloadError || !blob) return reply("Evidence unavailable", 404);

    const bytes = await blob.arrayBuffer();
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
    if (!context.evidence_sha256 || digest !== context.evidence_sha256) {
      return reply("Evidence integrity check failed", 409);
    }

    const originalType = allowedTypes.has(context.mime_type) ? context.mime_type : "application/octet-stream";
    const filename = safeName(context.file_name);

    // functions.invoke parses application/octet-stream as Blob. The original validated
    // MIME is metadata only; attachment remains the default browser behavior.
    return reply(bytes, 200, {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      "X-Evidence-Content-Type": originalType,
      "X-Evidence-File-Name": encodeURIComponent(filename),
      "Cache-Control": "private, no-store",
      "Pragma": "no-cache"
    });
  } finally {
    if (leaseToken) {
      await userClient.rpc("complete_evidence_delivery", { target_lease: leaseToken });
    }
  }
});
