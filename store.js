// Data layer. Two modes, same API:
//  - Live mode: Supabase (Postgres + Realtime) when js/config.js has a URL + anon key.
//  - Demo mode: localStorage, with a BroadcastChannel so multiple tabs on this device
//    still see each other's changes live (so the realtime UI can be tried before Supabase is wired up).
import { CONFIG } from '../config.js';
import { uid } from './ui.js';
import { seed } from './seed.js';

let sb = null;
export const isLive = () => !!sb;
const bc = 'BroadcastChannel' in window ? new BroadcastChannel('bb-demo') : null;
const listeners = {}; // table -> Set<fn>
const LS_KEY = 'bb_demo_db_v1';

function loadDemo() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch {}
  const db = seed(); localStorage.setItem(LS_KEY, JSON.stringify(db)); return db;
}
let demoDB = null;
function saveDemo() { localStorage.setItem(LS_KEY, JSON.stringify(demoDB)); }
function notify(table, evt, row, old) { (listeners[table] || new Set()).forEach((fn) => fn({ eventType: evt, new: row, old })); }
bc?.addEventListener('message', (e) => { if (e.data?.table) { demoDB = loadDemo(); notify(e.data.table, e.data.evt, e.data.row, e.data.old); } });

function creds() {
  try { const o = JSON.parse(localStorage.getItem('bb_supabase') || 'null'); if (o?.url && o?.key) return o; } catch {}
  return CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY ? { url: CONFIG.SUPABASE_URL, key: CONFIG.SUPABASE_ANON_KEY } : null;
}
export function setCreds(url, key) { localStorage.setItem('bb_supabase', JSON.stringify({ url, key })); }
export function clearCreds() { localStorage.removeItem('bb_supabase'); }
export async function initStore() {
  const c = creds();
  if (c) {
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      sb = createClient(c.url, c.key, { auth: { persistSession: true, autoRefreshToken: true } });
      await sb.from('products').select('id').limit(1).throwOnError();
      return true;
    } catch (e) { console.error('Supabase connection failed, falling back to demo mode.', e); sb = null; }
  }
  demoDB = loadDemo();
  return false;
}
export function resetDemo() { demoDB = seed(); saveDemo(); bc?.postMessage({ table: '*' }); Object.keys(listeners).forEach((t) => notify(t, 'reset')); }

// ---------- Auth ----------
export const auth = {
  async signUp(email, password) { if (!sb) return demoSignUp(email, password); const { data, error } = await sb.auth.signUp({ email, password }); if (error) throw error; return data; },
  async signIn(email, password) { if (!sb) return demoSignIn(email, password); const { data, error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; return data; },
  async signOut() { if (!sb) return demoSignOut(); await sb.auth.signOut(); },
  async session() { if (!sb) return demoSession(); const { data } = await sb.auth.getSession(); return data.session; },
  onChange(fn) { if (!sb) return demoOnChange(fn); return sb.auth.onAuthStateChange((_e, s) => fn(s)).data.subscription; },
};
function demoSignUp(email, password) {
  if (!email || password.length < 6) throw new Error('Enter a valid email and a password of at least 6 characters.');
  const users = demoDB.staff;
  if (users.find((u) => u.email === email)) throw new Error('That email already has an account.');
  const role = users.length === 0 ? 'Owner' : 'Cashier';
  const row = { id: uid(), name: email.split('@')[0], email, password, role, active: true, created_at: new Date().toISOString() };
  users.push(row); saveDemo(); localStorage.setItem('bb_demo_user', row.id);
  return { user: row };
}
function demoSignIn(email, password) {
  const u = demoDB.staff.find((x) => x.email === email && x.password === password);
  if (!u) throw new Error('Incorrect email or password.');
  if (!u.active) throw new Error('This account has been deactivated. Ask the Owner to reactivate it.');
  localStorage.setItem('bb_demo_user', u.id); return { user: u };
}
function demoSignOut() { localStorage.removeItem('bb_demo_user'); }
function demoSession() { const id = localStorage.getItem('bb_demo_user'); const u = id && demoDB.staff.find((x) => x.id === id); return u ? { user: u } : null; }
function demoOnChange() { return { unsubscribe() {} }; }
export async function currentProfile() {
  if (!sb) { const s = await demoSession(); return s?.user || null; }
  const s = await auth.session(); if (!s) return null;
  const { data } = await sb.from('staff').select('*').eq('user_id', s.user.id).maybeSingle();
  return data ? { ...data, email: s.user.email } : { id: s.user.id, email: s.user.email, name: s.user.email.split('@')[0], role: 'Owner' };
}

// ---------- Generic table CRUD, used by every module ----------
export function table(name) {
  return {
    async list({ order = 'created_at', asc = false } = {}) {
      if (!sb) return [...demoDB[name]].sort((a, b) => (asc ? 1 : -1) * (a[order] > b[order] ? 1 : a[order] < b[order] ? -1 : 0));
      const { data, error } = await sb.from(name).select('*').order(order, { ascending: asc });
      if (error) throw error; return data;
    },
    async insert(row) {
      row = { id: uid(), created_at: new Date().toISOString(), ...row };
      if (!sb) { demoDB[name].push(row); saveDemo(); notify(name, 'INSERT', row); bc?.postMessage({ table: name, evt: 'INSERT', row }); return row; }
      const { data, error } = await sb.from(name).insert(row).select().single(); if (error) throw error; return data;
    },
    async update(id, patch) {
      if (!sb) {
        const i = demoDB[name].findIndex((r) => r.id === id); if (i < 0) throw new Error('Not found.');
        demoDB[name][i] = { ...demoDB[name][i], ...patch, updated_at: new Date().toISOString() }; saveDemo();
        notify(name, 'UPDATE', demoDB[name][i]); bc?.postMessage({ table: name, evt: 'UPDATE', row: demoDB[name][i] }); return demoDB[name][i];
      }
      const { data, error } = await sb.from(name).update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().single(); if (error) throw error; return data;
    },
    async remove(id) {
      if (!sb) { const old = demoDB[name].find((r) => r.id === id); demoDB[name] = demoDB[name].filter((r) => r.id !== id); saveDemo(); notify(name, 'DELETE', null, old); bc?.postMessage({ table: name, evt: 'DELETE', old }); return; }
      const { error } = await sb.from(name).delete().eq('id', id); if (error) throw error;
    },
    subscribe(fn) {
      if (!sb) { (listeners[name] ??= new Set()).add(fn); return () => listeners[name].delete(fn); }
      const ch = sb.channel('rt-' + name).on('postgres_changes', { event: '*', schema: 'public', table: name }, fn).subscribe();
      return () => sb.removeChannel(ch);
    },
  };
}
export function connectionStatus(onChange) {
  if (!sb) { onChange('demo'); return () => {}; }
  const ch = sb.channel('presence-health').subscribe((status) => onChange(status === 'SUBSCRIBED' ? 'online' : status === 'CLOSED' ? 'offline' : 'connecting'));
  return () => sb.removeChannel(ch);
}
