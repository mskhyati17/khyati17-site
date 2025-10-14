// Module-based auth that uses Supabase when configured, otherwise falls back to demo localStorage.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

// Toggle this to true if you want the header to show Sign in / Sign up links when
// no user is signed in. Default: false (the site remains open to all and links are accessible
// via direct pages like login.html / signup.html).
const SHOW_AUTH_LINKS = true;

let supabase = null;
let supabaseInitError = null;
if(SUPABASE_URL && SUPABASE_ANON_KEY){
  // dynamically import supabase library from CDN
  try{
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client created for', SUPABASE_URL);
    // If the URL has an auth fragment (from OAuth or email links), try
    // to extract and store the session quietly and then remove the fragment
    // to avoid the browser re-processing the fragment and causing reloads/304s.
    try{
      if(location && location.hash && location.hash.includes('access_token')){
        console.debug('Auth fragment detected in URL; attempting to parse session from URL');
        // supabase-js v2 exposes getSessionFromUrl to capture url fragments
        if(typeof supabase.auth.getSessionFromUrl === 'function'){
          // protect against throwing in older clients
          try{
            const parsed = await supabase.auth.getSessionFromUrl({ storeSession: true });
            console.debug('Parsed session from URL fragment', parsed);
          }catch(e){
            console.warn('getSessionFromUrl failed', e);
          }
        }
        // Clean up the URL hash to prevent repeated handling / 304 redirect loops
        try{ history.replaceState(null, document.title, location.pathname + location.search); }catch(e){ /* ignore */ }
      }
    }catch(e){ console.warn('Error while handling URL auth fragment', e); }
  }catch(e){
    console.warn('Failed to load Supabase JS, falling back to local demo auth.', e);
    supabaseInitError = 'supabase import failed: ' + (e?.message || e);
    supabase = null;
  }
}

// If supabase is available, listen for auth state changes so header updates across pages
if(supabase && typeof supabase.auth?.onAuthStateChange === 'function'){
  try{
    supabase.auth.onAuthStateChange((event, session) => {
      console.debug('Supabase auth state changed', event, session);
      // re-render auth area when auth state changes
      try{ Auth && Auth.renderAuthArea && Auth.renderAuthArea(); }catch(e){/* ignore */}
    });
  }catch(e){ /* ignore */ }
}

if(!SUPABASE_URL || !SUPABASE_ANON_KEY){
  console.log('Supabase config not set; using demo localStorage auth');
  supabaseInitError = supabaseInitError || 'missing SUPABASE_URL or SUPABASE_ANON_KEY';
}

// Small HTML escaper used by both DemoAuth and SupabaseAuth renderers
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

