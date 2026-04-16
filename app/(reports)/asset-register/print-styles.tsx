export function ReportPrintStyles() {
  return (
    <style>{`
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
        margin: 4mm 0 0 0;
      }
      @page :first {
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
        /* Tables: allow natural page breaks but keep header repeating */
        table { border-collapse: collapse; }
        thead { display: table-header-group; }
        tr { break-inside: avoid; page-break-inside: avoid; }
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
  );
}
