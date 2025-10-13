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
    // signature: signup(email, password, metadata)
    const metadata = arguments[2] || {};
    if(!email || !password) return {ok:false,msg:'Email and password required'};
    const users = loadUsers();
    if(users[email]) return {ok:false,msg:'User already exists'};
    users[email] = {password, metadata};
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
  function currentUser(){
    const email = localStorage.getItem(SESSION_KEY);
    if(!email) return null;
    const users = loadUsers();
    const user = users[email];
    return { email, metadata: user?.metadata || {} };
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]) }

  async function renderAuthArea(){
    const el = document.getElementById('auth-area');
    if(!el) return;
    const user = currentUser();
    if(user){
      const display = user.metadata?.name || user.metadata?.username || user.email.split('@')[0];
      el.innerHTML = `<span class="auth-user">Hello, ${escapeHtml(display)}</span> <button id="logout-btn" class="btn">Logout</button>`;
      const btn = document.getElementById('logout-btn');
      btn && btn.addEventListener('click', ()=>{ signout(); renderAuthArea(); location.reload(); });
    } else {
      el.innerHTML = `<a href="login.html" class="btn">Sign in</a> <a href="signup.html" class="btn btn-ghost">Sign up</a>`;
    }
  }

  return {signup,signin,signout,currentUser,renderAuthArea}
})();

const SupabaseAuth = supabase ? {
  async signup(email,password, metadata){
    // Supabase v2: pass user_metadata via options
    const res = await supabase.auth.signUp({email,password}, { data: metadata });
    if(res.error) return {ok:false,msg:res.error.message};
    // If session exists the user is confirmed and signed in; otherwise confirmation required
    const confirmed = !!(res.data?.session);
    return {ok:true, confirmed, data: res.data};
  },
  async signin(email,password){
    const res = await supabase.auth.signInWithPassword({email,password});
    if(res.error) return {ok:false,msg:res.error.message};
    return {ok:true};
  },
  async signout(){ await supabase.auth.signOut(); },
  async currentUser(){ const r = await supabase.auth.getUser(); const user = r?.data?.user; return user ? { email: user.email, metadata: user.user_metadata || {} } : null },
  async renderAuthArea(){
    const el = document.getElementById('auth-area');
    if(!el) return;
    const current = await SupabaseAuth.currentUser();
    if(current){
      const display = current.metadata?.name || current.metadata?.username || current.email.split('@')[0];
      el.innerHTML = `<span class="auth-user">Hello, ${display}</span> <button id="logout-btn" class="btn">Logout</button>`;
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
  // render debug banner
  const banner = document.createElement('div');
  banner.id = 'auth-debug-banner';
  banner.style.cssText = 'position:fixed;left:10px;bottom:10px;padding:8px 12px;background:rgba(0,0,0,0.6);color:white;border-radius:8px;font-size:13px;z-index:9999';
  banner.textContent = 'Auth: ' + (window.Auth.isSupabase ? 'Supabase' : 'Demo');
  document.body.appendChild(banner);
  Auth.currentUser().then(u=>{ if(u) banner.textContent += ' | user: ' + (u.metadata?.name || u.metadata?.username || u.email); });
});
