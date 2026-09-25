/* BAYBREEZE Business OS — real auth via Supabase */
let mode = 'signin'; // 'signin' | 'signup'

const form = document.getElementById('loginForm');
const err = document.getElementById('err');
const ok = document.getElementById('ok');
const submitBtn = document.getElementById('submitBtn');
const toggleBtn = document.getElementById('toggleMode');
const title = document.getElementById('formTitle');
const sub = document.getElementById('formSub');

// Already signed in? Skip straight to the app.
sb.auth.getSession().then(({data})=>{
  if(data.session) location.replace('index.html');
});

toggleBtn.addEventListener('click', ()=>{
  mode = mode==='signin' ? 'signup' : 'signin';
  err.hidden = true; ok.hidden = true;
  if(mode==='signup'){
    title.textContent = 'Create the owner account';
    sub.textContent = 'This runs once, the first time you set up the app.';
    submitBtn.textContent = 'Create account';
    toggleBtn.textContent = 'Back to sign in';
  }else{
    title.textContent = 'Welcome back';
    sub.textContent = 'Sign in to open your dashboard.';
    submitBtn.textContent = 'Sign in';
    toggleBtn.textContent = 'Create the owner account';
  }
});

form.addEventListener('submit', async e=>{
  e.preventDefault();
  err.hidden = true; ok.hidden = true;
  const email = document.getElementById('user').value.trim();
  const password = document.getElementById('pass').value;
  submitBtn.disabled = true;
  submitBtn.textContent = mode==='signup' ? 'Creating…' : 'Signing in…';

  if(mode==='signup'){
    const {data, error} = await sb.auth.signUp({email, password});
    if(error){
      err.textContent = error.message; err.hidden = false;
    }else if(data.session){
      location.replace('index.html');
    }else{
      ok.textContent = 'Account created. Check your email to confirm, then sign in.';
      ok.hidden = false;
      toggleBtn.click();
    }
  }else{
    const {error} = await sb.auth.signInWithPassword({email, password});
    if(error){
      err.textContent = error.message; err.hidden = false;
    }else{
      location.replace('index.html');
    }
  }
  submitBtn.disabled = false;
  submitBtn.textContent = mode==='signup' ? 'Create account' : 'Sign in';
});
