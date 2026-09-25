/* Demo authentication only — replace with a real backend/API call
   before using this in production. */
const USER = 'owner';
const PASS = '1234';

// If already signed in this session, skip straight to the app.
if(sessionStorage.getItem('bb_auth')==='1'){
  location.replace('index.html');
}

document.getElementById('loginForm').addEventListener('submit', e=>{
  e.preventDefault();
  const u = document.getElementById('user').value.trim();
  const p = document.getElementById('pass').value;
  const err = document.getElementById('err');
  if(u===USER && p===PASS){
    sessionStorage.setItem('bb_auth','1');
    location.replace('index.html');
  }else{
    err.hidden = false;
  }
});
