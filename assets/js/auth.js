// Module-based auth that uses Supabase when configured, otherwise falls back to demo localStorage.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

let supabase = null;
if(SUPABASE_URL && SUPABASE_ANON_KEY){
  // dynamically import supabase library from CDN
  try{
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client created for', SUPABASE_URL);
  }catch(e){
    console.warn('Failed to load Supabase JS, falling back to local demo auth.', e);
    supabase = null;
  }
}

if(!SUPABASE_URL || !SUPABASE_ANON_KEY){
  console.log('Supabase config not set; using demo localStorage auth');
}

const DemoAuth = (() => {
  const LS_KEY = 'khyati_users';
  const SESSION_KEY = 'khyati_session';

  function loadUsers(){ try{ return JSON.parse(localStorage.getItem(LS_KEY) || '{}') }catch(e){return {}} }
  function saveUsers(users){ localStorage.setItem(LS_KEY, JSON.stringify(users)) }

  function signup(email, password){
    if(!email || !password) return {ok:false,msg:'Email and password required'};
    const users = loadUsers();
    if(users[email]) return {ok:false,msg:'User already exists'};
    users[email] = {password};
    saveUsers(users);
    localStorage.setItem(SESSION_KEY, email);
    return {ok:true};
  }

  function signin(email, password){
    const users = loadUsers();
    if(!users[email] || users[email].password !== password) return {ok:false,msg:'Invalid credentials'};
    localStorage.setItem(SESSION_KEY, email);
    return {ok:true};
  }

  function signout(){ localStorage.removeItem(SESSION_KEY) }
  function currentUser(){ return localStorage.getItem(SESSION_KEY) }

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]) }

  async function renderAuthArea(){
    const el = document.getElementById('auth-area');
    if(!el) return;
    const user = currentUser();
    if(user){
      el.innerHTML = `<span class="auth-user">Hello, ${escapeHtml(user)}</span> <button id="logout-btn" class="btn">Logout</button>`;
      const btn = document.getElementById('logout-btn');
      btn && btn.addEventListener('click', ()=>{ signout(); renderAuthArea(); location.reload(); });
    } else {
      el.innerHTML = `<a href="login.html" class="btn">Sign in</a> <a href="signup.html" class="btn btn-ghost">Sign up</a>`;
    }
  }

  return {signup,signin,signout,currentUser,renderAuthArea}
})();

const SupabaseAuth = supabase ? {
  async signup(email,password){
    const res = await supabase.auth.signUp({email,password});
    if(res.error) return {ok:false,msg:res.error.message};
    return {ok:true};
  },
  async signin(email,password){
    const res = await supabase.auth.signInWithPassword({email,password});
    if(res.error) return {ok:false,msg:res.error.message};
    return {ok:true};
  },
  async signout(){ await supabase.auth.signOut(); },
  async currentUser(){ const s = supabase.auth.getUser(); const r = await s; return r?.data?.user?.email || null },
  async renderAuthArea(){
    const el = document.getElementById('auth-area');
    if(!el) return;
    const { data: session } = await supabase.auth.getSession();
    const userEmail = session?.session?.user?.email;
    if(userEmail){
      el.innerHTML = `<span class="auth-user">Hello, ${userEmail}</span> <button id="logout-btn" class="btn">Logout</button>`;
      const btn = document.getElementById('logout-btn');
      btn && btn.addEventListener('click', async ()=>{ await supabase.auth.signOut(); SupabaseAuth.renderAuthArea(); location.reload(); });
    } else {
      el.innerHTML = `<a href="login.html" class="btn">Sign in</a> <a href="signup.html" class="btn btn-ghost">Sign up</a>`;
    }
  }
} : null;

const Auth = {
  async signup(email,password){ if(supabase) return await SupabaseAuth.signup(email,password); return DemoAuth.signup(email,password); },
  async signin(email,password){ if(supabase) return await SupabaseAuth.signin(email,password); return DemoAuth.signin(email,password); },
  async signout(){ if(supabase) return await SupabaseAuth.signout(); return DemoAuth.signout(); },
  async currentUser(){ if(supabase) return await SupabaseAuth.currentUser(); return DemoAuth.currentUser(); },
  async renderAuthArea(){ if(supabase) return await SupabaseAuth.renderAuthArea(); return await DemoAuth.renderAuthArea(); }
};

// expose Auth globally for non-module inline scripts on pages
window.Auth = Auth;
window.Auth.isSupabase = !!supabase;
console.log('Auth.isSupabase =', window.Auth.isSupabase);

document.addEventListener('DOMContentLoaded', ()=>{
  Auth.renderAuthArea();
});
