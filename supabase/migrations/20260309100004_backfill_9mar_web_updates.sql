INSERT INTO dev_updates (platform, date, title, summary, detail, sort_order) VALUES
('web', '2026-03-09', 'Cow Category Mapping Fix',
 'All cow types (Breeder Cow, Breeder Heifer, Wet Cow, Cull Cow) now map to "Cows" instead of "Breeding Cow"/"Wet Cow". Was causing saleyard price lookups to fail silently (no "Breeding Cow" category in MLA data). Now matches iOS mapping.',
 'mapCategoryToMLACategory updated to return "Cows" for all cow types. mlaCsvCategoryMapping simplified to single "Cows|*" wildcard instead of per-prefix entries (Processor, Restocker, Dairy, PTIC, Feeder).

Files changed: lib/data/reference-data.ts', 0),

('web', '2026-03-09', 'Formula Walkthrough Layout',
 'Moved data source info (price source, date, category mapping) below NetValue as grouped reference section in the test calculator formula walkthrough.',
 'Price Data Source, Latest Data Source Date, and Category Mapping moved from inline in calculation steps to a grouped section below NetValue, separated by a divider.

Files changed: app/(app)/dashboard/admin/valuation/test-calculator.tsx', 1);
