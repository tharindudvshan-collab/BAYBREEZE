import { $, $$, esc, head, money, fmtDate, today, addDays, dayOf, sum, download, toCSV, printHTML } from '../core/ui.js';
import { cache, byId } from '../core/cache.js';

const REPORTS = [
  ['sales', 'Sales'], ['purchases', 'Purchases'], ['expenses', 'Expenses'], ['production', 'Production batches'], ['wastage', 'Wastage'], ['payments', 'Payments'],
];
function rowsFor(kind, from, to) {
  const inRange = (d) => d >= from && d <= to;
  if (kind === 'sales') return cache('sales').rows().filter((r) => inRange(dayOf(r))).map((r) => [fmtDate(r.created_at), r.channel, r.payment_method, money(r.total)]);
  if (kind === 'purchases') return cache('purchases').rows().filter((r) => inRange(r.date)).map((r) => [fmtDate(r.date), r.invoice_no, byId('suppliers', r.supplier_id)?.name || '', money(r.total)]);
  if (kind === 'expenses') return cache('expenses').rows().filter((r) => inRange(r.date)).map((r) => [fmtDate(r.date), r.category, r.description, money(r.amount)]);
  if (kind === 'production') return cache('production').rows().filter((r) => inRange((r.started_at || '').slice(0, 10))).map((r) => [r.batch_no, byId('products', r.product_id)?.name || '', r.planned_qty, r.actual_qty, r.status]);
  if (kind === 'wastage') return cache('wastage').rows().filter((r) => inRange(r.date)).map((r) => [fmtDate(r.date), byId('products', r.product_id)?.name || '', r.qty, money(r.cost), r.reason]);
  if (kind === 'payments') return cache('payments').rows().filter((r) => inRange(r.date)).map((r) => [fmtDate(r.date), r.direction === 'in' ? 'In' : 'Out', (r.direction === 'in' ? byId('customers', r.customer_id)?.name : byId('suppliers', r.supplier_id)?.name) || '', money(r.amount)]);
  return [];
}
const HEAD = { sales: ['Date', 'Channel', 'Method', 'Total'], purchases: ['Date', 'Invoice', 'Supplier', 'Total'], expenses: ['Date', 'Category', 'Description', 'Amount'], production: ['Batch', 'Product', 'Planned', 'Actual', 'Status'], wastage: ['Date', 'Product', 'Qty', 'Cost', 'Reason'], payments: ['Date', 'Direction', 'Party', 'Amount'] };

export async function render(page) {
  await Promise.all(['sales', 'purchases', 'expenses', 'production', 'wastage', 'payments', 'products', 'suppliers', 'customers'].map((t) => cache(t).ready));
  let kind = 'sales', from = addDays(today(), -29), to = today();
  const el = document.createElement('div'); page.append(el);
  function draw() {
    const rows = rowsFor(kind, from, to);
    el.innerHTML = `
    ${head('reports', 'Pick a report and a date range, then export or print it.')}
    <div class="toolbar">
     <div class="seg" id="seg">${REPORTS.map(([k, l]) => `<button class="${k === kind ? 'on' : ''}" data-k="${k}">${l}</button>`).join('')}</div>
     <span class="sp"></span>
     <label class="f" style="flex-direction:row;align-items:center;gap:8px;width:auto"><small>From</small><input type="date" id="from" value="${from}"></label>
     <label class="f" style="flex-direction:row;align-items:center;gap:8px;width:auto"><small>To</small><input type="date" id="to" value="${to}"></label>
     <button class="btn sm" id="exp">Export CSV</button><button class="btn sm" id="prt">Print</button>
    </div>
    <div class="card scroll"><h2>${REPORTS.find((r) => r[0] === kind)[1]} · ${fmtDate(from)} – ${fmtDate(to)}<span style="color:var(--mute);font-weight:400"> · ${rows.length} rows</span></h2>
     <table><tr>${HEAD[kind].map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${i === r.length - 1 ? 'r' : ''}">${c}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${HEAD[kind].length}"><div class="empty">No records in this range.</div></td></tr>`}</table></div>`;
    $$('#seg button', el).forEach((b) => (b.onclick = () => { kind = b.dataset.k; draw(); }));
    $('#from', el).onchange = (e) => { from = e.target.value; draw(); };
    $('#to', el).onchange = (e) => { to = e.target.value; draw(); };
    $('#exp', el).onclick = () => download(`${kind}-${from}-to-${to}.csv`, toCSV([HEAD[kind], ...rows]), 'text/csv');
    $('#prt', el).onclick = () => printHTML(REPORTS.find((r) => r[0] === kind)[1], `<h1>${REPORTS.find((r) => r[0] === kind)[1]}</h1><p>${fmtDate(from)} – ${fmtDate(to)}</p><table>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`);
  }
  draw();
  return {};
}
