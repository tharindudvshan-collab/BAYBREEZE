import { $, $$, esc, toast, go } from './core/ui.js';
import { GROUPS, ALL, LOADERS, label, groupLabel, lang } from './core/routes.js';
import { initStore, isLive, auth, currentProfile, connectionStatus, resetDemo } from './core/store.js';
import { cache } from './core/cache.js';
import { CONFIG } from './config.js';

export let PROFILE = null;
export const can = (roles) => !PROFILE || roles.includes(PROFILE.role);

async function boot() {
  const live = await initStore();
  $('#demo').hidden = live;
  wireLogin(); wireLang(); wireSearch();

  PROFILE = await currentProfile();
  auth.onChange(async (session) => {
    const was = !!PROFILE; PROFILE = session ? await currentProfile() : null;
    if (!!session !== was) render();
  });
  connectionStatus((s) => setSync(s === 'demo' ? (live ? 'online' : 'demo') : s));
  render();
  $('#boot').remove();
}

function setSync(s) {
  const dot = $('#sync .dot'), text = $('#sync span:last-child');
  dot.className = 'dot ' + (s === 'online' ? '' : s === 'demo' ? 'demo' : s === 'connecting' ? 'wait' : 'off');
  text.textContent = s === 'online' ? 'Synced' : s === 'demo' ? 'Demo mode' : s === 'connecting' ? 'Connecting' : 'Offline';
}

function render() {
  if (!PROFILE) { showLogin(); return; }
  $('#login').hidden = true;
  buildNav(); wireWho();
  if (!location.hash) location.hash = '#/dash';
  route();
}
window.addEventListener('hashchange', route);

let current = null;
async function route() {
  const id = (location.hash.match(/#\/([a-z]+)/) || [])[1] || 'dash';
  const target = ALL.find((r) => r[0] === id) ? id : 'dash';
  $$('#nav [data-v], #bnav [data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === target));
  const page = $('#page');
  current?.destroy?.();
  page.innerHTML = '<div class="sk"></div><div class="sk mt"></div>';
  try {
    const mod = await LOADERS[target]();
    page.innerHTML = '';
    current = (await mod.render(page)) || null;
  } catch (e) {
    console.error(e);
    page.innerHTML = `<div class="card"><h2>Couldn't load ${esc(label(target))}</h2><p class="sub">${esc(e.message || e)}</p></div>`;
  }
  document.querySelector('main').scrollTo(0, 0);
}

function buildNav() {
  const nav = $('#nav');
  nav.innerHTML = GROUPS.map(([g, , items]) => `<h4>${esc(groupLabel([g, GROUPS.find((x) => x[0] === g)[1]]))}</h4>${items.map(([id, ic, en, si]) => `<button data-v="${id}" data-n="${id}"><i>${ic}</i><span>${esc(lang() === 'si' ? si : en)}</span></button>`).join('')}`).join('');
  $$('#nav [data-v]').forEach((b) => (b.onclick = () => go(b.dataset.v)));
  const mob = [['dash', '◧'], ['pos', '▣'], ['inventory', '▤'], ['production', '⚙'], ['more', '☰']];
  $('#bnav').innerHTML = mob.map(([v, i]) => `<button data-v="${v}"><i>${i}</i><span>${v === 'more' ? (lang() === 'si' ? 'තව' : 'More') : esc(label(v))}</span></button>`).join('');
  $$('#bnav [data-v]').forEach((b) => (b.onclick = () => (b.dataset.v === 'more' ? openMore() : go(b.dataset.v))));
}
function openMore() {
  const body = `<div class="more">${ALL.filter((r) => !['dash', 'pos', 'inventory', 'production'].includes(r[0])).map(([id, ic]) => `<button data-v="${id}"><i>${ic}</i>${esc(label(id))}</button>`).join('')}</div>`;
  import('./core/ui.js').then(({ modal }) => {
    const m = modal({ title: lang() === 'si' ? 'සියලු මොඩියුල' : 'All modules', body });
    $$('[data-v]', m.el).forEach((b) => (b.onclick = () => { go(b.dataset.v); m.close(); }));
  });
}
function wireWho() {
  const who = $('#who'); who.textContent = PROFILE.name || PROFILE.email; who.title = PROFILE.role;
  who.onclick = async () => {
    const { modal } = await import('./core/ui.js');
    const m = modal({ title: PROFILE.name || PROFILE.email, body: `<p class="sub">${esc(PROFILE.email || '')} · ${esc(PROFILE.role)}</p>`, foot: `<button class="btn" data-set>Settings</button><button class="btn dng" data-out>Sign out</button>` });
    $('[data-out]', m.el).onclick = async () => { await auth.signOut(); m.close(); location.hash = ''; PROFILE = null; render(); };
    $('[data-set]', m.el).onclick = () => { go('settings'); m.close(); };
  };
}
function wireLang() {
  $('#lang').onclick = () => { localStorage.setItem('bb_lang', lang() === 'en' ? 'si' : 'en'); buildNav(); route(); };
}
function wireSearch() {
  const input = $('#gs'), box = $('#gsr');
  const idx = () => [
    ...cache('products').rows().map((r) => ({ t: 'Product', n: r.name, s: r.sku, v: 'products' })),
    ...cache('customers').rows().map((r) => ({ t: 'Customer', n: r.name, s: r.type, v: 'customers' })),
    ...cache('suppliers').rows().map((r) => ({ t: 'Supplier', n: r.name, s: r.category, v: 'suppliers' })),
    ...cache('production').rows().map((r) => ({ t: 'Batch', n: r.batch_no, s: r.status, v: 'production' })),
  ];
  const run = () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { box.hidden = true; return; }
    const hits = idx().filter((r) => r.n.toLowerCase().includes(q) || (r.s || '').toLowerCase().includes(q)).slice(0, 8);
    box.innerHTML = hits.length ? hits.map((h) => `<button data-v="${h.v}"><span>${esc(h.n)}</span><small>${esc(h.t)} · ${esc(h.s || '')}</small></button>`).join('') : '<div class="empty">No matches.</div>';
    box.hidden = false;
    $$('[data-v]', box).forEach((b) => (b.onclick = () => { go(b.dataset.v); box.hidden = true; input.value = ''; }));
  };
  input.oninput = run; input.onfocus = run;
  document.addEventListener('click', (e) => { if (!e.target.closest('.sw')) box.hidden = true; });
}

function showLogin() {
  $('#login').hidden = false; $('#page').innerHTML = '';
}
function wireLogin() {
  const form = $('#loginForm'), err = $('#loginErr'), go1 = $('#loginGo'), signup = $('#signupGo');
  const submit = async (mode) => {
    err.textContent = '';
    const email = form.email.value.trim(), pw = form.password.value;
    go1.disabled = signup.disabled = true;
    try {
      if (mode === 'up') await auth.signUp(email, pw); else await auth.signIn(email, pw);
      PROFILE = await currentProfile(); toast(mode === 'up' ? 'Account created.' : 'Welcome back.'); render();
    } catch (e) { err.textContent = e.message || String(e); } finally { go1.disabled = signup.disabled = false; }
  };
  form.onsubmit = (e) => { e.preventDefault(); submit('in'); };
  signup.onclick = () => submit('up');
}

boot();
