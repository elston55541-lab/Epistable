import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const roles = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "inspector", label: "Inspector" },
  { value: "buyer", label: "Buyer" },
];

export function AdminInviteLauncher() {
  const [caller, setCaller] = useState(null);
  const [factories, setFactories] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "admin", factoryId: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData?.session?.user;
      if (!authUser || !active) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id,role,status,factory_id,factory_name")
        .eq("auth_user_id", authUser.id)
        .maybeSingle();

      if (!active || !profile || profile.status !== "active" || !["owner", "admin"].includes(profile.role)) return;
      setCaller(profile);

      if (profile.role === "owner") {
        const { data } = await supabase.from("factories").select("id,name").order("name");
        if (active) setFactories(data || []);
      } else if (profile.factory_id) {
        setFactories([{ id: profile.factory_id, name: profile.factory_name || "Factory" }]);
        setForm((f) => ({ ...f, factoryId: profile.factory_id }));
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const selectedFactory = useMemo(
    () => factories.find((f) => f.id === form.factoryId),
    [factories, form.factoryId]
  );

  if (!caller) return null;

  async function sendInvite(e) {
    e?.preventDefault?.();
    const email = form.email.trim().toLowerCase();
    const name = form.name.trim();
    if (!email || !name) {
      setError("Name and email are required.");
      return;
    }
    if (caller.role !== "owner" && !form.factoryId) {
      setError("Your account is not linked to a factory.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("admin-invite", {
        body: {
          name,
          email,
          role: form.role,
          factory_id: form.factoryId || null,
          factory_name: selectedFactory?.name || null,
          redirect_to: `${window.location.origin}/invite`,
        },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      setMessage(`Invite sent to ${email}.`);
      setForm((f) => ({ ...f, name: "", email: "" }));
    } catch (err) {
      setError(err?.message || "Could not send invitation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setMessage(""); setError(""); }}
        style={{
          position: "fixed", right: 20, bottom: 20, zIndex: 9997,
          border: 0, borderRadius: 10, padding: "11px 16px",
          background: "#0057a8", color: "white", fontWeight: 700,
          boxShadow: "0 8px 24px rgba(0,0,0,.18)", cursor: "pointer",
        }}
      >
        + Invite User
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(15,23,42,.46)", display: "grid", placeItems: "center", padding: 20 }}>
          <form onSubmit={sendInvite} style={{ width: "min(440px,100%)", background: "white", borderRadius: 14, padding: 22, boxShadow: "0 20px 60px rgba(0,0,0,.24)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#172033" }}>Invite Epistable User</div>
                <div style={{ fontSize: 12, color: "#667085", marginTop: 3 }}>Supabase sends a secure account invitation.</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} disabled={busy} style={{ border: 0, background: "transparent", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>

            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Full name</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" style={inputStyle} />

            <label style={{ display: "block", fontSize: 12, fontWeight: 700, margin: "14px 0 6px" }}>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="name@company.com" style={inputStyle} />

            <label style={{ display: "block", fontSize: 12, fontWeight: 700, margin: "14px 0 6px" }}>Role</label>
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} style={inputStyle}>
              {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>

            {caller.role === "owner" && (
              <>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, margin: "14px 0 6px" }}>Factory</label>
                <select value={form.factoryId} onChange={(e) => setForm((f) => ({ ...f, factoryId: e.target.value }))} style={inputStyle}>
                  <option value="">No factory</option>
                  {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </>
            )}

            {error && <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 8, background: "#fff1f2", color: "#b42318", fontSize: 12 }}>{error}</div>}
            {message && <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 8, background: "#ecfdf3", color: "#067647", fontSize: 12 }}>{message}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 18 }}>
              <button type="button" onClick={() => setOpen(false)} disabled={busy} style={secondaryButton}>Cancel</button>
              <button type="submit" disabled={busy || !form.name.trim() || !form.email.trim()} style={{ ...primaryButton, opacity: busy ? .65 : 1 }}>{busy ? "Sending…" : "Send Invite"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box", border: "1px solid #d0d5dd", borderRadius: 8,
  padding: "11px 12px", fontSize: 13, background: "white", color: "#172033",
};
const primaryButton = { border: 0, borderRadius: 8, padding: "11px 13px", background: "#0057a8", color: "white", fontWeight: 700, cursor: "pointer" };
const secondaryButton = { border: "1px solid #d0d5dd", borderRadius: 8, padding: "11px 13px", background: "white", color: "#344054", fontWeight: 700, cursor: "pointer" };
