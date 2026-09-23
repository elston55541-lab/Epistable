import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedTypes = new Set(["application/pdf","image/jpeg","image/png","image/webp"]);

function safeName(value: string) {
  return (value || "evidence").replace(/[\r\n"\\]/g, "_").slice(0, 180);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return new Response("Evidence service unavailable", { status: 503 });

  let body: { document_id?: string } = {};
  try { body = await req.json(); } catch { return new Response("Invalid request", { status: 400 }); }
  if (!body.document_id) return new Response("Document is required", { status: 400 });

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false }
  });
  const serviceClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return new Response("Unauthorized", { status: 401 });

  const { data: context, error: contextError } = await userClient.rpc("authorize_evidence_delivery", {
    target_document_id: body.document_id
  });
  if (contextError || !context?.storage_path) {
    const rateLimited = contextError?.message?.includes("Too many");
    return new Response(rateLimited ? "Too many evidence requests" : "Evidence unavailable", {
      status: rateLimited ? 429 : 403
    });
  }

  const leaseToken = context.lease_token;
  try {
    const { data: blob, error: downloadError } = await serviceClient.storage
      .from("trade-evidence")
      .download(context.storage_path);
    if (downloadError || !blob) return new Response("Evidence unavailable", { status: 404 });

    const bytes = await blob.arrayBuffer();
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
    if (!context.evidence_sha256 || digest !== context.evidence_sha256) {
      return new Response("Evidence integrity check failed", { status: 409 });
    }

    const contentType = allowedTypes.has(context.mime_type) ? context.mime_type : "application/octet-stream";
    const filename = safeName(context.file_name);

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
        "Pragma": "no-cache"
      }
    });
  } finally {
    if (leaseToken) {
      await userClient.rpc("complete_evidence_delivery", { target_lease: leaseToken });
    }
  }
});
