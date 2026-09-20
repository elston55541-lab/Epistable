# Epistable DeepSeek Code Bundle — Part 02: Components & Libraries A
Snapshot: 31d78c0ee3bd70f7a934b44140549048a41e6a01


===== FILE: src/components/AdminInviteLauncher.jsx =====
```jsx
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

```

===== FILE: src/components/EvidenceUploadModal.jsx =====
```jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { C } from "../lib/domain";
import { FONT_STACK, RADIUS, SPACE } from "../lib/tokens";
import { Btn, Inp, Modal, Sel, T } from "./ui";
import { Icon } from "./Icon";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const BUCKET = "factory_evidence";

function sanitizeFilename(name) {
  return name.replace(/[^A-Za-z0-9._-]/g, "_").replace(/_{2,}/g, "_");
}

function bytesLabel(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

function toDateInput(ts) {
  return ts ? new Date(ts).toISOString().slice(0, 10) : "";
}

function toTs(v) {
  return v ? new Date(`${v}T00:00:00`).getTime() : null;
}

function addMonths(ts, months) {
  const d = new Date(ts);
  d.setMonth(d.getMonth() + months);
  return d.getTime();
}

export function EvidenceUploadModal({ req, evidence, bodies, factoryId, onClose, onSave, saving }) {
  const renewalMonths = req?.renewalPeriodMonths || req?.renewal_period_months || null;
  const isExistingPath = evidence?.file_url && !/^https?:\/\//i.test(evidence.file_url);

  const [form, setForm] = useState({
    certificateNumber: evidence?.certificate_number || "",
    issuingBodyId: evidence?.issuing_body_id || "",
    issuedAt: toDateInput(evidence?.issued_at),
    expiresAt: toDateInput(evidence?.expires_at),
    notes: evidence?.notes || "",
  });
  const [otherBody, setOtherBody] = useState(evidence?.metadata?.issuingBodyName || "");
  const [showOther, setShowOther] = useState(false);
  const [filePath, setFilePath] = useState(isExistingPath ? evidence.file_url : "");
  const [fileName, setFileName] = useState(
    evidence?.metadata?.fileName || (isExistingPath ? evidence.file_url.split("/").pop() : "")
  );
  const [fileSize, setFileSize] = useState(0);
  const [upload, setUpload] = useState({ status: "idle", error: "" });
  const [linkMode, setLinkMode] = useState(false);
  const [pasteUrl, setPasteUrl] = useState(
    evidence?.file_url && /^https?:\/\//i.test(evidence.file_url) ? evidence.file_url : ""
  );
  const [autoFilled, setAutoFilled] = useState(false);

  // Auto-fill expires_at from renewal period when issued date is entered and expiry is empty
  useEffect(() => {
    if (!form.issuedAt || form.expiresAt || !renewalMonths || autoFilled) return;
    const issuedTs = toTs(form.issuedAt);
    if (!issuedTs) return;
    setForm(prev => ({ ...prev, expiresAt: toDateInput(addMonths(issuedTs, renewalMonths)) }));
    setAutoFilled(true);
  }, [form.issuedAt, form.expiresAt, renewalMonths, autoFilled]);

  const bodyOptions = useMemo(() => [
    { value: "", label: "Select issuing body" },
    ...bodies.map(b => ({ value: b.id, label: b.name })),
    { value: "__other__", label: "Other..." },
  ], [bodies]);

  function onBodyChange(v) {
    if (v === "__other__") {
      setShowOther(true);
      setForm(prev => ({ ...prev, issuingBodyId: "" }));
    } else {
      setShowOther(false);
      setOtherBody("");
      setForm(prev => ({ ...prev, issuingBodyId: v }));
    }
  }

  async function handleFileSelected(file) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setUpload({ status: "error", error: `File is too large (${bytesLabel(file.size)}). Max 10 MB.` });
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUpload({ status: "error", error: "Unsupported file type. Use PDF, JPEG, PNG, or WebP." });
      return;
    }
    if (!factoryId || !req?.id) {
      setUpload({ status: "error", error: "Cannot upload — factory or requirement context is missing." });
      return;
    }
    setUpload({ status: "uploading", error: "" });
    try {
      const safe = sanitizeFilename(file.name);
      const path = `${factoryId}/${req.id}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      setFilePath(path);
      setFileName(file.name);
      setFileSize(file.size);
      setUpload({ status: "uploaded", error: "" });
    } catch (e) {
      console.error("Evidence upload failed", e);
      setUpload({ status: "error", error: e.message || "Upload failed. Try again." });
    }
  }

  function removeFile() {
    setFilePath("");
    setFileName("");
    setFileSize(0);
    setUpload({ status: "idle", error: "" });
  }

  function switchToLink() {
    setLinkMode(true);
    removeFile();
  }

  function switchToUpload() {
    setLinkMode(false);
    setPasteUrl("");
  }

  function handleSubmit() {
    const finalFileUrl = linkMode ? (pasteUrl.trim() || null) : (filePath || null);
    const metadata = { ...(evidence?.metadata || {}) };
    if (showOther && otherBody.trim()) metadata.issuingBodyName = otherBody.trim();
    else delete metadata.issuingBodyName;
    if (!linkMode && fileName) metadata.fileName = fileName;
    if (linkMode) delete metadata.fileName;

    onSave({
      status: "submitted",
      certificateNumber: form.certificateNumber || null,
      issuingBodyId: form.issuingBodyId || null,
      issuedAt: toTs(form.issuedAt),
      expiresAt: toTs(form.expiresAt),
      fileUrl: finalFileUrl,
      notes: form.notes,
      metadata: Object.keys(metadata).length ? metadata : undefined,
    });
  }

  const uploading = upload.status === "uploading";
  const hasEvidence = !!(filePath || pasteUrl.trim() || form.certificateNumber.trim() || form.notes.trim());
  const canSubmit = !saving && !uploading && hasEvidence;

  return (
    <Modal
      title={`Submit evidence - ${req.shortName || req.requirementName}`}
      onClose={uploading ? undefined : onClose}
      closeOnBackdrop={false}
    >
      <div style={{ display: "grid", gap: SPACE.base }}>
        <div style={{ fontSize: 13, lineHeight: 1.65, color: C.textMid }}>
          {req.evidence_instructions ||
            "Upload the certificate, report, or supporting document. This is submitted evidence — Epistable organises it, but does not issue certifications."}
        </div>

        {/* Upload area or paste-link area */}
        {!linkMode && (
          <div>
            <label style={{ display: "block", color: C.text, marginBottom: SPACE.sm, ...T.label }}>
              Document file
            </label>
            {filePath ? (
              <div
                style={{
                  border: `1px solid ${C.greenBorder}`,
                  background: C.greenBg,
                  borderRadius: RADIUS.md,
                  padding: SPACE.md,
                  display: "flex",
                  gap: SPACE.sm,
                  alignItems: "center",
                }}
              >
                <Icon name="check" size={18} color={C.green} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fileName || "Uploaded file"}
                  </div>
                  <div style={{ fontSize: 11, color: C.textDim }}>
                    {fileSize ? `${bytesLabel(fileSize)} uploaded` : "Saved evidence file"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  disabled={uploading || saving}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: C.red,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: FONT_STACK,
                  }}
                >
                  Replace
                </button>
              </div>
            ) : (
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `2px dashed ${upload.status === "error" ? C.redBorder : C.border}`,
                  borderRadius: RADIUS.md,
                  padding: `${SPACE.xl}px ${SPACE.md}px`,
                  cursor: uploading ? "wait" : "pointer",
                  background: C.surface,
                  gap: SPACE.sm,
                  textAlign: "center",
                }}
              >
                <Icon name={uploading ? "refresh" : "upload"} size={22} color={C.primary} />
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                  {uploading ? "Uploading..." : "Choose a file to upload"}
                </div>
                <div style={{ fontSize: 11, color: C.textDim }}>
                  PDF, JPEG, PNG, or WebP · up to 10 MB
                </div>
                <input
                  type="file"
                  accept={ACCEPTED_TYPES.join(",")}
                  onChange={e => handleFileSelected(e.target.files?.[0])}
                  disabled={uploading}
                  style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }}
                />
              </label>
            )}
            {upload.error && (
              <div
                style={{
                  background: C.redBg,
                  border: `1px solid ${C.redBorder}`,
                  borderRadius: RADIUS.md,
                  padding: `${SPACE.sm}px ${SPACE.md}px`,
                  fontSize: 12,
                  color: C.red,
                  marginTop: SPACE.sm,
                }}
              >
                {upload.error}
              </div>
            )}
            <button
              type="button"
              onClick={switchToLink}
              disabled={uploading}
              style={{
                marginTop: SPACE.sm,
                background: "transparent",
                border: "none",
                color: C.primary,
                fontSize: 12,
                fontWeight: 600,
                cursor: uploading ? "not-allowed" : "pointer",
                padding: 0,
                fontFamily: FONT_STACK,
              }}
            >
              Or paste a link to an externally hosted document
            </button>
          </div>
        )}

        {linkMode && (
          <div>
            <Inp
              label="Document URL"
              value={pasteUrl}
              onChange={setPasteUrl}
              placeholder="https://..."
            />
            <button
              type="button"
              onClick={switchToUpload}
              style={{
                marginTop: SPACE.sm,
                background: "transparent",
                border: "none",
                color: C.primary,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
                fontFamily: FONT_STACK,
              }}
            >
              Upload a file instead
            </button>
          </div>
        )}

        <Inp
          label="Certificate / document number"
          value={form.certificateNumber}
          onChange={v => setForm(p => ({ ...p, certificateNumber: v }))}
          placeholder="e.g. IEC number, certificate ID, test report no."
        />

        <div>
          <Sel
            label="Issuing body"
            value={showOther ? "__other__" : form.issuingBodyId}
            onChange={onBodyChange}
            options={bodyOptions}
          />
          {showOther && (
            <div style={{ marginTop: SPACE.sm }}>
              <Inp
                label="Issuing body name"
                value={otherBody}
                onChange={setOtherBody}
                placeholder="Enter the body name"
              />
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SPACE.md }}>
          <Inp
            label="Issued date"
            type="date"
            value={form.issuedAt}
            onChange={v => setForm(p => ({ ...p, issuedAt: v }))}
          />
          <Inp
            label={renewalMonths ? `Valid until (${renewalMonths}-mo renewal)` : "Valid until"}
            type="date"
            value={form.expiresAt}
            onChange={v => setForm(p => ({ ...p, expiresAt: v }))}
          />
        </div>

        <div>
          <label style={{ display: "block", color: C.text, marginBottom: SPACE.sm, ...T.label }}>
            Notes
          </label>
          <textarea
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            rows={3}
            placeholder="Scope, product covered, or what an auditor should know"
            style={{
              width: "100%",
              padding: 12,
              border: `1.5px solid ${C.border}`,
              borderRadius: 10,
              boxSizing: "border-box",
              fontFamily: FONT_STACK,
              fontSize: 14,
              color: C.text,
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Btn variant="secondary" onClick={onClose} disabled={saving || uploading}>
            Cancel
          </Btn>
          <Btn onClick={handleSubmit} disabled={!canSubmit}>
            {saving ? "Saving..." : "Submit evidence"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

```

===== FILE: src/components/Icon.jsx =====
```jsx
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  Box,
  Building2,
  CalendarDays,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  Factory,
  FileText,
  Filter,
  Image as ImageIcon,
  IndianRupee,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  MoreHorizontal,
  Package,
  Pause,
  Phone,
  Play,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  Truck,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";

const MAP = {
  factory: Factory,
  user: User,
  users: Users,
  search: Search,
  bell: Bell,
  check: Check,
  close: X,
  alert: AlertTriangle,
  camera: Camera,
  image: ImageIcon,
  qr: QrCode,
  copy: Copy,
  print: Printer,
  download: Download,
  upload: Upload,
  next: ChevronRight,
  prev: ChevronLeft,
  pause: Pause,
  play: Play,
  add: Plus,
  remove: Minus,
  verified: ShieldCheck,
  building: Building2,
  package: Package,
  trend: TrendingUp,
  chart: BarChart3,
  list: ClipboardList,
  date: CalendarDays,
  mail: Mail,
  phone: Phone,
  message: MessageCircle,
  bot: Bot,
  settings: Settings,
  billing: CreditCard,
  currency: IndianRupee,
  truck: Truck,
  box: Box,
  location: MapPin,
  arrow: ArrowRight,
  show: Eye,
  hide: EyeOff,
  filter: Filter,
  refresh: RefreshCw,
  more: MoreHorizontal,
  file: FileText,
};

export function Icon({ name, size = 16, color = "currentColor", strokeWidth = 1.75, style }) {
  const Cmp = MAP[name];
  if (!Cmp) return null;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} style={style} />;
}


```

===== FILE: src/components/OverflowMenu.jsx =====
```jsx
import { useEffect, useRef, useState } from "react";
import { C } from "../lib/domain";
import { FONT_STACK, RADIUS, SHADOW, SPACE, TYPE } from "../lib/tokens";
import { Icon } from "./Icon";

export function OverflowMenu({ items = [], label = "More actions" }) {
  const [open,setOpen]=useState(false);
  const ref=useRef(null);

  useEffect(()=>{
    function onDoc(e) {
      if(ref.current && !ref.current.contains(e.target))setOpen(false);
    }
    document.addEventListener("mousedown",onDoc);
    return ()=>document.removeEventListener("mousedown",onDoc);
  },[]);

  return (
    <div ref={ref} style={{position:"relative",display:"inline-block"}}>
      <button
        type="button"
        onClick={()=>setOpen(o=>!o)}
        aria-label={label}
        style={{
          background:"transparent",border:`1px solid ${C.border}`,
          borderRadius:RADIUS.md,padding:"6px 8px",cursor:"pointer",
          display:"inline-flex",alignItems:"center",fontFamily:FONT_STACK,
        }}
      >
        <Icon name="more" size={14}/>
      </button>
      {open&&(
        <div style={{
          position:"absolute",right:0,top:"100%",marginTop:4,
          background:C.white,border:`1px solid ${C.border}`,
          borderRadius:RADIUS.md,boxShadow:SHADOW.raised,
          minWidth:180,zIndex:50,padding:SPACE.xs,
        }}>
          {items.map((it,i)=>(
            <button
              key={i}
              onClick={()=>{setOpen(false);it.onClick?.();}}
              disabled={it.disabled}
              style={{
                display:"block",width:"100%",textAlign:"left",
                padding:`${SPACE.sm}px ${SPACE.md}px`,background:"transparent",
                border:"none",borderRadius:RADIUS.sm,cursor:"pointer",
                fontFamily:FONT_STACK,fontSize:TYPE.label.size,
                color:it.tone==="danger"?C.red:C.text,
                opacity:it.disabled?0.5:1,
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

```

===== FILE: src/components/Pill.jsx =====
```jsx
import { C } from "../lib/domain";
import { RADIUS, SPACE, TYPE, WEIGHT } from "../lib/tokens";

const TONES = {
  neutral: { color: C.textMid, bg: C.surface, border: C.border },
  primary: { color: C.primary, bg: C.primaryBg, border: C.primaryBorder },
  accent: { color: C.accent, bg: C.accentBg, border: C.accentBorder },
  success: { color: C.green, bg: C.greenBg, border: C.greenBorder },
  warning: { color: C.amber, bg: C.amberBg, border: C.amberBorder },
  danger: { color: C.red, bg: C.redBg, border: C.redBorder },
  info: { color: C.blue, bg: C.blueBg, border: C.blueBorder },
};

export function Pill({ tone = "neutral", children, icon, size = "md", style }) {
  const t = TONES[tone] || TONES.neutral;
  const pad = size === "sm" ? `${SPACE.xs}px ${SPACE.sm + 2}px` : `${SPACE.xs + 1}px ${SPACE.md}px`;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: SPACE.xs + 1,
        background: t.bg,
        border: `1px solid ${t.border}`,
        color: t.color,
        padding: pad,
        borderRadius: RADIUS.pill,
        whiteSpace: "nowrap",
        fontSize: TYPE.caption.size,
        fontWeight: WEIGHT.medium,
        lineHeight: 1.3,
        letterSpacing: TYPE.caption.letterSpacing,
        ...style,
      }}
    >
      {icon}
      {children}
    </span>
  );
}


```

===== FILE: src/components/QualityReport.jsx =====
```jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { C, gradeConf, fmtMoney } from "../lib/domain";
import { FONT_STACK } from "../lib/tokens";
import { useBP } from "../hooks/useBP";
import { Btn, Card, Loader } from "./ui";
import { Icon } from "./Icon";

const asList = value => Array.isArray(value) ? value : [];
const asObject = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const normalizePhoto = (photo,idx) => typeof photo === "string" ? {src:photo,label:idx===0?"Primary photo":`Evidence ${idx+1}`} : photo;

function ReportError({title,msg}) {
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT_STACK,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <Card style={{padding:24,maxWidth:440,textAlign:"center"}}>
        <div style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:8}}>{title}</div>
        <div style={{fontSize:13,color:C.textMid,lineHeight:1.65,marginBottom:16}}>{msg}</div>
        <Btn onClick={()=>window.location.assign("/")}>Go to Epistable</Btn>
      </Card>
    </div>
  );
}

function Field({label,value}) {
  return (
    <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 14px"}}>
      <div style={{fontSize:10.5,fontWeight:750,color:C.textDim,textTransform:"uppercase",letterSpacing:.4,marginBottom:5}}>{label}</div>
      <div style={{fontSize:14,fontWeight:800,color:C.text,lineHeight:1.25}}>{value || "Not recorded"}</div>
    </div>
  );
}

function ScoreBar({label,value,color=C.green}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderTop:`1px solid ${C.border}`}}>
      <div style={{fontSize:12.5,fontWeight:650,color:C.text,flex:"0 0 43%"}}>{label}</div>
      <div style={{flex:1,height:7,borderRadius:999,background:C.primaryBg,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${Math.min(Math.max(value,0),100)}%`,borderRadius:999,background:color}}/>
      </div>
      <div style={{fontSize:12,fontWeight:850,color:C.primaryD,width:34,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{value}</div>
    </div>
  );
}

function PlaceholderSlab({children}) {
  return (
    <div style={{position:"relative",height:"100%",minHeight:210,background:"linear-gradient(145deg,#fbfcfd 0%,#edf3f8 54%,#dce6ef 100%)",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(116deg,transparent 0 55%,rgba(74,85,104,.13) 56%,transparent 58%),linear-gradient(151deg,transparent 0 66%,rgba(74,85,104,.10) 67%,transparent 69%)"}}/>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(255,255,255,0) 0 52%,rgba(0,63,122,.14) 100%)"}}/>
      {children}
    </div>
  );
}

export function QualityReport({slabId}) {
  const [slab,setSlab]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [copied,setCopied]=useState(false);
  const [inq,setInq]=useState({name:"",company:"",email:"",phone:"",areaSqFt:"",message:""});
  const [inqBusy,setInqBusy]=useState(false);
  const [inqSent,setInqSent]=useState(false);
  const [inqError,setInqError]=useState("");
  const {isMobile}=useBP();

  useEffect(()=>{
    let active=true;
    async function load(){
      setLoading(true);setError("");
      try {
        const {data,error}=await supabase.rpc("get_public_slab_certificate",{slab_id:slabId});
        if(!active)return;
        if(error){setError(error.message||"Unable to load this quality report.");setLoading(false);return;}
        const row=Array.isArray(data)?data[0]:data;
        if(!row){setError("No verified slab was found for this report.");setLoading(false);return;}
        setSlab(row);setLoading(false);
      } catch(e) {
        if(active){setError(e.message||"Unable to load this quality report.");setLoading(false);}
      }
    }
    load();
    return()=>{active=false;};
  },[slabId]);

  const measurements=useMemo(()=>asObject(slab?.measurements),[slab]);
  const trace=useMemo(()=>asObject(measurements.traceability),[measurements]);
  const audit=useMemo(()=>asObject(measurements.audit),[measurements]);
  const defects=useMemo(()=>asList(slab?.defects),[slab]);
  const photos=useMemo(()=>asList(slab?.photos).map(normalizePhoto).filter(p=>p?.src),[slab]);

  if(loading)return <Loader/>;
  if(error)return <ReportError title="Quality report unavailable" msg={error}/>;

  const g=gradeConf(slab.grade);
  const photo=slab.photo || photos[0]?.src;
  const evidenceCount=photos.length || (photo ? 1 : 0);
  const traceCount=["quarrySource","batchNo","blockNo","productionLine","operator","containerNo","customerRef"].filter(k=>trace[k]).length;
  const auditCount=["calibrationChecked","checklistComplete","rootCause","correctiveAction","actionOwner","actionDue"].filter(k=>audit[k]).length;
  const exportScore=Math.round(((traceCount/7)*100+(auditCount/6)*100+(evidenceCount?100:0))/3);
  const qualityScores=[
    {label:"Colour consistency",value:slab.grade==="Premium"?92:slab.grade==="Standard"?82:68,color:slab.grade==="Commercial"?C.amber:C.green},
    {label:"Surface finish",value:Number(measurements.polish)?Math.min(100,Math.round(Number(measurements.polish)/5*100)):slab.grade==="Premium"?88:76,color:C.green},
    {label:"Structural integrity",value:defects.some(d=>String(d).toLowerCase().includes("crack"))?58:95,color:defects.some(d=>String(d).toLowerCase().includes("crack"))?C.red:C.green},
    {label:"Dimensional accuracy",value:measurements.thickness?84:70,color:measurements.thickness?C.green:C.amber},
  ];
  const reportUrl=window.location.href;
  const canInquire=(slab.inventory_status||"available")==="available";
  const inquiryReady=inq.name.trim()&&(inq.email.trim()||inq.phone.trim());
  const areaSqFt=Number(inq.areaSqFt);
  const quoteEstimate=Number.isFinite(areaSqFt)&&areaSqFt>0 ? Math.round(areaSqFt*Number(slab.price_per_sq_ft||0)) : 0;
  const batchLabel=trace.batchNo || slab.id;

  async function copyReport(){
    const text=[
      `Quality report: ${slab.stone}`,
      `Grade: ${slab.grade}`,
      `Export readiness: ${exportScore}%`,
      `Supplier: ${slab.factory_name}`,
      `Batch: ${batchLabel}`,
      `Link: ${reportUrl}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(()=>setCopied(false),1600);
    } catch(e) {
      window.prompt("Copy quality report",text);
    }
  }

  async function submitInquiry(){
    if(!inquiryReady||inqBusy)return;
    setInqBusy(true);setInqError("");
    const message=[
      inq.areaSqFt.trim()?`Area required: ${inq.areaSqFt.trim()} sq ft`:"",
      quoteEstimate?`Estimated slab value: ${fmtMoney(quoteEstimate)}`:"",
      inq.message.trim(),
      inq.phone.trim()?`Phone: ${inq.phone.trim()}`:"",
      `Quality report: ${reportUrl}`,
    ].filter(Boolean).join("\n\n");
    const {error}=await supabase.rpc("create_public_slab_inquiry",{
      slab_id:slab.id,
      buyer_name:inq.name.trim(),
      buyer_company:inq.company.trim(),
      buyer_email:inq.email.trim(),
      buyer_message:message,
    });
    if(error){setInqError(error.message||"Unable to send inquiry.");setInqBusy(false);return;}
    setInqSent(true);setInqBusy(false);
  }

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(180deg,#f8f9fb 0%,#f0f2f5 44%,#eef3f8 100%)",fontFamily:FONT_STACK,color:C.text,paddingBottom:92}}>
      <div style={{position:"sticky",top:0,zIndex:20,display:"flex",alignItems:"center",gap:12,padding:"14px 16px",background:"rgba(248,249,251,.94)",backdropFilter:"blur(10px)",borderBottom:`1px solid ${C.border}`}}>
        <button onClick={()=>{if(window.history.length>1)window.history.back();else window.location.assign("/");}} aria-label="Back" style={{width:36,height:36,borderRadius:10,border:`1px solid ${C.border}`,background:C.white,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 1px 3px rgba(10,37,64,.04)"}}>
          <Icon name="prev" size={18} color={C.primaryD}/>
        </button>
        <div style={{fontSize:14,fontWeight:850,color:C.primaryD}}>
          Quality Report
          <div style={{fontSize:10.5,fontWeight:500,color:C.textDim,fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace"}}>{slab.factory_name}</div>
        </div>
        <button onClick={copyReport} aria-label="Share report" style={{marginLeft:"auto",width:36,height:36,borderRadius:10,border:`1px solid ${C.border}`,background:C.white,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 1px 3px rgba(10,37,64,.04)"}}>
          <Icon name={copied?"check":"upload"} size={18} color={copied?C.green:C.primaryD}/>
        </button>
      </div>

      <main style={{width:"100%",maxWidth:480,margin:"0 auto"}}>
        <section style={{padding:"22px 18px 0"}}>
          <div style={{height:318,border:`1px solid ${C.primaryBorder}`,borderRadius:16,boxShadow:"0 4px 16px rgba(10,37,64,.10)",position:"relative",overflow:"hidden",background:C.white}}>
            {photo?<img src={photo} alt={slab.stone} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>:<PlaceholderSlab/>}
            <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(255,255,255,0) 0 52%,rgba(0,63,122,.14) 100%)",pointerEvents:"none"}}/>
            <div style={{position:"absolute",top:14,left:14,display:"inline-flex",alignItems:"center",gap:6,fontSize:10,fontWeight:850,color:C.green,background:"rgba(255,255,255,.9)",border:`1px solid ${C.greenBorder}`,padding:"6px 10px",borderRadius:999}}>
              <Icon name="verified" size={11}/>{slab.export_ready?"Export ready":"Epistable graded"}
            </div>
            <div style={{position:"absolute",right:14,top:14,fontSize:10,fontWeight:750,color:C.primaryD,background:"rgba(255,255,255,.78)",padding:"6px 10px",borderRadius:999}}>{batchLabel}</div>
            <div style={{position:"absolute",left:14,right:14,bottom:14,background:"rgba(255,255,255,.94)",border:`1px solid ${C.primaryBorder}`,borderRadius:14,padding:14,display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"end",boxShadow:"0 4px 16px rgba(10,37,64,.08)"}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:23,fontWeight:850,color:C.primaryD,lineHeight:1.05}}>{slab.stone}</div>
                <div style={{fontSize:10.5,color:C.textMid,marginTop:5,fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace"}}>{evidenceCount || "No"} photo{evidenceCount===1?"":"s"} - {slab.grade} - {slab.date || "date not recorded"}</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <div style={{minWidth:62,borderRadius:10,background:C.primaryBg,padding:"8px 9px",textAlign:"center"}}>
                  <strong style={{display:"block",fontSize:17,lineHeight:1,color:C.primaryD}}>{String(slab.grade||"A").slice(0,1)}</strong>
                  <span style={{display:"block",fontSize:9.5,fontWeight:750,color:C.primary,marginTop:4}}>Quality</span>
                </div>
                <div style={{minWidth:62,borderRadius:10,background:C.primaryBg,padding:"8px 9px",textAlign:"center"}}>
                  <strong style={{display:"block",fontSize:17,lineHeight:1,color:C.primaryD}}>{exportScore}%</strong>
                  <span style={{display:"block",fontSize:9.5,fontWeight:750,color:C.primary,marginTop:4}}>Export</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{margin:"10px 4px 0",display:"flex",alignItems:"flex-start",gap:7,color:C.textMid,fontSize:11,lineHeight:1.45}}>
            <Icon name="alert" size={13} color={C.primary} style={{flex:"none",marginTop:1}}/>AI grade from seller images. Documents checked separately.
          </div>
        </section>

        <section style={{padding:"22px 18px 0"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,margin:"0 2px 12px"}}>
            <h2 style={{fontSize:15,fontWeight:850,color:C.primaryD,margin:0}}>Specifications</h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
            <Field label="Dimensions" value={measurements.length&&measurements.width?`${measurements.length} x ${measurements.width} cm`:"Not recorded"}/>
            <Field label="Thickness" value={measurements.thickness?`${measurements.thickness} mm`:"Not recorded"}/>
            <Field label="Finish" value={measurements.surfaceFinish || measurements.finish || "Polished"}/>
            <Field label="Price" value={`${fmtMoney(slab.price_per_sq_ft||0)} / sqft`}/>
          </div>
        </section>

        <section style={{padding:"22px 18px 0"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,margin:"0 2px 12px"}}>
            <h2 style={{fontSize:15,fontWeight:850,color:C.primaryD,margin:0}}>Grade breakdown</h2>
            <span style={{marginLeft:"auto",fontSize:11,color:C.textDim,fontWeight:650,fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace"}}>{g.label}</span>
          </div>
          <Card style={{borderRadius:14,padding:18}}>
            {qualityScores.map((s,i)=><ScoreBar key={s.label} label={s.label} value={s.value} color={s.color} style={{borderTop:i?undefined:"none"}}/>)}
          </Card>
        </section>

        <section style={{padding:"22px 18px 0"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,margin:"0 2px 12px"}}>
            <h2 style={{fontSize:15,fontWeight:850,color:C.primaryD,margin:0}}>Defect analysis</h2>
            <span style={{marginLeft:"auto",fontSize:11,color:C.textDim,fontWeight:650,fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace"}}>{defects.length ? `${defects.length} found` : "Clear"}</span>
          </div>
          <Card style={{borderRadius:14,padding:18}}>
            <div style={{height:170,borderRadius:12,position:"relative",overflow:"hidden",background:"linear-gradient(135deg,#f6f8fb 0%,#d4dce7 46%,#edf2f7 100%)",marginBottom:14}}>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent 0 24%,rgba(0,87,168,.08) 25% 26%,transparent 27% 61%,rgba(0,151,167,.08) 62% 63%,transparent 64% 100%)"}}/>
              {defects.slice(0,3).map((d,i)=><span key={`${d}-${i}`} style={{position:"absolute",left:`${34+i*18}%`,top:`${40+(i%2)*18}%`,width:22,height:22,borderRadius:"50%",border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:850,color:"#fff",transform:"translate(-50%,-50%)",boxShadow:"0 3px 8px rgba(0,0,0,.28)",zIndex:2,background:i?C.blue2:C.amber}}>{i+1}</span>)}
              <span style={{position:"absolute",left:10,bottom:10,fontSize:9.5,fontWeight:750,color:C.primaryD,background:"rgba(255,255,255,.86)",padding:"4px 9px",borderRadius:7,zIndex:2}}>Current slab map</span>
            </div>
            {defects.length?defects.map((d,i)=><div key={`${d}-${i}`} style={{display:"flex",alignItems:"center",gap:11,padding:"11px 0",borderTop:i?`1px solid ${C.border}`:"none"}}>
              <span style={{width:9,height:9,borderRadius:"50%",background:i?C.blue2:C.amber,flex:"none"}}/>
              <span style={{flex:1,fontSize:13,fontWeight:650,color:C.primaryD,textTransform:"capitalize"}}>{d}</span>
              <span style={{fontSize:10,fontWeight:850,textTransform:"uppercase",letterSpacing:.4,padding:"3px 8px",borderRadius:6,color:i?C.blue2:C.amber,background:i?C.blue2Bg:C.amberBg}}>{i?"Trace":"Minor"}</span>
            </div>):<div style={{fontSize:13,fontWeight:700,color:C.green}}>No defects recorded</div>}
          </Card>
        </section>

        <section style={{padding:"22px 18px 0"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,margin:"0 2px 12px"}}>
            <h2 style={{fontSize:15,fontWeight:850,color:C.primaryD,margin:0}}>Batch and source</h2>
            <span style={{marginLeft:"auto",fontSize:11,color:C.textDim,fontWeight:650,fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace"}}>{batchLabel}</span>
          </div>
          <Card style={{borderRadius:14,padding:18}}>
            {[
              ["Quarry / source",trace.quarrySource || "Not recorded"],
              ["Cut and polished",trace.productionLine || "Factory record"],
              ["QR-sealed and graded",`${traceCount}/7 trace fields recorded`],
            ].map(([title,meta],i)=><div key={title} style={{position:"relative",padding:`0 0 ${i===2?0:16}px 30px`}}>
              {i<2&&<span style={{position:"absolute",left:9,top:19,bottom:-2,width:2,background:`linear-gradient(${C.primary},${C.border})`}}/>}
              <span style={{position:"absolute",left:0,top:1,width:19,height:19,borderRadius:"50%",background:C.white,border:`2px solid ${C.primary}`,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="check" size={10} color={C.primary}/></span>
              <span style={{fontSize:13.5,fontWeight:800,color:C.primaryD}}>{title}</span>
              <span style={{display:"inline-block",fontSize:10,fontWeight:650,color:C.primaryD,background:C.primaryBg,padding:"2px 7px",borderRadius:5,marginLeft:7}}>{meta}</span>
            </div>)}
          </Card>
        </section>

        <section style={{padding:"22px 18px 0"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,margin:"0 2px 12px"}}>
            <h2 style={{fontSize:15,fontWeight:850,color:C.primaryD,margin:0}}>Compliance for this batch</h2>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            <div style={{display:"flex",alignItems:"center",gap:12,background:C.white,borderRadius:12,boxShadow:C.shadow,padding:"15px 16px",border:`1px solid ${C.border}`}}>
              <span style={{width:34,height:34,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flex:"none",background:slab.export_ready?C.greenBg:C.amberBg,color:slab.export_ready?C.green:C.amber}}><Icon name={slab.export_ready?"check":"alert"} size={17}/></span>
              <span style={{flex:1}}><span style={{display:"block",fontSize:13.5,fontWeight:800,color:C.primaryD}}>{slab.export_ready?"Export ready":"Export readiness partial"}</span><span style={{display:"block",fontSize:11.5,color:C.textMid,marginTop:1}}>{exportScore}% evidence readiness from photos, traceability, and audit fields</span></span>
              <Icon name="next" size={16} color={C.textDim}/>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12,background:C.white,borderRadius:12,boxShadow:C.shadow,padding:"15px 16px",border:`1px solid ${C.border}`}}>
              <span style={{width:34,height:34,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flex:"none",background:auditCount>=4?C.greenBg:C.amberBg,color:auditCount>=4?C.green:C.amber}}><Icon name={auditCount>=4?"file":"alert"} size={17}/></span>
              <span style={{flex:1}}><span style={{display:"block",fontSize:13.5,fontWeight:800,color:C.primaryD}}>Document checks</span><span style={{display:"block",fontSize:11.5,color:C.textMid,marginTop:1}}>{auditCount}/6 audit fields recorded for this slab</span></span>
              <Icon name="next" size={16} color={C.textDim}/>
            </div>
          </div>
        </section>

        <div style={{margin:"24px 18px 0",fontSize:11,color:C.textMid,lineHeight:1.55,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:12,padding:"13px 15px"}}>
          <b style={{color:C.primaryD}}>How to read this.</b> AI grade is based on seller images. Documents are checked separately. Request independent inspection before large orders.
        </div>
      </main>

      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,zIndex:30,background:"rgba(255,255,255,.93)",backdropFilter:"blur(10px)",borderTop:`1px solid ${C.border}`,padding:"12px 16px calc(12px + env(safe-area-inset-bottom))",display:"flex",gap:10}}>
        {inqSent?<button style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontWeight:750,fontSize:14.5,padding:14,borderRadius:12,cursor:"default",border:"none",background:C.green,color:C.white,fontFamily:FONT_STACK}}><Icon name="check" size={16}/>Quote requested</button>:
        <button disabled={!canInquire} onClick={()=>document.getElementById("quality-inquiry")?.scrollIntoView({behavior:"smooth",block:"center"})} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontWeight:750,fontSize:14.5,padding:14,borderRadius:12,cursor:canInquire?"pointer":"not-allowed",border:"none",background:canInquire?C.primary:C.border,color:canInquire?C.white:C.textDim,fontFamily:FONT_STACK,boxShadow:canInquire?"0 4px 16px rgba(0,87,168,.22)":"none"}}><Icon name="message" size={16}/>Request quote</button>}
        <button onClick={()=>window.print()} aria-label="Download report" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontWeight:750,fontSize:14.5,padding:"14px 16px",borderRadius:12,cursor:"pointer",border:`1px solid ${C.border}`,background:C.white,color:C.primaryD,fontFamily:FONT_STACK}}><Icon name="download" size={16}/></button>
        <button onClick={copyReport} aria-label="Share report" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontWeight:750,fontSize:14.5,padding:"14px 16px",borderRadius:12,cursor:"pointer",border:`1px solid ${C.border}`,background:C.white,color:C.primaryD,fontFamily:FONT_STACK}}><Icon name={copied?"check":"upload"} size={16}/></button>
      </div>

      <div id="quality-inquiry" style={{maxWidth:480,margin:"0 auto",padding:"22px 18px 112px"}}>
        <Card style={{borderRadius:14,padding:18}}>
          <div style={{fontSize:15,fontWeight:850,color:C.primaryD,marginBottom:10}}>Request quote</div>
          {!canInquire?<div style={{fontSize:13,color:C.textMid,lineHeight:1.6}}>This slab is not currently marked available. Open the supplier profile for alternatives.</div>:inqSent?<div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:12,padding:14,color:C.green,fontSize:13,fontWeight:750}}>Inquiry sent to {slab.factory_name}.</div>:<div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input value={inq.name} onChange={e=>setInq(p=>({...p,name:e.target.value}))} placeholder="Your name" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK}}/>
            <input value={inq.company} onChange={e=>setInq(p=>({...p,company:e.target.value}))} placeholder="Company (optional)" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK}}/>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
              <input value={inq.email} onChange={e=>setInq(p=>({...p,email:e.target.value}))} placeholder="Email" type="email" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,minWidth:0}}/>
              <input value={inq.phone} onChange={e=>setInq(p=>({...p,phone:e.target.value}))} placeholder="Phone" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,minWidth:0}}/>
            </div>
            <input value={inq.areaSqFt} onChange={e=>setInq(p=>({...p,areaSqFt:e.target.value.replace(/[^\d.]/g,"")}))} placeholder="Area required in sq ft (optional)" inputMode="decimal" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK}}/>
            {quoteEstimate>0&&<div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:"12px 14px",display:"flex",justifyContent:"space-between",gap:12}}><span style={{fontSize:12,fontWeight:700,color:C.green}}>Estimated value</span><span style={{fontSize:13,fontWeight:850,color:C.green}}>{fmtMoney(quoteEstimate)}</span></div>}
            <textarea value={inq.message} onChange={e=>setInq(p=>({...p,message:e.target.value}))} rows={3} placeholder="Message (quantity, timeline, destination...)" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,resize:"none"}}/>
            {inqError&&<div style={{fontSize:12,color:C.red,fontWeight:700}}>{inqError}</div>}
            <Btn full disabled={!inquiryReady||inqBusy} onClick={submitInquiry}>{inqBusy?"Sending...":"Send inquiry"}</Btn>
            <div style={{fontSize:11.5,color:C.textDim,lineHeight:1.5}}>Name and either email or phone are required.</div>
          </div>}
        </Card>
      </div>
    </div>
  );
}

