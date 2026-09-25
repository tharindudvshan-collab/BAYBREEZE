import { $, esc, head, money, pct, sum, today, addDays, dayOf } from '../core/ui.js';
import { cache, byId } from '../core/cache.js';

function factsBlock(facts) { return facts.map(([t, x]) => `<p><span class="tag t-${{ Fact: 'g', Calculation: 'b', Trend: 'a', 'Possible explanation': 'a', 'User decision': 'r', 'Insufficient data': 'r' }[t] || 'n'}">${t}</span> ${x}</p>`).join(''); }

function answer(q) {
  const products = cache('products').rows(), sales = cache('sales').rows(), wastage = cache('wastage').rows(), purchases = cache('purchases').rows();
  const t0 = today(), last30 = (d) => Math.abs(new Date(t0) - new Date(d)) / 864e5 <= 30;
  q = q.toLowerCase();
  if (q.includes('margin') || q.includes('profit')) {
    const ranked = [...products].sort((a, b) => (b.price ? (b.price - b.cost) / b.price : 0) - (a.price ? (a.price - a.cost) / a.price : 0));
    const top = ranked[0], bottom = ranked[ranked.length - 1];
    return [['Fact', `${esc(top?.name)} has the best margin at ${pct(top ? ((top.price - top.cost) / top.price) * 100 : 0, 0)}.`], ['Fact', `${esc(bottom?.name)} has the thinnest margin at ${pct(bottom ? ((bottom.price - bottom.cost) / bottom.price) * 100 : 0, 0)}.`]];
  }
  if (q.includes('wastage') || q.includes('waste')) {
    const recent = wastage.filter((w) => last30(w.date));
    const cost = sum(recent, (w) => w.cost);
    const totalCOGS = sum(sales.filter((s) => last30(dayOf(s))), (s) => sum(s.items, (i) => (byId('products', i.product_id)?.cost || 0) * i.qty));
    return recent.length ? [['Calculation', `Wastage in the last 30 days cost ${money(cost)}, across ${recent.length} entr${recent.length === 1 ? 'y' : 'ies'}.`], ['Trend', totalCOGS ? `That is ${pct((cost / totalCOGS) * 100)} of production cost over the same period.` : 'No production cost recorded in the same period for comparison.']] : [['Insufficient data', 'No wastage has been logged in the last 30 days.']];
  }
  if (q.includes('cost') && (q.includes('up') || q.includes('increase') || q.includes('rise'))) {
    const recent = [...purchases].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3);
    return recent.length ? [['Fact', `Most recent purchase was invoice ${esc(recent[0].invoice_no)} for ${money(recent[0].total)}.`], ['Possible explanation', 'Compare unit costs across recent purchases in the Purchases tab to see which materials moved.'], ['User decision', 'Change supplier, raise prices, or accept a lower margin.']] : [['Insufficient data', 'No purchase history yet.']];
  }
  if (q.includes('stock') || q.includes('reorder') || q.includes('low')) {
    const low = products.filter((p) => p.stock <= p.min_stock);
    return low.length ? [['Fact', `${low.length} product${low.length === 1 ? '' : 's'} at or below the reorder point: ${low.map((p) => esc(p.name)).join(', ')}.`]] : [['Fact', 'No products are below their reorder point right now.']];
  }
  if (q.includes('top') || q.includes('best sell')) {
    const by = {}; sales.filter((s) => last30(dayOf(s))).forEach((s) => s.items.forEach((i) => (by[i.product_id] = (by[i.product_id] || 0) + i.qty)));
    const ranked = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return ranked.length ? [['Fact', `Top sellers by units in the last 30 days: ${ranked.map(([id, q2]) => `${esc(byId('products', id)?.name)} (${q2})`).join(', ')}.`]] : [['Insufficient data', 'No sales recorded in the last 30 days.']];
  }
  return [['Insufficient data', "I can answer questions about margins, wastage, cost changes, stock levels and top sellers — try one of the buttons below, or rephrase your question."]];
}
const PRESETS = ['Top margin products', 'Wastage this month', 'Why did cost go up?', 'What needs reordering?', 'Top sellers this month'];

export async function render(page) {
  await Promise.all(['products', 'sales', 'wastage', 'purchases'].map((t) => cache(t).ready));
  page.innerHTML = `${head('ai', 'Ask about your own numbers. Every answer is labelled by type: fact, calculation, trend, or a decision only you can make.')}
   <div class="card">
    <div class="chat" id="chat"><div class="a"><p><span class="tag t-a">Fact</span> Pick a question below, or type your own.</p></div></div>
    <div class="ai mt">${PRESETS.map((p) => `<button data-q="${esc(p)}">${esc(p)}</button>`).join('')}</div>
    <form class="ask" id="ask"><input type="text" id="freeq" placeholder="Ask a question about your business…" aria-label="Ask a question"><button class="btn pri" type="submit">Ask</button></form>
   </div>`;
  const chat = $('#chat');
  function ask(q) {
    chat.insertAdjacentHTML('beforeend', `<div class="q">${esc(q)}</div><div class="a">${factsBlock(answer(q))}</div>`);
    chat.scrollTop = chat.scrollHeight;
  }
  page.querySelectorAll('.ai [data-q]').forEach((b) => (b.onclick = () => ask(b.dataset.q)));
  $('#ask').onsubmit = (e) => { e.preventDefault(); const v = $('#freeq').value.trim(); if (v) { ask(v); $('#freeq').value = ''; } };
  return {};
}