function getDisplayFirstName(obj){
  const meta = obj?.metadata || {};
  if(meta.first_name) return String(meta.first_name).trim().split(' ')[0];
  if(meta.name) return String(meta.name).trim().split(' ')[0];
  if(obj?.email) return String(obj.email).split('@')[0];
  return '';
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


  async function renderAuthArea(){
    const el = document.getElementById('auth-area');
    if(!el) return;
    const user = currentUser();
    if(user){
      // Try to prefer a saved profile's first_name (if available)
      let first = '';
      try{
        const prof = await Auth.getProfile(user.id || user.email);
        if(prof.ok && prof.profile && prof.profile.first_name){ first = String(prof.profile.first_name).trim().split(' ')[0]; console.debug('Using profile.first_name for greeting:', first); }
      }catch(e){ /* ignore */ }
      if(!first) first = getDisplayFirstName(user) || user.metadata?.username || user.email.split('@')[0];
      // put greeting above the nav so tabs remain in place
      try{
  let g = document.getElementById('header-greeting');
  if(!g){ g = document.createElement('div'); g.id = 'header-greeting'; const header = document.querySelector('.site-header'); header && header.insertBefore(g, header.firstChild); }
  g.textContent = 'Welcome ' + escapeHtml(first);
        g.style.color = 'white';
        // reveal with animation
        requestAnimationFrame(()=> g.classList.add('visible'));
      }catch(e){/* ignore */}
      // auth area should only show actions (Profile / Logout)
      el.innerHTML = `<a href="profile.html" class="btn">Profile</a> <button id="logout-btn" class="btn">Logout</button>`;
      // also update brand title (top-left) to show user's first name if present
      try{ const brand = document.querySelector('.brand h1'); if(brand) brand.textContent = escapeHtml(first); }catch(e){}
      const btn = document.getElementById('logout-btn');
      btn && btn.addEventListener('click', ()=>{ signout(); renderAuthArea(); location.reload(); });
  // make avatar clickable to profile
  try{ const avatar = document.querySelector('.brand .avatar'); if(avatar){ avatar.classList.add('clickable'); avatar.onclick = ()=>{ const u = currentUser(); if(u) window.location.href='profile.html'; else window.location.href='login.html'; } } }catch(e){}
    } else {
      // remove greeting if present
      try{ const g = document.getElementById('header-greeting'); if(g) g.remove(); }catch(e){/* ignore */}
      // Optionally show links; by default keep header clean and open to everyone
      if(SHOW_AUTH_LINKS){ el.innerHTML = `<a href="login.html" class="btn">Sign in</a> <a href="signup.html" class="btn btn-ghost">Sign up</a>`; }
      else { el.innerHTML = ''; }
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
    console.debug('Supabase.signUp response', res);
    if(res.error) return {ok:false,msg:res.error.message, raw: res};
    // If session exists the user is confirmed and signed in; otherwise confirmation required
    if(res.data?.session){
      return {ok:true, confirmed:true, data: res.data, raw: res};
    }
    // Some Supabase projects allow immediate sign-in; try signing in right away to get a session.
    try{
      const signInRes = await supabase.auth.signInWithPassword({email,password});
      console.debug('Supabase.signInAfterSignUp response', signInRes);
      if(!signInRes.error && signInRes.data?.session){
        return {ok:true, confirmed:true, data: signInRes.data, raw: signInRes};
      }
      // Return the signInRes in raw form for debugging
      if(signInRes.error) return {ok:true, confirmed:false, data: res.data, raw: { signInRes }};
    }catch(e){ console.warn('Error while trying signIn after signUp', e); }
    // No session yet — user likely needs email confirmation
    return {ok:true, confirmed:false, data: res.data, raw: res};
  },
  async signin(email,password){
    const res = await supabase.auth.signInWithPassword({email,password});
    console.debug('Supabase.signIn response', res);
    if(res.error) return {ok:false,msg:res.error.message, raw: res};
    // store session implicitly is handled by supabase-js; return data to caller
    return {ok:true, data: res.data, raw: res};
  },
  async signout(){ await supabase.auth.signOut(); },
  async currentUser(){ const r = await supabase.auth.getUser(); const user = r?.data?.user; return user ? { id: user.id, email: user.email, metadata: user.user_metadata || {} } : null },
  async renderAuthArea(){
    const el = document.getElementById('auth-area');
    if(!el) return;
    const current = await SupabaseAuth.currentUser();
      if(current){
        // Prefer profile first_name when available
        let first = '';
        try{
          const prof = await Auth.getProfile(current.id || current.email);
          if(prof.ok && prof.profile && prof.profile.first_name){ first = String(prof.profile.first_name).trim().split(' ')[0]; console.debug('Using profile.first_name for Supabase greeting:', first); }
        }catch(e){ /* ignore */ }
        if(!first){ const raw = current.metadata?.first_name || current.metadata?.name || current.metadata?.username || current.email.split('@')[0]; first = String(raw).trim().split(' ')[0] || raw; }
        // put greeting above the nav so the tabs don't move
        try{
          let g = document.getElementById('header-greeting');
          if(!g){ g = document.createElement('div'); g.id = 'header-greeting'; const header = document.querySelector('.site-header'); header && header.insertBefore(g, header.firstChild); }
          g.textContent = 'Welcome ' + escapeHtml(first);
          g.style.color = 'white';
          // reveal with animation (match DemoAuth behavior)
          try{ requestAnimationFrame(()=> g.classList.add('visible')); }catch(e){ /* ignore */ }
        }catch(e){/* ignore */}
        el.innerHTML = `<a href="profile.html" class="btn">Profile</a> <button id="logout-btn" class="btn">Logout</button>`;
        try{ const brand = document.querySelector('.brand h1'); if(brand) brand.textContent = escapeHtml(first); }catch(e){}
      const btn = document.getElementById('logout-btn');
      btn && btn.addEventListener('click', async ()=>{ await supabase.auth.signOut(); SupabaseAuth.renderAuthArea(); location.reload(); });
    // make avatar clickable to profile
    try{ const avatar = document.querySelector('.brand .avatar'); if(avatar){ avatar.classList.add('clickable'); avatar.onclick = ()=>{ const u = current; if(u) window.location.href='profile.html'; else window.location.href='login.html'; } } }catch(e){}
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
  // Create or update a profile row in public.profiles (supports Supabase and demo localStorage)
  async createProfile(profile){
    if(supabase){
      try{
        const r = await supabase.from('profiles').upsert(profile, { returning: 'minimal' });
        if(r.error) return {ok:false,msg:r.error.message, raw:r};
        return {ok:true, raw:r};
      }catch(e){ return {ok:false,msg:String(e)} }
    }
    // Demo fallback: store profiles in localStorage keyed by id or email
    try{
      const key = 'khyati_profiles';
      const map = JSON.parse(localStorage.getItem(key) || '{}');
      const id = profile.id || profile.email;
      map[id] = profile;
      localStorage.setItem(key, JSON.stringify(map));
      return {ok:true, raw: map[id]};
    }catch(e){ return {ok:false,msg:String(e)} }
  },
  // Fetch a profile by id or email
  async getProfile(idOrEmail){
    if(supabase){
      try{
        const q = await supabase.from('profiles').select('*').or(`id.eq.${idOrEmail},email.eq.${idOrEmail}`).limit(1).maybeSingle();
        if(q.error) return {ok:false,msg:q.error.message, raw:q};
        return {ok:true, profile: q.data};
      }catch(e){ return {ok:false,msg:String(e)} }
    }
    try{
      const key = 'khyati_profiles';
      const map = JSON.parse(localStorage.getItem(key) || '{}');
      if(map[idOrEmail]) return {ok:true, profile: map[idOrEmail]};
      // search by email
      for(const k in map) if(map[k].email === idOrEmail) return {ok:true, profile: map[k]};
      return {ok:false,msg:'not found'};
    }catch(e){ return {ok:false,msg:String(e)} }
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
// readiness promise: resolves when the module has completed initial DOM rendering
let __authReadyResolve;
const AuthReady = new Promise((res)=>{ __authReadyResolve = res; });
// expose on window for backwards compatibility
window.AuthReady = AuthReady;
// also attach to the Auth object for convenience
Auth.ready = AuthReady;

document.addEventListener('DOMContentLoaded', async ()=>{
  await Auth.renderAuthArea();
  // render debug banner
  const banner = document.createElement('div');
  banner.id = 'auth-debug-banner';
  banner.style.cssText = 'position:fixed;left:10px;bottom:10px;padding:8px 12px;background:rgba(0,0,0,0.6);color:white;border-radius:8px;font-size:13px;z-index:9999';
  banner.textContent = 'Auth: ' + (window.Auth.isSupabase ? 'Supabase' : 'Demo') + (supabaseInitError ? (' — ' + supabaseInitError) : '');
  document.body.appendChild(banner);
  Auth.currentUser().then(u=>{ if(u) banner.textContent += ' | user: ' + (u.metadata?.first_name || u.metadata?.name || u.metadata?.username || u.email); });
  // If a pending profile was saved (from sign-up flow requiring confirmation),
  // and the user is now authenticated, create the profile and clear the pending key.
  (async ()=>{
    try{
      const pending = localStorage.getItem('pending_profile');
      if(!pending) return;
      const p = JSON.parse(pending);
      const u = await Auth.currentUser();
      if(u && u.id){
        const profile = { id: u.id, first_name: p.first_name, last_name: p.last_name, username: p.username, email: p.email, metadata: p };
        const created = await Auth.createProfile(profile);
        console.debug('auto-create pending profile result', created);
        if(created.ok) localStorage.removeItem('pending_profile');
      }
    }catch(e){ /* ignore */ }
  })();
  // signal that Auth initialization and first render are complete
  try{ __authReadyResolve && __authReadyResolve(); }catch(e){/* ignore */}
});

  // Export Auth and readiness promise so other pages can import them directly
  export { Auth, AuthReady };
