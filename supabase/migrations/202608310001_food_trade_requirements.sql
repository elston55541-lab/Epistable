-- Food trade conversion: seed buyer-facing food export readiness requirements.
-- Additive migration. Existing stone data remains untouched so rollback/comparison is possible.

insert into public.export_requirements (
  id, sector, product_type, destination_market, requirement_type, requirement_name,
  description, is_mandatory, priority, estimated_cost_min_inr, estimated_cost_max_inr,
  estimated_timeline_weeks_min, estimated_timeline_weeks_max, evidence_type,
  evidence_instructions, renewal_period_months, documents_required, evidence_examples, source_notes
) values
  (
    'food_any_any_iec',
    'food', 'any', 'any', 'registration', 'Importer Exporter Code (IEC)',
    'DGFT registration used by Indian businesses to import or export goods.',
    true, 100, 500, 2000, 1, 2, 'certificate_number',
    'Enter the IEC number and upload the DGFT certificate or acknowledgement.',
    null,
    '["IEC certificate","PAN/GST details","bank details used for IEC"]'::jsonb,
    '["IEC number","DGFT certificate PDF"]'::jsonb,
    'Exporter should verify the latest DGFT process before application.'
  ),
  (
    'food_any_any_fssai',
    'food', 'any', 'any', 'registration', 'FSSAI Licence / Registration',
    'Indian food businesses should maintain the FSSAI licence or registration applicable to their activities and facility.',
    true, 100, 2000, 20000, 1, 6, 'certificate_number',
    'Upload the current FSSAI licence, licence number, facility scope, issue date, and expiry date.',
    12,
    '["FSSAI licence","facility details","scope/category details"]'::jsonb,
    '["valid FSSAI licence","licence number and expiry"]'::jsonb,
    'Applicability and licence type depend on the business activity and facility.'
  ),
  (
    'food_any_any_spec_coa',
    'food', 'any', 'any', 'testing', 'Product Specification & Certificate of Analysis',
    'Buyers commonly require a current specification sheet and lot/batch-specific COA showing agreed quality and safety parameters.',
    true, 95, 3000, 20000, 1, 2, 'lab_report',
    'Upload the product specification and a recent COA linked to the relevant lot or batch.',
    null,
    '["product specification","lot/batch COA","test method references"]'::jsonb,
    '["microbiology values","moisture","chemical parameters","sensory/physical parameters"]'::jsonb,
    'Parameters vary by category and buyer specification.'
  ),
  (
    'food_any_any_haccp',
    'food', 'any', 'any', 'certification', 'HACCP Food Safety System Evidence',
    'HACCP-based food safety controls are commonly expected by professional buyers and certification schemes.',
    false, 80, 50000, 200000, 4, 12, 'certificate_number',
    'Upload the HACCP certificate where externally certified, or relevant food-safety plan/audit evidence where the buyer accepts internal evidence.',
    12,
    '["HACCP certificate or plan","hazard analysis","CCP records","audit evidence"]'::jsonb,
    '["certificate","HACCP plan","monitoring records"]'::jsonb,
    'Buyer expectations vary; formal certification is not universally mandatory.'
  ),
  (
    'food_any_any_fssc_brcgs',
    'food', 'any', 'any', 'certification', 'GFSI-Recognised Food Safety Certification',
    'Many larger retailers, manufacturers, and importers prefer or require certification such as FSSC 22000 or BRCGS depending on supply-chain role and buyer policy.',
    false, 90, 150000, 600000, 8, 24, 'certificate_number',
    'Upload the current certificate, scope, site address, certification body, audit grade/result where relevant, and expiry date.',
    12,
    '["FSSC 22000 or BRCGS certificate","scope statement","audit summary where shareable"]'::jsonb,
    '["valid certificate","site scope","expiry date"]'::jsonb,
    'Scheme choice depends on buyer requirements and facility activity.'
  ),
  (
    'food_spices_eu_pesticide',
    'food', 'spices', 'EU', 'testing', 'EU Pesticide Residue Compliance Evidence',
    'EU buyers may require pesticide residue testing showing compliance with applicable maximum residue levels for the product.',
    true, 95, 8000, 30000, 1, 3, 'lab_report',
    'Upload a recent accredited pesticide residue report linked to the relevant product and lot/batch.',
    null,
    '["pesticide residue report","sample identification","lot/batch reference","test method"]'::jsonb,
    '["multi-residue panel","MRL comparison","accredited lab report"]'::jsonb,
    'Exact analytes and legal limits depend on product and destination market; verify against current EU requirements.'
  ),
  (
    'food_spices_any_contaminants',
    'food', 'spices', 'any', 'testing', 'Contaminant & Microbiology Test Evidence',
    'Professional spice buyers commonly request microbiology and contaminant evidence such as Salmonella, E. coli, aflatoxins, heavy metals, or other buyer-specific parameters.',
    true, 90, 8000, 35000, 1, 3, 'lab_report',
    'Upload recent accredited reports linked to the relevant lot/batch and buyer specification.',
    null,
    '["microbiology report","aflatoxin/mycotoxin report where applicable","heavy metals report where applicable"]'::jsonb,
    '["Salmonella result","E. coli result","aflatoxin values","lead/cadmium values"]'::jsonb,
    'Required tests vary by spice, origin, process, buyer, and destination market.'
  ),
  (
    'food_fresh_produce_any_traceability',
    'food', 'fresh_produce', 'any', 'documentation', 'Farm / Source and Lot Traceability',
    'Fresh produce buyers need clear source, harvest/packing, lot, and supplier traceability to support quality, recall, and compliance requirements.',
    true, 95, 0, 10000, 1, 2, 'document_upload',
    'Upload or enter farm/source details, packhouse details, harvest/packing date, lot/batch number, and chain-of-custody records.',
    null,
    '["farm/source record","packhouse record","lot/batch traceability sheet","harvest/packing date"]'::jsonb,
    '["lot traceability export","farm code","pack date","supplier declaration"]'::jsonb,
    'Traceability depth depends on product and buyer programme.'
  ),
  (
    'food_fresh_produce_any_phyto',
    'food', 'fresh_produce', 'any', 'documentation', 'Phytosanitary / Plant Health Documents',
    'Fresh produce shipments may require phytosanitary or other plant-health documentation depending on commodity and destination.',
    true, 90, 1000, 10000, 1, 2, 'document_upload',
    'Upload the phytosanitary certificate or relevant application/inspection evidence for the shipment when applicable.',
    null,
    '["phytosanitary certificate","inspection/application reference","commodity and shipment details"]'::jsonb,
    '["official certificate","shipment-linked reference"]'::jsonb,
    'Applicability depends on commodity and importing-country rules.'
  ),
  (
    'food_any_any_allergen',
    'food', 'any', 'any', 'documentation', 'Allergen Declaration & Cross-Contact Controls',
    'Buyers need clear allergen status and, where relevant, evidence of controls for cross-contact and label accuracy.',
    true, 85, 0, 15000, 1, 2, 'document_upload',
    'Upload the allergen declaration and supporting controls or risk assessment where relevant.',
    12,
    '["allergen declaration","cross-contact risk assessment","label/specification reference"]'::jsonb,
    '["signed declaration","allergen matrix","control procedure"]'::jsonb,
    'Requirements depend on product composition, facility activities, and destination labelling rules.'
  ),
  (
    'food_any_any_packaging_labelling',
    'food', 'any', 'any', 'packaging', 'Packaging & Labelling Evidence',
    'Buyers commonly review pack format, food-contact suitability, labels, lot coding, shelf-life information, and destination-market labelling before shipment.',
    true, 85, 0, 30000, 1, 4, 'document_upload',
    'Upload packaging specifications, label artwork, lot coding example, shelf-life details, and food-contact declarations where relevant.',
    null,
    '["packaging specification","label artwork","food-contact declaration","lot/date coding example"]'::jsonb,
    '["approved label","pack format","shelf-life declaration"]'::jsonb,
    'Destination-market label requirements should be validated before commercial shipment.'
  ),
  (
    'food_any_any_origin_shipping',
    'food', 'any', 'any', 'documentation', 'Origin & Shipment Documentation',
    'Commercial food shipments typically require a consistent document pack covering origin, invoice, packing, transport, and commodity-specific certificates.',
    true, 90, 0, 15000, 1, 2, 'document_upload',
    'Upload or prepare the commercial invoice, packing list, certificate of origin and relevant shipment/health documents for the transaction.',
    null,
    '["commercial invoice","packing list","certificate of origin","bill of lading/air waybill","health or sanitary certificate where applicable"]'::jsonb,
    '["shipment document pack","origin certificate","packing list"]'::jsonb,
    'Exact document set depends on commodity, destination, Incoterm, and buyer.'
  )
on conflict (id) do update set
  sector = excluded.sector,
  product_type = excluded.product_type,
  destination_market = excluded.destination_market,
  requirement_type = excluded.requirement_type,
  requirement_name = excluded.requirement_name,
  description = excluded.description,
  is_mandatory = excluded.is_mandatory,
  priority = excluded.priority,
  evidence_type = excluded.evidence_type,
  evidence_instructions = excluded.evidence_instructions,
  renewal_period_months = excluded.renewal_period_months,
  documents_required = excluded.documents_required,
  evidence_examples = excluded.evidence_examples,
  source_notes = excluded.source_notes,
  active = true,
  updated_at = (extract(epoch from now()) * 1000)::bigint;
