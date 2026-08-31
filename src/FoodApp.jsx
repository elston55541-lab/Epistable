import React, { useMemo, useState } from "react";

const products = [
  {
    id: "CHILLI-2408-A",
    name: "Red Chilli Powder",
    category: "Spices & Seasonings",
    supplier: "Deccan Spice Foods",
    origin: "Guntur, Andhra Pradesh, India",
    quantity: "18 MT",
    moq: "1 MT",
    packaging: "25 kg food-grade bags",
    market: "EU / UK",
    readiness: 92,
    evidence: ["COA", "Pesticide residue", "Microbiology", "FSSAI", "BRCGS"],
  },
  {
    id: "MANGO-ALPH-0826",
    name: "Alphonso Mango Pulp",
    category: "Processed Fruit & Fruit Ingredients",
    supplier: "Konkan Fruit Processors",
    origin: "Ratnagiri, Maharashtra, India",
    quantity: "42 MT",
    moq: "5 MT",
    packaging: "Aseptic 215 kg drums",
    market: "US / EU / GCC",
    readiness: 88,
    evidence: ["COA", "Microbiology", "FSSC 22000", "Allergen declaration", "Origin docs"],
  },
  {
    id: "GRAPE-2608-14",
    name: "Fresh Thompson Seedless Grapes",
    category: "Fresh Produce",
    supplier: "Nashik Fresh Exports",
    origin: "Nashik, Maharashtra, India",
    quantity: "26 MT",
    moq: "2 MT",
    packaging: "4.5 kg export cartons",
    market: "EU / GCC",
    readiness: 81,
    evidence: ["Pesticide residue", "Traceability", "Phytosanitary", "Packing record"],
  },
];

const rfqsSeed = [
  { id: "RFQ-1024", buyer: "Northstar Ingredients GmbH", product: "Red Chilli Powder", qty: "10 MT", destination: "Hamburg, Germany", status: "Open" },
  { id: "RFQ-1021", buyer: "Meridian Foods LLC", product: "Mango Pulp", qty: "20 MT", destination: "New Jersey, USA", status: "Quoted" },
];

