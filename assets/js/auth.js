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
      const raw = user.metadata?.name || user.metadata?.username || user.email.split('@')[0];
      const first = String(raw).trim().split(' ')[0] || raw;
      const display = first;
      el.innerHTML = `<span class="auth-user">Welcome ${escapeHtml(display)}</span> <button id="logout-btn" class="btn">Logout</button>`;
      // also update brand title (top-left) to show user's first name if present
      try{ const brand = document.querySelector('.brand h1'); if(brand) brand.textContent = escapeHtml(display); }catch(e){}
      const btn = document.getElementById('logout-btn');
      btn && btn.addEventListener('click', ()=>{ signout(); renderAuthArea(); location.reload(); });
    } else {
      el.innerHTML = `<a href="login.html" class="btn">Sign in</a> <a href="signup.html" class="btn btn-ghost">Sign up</a>`;
      // restore site title when signed out
      try{ const brand = document.querySelector('.brand h1'); if(brand) brand.textContent = 'Khyati'; }catch(e){}
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
    if(res.data?.session){
      return {ok:true, confirmed:true, data: res.data};
    }
    // Some Supabase projects allow immediate sign-in; try signing in right away to get a session.
    try{
      const signInRes = await supabase.auth.signInWithPassword({email,password});
      if(!signInRes.error && signInRes.data?.session){
        return {ok:true, confirmed:true, data: signInRes.data};
      }
    }catch(e){ /* ignore */ }
    // No session yet — user likely needs email confirmation
    return {ok:true, confirmed:false, data: res.data};
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
      const raw = current.metadata?.name || current.metadata?.username || current.email.split('@')[0];
      const first = String(raw).trim().split(' ')[0] || raw;
      el.innerHTML = `<span class="auth-user">Welcome ${escapeHtml(first)}</span> <button id="logout-btn" class="btn">Logout</button>`;
      try{ const brand = document.querySelector('.brand h1'); if(brand) brand.textContent = escapeHtml(first); }catch(e){}
      const btn = document.getElementById('logout-btn');
      btn && btn.addEventListener('click', async ()=>{ await supabase.auth.signOut(); SupabaseAuth.renderAuthArea(); location.reload(); });
    } else {
      el.innerHTML = `<a href="login.html" class="btn">Sign in</a> <a href="signup.html" class="btn btn-ghost">Sign up</a>`;
      try{ const brand = document.querySelector('.brand h1'); if(brand) brand.textContent = 'Khyati'; }catch(e){}
    }
  }
} : null;

const Auth = {
  // Accept metadata and forward to underlying implementation
  async signup(email,password, metadata){
    if(supabase) return await SupabaseAuth.signup(email,password, metadata);
    return DemoAuth.signup(email,password, metadata);
  },
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
