# Supabase Migration Runbook

Use this when applying SQL migrations manually from the Supabase dashboard.

## Before Running SQL

1. Open the Supabase project.
2. Go to SQL Editor.
3. Open the migration file from `supabase/migrations`.
4. Read the header comment.
5. Confirm the migration is additive or otherwise expected.

## Safe Migration Order

Run migrations in filename order.

For the sector/compliance foundation, apply:

1. `202605200001_sector_foundation_fields.sql`
2. `202605200002_compliance_template_foundation.sql`
3. `202605200003_compliance_template_rls.sql`
4. `202605200004_inspection_integrity_fields.sql`
5. `202605200005_backfill_generic_inspection_fields.sql`
6. `202605200006_compliance_template_lifecycle.sql`
7. `202605200007_activity_log_evidence_fields.sql`
8. `202605200008_evidence_packets.sql`

## After Running SQL

Confirm:

- SQL Editor returns success.
- No app login flow regressed.
- Factory admin dashboard loads.
- Analytics page loads.
- Existing slab certificates still load.

## Important Notes

These migrations are additive foundation work.

They should not change current stone workflows until application code starts reading or writing the new fields.

Use `docs/compliance-template-authoring.md` before adding a new `compliance_templates` migration.

If a migration fails, stop and fix that migration before applying later files.

Do not skip RLS migrations for new tables.
