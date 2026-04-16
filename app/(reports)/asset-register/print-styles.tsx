export function ReportPrintStyles() {
  return (
    <>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <style>{`
      /* Debug: Inter web font ensures identical rendering across browser and Puppeteer.
         Without this, system fonts differ between macOS (SF Pro) and Linux (DejaVu). */
      .report-page, .report-page * {
        font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
      }
      /* Override dark theme for report pages */
      html.dark .report-root {
        color-scheme: light;
      }
      .report-root {
        background: white !important;
        color: #111827 !important;
      }
      @page {
        size: A4;
        margin: 0;
        @bottom-right {
          content: "Page " counter(page) " of " counter(pages);
          font-size: 8px;
          color: #9ca3af;
          font-family: sans-serif;
        }
      }
      @media print {
        html, body {
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          counter-reset: page;
        }
        .no-print {
          display: none !important;
        }
        .break-inside-avoid {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        /* Prevent cards, tables, and stat grids from splitting across pages */
        .rounded-xl, table, thead, .grid {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .report-page {
          padding: 12mm 16mm;
          max-width: none;
          margin: 0;
        }
        .print-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 6mm 16mm;
          font-size: 7px;
          color: #9ca3af;
          display: flex;
          justify-content: space-between;
        }
      }
      @media screen {
        .report-page {
          max-width: 210mm;
          margin: 0 auto;
          padding: 16mm;
          padding-top: calc(16mm + 56px);
        }
        .print-footer {
          display: none;
        }
      }
    `}</style>
    </>
  );
}