```

===== FILE: src/components/SlabCertificate.jsx =====
```jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { C, gradeConf } from "../lib/domain";
import { useBP } from "../hooks/useBP";
import { Btn, Card, Loader, PBar } from "./ui";

const asList = value => Array.isArray(value) ? value : [];
const asObject = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const normalizePhoto = (photo,idx) => typeof photo === "string" ? {src:photo,label:idx===0?"Primary photo":`Evidence ${idx+1}`} : photo;
const invConf = status => ({
  available:{label:"Available",color:C.green,bg:C.greenBg,border:C.greenBorder},
  reserved:{label:"Reserved",color:C.amber,bg:C.amberBg,border:C.amberBorder},
  sold:{label:"Sold",color:C.red,bg:C.redBg,border:C.redBorder},
}[status]||{label:"Available",color:C.green,bg:C.greenBg,border:C.greenBorder});

function Field({label,value}) {
  return (
    <div style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
      <div style={{fontSize:12,fontWeight:600,color:C.textDim,textTransform:"uppercase",marginBottom:3}}>{label}</div>
      <div style={{fontSize:14,fontWeight:700,color:C.text}}>{value || "Not recorded"}</div>
    </div>
  );
}

function CertificateError({title,msg}) {
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <Card style={{padding:24,maxWidth:460,textAlign:"center"}}>
        <div style={{fontSize:18,fontWeight:700,marginBottom:8,color:C.text}}>{title}</div>
        <div style={{fontSize:13,color:C.textMid,lineHeight:1.7,marginBottom:16}}>{msg}</div>
        <Btn onClick={()=>window.location.assign("/")}>Go to Epistable</Btn>
      </Card>
    </div>
  );
}

