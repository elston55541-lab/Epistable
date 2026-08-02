import { useEffect, useMemo, useState } from "react";
import { C, fmtD } from "../lib/domain";
import { SPACE } from "../lib/tokens";
import { EXPORT_PRODUCTS, readinessStatusConf, scoreRequirements, sectionForRequirement } from "../lib/readiness";
import { EXPORT_MARKETS, marketConf } from "../lib/markets";
import { EvidenceUploadModal } from "../components/EvidenceUploadModal";
import { Icon } from "../components/Icon";
import { Pill } from "../components/Pill";
import { Btn, Card, Loader, Sel, T } from "../components/ui";

const DOC_SECTIONS = [
  { id: "business", label: "Business documents", readinessIds: ["market_entry"], hint: "Start here. These are the registrations buyers expect before export conversations get serious." },
  { id: "product", label: "Product test reports", readinessIds: ["product_standards"], hint: "Lab reports, CE/EN/ASTM evidence, and technical product documents." },
  { id: "factory", label: "Factory certificates", readinessIds: ["quality_evidence", "responsible_sourcing"], hint: "Factory-level certificates, social audit evidence, safety, and environmental records." },
  { id: "shipment", label: "Shipment documents", readinessIds: ["packaging_shipment"], hint: "Origin, packing, labelling, fumigation, and shipment proof." },
  { id: "slab", label: "Slab evidence", readinessIds: ["origin_traceability"], hint: "Auto-filled from scans where possible: slab certificates, inspection photos, supplier and batch data." },
];

const DEFAULT_FORM = {
  sector: "stone",
  productType: "any",
  markets: ["EU"],
  exportStatus: "planning",
  companySize: "",
  currentCertifications: [],
};

const TEXT = {
  title: { ...T.title, fontWeight: 700 },
  meta: { ...T.hint, color: C.textDim },
};

function docSectionForRequirement(req) {
  const section = sectionForRequirement(req);
  const found = DOC_SECTIONS.find(s => s.readinessIds.includes(section));
  return found?.id || "business";
}

function evidenceSummary(ev) {
  if (!ev) return null;
  const parts = [];
  if (ev.certificate_number) parts.push(`Ref ${ev.certificate_number}`);
  if (ev.expires_at) parts.push(`Valid until ${fmtD(ev.expires_at)}`);
  if (ev.file_url) parts.push("File added");
  if (!parts.length && ev.notes) parts.push(ev.notes.slice(0, 90));
  return parts.join(" · ");
}

