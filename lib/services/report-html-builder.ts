// Shared HTML builder for the Asset Register report.
// Used by both the /api/report/asset-register (HTML) and /api/report/asset-register/pdf (PDF) routes.

import type { ReportData, HerdReportData } from "@/lib/types/reports";
import type { PortfolioMovementSummary } from "@/lib/types/portfolio-movement";

function fmt(v: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(v);
}
function fmtFull(v: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}
function esc(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

export function buildReportHTML(data: ReportData, movement: PortfolioMovementSummary | null): string {
  const { executiveSummary: es, herdData, herdComposition, userDetails, properties, dateRange } = data;

  const grouped = new Map<string, HerdReportData[]>();
  for (const h of herdData) {
    const key = h.propertyName ?? "Unassigned";
    grouped.set(key, [...(grouped.get(key) ?? []), h]);
  }
  const totalHead = herdData.reduce((s, h) => s + h.headCount, 0);
  const totalValue = herdData.reduce((s, h) => s + h.netValue, 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Asset Register</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;color:#271F16;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:210mm;margin:0 auto;padding:16mm}
@page{size:A4;margin:0}
.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.flex-between{display:flex;align-items:center;justify-content:space-between}
.label{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#6B5B45}
.val{font-size:14px;font-weight:600;color:#271F16;margin-top:2px}
.val-lg{font-size:18px;font-weight:700}
.val-xl{font-size:28px;font-weight:700}
.card{border:1px solid rgba(139,115,85,0.25);border-radius:12px;overflow:hidden;break-inside:avoid;page-break-inside:avoid}
.card-head{padding:10px 16px;background:rgba(139,115,85,0.25)}
.card-body{padding:8px 16px}
.pill{border-radius:9999px;padding:8px 16px}
.bg-dark{background:#271F16;color:#fff}
.break-avoid{break-inside:avoid;page-break-inside:avoid}
.text-muted{color:rgba(39,31,22,0.5)}
.text-green{color:#15803d}
.text-red{color:#b91c1c}
.mt-4{margin-top:16px}
.mt-5{margin-top:20px}
.mb-2{margin-bottom:8px}
.mb-3{margin-bottom:12px}
.text-gold{color:#FFAA00}
.border-t{border-top:1px solid rgba(139,115,85,0.2)}
.pt-2{padding-top:8px}
table{width:100%;border-collapse:collapse;font-size:11px}
th{text-align:left;font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6B5B45;padding:6px 8px;border-bottom:1px solid rgba(139,115,85,0.2)}
td{padding:6px 8px;border-bottom:1px solid rgba(139,115,85,0.1)}
.bridge-row{display:flex;justify-content:space-between;padding:6px 16px;font-size:12px}
.bridge-total{background:rgba(139,115,85,0.08);font-weight:600}
.footer{margin-top:24px;padding-top:8px;font-size:7px;color:#6B5B45;display:flex;justify-content:space-between}
</style>
</head>
<body>
<div class="page">

${es ? `
<div class="flex-between">
  <img src="https://stockmanswallet.com.au/images/sw-logo-light.svg" alt="Stockman's Wallet" style="height:64px"/>
  <p style="font-size:28px;font-weight:700">Asset Register</p>
</div>

<div class="card mt-4">
  <div style="padding:16px 20px;background:#271F16">
    <p class="label" style="color:rgba(255,255,255,0.7)">Executive Summary</p>
    <p style="font-size:28px;font-weight:700;color:#fff;margin-top:4px">${fmtFull(es.totalPortfolioValue)}</p>
  </div>
  <div class="grid-4" style="padding:12px 20px">
    <div><p class="label">Head Count</p><p class="val">${es.totalHeadCount.toLocaleString()}</p></div>
    <div><p class="label">Avg per Head</p><p class="val">${fmt(es.averageValuePerHead)}</p></div>
    <div><p class="label">Valuation Date</p><p class="val" style="font-size:13px">${fmtDate(es.valuationDate)}</p></div>
    <div><p class="label">Report Period</p><p class="val" style="font-size:13px">${fmtDate(dateRange.start)}<br/>${fmtDate(dateRange.end)}</p></div>
  </div>
</div>
` : ""}

<div class="grid-2 mt-4">
${userDetails ? `
  <div class="card" style="padding:16px 20px">
    <p class="label">Producer</p>
    <p style="font-size:15px;font-weight:600;margin-top:2px">${esc(userDetails.preparedFor)}</p>
    ${properties.length > 0 ? `
    <div class="border-t" style="margin-top:12px;padding-top:12px">
      <p class="label mb-2">${properties.length > 1 ? "Properties" : "Property"}</p>
      ${properties.map(p => `<p style="font-size:13px"><b>${esc(p.name)}</b>${p.picCode ? ` <span class="text-muted" style="font-size:11px">PIC: ${esc(p.picCode)}</span>` : ""}${p.state ? ` <span class="text-muted" style="font-size:11px">${esc(p.state)}</span>` : ""}</p>`).join("")}
    </div>` : ""}
  </div>` : ""}
${herdComposition.length > 0 ? `
  <div class="card" style="padding:16px 20px">
    <p class="label mb-3">Herd Composition</p>
    ${herdComposition.map(c => `<div class="flex-between" style="font-size:12px;padding:2px 0"><span>${esc(c.assetClass)}</span><span><span class="text-muted">${c.headCount} hd</span> <b>${c.percentage.toFixed(1)}%</b></span></div>`).join("")}
  </div>` : ""}
</div>

${movement ? buildMovementHTML(movement) : ""}

<section class="mt-5">
  <h2 style="font-size:16px;font-weight:700" class="mb-2">Livestock Assets</h2>
  ${[...grouped.entries()].map(([propName, herds]) => {
    const propTotal = herds.reduce((s, h) => s + h.netValue, 0);
    const propHead = herds.reduce((s, h) => s + h.headCount, 0);
    return `
    <div style="margin-bottom:16px">
      <div class="pill bg-dark flex-between mb-2" style="font-size:13px">
        <b>${esc(propName)}</b>
        <span style="color:rgba(255,255,255,0.6)">${propHead.toLocaleString()} head &middot; <span class="text-gold"><b>${fmt(propTotal)}</b></span></span>
      </div>
      ${herds.map(h => buildHerdCardHTML(h)).join("")}
    </div>`;
  }).join("")}

  <div class="flex-between" style="margin-top:12px;padding-top:8px">
    <b>TOTAL</b>
    <span>${totalHead.toLocaleString()} head &nbsp; <b>${fmtFull(totalValue)}</b></span>
  </div>
</section>

<div class="footer">
  <span>Stockman's Wallet | Intelligent Livestock Valuation | www.stockmanswallet.com.au</span>
  <span>Generated ${fmtDate(new Date().toISOString())}</span>
</div>

</div>
</body>
</html>`;
}

function buildMovementHTML(m: PortfolioMovementSummary): string {
  const bridgeRow = (label: string, value: number, isTotal: boolean) => {
    const abs = fmt(Math.abs(value));
    const display = isTotal ? abs : value >= 0 ? `+${abs}` : `-${abs}`;
    const cls = isTotal ? "text-green" : value > 0 ? "text-green" : value < 0 ? "text-red" : "text-muted";
    return `<div class="bridge-row${isTotal ? " bridge-total" : ""}"><span>${label}</span><span class="${cls}">${display}</span></div>`;
  };

  return `
<section class="mt-5 break-avoid">
  <h2 style="font-size:16px;font-weight:700" class="mb-2">Portfolio Movement</h2>
  <p style="font-size:12px;color:#6B5B45" class="mb-3">${fmtDate(m.openingDate)} to ${fmtDate(m.closingDate)}</p>

  <div class="grid-4 card mb-3" style="padding:12px 20px">
    <div><p class="label">Opening Value</p><p class="val">${fmt(m.openingValue)}</p></div>
    <div><p class="label">Closing Value</p><p class="val">${fmt(m.closingValue)}</p></div>
    <div><p class="label">Net Change</p><p class="val ${m.netChangeDollars >= 0 ? "text-green" : "text-red"}">${fmt(m.netChangeDollars)}${m.netChangePercent != null ? ` <span style="font-size:11px">(${m.netChangePercent >= 0 ? "+" : ""}${m.netChangePercent.toFixed(1)}%)</span>` : ""}</p></div>
    <div><p class="label">Head Count</p><p class="val" style="font-size:13px">${m.openingHeadCount} &rarr; ${m.closingHeadCount}</p></div>
  </div>

  <div class="card mb-3">
    <div style="padding:8px 16px;background:rgba(139,115,85,0.1)"><p class="label">Movement Bridge</p></div>
    ${bridgeRow("Opening Portfolio Value", m.openingValue, true)}
    ${bridgeRow("Additions", m.additionsValue, false)}
    ${bridgeRow("Removals/Sales", -m.removalsValue, false)}
    ${bridgeRow("Market Movement", m.marketMovement, false)}
    ${bridgeRow("Weight Gain", m.biologicalMovement.weightGain, false)}
    ${bridgeRow("Breeding Accrual", m.biologicalMovement.breedingAccrual, false)}
    ${bridgeRow("Mortality", m.biologicalMovement.mortality, false)}
    ${Math.abs(m.assumptionChanges) > 1 ? bridgeRow("Other / Assumptions", m.assumptionChanges, false) : ""}
    ${bridgeRow("Closing Portfolio Value", m.closingValue, true)}
  </div>

  <div class="grid-3 card mb-3" style="padding:12px 20px">
    <div><p class="label">Like-for-Like Opening</p><p class="val" style="font-size:13px">${fmt(m.likeForLikeOpeningValue)}</p></div>
    <div><p class="label">Like-for-Like Closing</p><p class="val" style="font-size:13px">${fmt(m.likeForLikeClosingValue)}</p></div>
    <div><p class="label">Like-for-Like Change</p><p class="val ${m.likeForLikeChangeDollars >= 0 ? "text-green" : "text-red"}" style="font-size:13px">${fmt(m.likeForLikeChangeDollars)}${m.likeForLikeChangePercent != null ? ` (${m.likeForLikeChangePercent >= 0 ? "+" : ""}${m.likeForLikeChangePercent.toFixed(1)}%)` : ""}</p></div>
  </div>

  ${m.herdMovements.length > 0 ? `
  <div class="card">
    <div style="padding:8px 16px;background:rgba(139,115,85,0.1)"><p class="label">Movement by Herd</p></div>
    <table>
      <thead><tr><th>Herd</th><th>Opening</th><th>Closing</th><th>Change</th><th style="text-align:right">Driver</th></tr></thead>
      <tbody>
        ${m.herdMovements.map(h => `<tr>
          <td style="font-weight:500">${esc(h.herdName)}</td>
          <td class="text-muted">${h.openingValue != null ? fmt(h.openingValue) : "New"}</td>
          <td class="text-muted">${h.closingValue != null ? fmt(h.closingValue) : "Removed"}</td>
          <td class="${h.dollarChange >= 0 ? "text-green" : "text-red"}" style="font-weight:600">${fmt(h.dollarChange)}</td>
          <td style="text-align:right;color:#6B5B45">${h.mainDriver}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}
</section>`;
}

function buildHerdCardHTML(h: HerdReportData): string {
  const calvingPct = h.calvingRate > 1 ? h.calvingRate : h.calvingRate * 100;
  const mortalityPct = h.mortalityRate > 1 ? h.mortalityRate : h.mortalityRate * 100;

  const extras: string[] = [];
  extras.push(`<div><p class="label">Avg per Head</p><p class="val" style="font-size:12px">${fmtFull(h.netValue / h.headCount)}</p></div>`);
  if (h.dailyWeightGain > 0) extras.push(`<div><p class="label">DWG</p><p class="val" style="font-size:12px">${h.dailyWeightGain.toFixed(2)} kg/day</p></div>`);
  if (h.isBreeder && calvingPct > 0) extras.push(`<div><p class="label">Calving</p><p class="val" style="font-size:12px">${calvingPct.toFixed(0)}%</p></div>`);
  if (h.breedingAccrual != null && h.breedingAccrual > 0) extras.push(`<div><p class="label">Calf Accrual</p><p class="val" style="font-size:12px">${fmtFull(h.breedingAccrual)}</p></div>`);
  if (mortalityPct > 0) extras.push(`<div><p class="label">Mortality</p><p class="val" style="font-size:12px">${mortalityPct.toFixed(1)}% p.a.</p></div>`);

  return `
  <div class="card" style="margin-bottom:6px">
    <div class="card-head flex-between">
      <span><b style="font-size:13px">${esc(h.name)}</b> <span class="text-muted" style="font-size:11px">${esc(h.category)}</span></span>
      <b style="font-size:15px">${fmtFull(h.netValue)}</b>
    </div>
    <div class="grid-4 card-body">
      <div><p class="label">Head Count</p><p class="val" style="font-size:12px">${h.headCount}</p></div>
      <div><p class="label">Age</p><p class="val" style="font-size:12px">${h.ageMonths} months</p></div>
      <div><p class="label">Weight</p><p class="val" style="font-size:12px">${h.weight.toFixed(0)} kg</p></div>
      <div><p class="label">Price</p><p class="val" style="font-size:12px">$${h.pricePerKg.toFixed(2)}/kg</p></div>
    </div>
    ${extras.length > 0 ? `<div class="grid-4 card-body border-t">${extras.join("")}</div>` : ""}
  </div>`;
}
