import { $, esc, head, toast, confirmBox } from '../core/ui.js';
import { isLive, setCreds, clearCreds, resetDemo } from '../core/store.js';
import { lang } from '../core/routes.js';
import { PROFILE, can } from '../app.js';

export async function render(page) {
  const owner = can(['Owner']);
  page.innerHTML = `${head('settings', 'Connect Supabase to save your data online, or keep using demo mode on this device.')}
  <div class="grid g2">
   <div class="card">
    <h2>Data connection</h2>
    <p class="sub" style="margin:0 0 14px">Currently: <b style="color:${isLive() ? 'var(--green)' : 'var(--amber)'}">${isLive() ? 'Connected to Supabase' : 'Demo mode (this browser only)'}</b></p>
    ${owner ? `<form id="sbForm" class="fg" style="display:grid;gap:14px">
      <label class="f">Supabase project URL<input name="url" placeholder="https://xxxx.supabase.co" value="${isLive() ? '••• already connected in js/config.js or here •••' : ''}"></label>
      <label class="f">Supabase anon public key<input name="key" placeholder="eyJhbGciOi..."></label>
      <p class="note">Run <code>supabase/schema.sql</code> in your Supabase project's SQL editor first — it creates the tables and security rules this app needs. The anon key is safe to use here; never paste the service_role key.</p>
      <div class="hact"><button type="submit" class="btn pri">Save and reload</button>${isLive() ? '<button type="button" class="btn dng" id="disconnect">Disconnect</button>' : ''}</div>
     </form>` : '<p class="note">Only the Owner can change the data connection.</p>'}
   </div>
   <div class="card">
    <h2>App</h2>
    <p class="line"><span>Language</span><b>${lang() === 'si' ? 'සිංහල' : 'English'} — use the EN | සිං button in the header</b></p>
    <p class="line"><span>Currency</span><b>Sri Lankan Rupees (Rs.)</b></p>
    <p class="line" style="border:0"><span>Signed in as</span><b>${esc(PROFILE.email || PROFILE.name)} (${esc(PROFILE.role)})</b></p>
    ${!isLive() ? '<button class="btn dng mt" id="wipe">Reset demo data</button>' : ''}
   </div>
  </div>`;
  const form = $('#sbForm');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = form.url.value.trim(), key = form.key.value.trim();
    if (!url.startsWith('http') || key.length < 20) { toast('Enter a valid Supabase URL and anon key.', 'err'); return; }
    setCreds(url, key); toast('Saved — reloading…'); setTimeout(() => location.reload(), 600);
  });
  $('#disconnect')?.addEventListener('click', async () => { if (await confirmBox('Disconnect from Supabase and switch back to demo mode?', { danger: true, yes: 'Disconnect' })) { clearCreds(); location.reload(); } });
  $('#wipe')?.addEventListener('click', async () => { if (await confirmBox('Reset all demo data back to the sample dataset? This cannot be undone.', { danger: true, yes: 'Reset' })) { resetDemo(); toast('Demo data reset.'); } });
  return {};
}
