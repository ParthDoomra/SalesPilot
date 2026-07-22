/**
 * Proposal export helpers.
 *
 * Produces a self-contained, presentation-ready HTML document from a
 * ProposalModel and drives Print / Export-PDF / Download. No PDF library is
 * used — the browser's native "Print → Save as PDF" is the PDF path, so the
 * export stays dependency-free and the pricing engine / UI are untouched.
 */

import type { ProposalModel } from '@/types';

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function money(n: number, symbol: string): string {
  return `${symbol}${Math.round(n).toLocaleString()}`;
}

/** Builds a complete, standalone HTML document for the proposal. */
export function buildProposalHtml(proposal: ProposalModel): string {
  const { executiveSummary: ex, selectedOption: opt, estimate } = proposal;
  const sym = proposal.currencySymbol;
  const ba = opt.budgetAnalysis;
  const generated = proposal.generatedAt.slice(0, 10);

  const requirementsRows = proposal.requirements
    .map((r) => `<tr><th>${esc(r.label)}</th><td>${esc(r.value)}</td></tr>`)
    .join('');

  const serviceCards = proposal.services
    .map(
      (s) => `
      <div class="card">
        <div class="card-cat">${esc(s.category)}</div>
        <div class="card-name">${esc(s.name)} <span class="muted">· ${esc(s.tier)}</span></div>
        <div class="card-why"><strong>Why:</strong> ${esc(s.why)}</div>
        <div class="card-role"><strong>Role:</strong> ${esc(s.role)}</div>
      </div>`,
    )
    .join('');

  const categoryRows = opt.categories
    .map(
      (c) =>
        `<tr><td>${esc(c.category)}</td><td class="num">${money(c.monthlyCost, sym)}</td><td class="num">${c.percentage}%</td></tr>`,
    )
    .join('');

  const topDrivers = [...opt.resources]
    .sort((a, b) => b.monthlyCost - a.monthlyCost)
    .slice(0, 3)
    .map((r) => `<li>${esc(r.serviceName)} — ${money(r.monthlyCost, sym)}/mo <span class="muted">(${esc(r.category)})</span></li>`)
    .join('');

  const benefits = proposal.benefits.map((b) => `<div class="benefit">✔ ${esc(b)}</div>`).join('');

  const recommendations = opt.recommendations.length
    ? `<ul>${opt.recommendations.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`
    : `<p class="muted">This architecture fits the customer's budget — no cost-reduction changes are required.</p>`;

  const optimization = opt.optimization
    ? `<p class="muted">Projected with optimizations: ${money(opt.optimization.newMonthlyCost, sym)}/mo
       (save ${money(opt.optimization.estimatedMonthlySavings, sym)}/mo) — status ${
        opt.optimization.newStatus === 'within' ? 'Within Budget' : opt.optimization.newStatus === 'over' ? 'Over Budget' : '—'
      }.</p>`
    : '';

  const budgetStatus =
    ba.status === 'within' ? 'Within Budget' : ba.status === 'over' ? 'Over Budget' : 'No budget provided';

  const whyRows = (
    [
      ['Scalability', proposal.why.scalability],
      ['Security', proposal.why.security],
      ['High Availability', proposal.why.highAvailability],
      ['Disaster Recovery', proposal.why.disasterRecovery],
      ['Performance', proposal.why.performance],
      ['Cost Optimization', proposal.why.costOptimization],
    ] as const
  )
    .map(([k, v]) => `<div class="why-item"><h4>${esc(k)}</h4><p>${esc(v)}</p></div>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>SalesPilot Proposal — ${esc(ex.customerName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1a2233; margin: 0; background: #fff; }
  .page { max-width: 900px; margin: 0 auto; padding: 40px 48px; }
  h1 { font-size: 30px; margin: 0 0 4px; }
  h2 { font-size: 19px; margin: 32px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #2E6BE6; color: #14203a; }
  h4 { margin: 0 0 4px; font-size: 14px; }
  p { line-height: 1.55; font-size: 13px; }
  .muted { color: #6b7280; }
  .cover { min-height: 92vh; display: flex; flex-direction: column; justify-content: center; border-bottom: 1px solid #e5e7eb; }
  .cover .brand { color: #2E6BE6; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; font-size: 13px; }
  .cover h1 { font-size: 40px; margin-top: 12px; }
  .cover .sub { font-size: 16px; color: #4b5563; margin-top: 8px; }
  .cover .meta { margin-top: 28px; font-size: 13px; color: #4b5563; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 7px 10px; border-bottom: 1px solid #eceff3; vertical-align: top; }
  th { width: 210px; color: #4b5563; font-weight: 600; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 8px 0 4px; }
  .kpi { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
  .kpi .label { font-size: 11px; color: #6b7280; }
  .kpi .value { font-size: 20px; font-weight: 700; margin-top: 4px; }
  .status { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .status.within { background: #e7f6ee; color: #12794a; }
  .status.over { background: #fdeaea; color: #b42318; }
  .status.unknown { background: #eef1f5; color: #4b5563; }
  .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
  .card-cat { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #2E6BE6; font-weight: 700; }
  .card-name { font-weight: 600; margin: 3px 0 6px; font-size: 14px; }
  .card-why, .card-role { font-size: 12px; color: #374151; margin-top: 3px; }
  .benefit { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-weight: 600; font-size: 13px; color: #14203a; }
  .why-item { margin-bottom: 12px; }
  .footer { margin-top: 40px; padding-top: 14px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
  ul { font-size: 13px; line-height: 1.6; }
  @media print {
    .page { padding: 24px 28px; }
    .cover { min-height: 96vh; page-break-after: always; }
    h2 { page-break-after: avoid; }
    .card, .why-item, .kpi { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <!-- Cover page -->
  <div class="page cover">
    <div class="brand">SalesPilot</div>
    <h1>Cloud Solution Proposal</h1>
    <div class="sub">Prepared for ${esc(ex.customerName)}</div>
    <div class="meta">
      <div><strong>Industry:</strong> ${esc(ex.industry)}</div>
      <div><strong>Recommended provider:</strong> ${esc(ex.cloudProvider)}</div>
      <div><strong>Recommended architecture:</strong> ${esc(ex.architectureName)}</div>
      <div><strong>Date:</strong> ${esc(generated)}</div>
    </div>
  </div>

  <div class="page">
    <!-- Executive summary -->
    <h2>1. Executive Summary</h2>
    <p>
      This proposal outlines a recommended cloud solution for <strong>${esc(ex.customerName)}</strong>
      in the ${esc(ex.industry)} sector. The business goal is to ${esc(ex.businessGoal.toLowerCase())}.
      We recommend the <strong>${esc(ex.architectureName)}</strong> architecture on
      <strong>${esc(ex.cloudProvider)}</strong>, estimated at
      <strong>${money(opt.monthlyCost, sym)}/month</strong> (${money(opt.yearlyCost, sym)}/year).
    </p>

    <!-- Requirements -->
    <h2>2. Customer Requirements</h2>
    <table>${requirementsRows}</table>

    <!-- Architecture -->
    <h2>3. Recommended Architecture</h2>
    <table>
      <tr><th>Architecture Name</th><td>${esc(proposal.architecture.name)}</td></tr>
      <tr><th>Architecture Type</th><td>${esc(proposal.architecture.type)}</td></tr>
      <tr><th>Cloud Provider</th><td>${esc(proposal.architecture.provider)}</td></tr>
      <tr><th>Availability</th><td>${esc(proposal.architecture.availability)}</td></tr>
      <tr><th>Selected Services</th><td>${esc(proposal.architecture.services.join(', '))}</td></tr>
    </table>

    <!-- Services included -->
    <h2>4. Services Included</h2>
    ${serviceCards}

    <!-- Pricing -->
    <h2>5. Pricing Summary</h2>
    <div class="kpis">
      <div class="kpi"><div class="label">Monthly Cost</div><div class="value">${money(opt.monthlyCost, sym)}</div></div>
      <div class="kpi"><div class="label">Yearly Cost</div><div class="value">${money(opt.yearlyCost, sym)}</div></div>
      <div class="kpi"><div class="label">Customer Budget</div><div class="value">${
        ba.hasBudget && ba.customerBudget !== null ? `${ba.customerCurrencySymbol}${ba.customerBudget.toLocaleString()}` : '—'
      }</div></div>
      <div class="kpi"><div class="label">Budget Status</div><div class="value"><span class="status ${ba.status}">${budgetStatus}</span></div></div>
    </div>
    <table>
      <tr><th class="num" style="width:auto">Category</th><th class="num">Monthly</th><th class="num">Share</th></tr>
      ${categoryRows}
    </table>
    <h4 style="margin-top:16px">Top cost drivers</h4>
    <ul>${topDrivers}</ul>
    <h4 style="margin-top:12px">AI cost explanation</h4>
    <p>${esc(opt.explanation)}</p>

    <!-- Why this architecture -->
    <h2>6. Why This Architecture</h2>
    ${whyRows}

    <!-- Benefits -->
    <h2>7. Benefits</h2>
    <div class="grid">${benefits}</div>

    <!-- Recommendations -->
    <h2>Recommendations</h2>
    ${recommendations}
    ${optimization}

    <!-- Assumptions -->
    <h2>8. Assumptions</h2>
    <ul>${proposal.assumptions.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>

    <!-- Next steps -->
    <h2>9. Next Steps</h2>
    <ul>${proposal.nextSteps.map((s) => `<li>${s.done ? '✔' : '▢'} ${esc(s.label)}</li>`).join('')}</ul>

    <div class="footer">Generated by SalesPilot · ${esc(generated)} · Estimated figures in ${esc(estimate.currency)} — not live provider pricing.</div>
  </div>
</body>
</html>`;
}

/** Opens the proposal in a new window and (optionally) triggers the print dialog. */
export function openProposalPrintWindow(proposal: ProposalModel, autoPrint = true): void {
  const html = buildProposalHtml(proposal);
  const win = window.open('', '_blank', 'width=1000,height=800');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  if (autoPrint) {
    // Give the new document a moment to lay out before invoking print. The
    // document has no external assets, so a short delay is sufficient and more
    // reliable than the load event after document.write().
    win.setTimeout(() => win.print(), 350);
  }
}

/** Downloads the proposal as a self-contained .html file. */
export function downloadProposalHtml(proposal: ProposalModel): void {
  const html = buildProposalHtml(proposal);
  const safeName = (proposal.executiveSummary.customerName || 'customer').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `salespilot_proposal_${safeName}.html`;
  link.click();
  URL.revokeObjectURL(url);
}
