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