export function SlabCertificate({slabId}) {
  const [slab,setSlab]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [inq,setInq]=useState({name:"",company:"",email:"",phone:"",areaSqFt:"",message:""});
  const [inqBusy,setInqBusy]=useState(false);
  const [inqSent,setInqSent]=useState(false);
  const [inqError,setInqError]=useState("");
  const [dispute,setDispute]=useState({name:"",company:"",email:"",phone:"",category:"wrong_grade",details:""});
  const [disputeBusy,setDisputeBusy]=useState(false);
  const [disputeSent,setDisputeSent]=useState(false);
  const [disputeError,setDisputeError]=useState("");
  const [copied,setCopied]=useState(false);
  const [summaryCopied,setSummaryCopied]=useState(false);
  const [auditNoteCopied,setAuditNoteCopied]=useState(false);
  const {isMobile}=useBP();

  useEffect(()=>{
    let active=true;
    async function load(){
      setLoading(true);setError("");
      try {
        const {data,error}=await supabase.rpc("get_public_slab_certificate",{slab_id:slabId});
        if(!active)return;
        if(error){setError(error.message||"Unable to load this slab certificate.");setLoading(false);return;}
        const row=Array.isArray(data)?data[0]:data;
        if(!row){setError("No verified slab was found for this QR code.");setLoading(false);return;}
        setSlab(row);setLoading(false);
      } catch(e) {
        if(active){setError(e.message||"Unable to load this slab certificate.");setLoading(false);}
      }
    }
    load();
    return()=>{active=false;};
  },[slabId]);

  const measurements=useMemo(()=>asObject(slab?.measurements),[slab]);
  const traceability=useMemo(()=>asObject(measurements.traceability),[measurements]);
  const audit=useMemo(()=>asObject(measurements.audit),[measurements]);
  const defects=useMemo(()=>asList(slab?.defects),[slab]);
  const photos=useMemo(()=>asList(slab?.photos).map(normalizePhoto).filter(p=>p?.src),[slab]);

  if(loading)return <Loader/>;
  if(error)return <CertificateError title="Certificate unavailable" msg={error}/>;

  const g=gradeConf(slab.grade);
  const inspectedAt=[slab.date,slab.time].filter(Boolean).join(" at ");
  const photo=slab.photo || photos[0]?.src;
  const polish=measurements.polish ? Number(measurements.polish) : 0;
  const inquiryReady=inq.name.trim()&&(inq.email.trim()||inq.phone.trim());
  const disputeReady=dispute.name.trim()&&(dispute.email.trim()||dispute.phone.trim())&&dispute.details.trim();
  const certificateUrl=window.location.href;
  const inventory=invConf(slab.inventory_status||"available");
  const canInquire=(slab.inventory_status||"available")==="available";
  const areaSqFt=Number(inq.areaSqFt);
  const quoteEstimate=Number.isFinite(areaSqFt)&&areaSqFt>0 ? Math.round(areaSqFt*Number(slab.price_per_sq_ft||0)) : 0;
  const evidenceCount=photos.length || (photo ? 1 : 0);
  const traceabilityCount=["quarrySource","batchNo","blockNo","productionLine","operator","containerNo","customerRef"].filter(k=>traceability[k]).length;
  const auditCount=["calibrationChecked","checklistComplete","rootCause","correctiveAction","actionOwner","actionDue"].filter(k=>audit[k]).length;
  const readinessScore=Math.round(((traceabilityCount/7)*100+(auditCount/6)*100+(evidenceCount?100:0))/3);
  const auditReadinessLabel=readinessScore>=80?"Strong":readinessScore>=55?"Partial":"Needs attention";
  const auditGaps=[
    traceabilityCount<7&&`${7-traceabilityCount} traceability field${7-traceabilityCount===1?"":"s"} missing`,
    auditCount<6&&`${6-auditCount} audit field${6-auditCount===1?"":"s"} missing`,
    !evidenceCount&&"photo evidence missing",
    defects.length&&!audit.correctiveAction&&"defects recorded without corrective action",
  ].filter(Boolean);
  const verificationItems=[
    {label:"Live certificate",detail:"Use this page URL or QR code as the source of truth before buying."},
    {label:"Slab identity",detail:`Match certificate ID ${slab.id} with the physical slab, invoice, or factory record.`},
    {label:"Evidence trail",detail:`Review ${evidenceCount} photo${evidenceCount===1?"":"s"}, measurements, defects, inspector, and timestamp together.`},
  ];
  const certificateSummary=[
    `Epistable verified slab: ${slab.stone}`,
    `Certificate: ${slab.id}`,
    `Factory: ${slab.factory_name}${slab.factory_location ? `, ${slab.factory_location}` : ""}`,
    `Grade: ${slab.grade}`,
    `Price: Rs ${slab.price_per_sq_ft || 0}/sq ft`,
    `Status: ${inventory.label}`,
    `Evidence readiness: ${readinessScore}%`,
    `Traceability fields: ${traceabilityCount}/7`,
    `Audit fields: ${auditCount}/6`,
    traceability.quarrySource ? `Source: ${traceability.quarrySource}` : "",
    traceability.batchNo ? `Batch: ${traceability.batchNo}` : "",
    traceability.containerNo ? `Container: ${traceability.containerNo}` : "",
    audit.correctiveAction ? `Corrective action: ${audit.correctiveAction}` : "",
    defects.length ? `Defects recorded: ${defects.join(", ")}` : "Defects recorded: none",
    `Photo evidence: ${evidenceCount} photo${evidenceCount===1 ? "" : "s"}`,
    `Certificate link: ${certificateUrl}`,
  ].filter(Boolean).join("\n");
  const auditNote=[
    `Audit readiness note for ${slab.id}`,
    `Status: ${auditReadinessLabel} (${readinessScore}%)`,
    `Factory: ${slab.factory_name}`,
    `Slab: ${slab.stone} | Grade: ${slab.grade}`,
    `Traceability: ${traceabilityCount}/7 fields recorded`,
    `Audit evidence: ${auditCount}/6 fields recorded`,
    `Photo evidence: ${evidenceCount} photo${evidenceCount===1?"":"s"}`,
    defects.length?`Defects: ${defects.join(", ")}`:"Defects: none recorded",
    auditGaps.length?`Gaps: ${auditGaps.join("; ")}`:"Gaps: none flagged from current certificate data",
    `Certificate: ${certificateUrl}`,
  ].join("\n");
  const scrollTo=id=>document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});

  async function copyLink(){
    try {
      await navigator.clipboard.writeText(certificateUrl);
      setCopied(true);
      setTimeout(()=>setCopied(false),1600);
    } catch(e) {
      window.prompt("Copy certificate link",certificateUrl);
    }
  }

  async function copySummary(){
    try {
      await navigator.clipboard.writeText(certificateSummary);
      setSummaryCopied(true);
      setTimeout(()=>setSummaryCopied(false),1600);
    } catch(e) {
      window.prompt("Copy certificate summary",certificateSummary);
    }
  }

  async function copyAuditNote(){
    try {
      await navigator.clipboard.writeText(auditNote);
      setAuditNoteCopied(true);
      setTimeout(()=>setAuditNoteCopied(false),1600);
    } catch(e) {
      window.prompt("Copy audit readiness note",auditNote);
    }
  }

  async function submitInquiry(){
    if(!inquiryReady||inqBusy)return;
    setInqBusy(true);setInqError("");
    const message=[
      inq.areaSqFt.trim()?`Area required: ${inq.areaSqFt.trim()} sq ft`:"",
      quoteEstimate?`Estimated slab value: Rs ${quoteEstimate}`:"",
      inq.message.trim(),
      inq.phone.trim()?`Phone: ${inq.phone.trim()}`:"",
      `Certificate: ${certificateUrl}`,
    ].filter(Boolean).join("\n\n");
    const {error}=await supabase.rpc("create_public_slab_inquiry",{
      slab_id:slab.id,
      buyer_name:inq.name.trim(),
      buyer_company:inq.company.trim(),
      buyer_email:inq.email.trim(),
      buyer_message:message
    });
    if(error){setInqError(error.message||"Unable to send inquiry.");setInqBusy(false);return;}
    setInqSent(true);setInqBusy(false);
  }

  async function submitDispute(){
    if(!disputeReady||disputeBusy)return;
    setDisputeBusy(true);setDisputeError("");
    const details=[dispute.details.trim(),dispute.email.trim()?`Email: ${dispute.email.trim()}`:"",dispute.phone.trim()?`Phone: ${dispute.phone.trim()}`:""].filter(Boolean).join("\n\n");
    const {error}=await supabase.rpc("create_public_slab_dispute",{
      slab_id:slab.id,
      buyer_name:dispute.name.trim(),
      buyer_company:dispute.company.trim(),
      dispute_category:dispute.category,
      dispute_details:details
    });
    if(error){setDisputeError(error.message||"Unable to report this issue.");setDisputeBusy(false);return;}
    setDisputeSent(true);setDisputeBusy(false);
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',sans-serif",color:C.text}}>
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .cert-actions, .cert-interactive { display: none !important; }
          .cert-page { background: #fff !important; }
          .cert-hero { border-radius: 0 !important; margin: 0 !important; }
          .cert-main { max-width: none !important; padding: 12px 0 0 !important; }
          .cert-grid { grid-template-columns: 1.05fr 0.95fr !important; gap: 12px !important; }
          .cert-card { box-shadow: none !important; break-inside: avoid; page-break-inside: avoid; }
          .cert-photo { max-height: 250px; object-fit: cover; }
          .cert-print-footer { display: block !important; }
        }
      `}</style>
      <div className="cert-actions" style={{position:"sticky",top:0,zIndex:50,background:"rgba(255,255,255,0.96)",borderBottom:`1px solid ${C.border}`,backdropFilter:"blur(8px)"}}>
        <div style={{maxWidth:980,margin:"0 auto",padding:"10px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:14}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:C.text}}>Certificate {slab.id}</div>
            <div style={{fontSize:12,color:C.textDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{slab.stone} · {slab.factory_name}</div>
          </div>
          <div style={{display:"flex",gap:14,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
            <button onClick={copySummary} style={{padding:"9px 11px",border:`1px solid ${C.border}`,borderRadius:9,background:C.white,color:C.textMid,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>{summaryCopied?"Summary Copied":"Copy Summary"}</button>
            <button onClick={copyAuditNote} style={{padding:"9px 11px",border:`1px solid ${C.border}`,borderRadius:9,background:C.white,color:C.textMid,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>{auditNoteCopied?"Audit Copied":"Copy Audit Note"}</button>
            <button onClick={copyLink} style={{padding:"9px 11px",border:`1px solid ${C.border}`,borderRadius:9,background:C.white,color:C.textMid,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>{copied?"Copied":"Copy Link"}</button>
            <button onClick={()=>window.print()} style={{padding:"9px 12px",border:"none",borderRadius:9,background:C.primary,color:C.white,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>Print / Save PDF</button>
          </div>
        </div>
      </div>
      <div style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary},${C.teal})`,color:C.white}}>
        <div className="cert-hero" style={{maxWidth:980,margin:"0 auto",padding:"18px 18px 24px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:18}}>
            <div>
              <div style={{fontSize:22,fontWeight:700,letterSpacing:0}}>Epistable AI</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.72)"}}>Verified slab certificate</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:999,padding:"6px 12px",fontSize:12,fontWeight:600}}>VERIFIED</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"minmax(0,1.2fr) minmax(220px,0.8fr)",gap:16,alignItems:"stretch"}}>
            <div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.72)",fontFamily:"monospace",marginBottom:7}}>{slab.id}</div>
              <div style={{fontSize:30,fontWeight:700,lineHeight:1.08,marginBottom:8}}>{slab.stone}</div>
              <div style={{fontSize:14,color:"rgba(255,255,255,0.78)",lineHeight:1.55}}>{slab.factory_name}{slab.factory_location ? `, ${slab.factory_location}` : ""}</div>
              <div className="cert-interactive" style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:16}}>
                <button onClick={()=>scrollTo("certificate-inquiry")} disabled={!canInquire} style={{padding:"10px 14px",border:"none",borderRadius:10,background:canInquire?C.white:"rgba(255,255,255,0.18)",color:canInquire?C.primary:"rgba(255,255,255,0.62)",fontSize:13,fontWeight:600,cursor:canInquire?"pointer":"not-allowed",fontFamily:"sans-serif"}}>{canInquire?"Interested in this slab":inventory.label}</button>
                <button onClick={()=>scrollTo("certificate-dispute")} style={{padding:"10px 14px",border:"1px solid rgba(255,255,255,0.28)",borderRadius:10,background:"rgba(255,255,255,0.1)",color:C.white,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>Report mismatch</button>
              </div>
            </div>
            <div style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.18)",borderRadius:12,padding:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:8}}>
                <div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.68)",textTransform:"uppercase",fontWeight:600}}>Grade</div>
                  <div style={{fontSize:24,fontWeight:700,color:C.white}}>{slab.grade}</div>
                </div>
                <div style={{background:g.bg,border:`1px solid ${g.border}`,color:g.color,borderRadius:10,padding:"8px 12px",fontSize:13,fontWeight:600}}>{g.label}</div>
              </div>
              <div style={{fontSize:26,fontWeight:700}}>Rs {slab.price_per_sq_ft || 0}<span style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.65)"}}> / sq ft</span></div>
              <div style={{display:"inline-flex",marginTop:14,background:inventory.bg,border:`1px solid ${inventory.border}`,borderRadius:20,padding:"4px 10px",fontSize:12,fontWeight:600,color:inventory.color}}>{inventory.label}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginTop:16}}>
                {[["Defects",defects.length||"None"],["Photos",evidenceCount],["Export",slab.export_ready ? "Ready" : "No"]].map(([label,value])=>(
                  <div key={label} style={{background:"rgba(255,255,255,0.11)",border:"1px solid rgba(255,255,255,0.16)",borderRadius:9,padding:"8px 6px",textAlign:"center"}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.white,lineHeight:1.1}}>{value}</div>
                    <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.62)",marginTop:3}}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="cert-main" style={{maxWidth:980,margin:"0 auto",padding:"16px 18px 48px"}}>
        <div className="cert-grid" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"minmax(0,1.1fr) minmax(280px,0.9fr)",gap:16}}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <Card style={{overflow:"hidden"}} className="cert-card">
              <div style={{aspectRatio:"16/9",background:g.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {photo?<img className="cert-photo" src={photo} alt={slab.stone} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>:<div style={{fontSize:18,fontWeight:700,color:g.color}}>No slab photo recorded</div>}
              </div>
            </Card>

            <Card className="cert-card" style={{padding:20}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Inspection Summary</div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:14,marginBottom:16}}>
                <div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:"13px 14px"}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.green,marginBottom:2}}>Trust Signal</div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text}}>{slab.export_ready ? "Export ready" : "Factory verified"}</div>
                </div>
                <div style={{background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:10,padding:"13px 14px"}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.primary,marginBottom:2}}>Evidence</div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text}}>{evidenceCount} photo{evidenceCount===1 ? "" : "s"}</div>
                </div>
                <div style={{background:defects.length?C.amberBg:C.greenBg,border:`1px solid ${defects.length?C.amberBorder:C.greenBorder}`,borderRadius:10,padding:"13px 14px"}}>
                  <div style={{fontSize:12,fontWeight:600,color:defects.length?C.amber:C.green,marginBottom:2}}>Defects</div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text}}>{defects.length ? `${defects.length} recorded` : "None recorded"}</div>
                </div>
              </div>
              <div style={{fontSize:14,lineHeight:1.7,color:C.textMid}}>{slab.reason || "No grading reason was recorded for this slab."}</div>
              {slab.notes&&<div style={{marginTop:16,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:12,fontSize:13,lineHeight:1.7,color:C.textMid}}>{slab.notes}</div>}
            </Card>

            <Card className="cert-card cert-interactive" style={{padding:20}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Buyer verification checklist</div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:14}}>
                {[
                  ["Match slab ID",`Confirm ${slab.id} matches the physical slab or invoice.`],
                  ["Review evidence",`Check ${evidenceCount} photo${evidenceCount===1 ? "" : "s"}, defects, and measurements.`],
                  ["Request quote",canInquire?"Send area and delivery needs from this certificate.":"Ask the factory for alternatives."],
                ].map(([label,detail])=>(
                  <div key={label} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px"}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.primary,marginBottom:4}}>{label}</div>
                    <div style={{fontSize:12,lineHeight:1.65,color:C.textMid}}>{detail}</div>
                  </div>
                ))}
              </div>
            </Card>

            {photos.length>1&&<Card className="cert-card" style={{padding:20}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:16}}>Photo Evidence</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:14}}>
                {photos.slice(1,7).map((p,idx)=><div key={idx} style={{position:"relative"}}>
                  <img src={p.src} alt="" style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:10,border:`1px solid ${C.border}`,display:"block"}}/>
                  {p.label&&<div style={{position:"absolute",left:6,bottom:6,right:6,background:"rgba(0,0,0,0.62)",borderRadius:6,padding:"4px 6px",fontSize:12,fontWeight:600,color:"#fff",textAlign:"center"}}>{p.label}</div>}
                </div>)}
              </div>
            </Card>}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <Card className="cert-card" style={{padding:20}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Certificate Details</div>
              <Field label="Factory" value={slab.factory_name}/>
              <Field label="Factory contact" value={slab.factory_contact_email}/>
              <Field label="Supplier" value={slab.supplier}/>
              <Field label="Inspector" value={slab.inspector}/>
              <Field label="Inspected" value={inspectedAt}/>
              <Field label="Export ready" value={slab.export_ready ? "Yes" : "No"}/>
              <Field label="Inventory status" value={inventory.label}/>
            </Card>

            <Card className="cert-card" style={{padding:20,borderColor:C.greenBorder,background:C.greenBg}}>
              <div style={{fontSize:16,fontWeight:700,color:C.green,marginBottom:8}}>How to verify this certificate</div>
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {verificationItems.map(item=>(
                  <div key={item.label} style={{background:C.white,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:"13px 14px"}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.green,marginBottom:3}}>{item.label}</div>
                    <div style={{fontSize:12,lineHeight:1.65,color:C.textMid}}>{item.detail}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="cert-card" style={{padding:20}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Measurements</div>
              <Field label="Thickness" value={measurements.thickness ? `${measurements.thickness} mm` : ""}/>
              <Field label="Size" value={measurements.length && measurements.width ? `${measurements.length} x ${measurements.width} cm` : ""}/>
              <Field label="Sound test" value={measurements.soundTest}/>
              <Field label="Edge condition" value={measurements.edgeCondition}/>
              <Field label="Surface finish" value={measurements.surfaceFinish}/>
              {polish>0&&<div style={{paddingTop:12}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600,marginBottom:6}}><span>Polish level</span><span>{polish}/5</span></div>
                <PBar value={polish/5*100} color={C.primary} h={8}/>
              </div>}
            </Card>

            <Card className="cert-card" style={{padding:20}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Traceability</div>
              <div style={{background:readinessScore>=70?C.greenBg:C.amberBg,border:`1px solid ${readinessScore>=70?C.greenBorder:C.amberBorder}`,borderRadius:10,padding:"14px 16px",marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:6}}>
                  <span style={{fontSize:12,fontWeight:600,color:readinessScore>=70?C.green:C.amber}}>Evidence readiness</span>
                  <span style={{fontSize:16,fontWeight:700,color:readinessScore>=70?C.green:C.amber}}>{readinessScore}%</span>
                </div>
                <div style={{fontSize:12,lineHeight:1.55,color:C.textMid}}>This score reflects recorded traceability, audit proof, and photo evidence for this slab. It is not a third-party certification.</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:8}}>
                <div style={{background:traceabilityCount?C.primaryBg:C.surface,border:`1px solid ${traceabilityCount?C.primaryBorder:C.border}`,borderRadius:10,padding:"13px 14px"}}>
                  <div style={{fontSize:12,fontWeight:600,color:traceabilityCount?C.primary:C.textDim,marginBottom:2}}>Trace fields</div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text}}>{traceabilityCount}/7 recorded</div>
                </div>
                <div style={{background:auditCount?C.greenBg:C.surface,border:`1px solid ${auditCount?C.greenBorder:C.border}`,borderRadius:10,padding:"13px 14px"}}>
                  <div style={{fontSize:12,fontWeight:600,color:auditCount?C.green:C.textDim,marginBottom:2}}>Audit fields</div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text}}>{auditCount}/6 recorded</div>
                </div>
              </div>
              <Field label="Quarry / source" value={traceability.quarrySource}/>
              <Field label="Batch" value={traceability.batchNo}/>
              <Field label="Block" value={traceability.blockNo}/>
              <Field label="Production line" value={traceability.productionLine}/>
              <Field label="Operator" value={traceability.operator}/>
              <Field label="Container / shipment" value={traceability.containerNo}/>
              <Field label="Customer / order ref" value={traceability.customerRef}/>
            </Card>

            <Card className="cert-card" style={{padding:20}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Audit Readiness</div>
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px",fontSize:12,lineHeight:1.65,color:C.textMid,marginBottom:14}}>These fields help factories maintain inspection evidence for buyer QC programs, internal reviews, and certification preparation.</div>
              <div style={{background:readinessScore>=80?C.greenBg:readinessScore>=55?C.amberBg:C.redBg,border:`1px solid ${readinessScore>=80?C.greenBorder:readinessScore>=55?C.amberBorder:C.redBorder}`,borderRadius:10,padding:"14px 16px",marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:6}}>
                  <span style={{fontSize:12,fontWeight:600,color:readinessScore>=80?C.green:readinessScore>=55?C.amber:C.red}}>{auditReadinessLabel} evidence file</span>
                  <button onClick={copyAuditNote} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,color:C.primary,padding:"5px 9px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>{auditNoteCopied?"Copied":"Copy note"}</button>
                </div>
                <div style={{fontSize:12,lineHeight:1.55,color:C.textMid}}>{auditGaps.length?auditGaps.join("; "):"No evidence gaps are flagged from the current certificate data."}</div>
              </div>
              <Field label="Calibration" value={audit.calibrationChecked ? "Checked" : ""}/>
              <Field label="Inspection checklist" value={audit.checklistComplete ? "Complete" : ""}/>
              <Field label="Root cause" value={audit.rootCause}/>
              <Field label="Corrective action" value={audit.correctiveAction}/>
              <Field label="Action owner" value={audit.actionOwner}/>
              <Field label="Action due" value={audit.actionDue}/>
            </Card>

            <Card className="cert-card" style={{padding:20}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:14}}>Defects</div>
              {defects.length===0?<div style={{fontSize:13,color:C.green,fontWeight:600}}>No defects recorded</div>:
              <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                {defects.map(d=><span key={d} style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:999,padding:"5px 10px",fontSize:12,fontWeight:600,color:C.amber,textTransform:"capitalize"}}>{d}</span>)}
              </div>}
            </Card>

            <Card id="certificate-inquiry" className="cert-card cert-interactive" style={{padding:20}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Interested in this slab?</div>
              {!canInquire?<div style={{background:inventory.bg,border:`1px solid ${inventory.border}`,borderRadius:10,padding:20}}>
                <div style={{fontSize:14,fontWeight:700,color:inventory.color,marginBottom:4}}>{inventory.label}</div>
                <div style={{fontSize:13,color:C.textMid,lineHeight:1.7}}>This slab is not currently marked available. Contact the factory for alternatives.</div>
              </div>:inqSent?<div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:20}}>
                <div style={{fontSize:14,fontWeight:700,color:C.green,marginBottom:4}}>Inquiry sent</div>
                <div style={{fontSize:13,color:C.textMid,lineHeight:1.7}}>The factory has received your interest in slab {slab.id}.</div>
              </div>:<div style={{display:"flex",flexDirection:"column",gap:14}}>
                <input value={inq.name} onChange={e=>setInq(p=>({...p,name:e.target.value}))} placeholder="Your name" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif"}}/>
                <input value={inq.company} onChange={e=>setInq(p=>({...p,company:e.target.value}))} placeholder="Company (optional)" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif"}}/>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
                  <input value={inq.email} onChange={e=>setInq(p=>({...p,email:e.target.value}))} placeholder="Email" type="email" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif",minWidth:0}}/>
                  <input value={inq.phone} onChange={e=>setInq(p=>({...p,phone:e.target.value}))} placeholder="Phone" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif",minWidth:0}}/>
                </div>
                <input value={inq.areaSqFt} onChange={e=>setInq(p=>({...p,areaSqFt:e.target.value.replace(/[^\d.]/g,"")}))} placeholder="Area required in sq ft (optional)" inputMode="decimal" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif"}}/>
                {quoteEstimate>0&&<div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:"14px 16px",display:"flex",justifyContent:"space-between",gap:14}}>
                  <span style={{fontSize:12,fontWeight:600,color:C.green}}>Estimated value</span>
                  <span style={{fontSize:14,fontWeight:700,color:C.green}}>Rs {quoteEstimate}</span>
                </div>}
                <textarea value={inq.message} onChange={e=>setInq(p=>({...p,message:e.target.value}))} rows={3} placeholder="Message (quantity, timeline, destination...)" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif",resize:"none"}}/>
                {inqError&&<div style={{fontSize:12,color:C.red,fontWeight:600}}>{inqError}</div>}
                <Btn full disabled={!inquiryReady||inqBusy} onClick={submitInquiry}>{inqBusy?"Sending...":"Send Inquiry"}</Btn>
                <div style={{fontSize:12,color:C.textDim,lineHeight:1.55}}>Name and either email or phone are required.</div>
              </div>}
            </Card>

            <Card id="certificate-dispute" className="cert-card cert-interactive" style={{padding:20}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Report an issue</div>
              {disputeSent?<div style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:10,padding:20}}>
                <div style={{fontSize:14,fontWeight:700,color:C.amber,marginBottom:4}}>Issue reported</div>
                <div style={{fontSize:13,color:C.textMid,lineHeight:1.7}}>The factory can now review your concern for slab {slab.id}.</div>
              </div>:<div style={{display:"flex",flexDirection:"column",gap:14}}>
                <div style={{fontSize:12,color:C.textMid,lineHeight:1.55}}>Use this if the delivered slab does not match the certificate.</div>
                <input value={dispute.name} onChange={e=>setDispute(p=>({...p,name:e.target.value}))} placeholder="Your name" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif"}}/>
                <input value={dispute.company} onChange={e=>setDispute(p=>({...p,company:e.target.value}))} placeholder="Company (optional)" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif"}}/>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
                  <input value={dispute.email} onChange={e=>setDispute(p=>({...p,email:e.target.value}))} placeholder="Email" type="email" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif",minWidth:0}}/>
                  <input value={dispute.phone} onChange={e=>setDispute(p=>({...p,phone:e.target.value}))} placeholder="Phone" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif",minWidth:0}}/>
                </div>
                <select value={dispute.category} onChange={e=>setDispute(p=>({...p,category:e.target.value}))} style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif",background:C.white}}>
                  <option value="wrong_grade">Wrong grade</option>
                  <option value="defect_missed">Defect missed</option>
                  <option value="measurement">Measurement issue</option>
                  <option value="other">Other</option>
                </select>
                <textarea value={dispute.details} onChange={e=>setDispute(p=>({...p,details:e.target.value}))} rows={3} placeholder="Describe what does not match..." style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif",resize:"none"}}/>
                {disputeError&&<div style={{fontSize:12,color:C.red,fontWeight:600}}>{disputeError}</div>}
                <Btn full variant="secondary" disabled={!disputeReady||disputeBusy} onClick={submitDispute}>{disputeBusy?"Sending...":"Report Issue"}</Btn>
                <div style={{fontSize:12,color:C.textDim,lineHeight:1.55}}>Name, contact, and issue details are required.</div>
              </div>}
            </Card>
          </div>
        </div>
        <div className="cert-print-footer" style={{display:"none",marginTop:14,paddingTop:10,borderTop:`1px solid ${C.border}`,fontSize:12,color:C.textDim,lineHeight:1.55}}>
          Verified by Epistable AI · Certificate ID {slab.id} · Generated from {certificateUrl}
        </div>
      </main>
    </div>
  );
}

