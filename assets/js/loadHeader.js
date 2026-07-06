export async function loadSharedHeader(){
  try{
    // ensure there is a mount point; some pages may not include it
    let root = document.getElementById('site-header-root');
    if(!root){ root = document.createElement('div'); root.id = 'site-header-root'; document.body.insertBefore(root, document.body.firstChild); }

    // try a few likely paths for the include (relative and absolute) so the header
    // works whether the site is served from root or a subpath, or opened via file://.
    const tryPaths = ['../assets/includes/header.html','./assets/includes/header.html','/assets/includes/header.html','assets/includes/header.html'];
    let html = null;
    for(const p of tryPaths){
      try{
        const res = await fetch(p);
        if(res && res.ok){ html = await res.text(); break; }
      }catch(e){ /* try next */ }
    }
    if(!html) throw new Error('Failed to fetch header include from any known path');
    root.innerHTML = html;
    // floating-emoji background decoration + cute touches (shared across pages)
    try{ if(!document.getElementById('decor-loader')){ const ds=document.createElement('script'); ds.id='decor-loader'; ds.src='/assets/js/decor.js'; document.body.appendChild(ds); } }catch(e){/* ignore */}
    try{ if(!document.getElementById('cute-loader')){ const cs=document.createElement('script'); cs.id='cute-loader'; cs.src='/assets/js/cute.js?v=5'; document.body.appendChild(cs); } }catch(e){/* ignore */}
    // placeholder house ads (shared across pages)
    try{ if(!document.getElementById('ads-loader')){ const as=document.createElement('script'); as.id='ads-loader'; as.src='/assets/js/ads.js?v=1'; document.body.appendChild(as); } }catch(e){/* ignore */}
    // global site search (shared across pages)
    try{ if(!document.getElementById('search-loader')){ const ss=document.createElement('script'); ss.id='search-loader'; ss.src='/assets/js/search.js?v=1'; document.body.appendChild(ss); } }catch(e){/* ignore */}
    // PWA: ensure the manifest + theme colour are present, then register the
    // service worker so the site is installable and works offline.
    try{
      if(!document.querySelector('link[rel="manifest"]')){ const ml=document.createElement('link'); ml.rel='manifest'; ml.href='/site.webmanifest'; document.head.appendChild(ml); }
      if(!document.querySelector('meta[name="theme-color"]')){ const tc=document.createElement('meta'); tc.name='theme-color'; tc.content='#6a1b9a'; document.head.appendChild(tc); }
      if('serviceWorker' in navigator){ navigator.serviceWorker.register('/sw.js').catch(function(){}); }
    }catch(e){/* ignore */}
    // after injecting, call Auth.renderAuthArea if available
    try{ if(window.Auth && window.Auth.renderAuthArea) await window.Auth.renderAuthArea(); }catch(e){/* ignore */}
    // make the Trading link always load a fresh page (bypass the static cache),
    // so a freshly-approved member is never blocked by a stale cached page
    try{ const tl = root.querySelector('a[href^="/trading/trading.html"]'); if(tl) tl.setAttribute('href', '/trading/trading.html?t=' + Date.now()); }catch(e){/* ignore */}
    // reveal the Admin link only for admin accounts
    try{
      const ADMINS = ['mskhyati.17@gmail.com','mskhyati17@gmail.com'];
      const em = localStorage.getItem('khyati_session') || '';
      let isAdm = ADMINS.indexOf(em) >= 0;
      if(!isAdm && em){ try{ const us = JSON.parse(localStorage.getItem('khyati_users')||'{}'); if(us[em] && us[em].level==='admin') isAdm = true; }catch(e){} }
      const al = root.querySelector('#nav-admin'); if(al && isAdm) al.style.display = '';
    }catch(e){/* ignore */}
    // mark active nav link based on current pathname
    try{
      const links = root.querySelectorAll('.main-nav a');
      const path = location.pathname.replace(/.*\//,'/');
      links.forEach(a=>{ a.removeAttribute('aria-current'); if(a.getAttribute('href') && a.getAttribute('href') === path) a.setAttribute('aria-current','page'); });
    }catch(e){/* ignore */}
    // keyboard: make avatar enter key navigate to profile if signed in
    try{
      const avatar = root.querySelector('.brand .avatar');
      if(avatar){ avatar.setAttribute('tabindex','0'); avatar.addEventListener('keydown', (ev)=>{ if(ev.key === 'Enter'){ try{ const u = window.Auth && window.Auth.currentUser && window.Auth.currentUser(); if(u) window.location.href='/admin/profile.html'; else window.location.href='/admin/login.html'; }catch(e){ window.location.href='/admin/login.html' } } }); }
    }catch(e){/* ignore */}
    // hamburger toggle for small screens
    try{
      const toggle = root.querySelector('.nav-toggle');
      const nav = root.querySelector('#main-nav');
      if(toggle && nav){
        // create backdrop
        let backdrop = document.createElement('div'); backdrop.className = 'nav-backdrop'; document.body.appendChild(backdrop);
        let lastFocused = null;
        function openNav(){ nav.classList.add('open'); toggle.setAttribute('aria-expanded','true'); backdrop.classList.add('visible'); lastFocused = document.activeElement; // move focus to first focusable in nav
          const focusable = nav.querySelectorAll('a,button,[tabindex]:not([tabindex="-1"])'); if(focusable[0]) focusable[0].focus(); document.body.style.overflow = 'hidden'; }
        function closeNav(){ nav.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); backdrop.classList.remove('visible'); if(lastFocused && lastFocused.focus) lastFocused.focus(); document.body.style.overflow = ''; }
        toggle.addEventListener('click', ()=>{ if(nav.classList.contains('open')) closeNav(); else openNav(); });
        // close on backdrop click
        backdrop.addEventListener('click', ()=> closeNav());
        // close on Escape and trap focus
        document.addEventListener('keydown', (ev)=>{
          if(ev.key === 'Escape' && nav.classList.contains('open')){ closeNav(); }
          if(nav.classList.contains('open') && ev.key === 'Tab'){
            const focusable = Array.from(nav.querySelectorAll('a,button,[tabindex]:not([tabindex="-1"])')).filter(Boolean);
            if(focusable.length === 0) return;
            const first = focusable[0]; const last = focusable[focusable.length-1];
            if(ev.shiftKey && document.activeElement === first){ ev.preventDefault(); last.focus(); }
            else if(!ev.shiftKey && document.activeElement === last){ ev.preventDefault(); first.focus(); }
          }
        });
      }
    }catch(e){/* ignore */}
  }catch(e){
    console.warn('loadSharedHeader failed', e);
  }
}