const shell = { minHeight: "100vh", background: "#f6f8fb", color: "#172033", fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" };
const card = { background: "white", border: "1px solid #e5e9f0", borderRadius: 16, boxShadow: "0 8px 24px rgba(30,45,70,.05)" };
const pill = tone => ({ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "5px 9px", fontSize: 12, fontWeight: 700, background: tone === "good" ? "#eaf8ef" : tone === "warn" ? "#fff7e5" : "#eef3fb", color: tone === "good" ? "#217a43" : tone === "warn" ? "#9a6a10" : "#385b86" });

function Button({ children, secondary, onClick }) {
  return <button onClick={onClick} style={{ border: secondary ? "1px solid #cfd7e4" : 0, background: secondary ? "white" : "#173b63", color: secondary ? "#173b63" : "white", borderRadius: 10, padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}>{children}</button>;
}

function BuyerView() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const visible = useMemo(() => products.filter(p => `${p.name} ${p.category} ${p.supplier} ${p.origin}`.toLowerCase().includes(query.toLowerCase())), [query]);

  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "end", flexWrap: "wrap", marginBottom: 22 }}>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800 }}>Find export-ready food suppliers</div>
        <div style={{ color: "#667085", marginTop: 5 }}>Search products, review lot-level evidence, and request quotes from suppliers.</div>
      </div>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search product, supplier, origin…" style={{ width: 330, maxWidth: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #ccd5e1", outline: "none" }} />
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 16 }}>
      {visible.map(p => <div key={p.id} style={{ ...card, padding: 18 }}>
        <div style={{ ...pill("good"), marginBottom: 12 }}>{p.readiness}% evidence ready</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{p.name}</div>
        <div style={{ color: "#536076", fontSize: 13, marginTop: 3 }}>{p.category}</div>
        <div style={{ marginTop: 16, fontWeight: 700 }}>{p.supplier}</div>
        <div style={{ color: "#667085", fontSize: 13, marginTop: 2 }}>{p.origin}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16, fontSize: 13 }}>
          <div><span style={{ color: "#8a94a6" }}>Available</span><br/><strong>{p.quantity}</strong></div>
          <div><span style={{ color: "#8a94a6" }}>MOQ</span><br/><strong>{p.moq}</strong></div>
          <div><span style={{ color: "#8a94a6" }}>Markets</span><br/><strong>{p.market}</strong></div>
          <div><span style={{ color: "#8a94a6" }}>Lot</span><br/><strong>{p.id}</strong></div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 16 }}>{p.evidence.slice(0,4).map(x => <span key={x} style={pill("neutral")}>{x}</span>)}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}><Button onClick={() => setSelected(p)}>View evidence</Button><Button secondary>Request quote</Button></div>
      </div>)}
    </div>

    {selected && <div style={{ position: "fixed", inset: 0, background: "rgba(20,31,48,.42)", display: "grid", placeItems: "center", padding: 20, zIndex: 20 }} onClick={() => setSelected(null)}>
      <div onClick={e => e.stopPropagation()} style={{ ...card, width: 720, maxWidth: "100%", maxHeight: "85vh", overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><div style={{ fontSize: 24, fontWeight: 800 }}>{selected.name}</div><div style={{ color: "#667085", marginTop: 4 }}>{selected.supplier} · {selected.id}</div></div><button onClick={() => setSelected(null)} style={{ border: 0, background: "transparent", fontSize: 24, cursor: "pointer" }}>×</button></div>
        <div style={{ marginTop: 22, display: "grid", gap: 12 }}>
          {["Supplier identity & facility", "Product specification", "Lot / batch traceability", "Certificate of Analysis", "Microbiology / safety tests", "Pesticide / residue evidence", "Facility certifications", "Packaging & labelling", "Destination-market readiness"].map((x,i) => <div key={x} style={{ padding: 14, border: "1px solid #e5e9f0", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontWeight: 700 }}>{x}</span><span style={pill(i < 7 ? "good" : "warn")}>{i < 7 ? "Available" : "Review"}</span></div>)}
        </div>
        <div style={{ marginTop: 20 }}><Button>Request quote for this lot</Button></div>
      </div>
    </div>}
  </div>;
}

function SellerView() {
  const [rfqs, setRfqs] = useState(rfqsSeed);
  return <div>
    <div style={{ marginBottom: 22 }}><div style={{ fontSize: 28, fontWeight: 800 }}>Supplier command center</div><div style={{ color: "#667085", marginTop: 5 }}>Keep products buyer-ready, respond to RFQs, and complete missing evidence.</div></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 18 }}>
      {[['Active products','14'],['Open RFQs','6'],['Evidence expiring','3'],['Buyer-ready lots','21']].map(([a,b]) => <div key={a} style={{ ...card, padding: 18 }}><div style={{ color: "#748095", fontSize: 13 }}>{a}</div><div style={{ fontSize: 28, fontWeight: 800, marginTop: 5 }}>{b}</div></div>)}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr .8fr", gap: 16 }}>
      <div style={{ ...card, padding: 18 }}><div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Buyer RFQs</div>{rfqs.map(r => <div key={r.id} style={{ padding: "14px 0", borderTop: "1px solid #edf0f4", display: "grid", gridTemplateColumns: "1.2fr 1fr .8fr", gap: 10, alignItems: "center" }}><div><strong>{r.product}</strong><div style={{ color: "#667085", fontSize: 12, marginTop: 3 }}>{r.buyer} · {r.destination}</div></div><div><strong>{r.qty}</strong><div style={{ color: "#667085", fontSize: 12 }}>{r.id}</div></div><div style={{ display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center" }}><span style={pill(r.status === 'Quoted' ? 'good' : 'warn')}>{r.status}</span>{r.status === 'Open' && <Button onClick={() => setRfqs(xs => xs.map(x => x.id === r.id ? {...x,status:'Quoted'} : x))}>Quote</Button>}</div></div>)}</div>
      <div style={{ ...card, padding: 18 }}><div style={{ fontSize: 18, fontWeight: 800 }}>Next evidence actions</div><div style={{ color: "#667085", fontSize: 13, marginTop: 4 }}>Complete the highest-impact gaps first.</div><div style={{ marginTop: 14, display: "grid", gap: 10 }}>{[
        ['Renew BRCGS certificate','Expires in 22 days'],['Upload chilli pesticide panel','EU buyer requirement'],['Add grape phytosanitary record','Shipment readiness']
      ].map(([a,b]) => <div key={a} style={{ padding: 12, border: "1px solid #e5e9f0", borderRadius: 12 }}><strong>{a}</strong><div style={{ color: "#8a6570", fontSize: 12, marginTop: 3 }}>{b}</div></div>)}</div></div>
    </div>
  </div>;
}

export default function FoodApp() {
  const [role, setRole] = useState("buyer");
  return <div style={shell}>
    <header style={{ background: "white", borderBottom: "1px solid #e5e9f0", position: "sticky", top: 0, zIndex: 10 }}><div style={{ maxWidth: 1180, margin: "0 auto", padding: "15px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14 }}><div><div style={{ fontSize: 19, fontWeight: 900, letterSpacing: "-.02em" }}>Epistable</div><div style={{ color: "#7b8799", fontSize: 11 }}>Verified food trade workspace</div></div><div style={{ display: "flex", gap: 6, background: "#f1f4f8", padding: 4, borderRadius: 10 }}><button onClick={() => setRole("buyer")} style={{ border:0, borderRadius:8, padding:"8px 12px", fontWeight:700, cursor:"pointer", background: role === "buyer" ? "white" : "transparent", color:"#173b63" }}>Buyer</button><button onClick={() => setRole("seller")} style={{ border:0, borderRadius:8, padding:"8px 12px", fontWeight:700, cursor:"pointer", background: role === "seller" ? "white" : "transparent", color:"#173b63" }}>Supplier</button></div></div></header>
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "30px 22px 60px" }}>{role === "buyer" ? <BuyerView/> : <SellerView/>}</main>
  </div>;
}
