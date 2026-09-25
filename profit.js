import { $, esc, head, money, pct, lineChart, sum, today, addDays, dayOf } from '../core/ui.js';
import { cache, byId } from '../core/cache.js';

export async function render(page) {
  await Promise.all(['sales', 'expenses', 'products', 'wastage'].map((t) => cache(t).ready));
  let from = addDays(today(), -29), to = today();
  const el = document.createElement('div'); page.append(el);
  function draw() {
    const inRange = (d) => d >= from && d <= to;
    const sales = cache('sales').rows().filter((s) => inRange(dayOf(s)));
    const expenses = cache('expenses').rows().filter((e) => inRange(e.date));
    const wastage = cache('wastage').rows().filter((w) => inRange(w.date));
    const revenue = sum(sales, (s) => s.total);
    const cogs = sum(sales, (s) => sum(s.items, (i) => (byId('products', i.product_id)?.cost || 0) * i.qty));
    const gross = revenue - cogs;
    const expTotal = sum(expenses, (e) => e.amount);
    const wasteTotal = sum(wastage, (w) => w.cost);
    const net = gross - expTotal - wasteTotal;
    const byCat = {}; expenses.forEach((e) => (byCat[e.category] = (byCat[e.category] || 0) + e.amount));
    const days = []; { let d = from; while (d <= to) { days.push(d); d = addDays(d, 1); } if (days.length > 40) days.splice(0, days.length - 40); }
    const rev = days.map((d) => sum(sales.filter((s) => dayOf(s) === d), (s) => s.total));
    const cost = days.map((d) => sum(sales.filter((s) => dayOf(s) === d), (s) => sum(s.items, (i) => (byId('products', i.product_id)?.cost || 0) * i.qty)));

    el.innerHTML = `
    ${head('profit', 'Revenue, cost and profit for a chosen period.')}
    <div class="toolbar">
     <label class="f" style="flex-direction:row;align-items:center;gap:8px;width:auto"><small>From</small><input type="date" id="from" value="${from}"></label>
     <label class="f" style="flex-direction:row;align-items:center;gap:8px;width:auto"><small>To</small><input type="date" id="to" value="${to}"></label>
    </div>
    <div class="grid g4">
     <div class="card kpi"><div class="ring">₨</div><small>Revenue</small><span class="v">${money(revenue)}</span></div>
     <div class="card kpi"><div class="ring">%</div><small>Gross profit</small><span class="v">${money(gross)}</span><small>${pct(revenue ? (gross / revenue) * 100 : 0)} margin</small></div>
     <div class="card kpi"><div class="ring">₨</div><small>Expenses + wastage</small><span class="v">${money(expTotal + wasteTotal)}</span></div>
     <div class="card kpi"><div class="ring">△</div><small>Net profit</small><span class="v" style="color:${net >= 0 ? 'var(--green)' : 'var(--red)'}">${money(net)}</span><small>${pct(revenue ? (net / revenue) * 100 : 0)} margin</small></div>
    </div>
    <div class="grid g2 mt">
     <div class="card"><h2>Revenue vs cost of goods</h2>${lineChart({ labels: days.map((d) => d.slice(5)), series: [{ values: rev, color: '#FFB81C' }, { values: cost, color: '#FF7A66', area: false, dash: '5 4', w: 2.5 }] })}<p style="color:var(--mute);font-size:12.5px"><span style="color:var(--amber)">━</span> Revenue &nbsp; <span style="color:var(--red)">┅</span> Cost of goods</p></div>
     <div class="card"><h2>Expenses by category</h2>${Object.keys(byCat).length ? `<table><tr><th>Category</th><th class="r">Amount</th></tr>${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => `<tr><td>${esc(c)}</td><td class="r">${money(v)}</td></tr>`).join('')}</table>` : '<div class="empty">No expenses in this period.</div>'}</div>
    </div>`;
    $('#from', el).onchange = (e) => { from = e.target.value; draw(); };
    $('#to', el).onchange = (e) => { to = e.target.value; draw(); };
  }
  draw();
  return {};
}