```

===== FILE: src/components/ui.jsx =====
```jsx
import { useState } from "react";
import { C } from "../lib/domain";
import { useBP } from "../hooks/useBP";
import { FONT_STACK, RADIUS, SHADOW, SPACE, TYPE, WEIGHT } from "../lib/tokens";
import { Icon } from "./Icon";
import { Pill } from "./Pill";

export const fontStack = FONT_STACK;

const typeStyle = key => ({
  fontFamily: FONT_STACK,
  fontSize: TYPE[key].size,
  lineHeight: TYPE[key].lineHeight,
  fontWeight: TYPE[key].weight,
  letterSpacing: TYPE[key].letterSpacing,
});

export const T = {
  body: typeStyle("body"),
  label: { ...typeStyle("label"), fontWeight: WEIGHT.medium },
  hint: typeStyle("caption"),
  control: { ...typeStyle("body"), lineHeight: 1.3, fontWeight: WEIGHT.medium },
  title: { ...typeStyle("heading"), fontWeight: WEIGHT.bold },
  pill: { ...typeStyle("caption"), lineHeight: 1.3, fontWeight: WEIGHT.medium },
};

const CONTROL_PAD = {
  sm: `${SPACE.sm + 1}px ${SPACE.base}px`,
  md: `${SPACE.md + 1}px ${SPACE.lg}px`,
  lg: `${SPACE.base}px ${SPACE.xl}px`,
};

