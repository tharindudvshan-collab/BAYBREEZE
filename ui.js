import { label } from './routes.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const num = (n, d = 2) => (+n || 0).toLocaleString('en-US', { maximumFractionDigits: d });
export const money = (n) => 'Rs. ' + Math.round(+n || 0).toLocaleString('en-US');
export const short = (n) => {
  n = +n || 0; const a = Math.abs(n);
  return 'Rs. ' + (a >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : a >= 1e5 ? Math.round(n / 1e3) + 'k' : a >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : Math.round(n));
};
export const pct = (n, d = 1) => (isFinite(n) ? (+n).toFixed(d) : '0.0') + '%';
export const ymd = (d) => { d = d instanceof Date ? d : new Date(d); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
export const today = () => ymd(new Date());
export const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d); };
export const diffDays = (a, b) => Math.round((new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')) / 864e5);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (s) => { if (!s) return ''; const d = new Date(String(s).length === 10 ? s + 'T00:00:00' : s); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); };
export const fmtTime = (s) => new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
export const weekday = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
const dayCache = new WeakMap();
export const dayOf = (r) => { let d = dayCache.get(r); if (!d) { d = ymd(r.created_at); dayCache.set(r, d); } return d; };
export const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const sum = (arr, f) => arr.reduce((s, x) => s + (+f(x) || 0), 0);
export const pending = {}; // one-shot hand-off between modules (search text, prefill)
export const go = (id) => { location.hash = '#/' + id; };

export const tag = (t, c = 'n') => `<span class="tag t-${c}">${esc(t)}</span>`;
export const kpi = ({ icon = '◧', label: l, value, sub = '', cls = '' }) =>
  `<div class="card kpi"><div class="ring">${icon}</div><small>${esc(l)}</small><span class="v">${value}</span><small class="${cls}">${sub}</small></div>`;
export const head = (id, sub = '', actions = '') =>
  `<div class="hd"><div><h1>${esc(label(id))}</h1><p class="sub">${sub}</p></div><div class="hact">${actions}</div></div>`;

export function toast(msg, type = 'ok') {
  const t = document.createElement('div'); t.className = 'toast ' + (type === 'err' ? 'err' : ''); t.textContent = msg;
  $('#toasts').append(t); setTimeout(() => t.classList.add('out'), type === 'err' ? 5200 : 2800); setTimeout(() => t.remove(), type === 'err' ? 5600 : 3200);
}

export function modal({ title, body, foot = '', wide = false, onClose }) {
  const ov = document.createElement('div'); ov.className = 'ov';
  ov.innerHTML = `<div class="md ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="mh"><h2>${esc(title)}</h2><button class="x" aria-label="Close">✕</button></div><div class="mb">${body}</div>${foot ? `<div class="mf">${foot}</div>` : ''}</div>`;
  document.body.append(ov);
  const top = () => [...document.querySelectorAll('.ov')].pop() === ov;
  const onKey = (e) => { if (e.key === 'Escape' && top()) close(); };
  const close = () => { if (!ov.isConnected) return; ov.remove(); document.removeEventListener('keydown', onKey); onClose?.(); };
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(); });
  $('.x', ov).onclick = close; document.addEventListener('keydown', onKey);
  return { el: ov, body: $('.mb', ov), foot: $('.mf', ov), close };
}

export function confirmBox(message, { yes = 'Confirm', danger = false, title = 'Are you sure?' } = {}) {
  return new Promise((res) => {
    const m = modal({ title, body: `<p>${message}</p>`, foot: `<button class="btn" data-n>Cancel</button><button class="btn ${danger ? 'dng' : 'pri'}" data-y>${esc(yes)}</button>`, onClose: () => res(false) });
    $('[data-n]', m.el).onclick = () => m.close();
    $('[data-y]', m.el).onclick = () => { res(true); m.close(); };
    $('[data-y]', m.el).focus();
  });
}

