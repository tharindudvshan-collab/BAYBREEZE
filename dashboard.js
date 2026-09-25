import { $, $$, esc, head, kpi, money, short, pct, tag, lineChart, barRows, today, addDays, dayOf, sum, go } from '../core/ui.js';
import { cache, byId } from '../core/cache.js';
import { PROFILE } from '../app.js';

export async function render(page) {
  const tabs = ['products', 'production', 'sales', 'customers', 'purchases', 'expenses', 'wastage', 'payments', 'wholesale_orders'];
  await Promise.all(tabs.map((t) => cache(t).ready));
  const offs = tabs.map((t) => cache(t).onChange(draw));

  const el = document.createElement('div'); page.append(el);
  function draw() {
    const products = cache('products').rows(), sales = cache('sales').rows(), expenses = cache('expenses').rows();
    const wastage = cache('wastage').rows(), production = cache('production').rows(), customers = cache('customers').rows();
    const wh = cache('wholesale_orders').rows();
    const t0 = today();
    const todaySales = sales.filter((s) => dayOf(s) === t0);
    const todayRev = sum(todaySales, (s) => s.total);
    const todayCOGS = sum(todaySales, (s) => sum(s.items, (i) => (byId('products', i.product_id)?.cost || 0) * i.qty));
    const todayExp = sum(expenses.filter((e) => e.date?.slice(0, 10) === t0), (e) => e.amount);
    const todayProfit = todayRev - todayCOGS - todayExp;
    const netMargin = todayRev ? (todayProfit / todayRev) * 100 : 0;

    const days = [...Array(14)].map((_, i) => addDays(t0, i - 13));
    const revByDay = days.map((d) => sum(sales.filter((s) => dayOf(s) === d), (s) => s.total));
    const profByDay = days.map((d, i) => revByDay[i] - sum(sales.filter((s) => dayOf(s) === d), (s) => sum(s.items, (it) => (byId('products', it.product_id)?.cost || 0) * it.qty)));

    const monthStart = t0.slice(0, 7);
    const monthSales = sales.filter((s) => (s.created_at || '').slice(0, 7) === monthStart);
    const monthRev = sum(monthSales, (s) => s.total);
    const monthCOGS = sum(monthSales, (s) => sum(s.items, (i) => (byId('products', i.product_id)?.cost || 0) * i.qty));
    const grossMargin = monthRev ? ((monthRev - monthCOGS) / monthRev) * 100 : 0;
    const stockValue = sum(products, (p) => p.stock * p.cost) + sum(cache('raw_materials').rows(), (r) => r.stock * r.cost_per_unit) + sum(cache('packaging').rows(), (p) => p.stock * p.cost_per_unit);
    const custBalance = sum(customers, (c) => c.balance);
    const custCount = customers.filter((c) => c.balance > 0).length;

    const alerts = [];
    products.filter((p) => p.stock <= p.min_stock).forEach((p) => alerts.push({ icon: '!', text: `${p.name} down to ${p.stock} ${p.unit}s`, sub: `Reorder point is ${p.min_stock}`, go: 'products' }));
    cache('packaging').rows().filter((p) => p.stock <= p.min_stock).forEach((p) => alerts.push({ icon: '▢', text: `${p.name} running low (${p.stock} left)`, sub: `Reorder point is ${p.min_stock}`, go: 'packaging' }));
    customers.filter((c) => c.balance > 0 && c.credit_limit && c.balance >= c.credit_limit * 0.8).forEach((c) => alerts.push({ icon: '₨', text: `${c.name} owes ${money(c.balance)}`, sub: 'Nearing credit limit', go: 'customers' }));
    if (!alerts.length) alerts.push({ icon: '✓', text: 'Nothing needs attention right now.', sub: '', go: '' });

    const chan = {};
    monthSales.forEach((s) => (chan[s.channel] = (chan[s.channel] || 0) + s.total));
    const chanItems = Object.entries(chan).sort((a, b) => b[1] - a[1]).map(([n, v]) => ({ label: n, value: v }));

    const profRows = products.map((p) => {
      const sold = sum(monthSales.flatMap((s) => s.items).filter((i) => i.product_id === p.id), (i) => i.qty);
      const margin = p.price ? ((p.price - p.cost) / p.price) * 100 : 0;
      return { id: p.id, name: p.name, price: p.price, cost: p.cost, margin, sold };
    }).sort((a, b) => b.sold - a.sold).slice(0, 6);

    const latestBatches = [...production].filter((b) => b.status === 'Completed').sort((a, b) => (a.completed_at < b.completed_at ? 1 : -1)).slice(0, 3);

    el.innerHTML = `
    ${head('dash', `${new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}. What you earned today, and what needs you.`)}
    <div class="stack">
     <div class="amber"><small>Net profit today</small><span class="big">${money(todayProfit)}</span><small>${pct(netMargin)} net margin, after ${money(todayExp)} of expenses</small><span class="knob">↗</span></div>
     <div class="white">
      <div><small>Sold</small><b>${money(todayRev)}</b></div>
      <div><small>Cost of goods</small><b>${money(todayCOGS)}</b></div>
      <div><small>Gross profit</small><b>${money(todayRev - todayCOGS)}</b></div>
      <div class="neg"><small>Expenses</small><b>${money(todayExp)}</b></div>
     </div>
    </div>
    <div class="grid g2">
     <div class="card"><h2>Needs your attention</h2>${alerts.slice(0, 6).map((a) => `<div class="item"><div class="ring">${a.icon}</div><p>${esc(a.text)}<small>${esc(a.sub)}</small></p>${a.go ? `<button class="go" data-go="${a.go}">Review</button>` : ''}</div>`).join('')}</div>
     <div class="card">
      <h2>BAYBREEZE Business AI</h2>
      <p class="sub" style="margin:0 0 10px">Ask about margins, cost changes or wastage — with figures from your own data.</p>
      <button class="btn pri" data-go="ai">Open AI Assistant</button>
     </div>
    </div>
    <div class="grid g4 mt">
     ${kpi({ icon: '₨', label: 'Month revenue', value: short(monthRev), sub: '' })}
     ${kpi({ icon: '%', label: 'Gross margin', value: pct(grossMargin), sub: '' })}
     ${kpi({ icon: '▤', label: 'Stock value', value: short(stockValue), sub: 'Raw, packaging and finished goods' })}
     ${kpi({ icon: '☺', label: 'Customer credit', value: short(custBalance), sub: `${custCount} customer${custCount === 1 ? '' : 's'}` })}
    </div>
    <div class="grid g2 mt">
     <div class="card">
      <h2>Revenue and profit, 14 days</h2>
      ${lineChart({ labels: days.map((d) => d.slice(5)), series: [{ values: revByDay, color: '#FFB81C' }, { values: profByDay, color: '#F4F1E8', dash: '6 5', w: 2.5, area: false }], aria: 'Revenue and net profit over 14 days' })}
      <p style="color:var(--mute);font-size:12.5px"><span style="color:var(--amber)">━</span> Revenue &nbsp; <span style="color:var(--ink)">┅</span> Net profit</p>
     </div>
     <div class="card"><h2>Revenue by sales channel, this month</h2>${barRows(chanItems)}</div>
    </div>
    <div class="grid g2 mt">
     <div class="card scroll">
      <h2>Product profitability, this month</h2>
      ${profRows.length ? `<table><tr><th>Product</th><th class="r">Price</th><th class="r">Cost</th><th class="r">Margin</th><th class="r">Units sold</th></tr>${profRows.map((r) => `<tr><td>${esc(r.name)}</td><td class="r">${money(r.price)}</td><td class="r">${money(r.cost)}</td><td class="r">${tag(pct(r.margin, 0), r.margin >= 40 ? 'g' : r.margin >= 25 ? 'a' : 'r')}</td><td class="r">${r.sold}</td></tr>`).join('')}</table>` : '<div class="empty">No sales yet this month.</div>'}
     </div>
     <div class="wcard">
      <h2>Latest batches</h2>
      ${latestBatches.length ? latestBatches.map((b) => { const p = byId('products', b.product_id); const y = b.planned_qty ? (b.actual_qty / b.planned_qty) * 100 : 0; return `<div class="line"><div><b>${esc(b.batch_no)}</b><br><small>${esc(p?.name || '')}</small></div><div style="text-align:right;${y < 95 ? 'color:#D2452F' : ''}"><b>Yield ${pct(y, 1)}</b><br><small>${money(b.cost_per_unit)} per unit</small></div></div>`; }).join('') : '<p style="color:#6B6F85">No completed batches yet.</p>'}
     </div>
    </div>`;
    $$('[data-go]', el).forEach((b) => (b.onclick = () => go(b.dataset.go)));
  }
  draw();
  return { destroy: () => offs.forEach((f) => f()) };
}
