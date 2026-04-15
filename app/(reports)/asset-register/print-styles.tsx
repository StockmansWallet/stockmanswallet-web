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
        margin: 0;
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
        }
        .no-print {
          display: none !important;
        }
        .break-inside-avoid {
          page-break-inside: avoid;
        }
        .report-page {
          padding: 12mm 16mm;
          max-width: none;
          margin: 0;
        }
      }
      @media screen {
        .report-page {
          max-width: 210mm;
          margin: 0 auto;
          padding: 16mm;
          padding-top: calc(16mm + 56px);
        }
      }
    `}</style>
  );
}