export const opts = (list) => (list || []).map((o) => (Array.isArray(o) ? o : [o, o]));
export const optionsHtml = (list, sel, blank) =>
  (blank !== undefined ? `<option value="">${esc(blank)}</option>` : '') + opts(list).map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(sel ?? '') ? 'selected' : ''}>${esc(l)}</option>`).join('');
export const setOptions = (sel, list, keep, blank) => { const cur = keep ?? sel.value; sel.innerHTML = optionsHtml(list, cur, blank); };

export function fieldHtml(f, v) {
  const val = v ?? f.default ?? '';
  const req = f.required ? ' required' : '';
  const dis = f.readonly ? ' disabled' : '';
  const cls = 'f' + (f.type === 'checkbox' ? ' chk' : '') + (f.span === 2 || f.type === 'textarea' || f.type === 'html' ? ' s2' : '');
  if (f.type === 'html') return `<div class="s2">${f.html}</div>`;
  let input;
  if (f.type === 'select') input = `<select name="${f.key}"${req}${dis}>${optionsHtml(typeof f.options === 'function' ? f.options() : f.options, val, f.blank)}</select>`;
  else if (f.type === 'textarea') input = `<textarea name="${f.key}" rows="${f.rows || 2}"${req}${dis}>${esc(val)}</textarea>`;
  else if (f.type === 'checkbox') return `<label class="${cls}"><input type="checkbox" name="${f.key}" ${val === true || val === 'true' ? 'checked' : ''}${dis}>${esc(f.label)}</label>`;
  else input = `<input name="${f.key}" type="${f.type || 'text'}" value="${esc(val)}"${req}${dis}${f.type === 'number' ? ` step="${f.step || 'any'}" min="${f.min ?? 0}"${f.max != null ? ` max="${f.max}"` : ''} inputmode="decimal"` : ''}${f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : ''}>`;
  return `<label class="${cls}">${esc(f.label)}${f.required ? ' *' : ''}${input}${f.hint ? `<small>${f.hint}</small>` : ''}</label>`;
}

export function readForm(form, fields) {
  const o = {};
  for (const f of fields) {
    if (f.type === 'html') continue;
    const el = form.elements[f.key]; if (!el) continue;
    let v;
    if (f.type === 'checkbox') v = el.checked;
    else if (f.type === 'number') v = el.value === '' ? null : +el.value;
    else { v = el.value.trim(); if (v === '' && (f.type === 'date' || f.type === 'select')) v = null; }
    o[f.key] = v;
  }
  return o;
}

export function formModal({ title, fields, values = {}, submit = 'Save', wide = false, note = '', onSubmit, onInput }) {
  const body = `<form class="frm" novalidate>${note ? `<p class="note">${note}</p>` : ''}<div class="fg">${fields.map((f) => fieldHtml(f, values[f.key])).join('')}</div><p class="ferr" role="alert"></p></form>`;
  const m = modal({ title, body, wide, foot: `<button type="button" class="btn" data-c>Cancel</button><button type="button" class="btn pri" data-s>${esc(submit)}</button>` });
  const form = $('form', m.el), err = $('.ferr', m.el), btn = $('[data-s]', m.el);
  $('[data-c]', m.el).onclick = m.close;
  const run = async () => {
    err.textContent = '';
    const v = readForm(form, fields);
    for (const f of fields) {
      if (f.type === 'html' || f.readonly) continue;
      const x = v[f.key];
      if (f.required && (x === null || x === '' || x === undefined || (f.type === 'number' && isNaN(x)))) { err.textContent = `${f.label} is required.`; form.elements[f.key]?.focus(); return; }
      if (f.type === 'number' && x !== null && f.min !== undefined && x < f.min) { err.textContent = `${f.label} must be at least ${f.min}.`; return; }
      if (f.validate) { const e = f.validate(x, v); if (e) { err.textContent = e; return; } }
    }
    btn.disabled = true;
    try { await onSubmit(v, m); } catch (e) { err.textContent = e.message || String(e); btn.disabled = false; }
  };
  btn.onclick = run;
  form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  form.addEventListener('input', (e) => onInput?.(form, e, m));
  form.addEventListener('change', (e) => onInput?.(form, e, m));
  setTimeout(() => form.querySelector('input:not([disabled]),select:not([disabled]),textarea')?.focus(), 30);
  onInput?.(form, null, m);
  return { ...m, form, err, btn };
}

export function tableHtml(cols, rows, { empty = 'Nothing here yet.', sortKey, dir = 1, selId } = {}) {
  if (!rows.length) return `<div class="empty">${empty}</div>`;
  return `<table><thead><tr>${cols.map((c) => `<th class="${c.cls || ''}"${c.sort !== false && c.key ? ` data-sort="${c.key}"` : ''}>${c.label}${sortKey === c.key ? (dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr data-id="${esc(r.id)}" class="${selId === r.id ? 'sel' : ''}">${cols.map((c) => `<td class="${c.cls || ''}">${c.render ? c.render(r) : esc(r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

const niceMax = (v) => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
export function lineChart({ labels, series, w = 620, h = 220, fmt = short, aria = 'Line chart' }) {
  const pad = { l: 52, r: 10, t: 14, b: 26 }, iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const all = series.flatMap((s) => s.values);
  const max = niceMax(Math.max(1, ...all)), min = Math.min(0, ...all) < 0 ? -niceMax(-Math.min(...all)) : 0;
  const X = (i) => pad.l + (labels.length < 2 ? iw / 2 : (i * iw) / (labels.length - 1));
  const Y = (v) => pad.t + ih - ((v - min) / (max - min)) * ih;
  const grid = [0, 1, 2, 3].map((i) => { const v = min + ((max - min) * i) / 3; return `<line x1="${pad.l}" y1="${Y(v)}" x2="${w - pad.r}" y2="${Y(v)}" stroke="#262A3D"/><text x="4" y="${Y(v) + 4}">${fmt(v).replace('Rs. ', '')}</text>`; }).join('');
  const step = Math.max(1, Math.ceil(labels.length / 5));
  const xl = labels.map((l, i) => (i % step === 0 || i === labels.length - 1 ? `<text x="${X(i)}" y="${h - 6}" text-anchor="${i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}">${esc(l)}</text>` : '')).join('');
  const lines = series.map((s, k) => {
    const pts = s.values.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    const area = k === 0 && s.area !== false ? `<polygon fill="url(#fa)" points="${X(0)},${Y(0)} ${pts} ${X(s.values.length - 1)},${Y(0)}"/>` : '';
    return `${area}<polyline fill="none" stroke="${s.color}" stroke-width="${s.w || 3}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} stroke-linejoin="round" points="${pts}"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="${esc(aria)}"><defs><linearGradient id="fa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB81C" stop-opacity=".35"/><stop offset="1" stop-color="#FFB81C" stop-opacity="0"/></linearGradient></defs>${grid}${lines}${xl}</svg>`;
}
export const barRows = (items, { cls = '' } = {}) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  return items.map((i) => `<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:6px"><span>${esc(i.label)}</span><b>${i.text ?? money(i.value)}</b></div><div class="bar ${i.cls || cls}"><i style="width:${Math.max(2, (i.value / max) * 100)}%"></i></div></div>`).join('') || '<div class="empty">No data in this period.</div>';
};

export function download(name, text, mime = 'text/plain') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
export const toCSV = (rows) => rows.map((r) => r.map((c) => { c = c ?? ''; c = String(c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(',')).join('\n');

export function printHTML(title, html) {
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.append(f); const d = f.contentDocument;
  d.open(); d.write(`<!doctype html><title>${esc(title)}</title><style>body{font:13px/1.4 Arial,sans-serif;margin:16px;color:#000}h1,h2{margin:0 0 6px}table{width:100%;border-collapse:collapse}td,th{padding:4px 2px;text-align:left}.r{text-align:right}hr{border:0;border-top:1px dashed #000;margin:8px 0}.c{text-align:center}@page{margin:8mm}</style>${html}`); d.close();
  f.contentWindow.focus(); setTimeout(() => { f.contentWindow.print(); setTimeout(() => f.remove(), 1500); }, 250);
}
