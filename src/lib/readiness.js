export const EXPORT_PRODUCTS = [
  {value:"any",label:"Mixed food products"},
  {value:"spices",label:"Spices & Seasonings"},
  {value:"fresh_produce",label:"Fresh Produce"},
  {value:"processed_fruit",label:"Processed Fruit & Fruit Ingredients"},
  {value:"nuts",label:"Nuts & Dry Fruits"},
  {value:"ingredients",label:"Food Ingredients"},
];

export const EXPORT_CERTS = [
  {id:"iec",label:"IEC"},
  {id:"fssai",label:"FSSAI"},
  {id:"haccp",label:"HACCP"},
  {id:"iso_22000",label:"ISO 22000"},
  {id:"fssc_22000",label:"FSSC 22000"},
  {id:"brcgs",label:"BRCGS Food Safety"},
  {id:"organic",label:"Organic certification"},
  {id:"halal",label:"Halal"},
  {id:"kosher",label:"Kosher"},
  {id:"lab_report",label:"Lab / COA reports"},
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
  {id:"market_entry",label:"Market Entry",hint:"Exporter registrations, food-business licences, and baseline documents needed before trade conversations get serious."},
  {id:"product_standards",label:"Product & Lab Evidence",hint:"Specifications, COAs, microbiology, pesticide/residue, allergen, contaminant, and buyer-specific test evidence."},
  {id:"quality_evidence",label:"Food Safety & Quality Systems",hint:"Facility certifications and operational evidence that show consistent food-safety and quality control."},
  {id:"origin_traceability",label:"Origin & Traceability",hint:"Supplier, farm/source, lot/batch, production, harvest, and chain-of-custody records."},
  {id:"packaging_shipment",label:"Packaging & Shipment",hint:"Labelling, packaging, cold-chain/storage, origin, phytosanitary/health, and shipment documentation where applicable."},
  {id:"responsible_sourcing",label:"Responsible Sourcing",hint:"Social, environmental, sustainability, ethical sourcing, and buyer due-diligence evidence."},
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
  const reqSector = r.sector || "food";
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
  if(t==="packaging" || name.includes("packaging") || name.includes("label") || name.includes("shipment") || name.includes("phytosanitary") || lifecycle==="shipment_document")return "packaging_shipment";
  if(name.includes("origin") || name.includes("trace") || name.includes("farm") || name.includes("source") || name.includes("supplier") || name.includes("batch") || name.includes("lot"))return "origin_traceability";
  if(t==="compliance" || lifecycle==="responsible_sourcing_audit" || name.includes("sourcing") || name.includes("environment") || name.includes("social audit") || name.includes("sustainability"))return "responsible_sourcing";
  if(t==="certification" || lifecycle==="management_system_cert" || name.includes("haccp") || name.includes("fssc") || name.includes("brcgs") || name.includes("iso 22000"))return "quality_evidence";
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
