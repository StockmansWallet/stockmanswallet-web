export function ReportPrintStyles() {
  return (
    <style>{`
      /* The report template is a light document even when the rest of the app runs
         in dark mode. We force html, body, and :root to white with !important so the
         app's dark global body background does not bleed into the @page margin area
         (Chromium fills the PDF canvas from the root element background). */
      html.dark .report-root {
        color-scheme: light;
      }
      :root, html, body {
        background: white !important;
        background-color: white !important;
      }
      html {
        color-scheme: light !important;
      }
      .report-root {
        background: white !important;
        color: #111827 !important;
      }
      @page {
        size: A4;
        /* 16mm top gives the logo clear space on every page.
           10mm bottom leaves room for the page counter in the @bottom-right margin box.
           Left/right are 0 here; .report-page owns horizontal padding.
           background: white keeps the margin boxes paper-white instead of inheriting
           any dark root background if CSS overrides fail. */
        margin: 16mm 0 10mm 0;
        background: white;
        @bottom-right {
          content: "Page " counter(page) " of " counter(pages);
          font-size: 8px;
          color: #9ca3af;
          font-family: sans-serif;
          margin-right: 16mm;
        }
      }
      /* Break-avoidance rules apply in all media so they take effect whether the
         page is rendered for screen preview or for Puppeteer print-to-PDF. */
      .break-inside-avoid {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        /* Chromium can ignore break-inside on elements with overflow:hidden.
           contain: paint isolates the element without the overflow side-effect. */
        contain: paint;
      }
      /* Table rows never split mid-row, but the table itself can break between rows. */
      tr { break-inside: avoid; page-break-inside: avoid; }
      table { border-collapse: collapse; }
      thead { display: table-header-group; }

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
        .report-page {
          padding: 0 16mm 12mm 16mm;
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