const CONTROL_FONT = {
  sm: TYPE.label.size,
  md: TYPE.body.size,
  lg: TYPE.body.size + 1,
};

export const Card = ({children,style={},onClick,className,...props}) =>
  <div
    {...props}
    className={className}
    onClick={onClick}
    style={{
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: RADIUS.lg,
      boxShadow: C.shadow,
      ...style,
    }}
  >
    {children}
  </div>;

export const BillPill = ({status}) => {
  const m = {
    paid: { tone: "success", label: "Paid" },
    overdue: { tone: "danger", label: "Overdue" },
    pending: { tone: "warning", label: "Pending" },
  };
  const s = m[status] || m.pending;
  return <Pill tone={s.tone}>{s.label}</Pill>;
};

export const StatPill = ({status}) => {
  const m = {
    active: { tone: "success", label: "Active" },
    paused: { tone: "danger", label: "Paused" },
    suspended: { tone: "danger", label: "Suspended" },
    inactive: { tone: "warning", label: "Inactive" },
    flagged: { tone: "danger", label: "Flagged" },
  };
  const s = m[status] || m.inactive;
  return <Pill tone={s.tone}>{s.label}</Pill>;
};

export const DisputeStatusPill = ({status}) => {
  const m = {
    open: { tone: "danger", label: "Open" },
    reviewing: { tone: "warning", label: "Reviewing" },
    resolved: { tone: "success", label: "Resolved" },
    dismissed: { tone: "neutral", label: "Dismissed" },
  };
  const s = m[status] || m.open;
  return <Pill tone={s.tone}>{s.label}</Pill>;
};

