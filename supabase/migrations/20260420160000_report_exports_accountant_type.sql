-- Accountant Report is migrating off the jsPDF client-side flow onto the
-- shared Puppeteer + Supabase Storage pipeline. Its report_type column
-- needs to accept 'accountant' alongside the existing four types.

ALTER TABLE public.report_exports
  DROP CONSTRAINT IF EXISTS report_exports_report_type_check;

ALTER TABLE public.report_exports
  ADD CONSTRAINT report_exports_report_type_check
  CHECK (
    report_type IN (
      'asset-report',
      'lender-report',
      'saleyard-comparison',
      'sales-summary',
      'accountant'
    )
  );
