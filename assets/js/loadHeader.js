export async function loadSharedHeader(){
  try{
    // ensure there is a mount point; some pages may not include it
    let root = document.getElementById('site-header-root');
    if(!root){ root = document.createElement('div'); root.id = 'site-header-root'; document.body.insertBefore(root, document.body.firstChild); }

    // try a few likely paths for the include (relative and absolute) so the header
    // works whether the site is served from root or a subpath, or opened via file://.
    const tryPaths = ['assets/includes/header.html','./assets/includes/header.html','/assets/includes/header.html'];
    let html = null;
    for(const p of tryPaths){
      try{
        const res = await fetch(p);
        if(res && res.ok){ html = await res.text(); break; }
      }catch(e){ /* try next */ }
    }
    if(!html) throw new Error('Failed to fetch header include from any known path');
    root.innerHTML = html;
    // after injecting, call Auth.renderAuthArea if available
    try{ if(window.Auth && window.Auth.renderAuthArea) await window.Auth.renderAuthArea(); }catch(e){/* ignore */}
    // mark active nav link based on current pathname
    try{
      const links = root.querySelectorAll('.main-nav a');
      const path = location.pathname.replace(/.*\//,'/');
      links.forEach(a=>{ a.removeAttribute('aria-current'); if(a.getAttribute('href') && a.getAttribute('href') === path) a.setAttribute('aria-current','page'); });
    }catch(e){/* ignore */}
    // keyboard: make avatar enter key navigate to profile if signed in
    try{
      const avatar = root.querySelector('.brand .avatar');
      if(avatar){ avatar.setAttribute('tabindex','0'); avatar.addEventListener('keydown', (ev)=>{ if(ev.key === 'Enter'){ try{ const u = window.Auth && window.Auth.currentUser && window.Auth.currentUser(); if(u) window.location.href='profile.html'; else window.location.href='login.html'; }catch(e){ window.location.href='login.html' } } }); }
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