export const InqPill = ({status}) => {
  const m = {
    reserved: { tone: "info", label: "Reserved" },
    new: { tone: "primary", label: "New" },
    contacted: { tone: "warning", label: "Contacted" },
    closed: { tone: "success", label: "Closed" },
  };
  const s = m[status] || m.new;
  return <Pill tone={s.tone}>{s.label}</Pill>;
};

export const Avi = ({initials,size=36,color=C.primary,bg=C.primaryBg,border=C.primaryBorder}) =>
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: bg,
      border: `2px solid ${border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: Math.max(TYPE.caption.size, Math.round(size * 0.33)),
      fontWeight: WEIGHT.bold,
      lineHeight: 1,
      color,
      flexShrink: 0,
      fontFamily: FONT_STACK,
    }}
  >
    {initials}
  </div>;

export const PBar = ({value,color=C.primary,h=6}) => {
  const height = h || SPACE.xs + 2;
  return (
    <div style={{background:C.primaryBg,borderRadius:height,height,overflow:"hidden"}}>
      <div style={{background:color,width:`${Math.min(Math.max(value,0),100)}%`,height:"100%",borderRadius:height,transition:"width 0.4s"}}/>
    </div>
  );
};

const KPI_ICON = {
  "\u{1F4B3}": "billing",
  "\u{1F50D}": "search",
  "\u{1F3ED}": "factory",
  "\u{1F464}": "user",
  "\u{1F465}": "users",
  "\u{1F6A8}": "alert",
  "\u{23F8}": "pause",
  "\u{1F4E6}": "package",
  "\u{1F4C5}": "date",
  "\u{1F4C6}": "date",
  "\u{1F3C6}": "verified",
  Scan: "search",
  Stock: "box",
  Grade: "verified",
  Bill: "billing",
  Quote: "message",
  Won: "check",
  Reply: "message",
  New: "bell",
  Hot: "alert",
  Due: "date",
  Mill: "factory",
  Trace: "list",
  Audit: "verified",
  CAPA: "alert",
  Batch: "package",
  Vol: "chart",
  Risk: "alert",
  Sold: "check",
  Now: "alert",
};

function KpiIcon({icon,color}) {
  if (!icon) return null;
  const name = KPI_ICON[icon] || (typeof icon === "string" && icon.length < 14 ? "chart" : null);
  if (!name || typeof icon !== "string") return icon;
  return <Icon name={name} size={TYPE.display.size - 2} color={color || C.primary}/>;
}

const INPUT_ICON = {
  "\u{1F50D}": "search",
  "\u{2709}\uFE0F": "mail",
  search: "search",
  mail: "mail",
};

function InputIcon({icon}) {
  if (!icon) return null;
  const name = INPUT_ICON[icon] || icon;
  if (typeof name === "string") return <Icon name={name} size={TYPE.body.size + 1} color={C.textDim}/>;
  return name;
}

export function Btn({children,onClick,variant="primary",full,disabled,style={},size="md"}) {
  const pad = CONTROL_PAD[size] || CONTROL_PAD.md;
  const fs = CONTROL_FONT[size] || CONTROL_FONT.md;
  const vs = {
    primary: { bg: C.primary, color: C.white, border: "none" },
    secondary: { bg: C.white, color: C.textMid, border: `1px solid ${C.border}` },
    green: { bg: C.green, color: C.white, border: "none" },
    red: { bg: C.red, color: C.white, border: "none" },
    ghost: { bg: "transparent", color: C.primary, border: `1px solid ${C.primaryBorder}` },
  };
  const v = vs[variant] || vs.primary;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: pad,
        background: v.bg,
        border: v.border,
        borderRadius: RADIUS.md,
        color: v.color,
        fontSize: fs,
        cursor: disabled ? "not-allowed" : "pointer",
        width: full ? "100%" : "auto",
        opacity: disabled ? 0.5 : 1,
        WebkitTapHighlightColor: "transparent",
        ...T.control,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Inp({label,value,onChange,type="text",placeholder,required,icon,hint}) {
  const [f,setF]=useState(false);
  const inputPad = icon
    ? `${SPACE.md + 2}px ${SPACE.base}px ${SPACE.md + 2}px ${SPACE.xxl + SPACE.sm}px`
    : `${SPACE.md + 2}px ${SPACE.base}px`;
  return (
    <div>
      {label&&<label style={{display:"block",color:C.text,marginBottom:SPACE.sm,...T.label}}>{label}{required&&<span style={{color:C.red}}> *</span>}</label>}
      <div style={{position:"relative"}}>
        {icon&&<span style={{position:"absolute",left:SPACE.base - 2,top:"50%",transform:"translateY(-50%)",fontSize:TYPE.body.size + 1,pointerEvents:"none",display:"flex",alignItems:"center"}}><InputIcon icon={icon}/></span>}
        <input
          type={type}
          value={value}
          onChange={e=>onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width:"100%",
            padding: inputPad,
            background:C.white,
            border:`1.5px solid ${f?C.primary:C.border}`,
            borderRadius:RADIUS.md,
            color:C.text,
            outline:"none",
            boxSizing:"border-box",
            ...T.body,
          }}
          onFocus={()=>setF(true)}
          onBlur={()=>setF(false)}
        />
      </div>
      {hint&&<div style={{color:C.textDim,marginTop:SPACE.sm,...T.hint}}>{hint}</div>}
    </div>
  );
}

export function Sel({label,value,onChange,options,hint}) {
  return (
    <div>
      {label&&<label style={{display:"block",color:C.text,marginBottom:SPACE.sm,...T.label}}>{label}</label>}
      <select
        value={value}
        onChange={e=>onChange(e.target.value)}
        style={{
          width:"100%",
          padding:`${SPACE.md + 2}px ${SPACE.base}px`,
          background:C.white,
          border:`1.5px solid ${C.border}`,
          borderRadius:RADIUS.md,
          color:C.text,
          outline:"none",
          WebkitAppearance:"none",
          appearance:"none",
          backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238a8478' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
          backgroundRepeat:"no-repeat",
          backgroundPosition:`right ${SPACE.base - 2}px center`,
          ...T.body,
        }}
      >
        {options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint&&<div style={{color:C.textDim,marginTop:SPACE.sm,...T.hint}}>{hint}</div>}
    </div>
  );
}

export function Modal({title,onClose,children,closeOnBackdrop=true}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={closeOnBackdrop?onClose:undefined}>
      <div style={{background:C.white,borderRadius:`${RADIUS.lg + 6}px ${RADIUS.lg + 6}px 0 0`,width:"100%",maxWidth:560,maxHeight:"92vh",overflow:"auto",boxShadow:SHADOW.modal}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:`${SPACE.md - 2}px 0 0`,display:"flex",justifyContent:"center"}}><div style={{width:SPACE.xxl + SPACE.sm,height:SPACE.xs,borderRadius:SPACE.xs / 2,background:C.border}}/></div>
        <div style={{padding:`${SPACE.base}px ${SPACE.xl}px`,display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${C.border}`}}>
          <div style={{color:C.text,...T.title}}>{title}</div>
          <button onClick={onClose} style={{background:C.surface,border:"none",borderRadius:"50%",color:C.textDim,width:SPACE.xxl,height:SPACE.xxl,cursor:"pointer",fontSize:TYPE.heading.size,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center",WebkitTapHighlightColor:"transparent",fontFamily:FONT_STACK}}>×</button>
        </div>
        <div style={{padding:SPACE.xl}}>{children}</div>
      </div>
    </div>
  );
}