export function SellerDocuments({ fac, user, DB, insps = [] }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [market, setMarket] = useState("EU");
  const [requirements, setRequirements] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [bodiesByReq, setBodiesByReq] = useState({});
  const [uploadReq, setUploadReq] = useState(null);
  const [showAllSections, setShowAllSections] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const evidenceByReq = useMemo(() => {
    const out = {};
    evidence.forEach(e => { out[e.requirement_id] = e; });
    return out;
  }, [evidence]);

  const scored = useMemo(() => requirements.map(r => ({
    ...r,
    status: evidenceByReq[r.id]?.status || "missing",
  })), [requirements, evidenceByReq]);

  const stats = scoreRequirements(requirements, evidence);
  const firstMissing = scored.find(r => ["missing", "expired", "rejected"].includes(r.status));
  const scanStats = useMemo(() => {
    const withPhoto = insps.filter(i => i.photo || (Array.isArray(i.photos) && i.photos.length)).length;
    const withBatch = insps.filter(i => i.measurements?.traceability?.batchNo).length;
    const exportReady = insps.filter(i => i.exportReady).length;
    return { total: insps.length, withPhoto, withBatch, exportReady };
  }, [insps]);

  async function fetchRequirements(nextForm, nextMarket) {
    const reqs = await DB.exportRequirements({
      sector: nextForm.sector,
      productType: nextForm.productType,
      market: nextMarket,
    });
    setRequirements(reqs);
    setBodiesByReq(await DB.readinessBodies(reqs.map(r => r.id)));
  }

  async function load() {
    if (!fac?.id) return;
    setLoading(true); setErr("");
    try {
      const p = await DB.getExportReadinessProfile(fac.id);
      const next = p ? {
        sector: p.sector || "stone",
        productType: p.product_type || "any",
        markets: p.destination_markets?.length ? p.destination_markets : ["EU"],
        exportStatus: p.export_status || "planning",
        companySize: p.company_size || "",
        currentCertifications: p.current_certifications || [],
      } : DEFAULT_FORM;
      const nextMarket = next.markets[0] || "EU";
      setProfile(p);
      setForm(next);
      setMarket(nextMarket);
      await fetchRequirements(next, nextMarket);
      setEvidence(p?.id ? await DB.readinessEvidence(p.id) : []);
    } catch (e) {
      console.error("Seller documents load failed", e);
      setErr(e.message || "Could not load seller documents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [fac?.id]);

  async function saveProfile(nextForm = form) {
    setSaving(true); setErr("");
    try {
      const saved = await DB.saveExportReadinessProfile(profile, {
        factoryId: fac.id,
        userId: user.id,
        sector: nextForm.sector,
        productType: nextForm.productType,
        destinationMarkets: nextForm.markets?.length ? nextForm.markets : [market],
        currentCertifications: nextForm.currentCertifications,
        companySize: nextForm.companySize,
        exportStatus: nextForm.exportStatus,
        onboardingInputs: { source: "seller_documents", productType: nextForm.productType, markets: nextForm.markets },
      });
      setProfile(saved);
      setEvidence(await DB.readinessEvidence(saved.id));
      return saved;
    } catch (e) {
      console.error("Seller documents profile save failed", e);
      setErr(e.message || "Could not prepare document profile.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function changeProfile(patch) {
    const next = { ...form, ...patch };
    setForm(next);
    if (patch.markets?.length) setMarket(patch.markets[0]);
    await saveProfile(next);
    await fetchRequirements(next, patch.markets?.[0] || market);
  }

  async function saveEvidence(req, patch) {
    let activeProfile = profile;
    if (!activeProfile?.id) activeProfile = await saveProfile(form);
    if (!activeProfile?.id) return;
    setSaving(true); setErr("");
    try {
      await DB.setReadinessEvidence({
        factoryId: fac.id,
        profileId: activeProfile.id,
        requirementId: req.id,
        evidenceType: req.evidenceType,
        evidenceLifecycleType: req.lifecycleType,
        userId: user.id,
        ...patch,
      });
      setEvidence(await DB.readinessEvidence(activeProfile.id));
      setUploadReq(null);
    } catch (e) {
      console.error("Seller document save failed", e);
      setErr(e.message || "Could not save document.");
    } finally {
      setSaving(false);
    }
  }

  async function markWorking(req) {
    await saveEvidence(req, { status: "pending", notes: "Working on this document." });
  }

  async function openEvidence(ev) {
    const url = await DB.evidenceFileUrl(ev?.file_url);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  const grouped = useMemo(() => {
    const out = Object.fromEntries(DOC_SECTIONS.map(s => [s.id, []]));
    scored.forEach(req => { out[docSectionForRequirement(req)].push(req); });
    return out;
  }, [scored]);
  const nextSectionId = firstMissing ? docSectionForRequirement(firstMissing) : null;
  const visibleSections = useMemo(() => {
    if (showAllSections || !nextSectionId) return DOC_SECTIONS;
    return DOC_SECTIONS.filter(section =>
      section.id === nextSectionId ||
      (grouped[section.id] || []).some(req => evidenceByReq[req.id])
    );
  }, [showAllSections, nextSectionId, grouped, evidenceByReq]);

  if (loading) return <Loader />;

  return (
    <div>
      {uploadReq && (
        <EvidenceUploadModal
          req={uploadReq}
          evidence={evidenceByReq[uploadReq.id]}
          bodies={bodiesByReq[uploadReq.id] || []}
          factoryId={fac?.id}
          saving={saving}
          onClose={() => setUploadReq(null)}
          onSave={patch => saveEvidence(uploadReq, patch)}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", gap: SPACE.base, alignItems: "flex-start", marginBottom: SPACE.lg, flexWrap: "wrap" }}>
        <div>
          <div style={TEXT.title}>Documents</div>
          <div style={{ ...TEXT.meta, marginTop: 4, maxWidth: 680 }}>
            Add the proof buyers ask for. Start with the missing items, one file or number at a time.
          </div>
        </div>
        <Pill tone={stats.score >= 75 ? "success" : stats.score >= 45 ? "warning" : "danger"} style={{ fontSize: 13, padding: "6px 12px" }}>
          {marketConf(market).short} ready: {stats.complete} of {stats.total}
        </Pill>
      </div>

      {err && (
        <div style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 10, padding: "12px 14px", fontSize: 13, color: C.red, marginBottom: SPACE.base }}>
          {err}
        </div>
      )}

      <Card style={{ padding: SPACE.lg, marginBottom: SPACE.base }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: SPACE.md, alignItems: "end" }}>
          <Sel
            label="Market"
            value={market}
            onChange={async v => {
              setMarket(v);
              const next = { ...form, markets: [v] };
              setForm(next);
              await saveProfile(next);
              await fetchRequirements(next, v);
            }}
            options={EXPORT_MARKETS}
          />
          <Sel
            label="Product"
            value={form.productType}
            onChange={v => changeProfile({ productType: v })}
            options={EXPORT_PRODUCTS}
          />
          <div style={{ display: "flex", gap: SPACE.sm, alignItems: "center", flexWrap: "wrap" }}>
            <Pill tone="success">{stats.complete} added</Pill>
            <Pill tone="warning">{stats.working} working</Pill>
            <Pill tone="danger">{stats.missing} missing</Pill>
          </div>
        </div>
      </Card>

      <Card style={{ padding: SPACE.lg, marginBottom: SPACE.base, background: firstMissing ? C.primaryBg : C.greenBg, borderColor: firstMissing ? C.primaryBorder : C.greenBorder }}>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.md, flexWrap: "wrap" }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name={firstMissing ? "upload" : "check"} size={20} color={firstMissing ? C.primary : C.green} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>
              {firstMissing ? `Next: add ${firstMissing.requirementName}` : "Core documents added"}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: C.textMid }}>
              {firstMissing ? firstMissing.evidence_instructions || "Upload the document or add the reference number when you have it." : "Keep expiry dates current before sharing evidence with buyers."}
            </div>
          </div>
          {firstMissing && <Btn size="sm" onClick={() => setUploadReq(firstMissing)}>Add document</Btn>}
        </div>
      </Card>

      {!showAllSections && nextSectionId && visibleSections.length < DOC_SECTIONS.length && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: SPACE.md, alignItems: "center", marginBottom: SPACE.base, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, lineHeight: 1.55, color: C.textMid }}>
            Showing the next useful section first. The full readiness checklist is still available when needed.
          </div>
          <Btn size="sm" variant="secondary" onClick={() => setShowAllSections(true)}>View all document sections</Btn>
        </div>
      )}

      <div style={{ display: "grid", gap: SPACE.base }}>
        {visibleSections.map(section => {
          const rows = grouped[section.id] || [];
          const sectionStats = scoreRequirements(rows, evidence);
          return (
            <Card key={section.id} style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: SPACE.lg, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", gap: SPACE.md, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{section.label}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.55, color: C.textMid, marginTop: 2 }}>{section.hint}</div>
                </div>
                <Pill tone={sectionStats.complete === sectionStats.total && sectionStats.total ? "success" : "neutral"}>
                  {sectionStats.complete} of {sectionStats.total}
                </Pill>
              </div>

              {section.id === "slab" && (
                <div style={{ padding: `${SPACE.md}px ${SPACE.lg}px`, background: C.surface, borderBottom: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: SPACE.sm }}>
                  {[
                    ["Scans", scanStats.total],
                    ["With photos", scanStats.withPhoto],
                    ["With batch no.", scanStats.withBatch],
                    ["Export ready", scanStats.exportReady],
                  ].map(([label, value]) => (
                    <div key={label} style={{ fontSize: 12, color: C.textMid }}>
                      <strong style={{ display: "block", fontSize: 18, color: C.text, lineHeight: 1.1 }}>{value}</strong>
                      {label}
                    </div>
                  ))}
                </div>
              )}

              {!rows.length ? (
                <div style={{ padding: SPACE.lg, color: C.textDim, fontSize: 13 }}>No required documents in this section for the selected market.</div>
              ) : rows.map((req, index) => {
                const ev = evidenceByReq[req.id];
                const conf = readinessStatusConf(req.status);
                const summary = evidenceSummary(ev);
                return (
                  <div key={req.id} style={{ padding: SPACE.lg, borderTop: index ? `1px solid ${C.border}` : "none", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: SPACE.md, alignItems: "center" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", gap: SPACE.sm, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                        <div style={{ fontSize: 14, lineHeight: 1.35, fontWeight: 700, color: C.text }}>{req.requirementName}</div>
                        {req.is_mandatory === false && <Pill tone="neutral" size="sm">Optional</Pill>}
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.55, color: C.textMid, maxWidth: 760 }}>
                        {req.evidence_instructions || req.description || "Add the document, certificate number, or supporting note."}
                      </div>
                      {summary && (
                        <div style={{ fontSize: 12, lineHeight: 1.5, color: C.textDim, marginTop: 6 }}>
                          {summary}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: SPACE.sm, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <Pill tone={conf.tone}>{conf.label}</Pill>
                      {ev?.file_url && <Btn size="sm" variant="ghost" onClick={() => openEvidence(ev)}>Open</Btn>}
                      <Btn size="sm" variant={ev ? "secondary" : "primary"} disabled={saving} onClick={() => setUploadReq(req)}>
                        {ev ? "Edit" : "Add document"}
                      </Btn>
                      {!ev && <Btn size="sm" variant="ghost" disabled={saving} onClick={() => markWorking(req)}>Working on it</Btn>}
                    </div>
                  </div>
                );
              })}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