export function KpiGrid({items}) {
  const {isMobile}=useBP();
  return (
    <div style={{display:"grid",gridTemplateColumns:`repeat(${isMobile?2:Math.min(items.length,4)},1fr)`,gap:SPACE.base,marginBottom:SPACE.xl}}>
      {items.map(({label,value,color,icon})=>(
        <Card key={label} style={{padding:`${SPACE.lg}px ${SPACE.base}px`}}>
          <div style={{fontSize:TYPE.display.size - 2,marginBottom:SPACE.sm,lineHeight:1}}><KpiIcon icon={icon} color={color}/></div>
          <div style={{fontSize:TYPE.display.size - 2,fontWeight:WEIGHT.bold,color:color||C.text,lineHeight:1.2,marginBottom:SPACE.xs,letterSpacing:0}}>{value}</div>
          <div style={{color:C.textMid,fontWeight:WEIGHT.medium,...T.hint}}>{label}</div>
        </Card>
      ))}
    </div>
  );
}

export function Loader() {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",flexDirection:"column",gap:SPACE.md,background:C.bg,fontFamily:FONT_STACK}}>
      <div style={{...typeStyle("display"),fontWeight:WEIGHT.bold,color:C.primary}}>Epistable</div>
      <div style={{color:C.textDim,...T.body}}>Loading...</div>
    </div>
  );
}

```

===== FILE: src/hooks/useBP.js =====
```javascript
import { useEffect, useState } from "react";

export function useBP() {
  const [w,setW]=useState(typeof window==="undefined"?1024:window.innerWidth);
  useEffect(()=>{if(typeof window==="undefined")return;const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  return {isMobile:w<640,isDesktop:w>=1024};
}

```

===== FILE: src/lib/auth.js =====
```javascript
import { supabase } from "./supabase";
import { requireData } from "./supabaseSafe";

async function loadProfileForAuthUser(userId, fallbackEmail) {
  const profileRows = requireData(
    await supabase
      .from("profiles")
      .select("*")
      .eq("auth_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1),
    "Could not load Epistable profile"
  );

  let profile = profileRows?.[0] || null;

  // Backward-compatible fallback for older seeded records that may not have
  // auth_user_id populated yet.
  if (!profile && fallbackEmail) {
    const fallbackRows = requireData(
      await supabase
        .from("profiles")
        .select("*")
        .eq("email", fallbackEmail.trim().toLowerCase())
        .order("created_at", { ascending: false })
        .limit(1),
      "Could not load Epistable profile"
    );
    profile = fallbackRows?.[0] || null;
  }

  if (!profile) throw new Error("No Epistable profile is linked to this login");
  if (profile.status === "suspended") throw new Error("Account suspended.");
  return profile;
}

export async function signInWithEmail(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  const auth = requireData(
    await withTimeout(
      supabase.auth.signInWithPassword({ email: normalizedEmail, password }),
      "Login took too long. Please check your connection and try again."
    ),
    "Could not sign in"
  );

  const userId = auth.user?.id;
  if (!userId) throw new Error("Signed in without a user profile");

  const profile = await loadProfileForAuthUser(userId, normalizedEmail);

  return { auth, profile };
}

export async function signOut() {
  requireData(await supabase.auth.signOut(), "Could not sign out");
}

export async function getSession() {
  return requireData(await supabase.auth.getSession(), "Could not load session").session;
}

export async function getSessionProfile() {
  const session = await getSession();
  const user = session?.user;
  if (!user?.id) return null;
  return loadProfileForAuthUser(user.id, user.email);
}

export async function acceptInviteWithPassword(email, password, mode = "signup") {
  const normalizedEmail = email.trim().toLowerCase();

  if (mode === "signup") {
    const inviteResult = requireData(
      await withTimeout(
        supabase.functions.invoke("accept-invite", {
          body: { email: normalizedEmail, password }
        }),
        "Invite setup took too long. Please try again."
      ),
      "Could not create invite login"
    );
    if (!inviteResult?.profile?.id) throw new Error("No pending invite found for this email.");
  }

  const auth = requireData(
    await withTimeout(
      supabase.auth.signInWithPassword({ email: normalizedEmail, password }),
      "Supabase Auth took too long. Please try again."
    ),
    "Could not sign in"
  );

  const profile = mode === "signin"
    ? requireData(
        await withTimeout(supabase.rpc("accept_profile_invite"), "Invite linking took too long. Please try again."),
        "Could not link invite"
      )
    : await loadProfileForAuthUser(auth.user?.id, normalizedEmail);

  return { auth, profile: profile?.[0] || profile };
}

export function friendlyAuthError(error, context = "login") {
  const raw = String(error?.message || error || "").trim();
  const msg = raw.toLowerCase();
  if (!raw) return context === "invite" ? "Could not accept invite. Please try again." : "Could not sign in. Please try again.";
  if (msg.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (msg.includes("email not confirmed")) return "Your email is not confirmed yet. Open the confirmation email, then try again.";
  if (msg.includes("rate limit")) return "Too many attempts. Wait a few minutes, then try again.";
  if (msg.includes("no epistable profile") || msg.includes("no pending invite")) return context === "invite"
    ? "No pending Epistable invite was found for this email. Ask the factory admin to create access first."
    : "This login is not linked to an Epistable profile yet. Ask the admin to link this email.";
  if (msg.includes("account suspended")) return "This account is suspended. Contact your administrator.";
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("took too long")) return "Connection timed out. Check your internet and try again.";
  if (msg.includes("already registered") || msg.includes("user already registered")) return "This email already has a login. Choose “I Have Login” and enter the existing password.";
  return raw;
}

function withTimeout(promise, message, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  ]);
}

```

===== FILE: src/lib/db.js =====
```javascript
import { supabase } from "./supabase";
import { maybeOne, requireData, rows } from "./supabaseSafe";

const byCreatedDesc = { ascending: false };
const byTsDesc = { ascending: false };

export const DB = {
  async getProfileByAuthUserId(authUserId) {
    return maybeOne(await supabase.from("profiles").select("*").eq("auth_user_id", authUserId).maybeSingle());
  },

  async getFac(id) {
    return maybeOne(await supabase.from("factories").select().eq("id", id).maybeSingle());
  },

  async updFac(id, updates) {
    return requireData(await supabase.from("factories").update(updates).eq("id", id).select().single());
  },

  async allFacs() {
    return rows(await supabase.from("factories").select().order("created_at", byCreatedDesc));
  },

  async facUsers(factoryId) {
    return rows(await supabase.from("profiles").select().eq("factory_id", factoryId));
  },

  async allUsers() {
    return rows(await supabase.from("profiles").select().order("created_at", byCreatedDesc));
  },

  async facInsps(factoryId) {
    return rows(await supabase.from("inspections").select().eq("factory_id", factoryId).order("ts", byTsDesc).limit(300));
  },

  async userInsps(userId) {
    return rows(await supabase.from("inspections").select().eq("user_id", userId).order("ts", byTsDesc).limit(200));
  },

  async allInsps() {
    return rows(await supabase.from("inspections").select().order("ts", byTsDesc));
  },
};

```

===== FILE: src/lib/domain.js =====
```javascript
import { COLOR, SHADOW } from "./tokens";

export const C = {
  ...COLOR,
  primaryD: COLOR.primaryMid,
  teal: COLOR.accent,
  blue2: COLOR.blue,
  blue2Bg: COLOR.blueBg,
  blue2Border: COLOR.blueBorder,
  shadow: SHADOW.card,
};

export const STONES = [
  {id:"makrana",label:"Makrana White"},{id:"black",label:"Black Granite"},
  {id:"green",label:"Rainforest Green"},{id:"yellow",label:"Jaisalmer Yellow"},
  {id:"pink",label:"Udaipur Pink"},{id:"kota",label:"Kota Brown"},
  {id:"carrara",label:"Carrara White"},{id:"red",label:"Indian Red Granite"},
];

export const DEFECTS = [
  {id:"crack",label:"Crack",color:C.red},
  {id:"stain",label:"Stain",color:C.amber},{id:"pit",label:"Pitting",color:C.red},
  {id:"chip",label:"Edge Chip",color:C.amber},{id:"vein",label:"Vein Issue",color:C.blue2},
  {id:"polish",label:"Polish Issue",color:C.amber},{id:"thin",label:"Thin Spot",color:C.purple},
];

export const GRADES = [
  {id:"Premium",label:"PREMIUM",color:C.green,bg:C.greenBg,border:C.greenBorder,emoji:"🏆",price:850},
  {id:"Standard",label:"STANDARD",color:C.amber,bg:C.amberBg,border:C.amberBorder,emoji:"✅",price:480},
  {id:"Commercial",label:"COMMERCIAL",color:C.blue2,bg:C.blue2Bg,border:C.blue2Border,emoji:"🏢",price:320},
  {id:"Rejected",label:"REJECT",color:C.red,bg:C.redBg,border:C.redBorder,emoji:"❌",price:0},
];

export const PLANS = {
  Starter:{label:"Starter",scansIncluded:100,pricePerScan:5,monthlyFee:299},
  Pro:{label:"Pro",scansIncluded:500,pricePerScan:3,monthlyFee:999},
  Enterprise:{label:"Enterprise",scansIncluded:2000,pricePerScan:1.5,monthlyFee:2999},
};

export const genId = p => p+"-"+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,5).toUpperCase();
export const fmtT = ts => new Date(ts).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
export const fmtD = ts => new Date(ts).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
export const curMon = () => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; };
export const fmtMoney = (n, { compact = false } = {}) => {
  const v = Number(n) || 0;
  if (compact && v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  return `₹${v.toLocaleString("en-IN")}`;
};
export const calcBill = (plan,scans) => {
  const p=PLANS[plan]||PLANS.Starter;
  const ov=Math.max(0,scans-p.scansIncluded);
  return {monthlyFee:p.monthlyFee,includedScans:p.scansIncluded,overageScans:ov,overageCharge:Math.round(ov*p.pricePerScan),pricePerScan:p.pricePerScan,total:p.monthlyFee+Math.round(ov*p.pricePerScan)};
};
export const gradeConf = g => GRADES.find(x=>x.id===g)||GRADES[1];
export const slabQrUrl = slabId => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent("https://epistable.pages.dev/slab/"+slabId)}`;

```

===== FILE: src/lib/marketplace.js =====
```javascript
import { supabase } from './supabase';

const data = (r) => { if (r.error) throw r.error; return r.data; };
const id = (prefix) => `${prefix}_${crypto.randomUUID()}`;

export const FOOD_CATEGORIES = [
  'Spices & Seasonings','Snacks','Sauces & Condiments','Ready-to-Eat / Ready-to-Cook',
  'Beverages','Bakery & Confectionery','Frozen & Processed Produce','Food Ingredients','Other Processed Foods'
];

export const FOOD_CERTIFICATIONS = [
  'FSSAI','FSSC 22000','BRCGS Food Safety','ISO 22000','HACCP','IFS Food','SQF',
  'GMP','Organic - NPOP','Organic - USDA','Organic - EU','Halal','Kosher','Non-GMO'
];

const PRODUCT_REVIEW_PATTERN = /(cure|treat|prevent)\s+(cancer|diabetes|disease|infection)|medicinal|therapeutic|miracle\s+cure|guaranteed\s+weight\s+loss|fda\s+approved/i;

export function productRequiresReview(product={}) {
  const text=[product.name,product.description,product.dietary_attributes,product.certifications]
    .flatMap(value=>Array.isArray(value)?value:[value])
    .filter(Boolean).join(' ');
  return PRODUCT_REVIEW_PATTERN.test(text);
}

export const TRADE_DOCUMENT_TYPES = [
  {value:'certificate_of_analysis',label:'Certificate of Analysis (COA)'},
  {value:'food_safety',label:'Food safety certification'},
  {value:'haccp_plan',label:'HACCP plan / certificate'},
  {value:'organic_certificate',label:'Organic certificate'},
  {value:'halal_certificate',label:'Halal certificate'},
  {value:'kosher_certificate',label:'Kosher certificate'},
  {value:'allergen_declaration',label:'Allergen declaration'},
  {value:'lab_report',label:'Laboratory / microbiology report'},
  {value:'product_specification',label:'Product specification sheet'},
  {value:'nutrition_label',label:'Nutrition / label artwork'},
  {value:'health_certificate',label:'Health / sanitary certificate'},
  {value:'origin_certificate',label:'Certificate of origin'},
  {value:'export_license',label:'Export registration / licence'},
  {value:'business_registration',label:'Business registration'},
  {value:'other',label:'Other trade evidence'}
];

export const marketplace = {
  async reviews() { return data(await supabase.from('marketplace_reviews').select('*').order('created_at',{ascending:false}).limit(100)); },
  async review(kind,targetId,decision,reason) {
    return data(await supabase.rpc('review_marketplace_record',{target_kind:kind,target_id:targetId,decision,reason}));
  },
  async context() { return data(await supabase.rpc('marketplace_context')); },
  async accounts() { return data(await supabase.rpc('marketplace_accounts')); },
  async assignAccess(targetUser,targetOrg,targetRole) {
    return data(await supabase.rpc('assign_marketplace_access',{target_user:targetUser,target_org:targetOrg,target_role:targetRole}));
  },
  async updateOrganization(organizationId,updates) {
    return data(await supabase.from('organizations').update(updates).eq('id',organizationId).select().single());
  },
  async organizations(type) {
    let q=supabase.from('organizations').select('*').order('created_at',{ascending:false});
    if(type)q=q.eq('type',type);
    return data(await q);
  },
  async createOrganization(input) {
    return data(await supabase.from('organizations').insert({id:id(input.type==='buyer'?'BUYORG':'SELORG'),...input}).select().single());
  },
  async products(filters={}) {
    let q=supabase.from('products').select('*, organizations!products_seller_org_id_fkey(*)').order('created_at',{ascending:false});
    if(filters.sellerOrgId)q=q.eq('seller_org_id',filters.sellerOrgId);
    if(filters.category)q=q.eq('category',filters.category);
    if(filters.status)q=q.eq('status',filters.status);
    if(filters.verified)q=q.eq('verification_status','verified');
    if(filters.published)q=q.eq('status','active');
    return data(await q);
  },
  async createProduct(input) {
    return data(await supabase.from('products').insert({id:id('PRD'),...input}).select().single());
  },
  async updateProduct(productId,updates) {
    return data(await supabase.from('products').update(updates).eq('id',productId).select().single());
  },
  async uploadProductImages(sellerOrgId,productId,files=[]) {
    const uploaded=[];
    for(const file of files) {
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Use JPG, PNG or WebP product images.');
      if(file.size>5*1024*1024) throw new Error('Each product image must be 5 MB or smaller.');
      const ext=(file.name?.split('.').pop()||file.type.split('/')[1]||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
      const path=`${sellerOrgId}/${productId}/${crypto.randomUUID()}.${ext||'jpg'}`;
      const result=await supabase.storage.from('product-images').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
      if(result.error) throw result.error;
      const publicResult=supabase.storage.from('product-images').getPublicUrl(path);
      uploaded.push(publicResult.data.publicUrl);
    }
    return uploaded;
  },
  async removeProductImages(urls=[]) {
    const marker='/storage/v1/object/public/product-images/';
    const paths=urls.map(url=>{
      const index=String(url).indexOf(marker);
      return index<0?null:decodeURIComponent(String(url).slice(index+marker.length));
    }).filter(Boolean);
    if(!paths.length)return;
    const result=await supabase.storage.from('product-images').remove(paths);
    if(result.error) throw result.error;
  },
  async documents(organizationId,productId=null) {
    let q=supabase.from('trade_documents').select('*').order('created_at',{ascending:false});
    if(organizationId)q=q.eq('organization_id',organizationId);
    if(productId)q=q.eq('product_id',productId);
    return data(await q);
  },
  async addDocument(input) {
    return data(await supabase.from('trade_documents').insert({id:id('DOC'),...input}).select().single());
  },
  async updateDocument(documentId,updates) {
    return data(await supabase.from('trade_documents').update(updates).eq('id',documentId).select().single());
  },
  async uploadTradeEvidence(organizationId,documentId,file) {
    if(!file)throw new Error('Choose a certificate or evidence file.');
    if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use PDF, JPG, PNG or WebP evidence files.');
    if(file.size>10*1024*1024)throw new Error('Evidence files must be 10 MB or smaller.');
    const ext=(file.name?.split('.').pop()||file.type.split('/')[1]||'bin').toLowerCase().replace(/[^a-z0-9]/g,'');
    const path=`${organizationId}/${documentId}/${crypto.randomUUID()}.${ext||'bin'}`;
    const result=await supabase.storage.from('trade-evidence').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
    if(result.error)throw result.error;
    return {storage_path:path,file_name:file.name||'Evidence file',mime_type:file.type,file_size:file.size};
  },
  async removeTradeEvidence(path) {
    if(!path)return;
    const result=await supabase.storage.from('trade-evidence').remove([path]);
    if(result.error)throw result.error;
  },
  async evidenceUrl(document,expiresIn=300) {
    if(document?.storage_path){
      const result=await supabase.storage.from('trade-evidence').createSignedUrl(document.storage_path,expiresIn);
      if(result.error)throw result.error;
      return result.data.signedUrl;
    }
    if(document?.file_url?.startsWith('https://'))return document.file_url;
    throw new Error('Evidence file is unavailable.');
  },
  async rfqs({buyerOrgId,sellerOrgId}={}) {
    let q=supabase.from('rfqs').select('*, products(*)').order('created_at',{ascending:false});
    if(buyerOrgId)q=q.eq('buyer_org_id',buyerOrgId);
    if(sellerOrgId)q=q.eq('seller_org_id',sellerOrgId);
    return data(await q);
  },
  async createRfq(input) {
    return data(await supabase.from('rfqs').insert({id:id('RFQ'),...input}).select().single());
  },
  async updateRfq(rfqId,updates) {
    return data(await supabase.from('rfqs').update(updates).eq('id',rfqId).select().single());
  },
  async quotes(rfqId) {
    let q=supabase.from('trade_quotes').select('*, organizations!trade_quotes_seller_org_id_fkey(*)').order('created_at',{ascending:false});
    if(rfqId)q=q.eq('rfq_id',rfqId);
    return data(await q);
  },
  async createQuote(input) {
    return data(await supabase.from('trade_quotes').insert({id:id('TQ'),...input}).select().single());
  },
  async updateQuote(quoteId,updates) {
    return data(await supabase.from('trade_quotes').update(updates).eq('id',quoteId).select().single());
  },
  async decideQuote(quoteId,decision,message='') {
    return data(await supabase.rpc('decide_trade_quote',{target_quote_id:quoteId,decision,message}));
  },
  async reviseQuote(quoteId,values) {
    return data(await supabase.rpc('revise_trade_quote',{
      target_quote_id:quoteId,
      quote_currency:values.currency,
      quote_unit_price:values.unit_price,
      quote_quantity:values.quantity,
      quote_quantity_unit:values.quantity_unit,
      quote_incoterm:values.incoterm,
      quote_lead_time_days:values.lead_time_days,
      quote_validity_ts:values.validity_ts,
      quote_notes:values.notes||null
    }));
  },
  async orders({buyerOrgId,sellerOrgId}={}) {
    let q=supabase.from('trade_orders').select('*, rfqs(*), trade_quotes(*)').order('created_at',{ascending:false});
    if(buyerOrgId)q=q.eq('buyer_org_id',buyerOrgId);
    if(sellerOrgId)q=q.eq('seller_org_id',sellerOrgId);
    return data(await q);
  },
  async updateOrderStatus(orderId,status,note='') {
    return data(await supabase.rpc('update_trade_order_status',{target_order_id:orderId,new_status:status,note}));
  }
};

```

===== FILE: src/lib/markets.js =====
```javascript
export const EXPORT_MARKETS = [
  {value:"EU",label:"European Union",short:"EU"},
  {value:"US",label:"United States",short:"US"},
  {value:"GB",label:"United Kingdom",short:"UK"},
  {value:"AE",label:"UAE / Gulf",short:"UAE"},
  {value:"CN",label:"China",short:"China"},
  {value:"JP",label:"Japan",short:"Japan"},
  {value:"BD",label:"Bangladesh",short:"BD"},
  {value:"MV",label:"Maldives",short:"MV"},
];

export const marketConf = code => EXPORT_MARKETS.find(m=>m.value===code) || {value:code,label:code,short:code};

```

===== FILE: src/lib/readiness.js =====
```javascript
export const EXPORT_PRODUCTS = [
  {value:"any",label:"Mixed stone products"},
  {value:"granite",label:"Granite"},
  {value:"marble",label:"Marble"},
  {value:"sandstone",label:"Sandstone"},
];

export const EXPORT_CERTS = [
  {id:"iec",label:"IEC"},
  {id:"iso_9001",label:"ISO 9001"},
  {id:"lab_report",label:"Lab test reports"},
  {id:"social_audit",label:"Social / responsible sourcing audit"},
  {id:"origin_docs",label:"Origin / shipment documents"},
];

export const EVIDENCE_STATUS = {
  missing: { tone:"danger", label:"Missing", score:0 },
  pending: { tone:"warning", label:"Working on it", score:45 },
  uploaded: { tone:"info", label:"Uploaded", score:70 },
  submitted: { tone:"info", label:"Submitted", score:75 },
  verified: { tone:"success", label:"Verified", score:100 },
  expired: { tone:"danger", label:"Expired", score:20 },
  rejected: { tone:"danger", label:"Rejected", score:10 },
  not_applicable: { tone:"neutral", label:"Not applicable", score:100 },
};

export const readinessStatusConf = status => EVIDENCE_STATUS[status] || EVIDENCE_STATUS.missing;

export const READINESS_SECTIONS = [
  {id:"market_entry",label:"Market Entry",hint:"Registrations and baseline documents needed before a shipment can move."},
  {id:"product_standards",label:"Product Standards",hint:"Market-specific test reports, standards, and technical documentation."},
  {id:"quality_evidence",label:"Quality Evidence",hint:"Operational records that show consistent inspection and quality control."},
  {id:"origin_traceability",label:"Origin & Traceability",hint:"Source, supplier, batch, and origin documents buyers may ask to review."},
  {id:"packaging_shipment",label:"Packaging & Shipment",hint:"Shipment documents, packaging proof, and labelling evidence."},
  {id:"responsible_sourcing",label:"Responsible Sourcing",hint:"Social, safety, environmental, and due-diligence evidence."},
];

export const evidenceTypeFallback = type => {
  const map = {
    government_registration:"certificate_number",
    management_system_cert:"certificate_number",
    product_test_report:"lab_report",
    responsible_sourcing_audit:"external_verification",
    shipment_document:"document_upload",
    operational_record:"checklist_confirmation",
    training_record:"checklist_confirmation",
    policy_document:"document_upload",
  };
  return map[type] || "document_upload";
};

export const marketsForRequirement = r => {
  const list = Array.isArray(r.destination_markets) ? r.destination_markets : [];
  if(list.length)return list;
  return [r.destination_market || "GLOBAL"];
};

export const requirementApplies = (r,{sector,productType,market}) => {
  const reqSector = r.sector || "stone";
  const reqProduct = r.product_type || r.productCategory || r.product_category || "any";
  const reqMarkets = marketsForRequirement(r);
  return reqSector === sector
    && (reqProduct === "any" || reqProduct === productType || productType === "any")
    && (reqMarkets.includes("GLOBAL") || reqMarkets.includes("any") || reqMarkets.includes(market));
};

export const mapRequirement = r => ({
  ...r,
  requirementName:r.certification_name || r.requirement_name || r.name || r.id,
  shortName:r.certification_code || r.requirement_name || r.id,
  timelineMin:r.timeline_min_weeks ?? r.estimated_timeline_weeks_min,
  timelineMax:r.timeline_max_weeks ?? r.estimated_timeline_weeks_max,
  costMin:r.estimated_cost_min_inr,
  costMax:r.estimated_cost_max_inr,
  evidenceType:r.evidence_type || evidenceTypeFallback(r.evidence_lifecycle_type || r.certification_evidence_type),
  lifecycleType:r.evidence_lifecycle_type || r.certification_evidence_type || r.evidence_type,
});

export const sectionForRequirement = r => {
  const t=(r.requirement_type||"").toLowerCase();
  const name=(r.requirementName||r.requirement_name||"").toLowerCase();
  const evidence=(r.evidenceType||r.evidence_type||"").toLowerCase();
  const lifecycle=(r.lifecycleType||r.evidence_lifecycle_type||"").toLowerCase();
  if(t==="registration" || lifecycle==="government_registration")return "market_entry";
  if(t==="testing" || t==="standard" || evidence==="lab_report" || lifecycle==="product_test_report")return "product_standards";
  if(t==="packaging" || name.includes("packaging") || name.includes("origin") || lifecycle==="shipment_document")return "packaging_shipment";
  if(name.includes("origin") || name.includes("trace") || name.includes("quarry") || name.includes("supplier"))return "origin_traceability";
  if(t==="compliance" || lifecycle==="responsible_sourcing_audit" || name.includes("sourcing") || name.includes("silica") || name.includes("environment"))return "responsible_sourcing";
  if(t==="certification" || lifecycle==="management_system_cert")return "quality_evidence";
  return "market_entry";
};

export const scoreRequirements = (requirements,evidenceRows) => {
  const evidenceMap={};
  evidenceRows.forEach(e=>{evidenceMap[e.requirement_id]=e;});
  const mandatory=requirements.filter(r=>r.is_mandatory!==false);
  const applicable=mandatory.filter(r=>evidenceMap[r.id]?.status!=="not_applicable");
  if(!applicable.length)return {score:requirements.length?100:0,complete:0,working:0,missing:requirements.length,total:requirements.length};
  const total=applicable.reduce((sum,r)=>sum+(r.priority||50),0);
  const earned=applicable.reduce((sum,r)=>{
    const status=evidenceMap[r.id]?.status || "missing";
    return sum + ((r.priority||50) * (readinessStatusConf(status).score/100));
  },0);
  const complete=requirements.filter(r=>["verified","not_applicable"].includes(evidenceMap[r.id]?.status)).length;
  const working=requirements.filter(r=>["pending","uploaded","submitted"].includes(evidenceMap[r.id]?.status)).length;
  const missing=requirements.filter(r=>["missing","rejected","expired",undefined].includes(evidenceMap[r.id]?.status)).length;
  return {score:Math.round(earned/total*100),complete,working,missing,total:requirements.length};
};

```
