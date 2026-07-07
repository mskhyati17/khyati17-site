// Sitewide light/dark theme for Khyati17. A 🌙/☀️ toggle in the header flips
// data-theme on <html>; the choice is saved and defaults to the OS preference.
// Dark styles target the shared design system + the injected widgets (search,
// ads, Mochi) by class, so bespoke game/tool pages are left untouched.
(function(){
  if (window.__themeLoaded) return;
  window.__themeLoaded = true;

  var KEY = 'theme';
  function saved(){ try { return localStorage.getItem(KEY); } catch(e){ return null; } }
  function systemDark(){ try { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; } catch(e){ return false; } }
  var current = saved() || (systemDark() ? 'dark' : 'light');

  function apply(t){
    current = t;
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(KEY, t); } catch(e){}
    updateButtons();
  }
  function toggle(){ apply(current === 'dark' ? 'light' : 'dark'); }

  // ---- dark stylesheet (shared shell + injected widgets) ----
  var dark = [
    '[data-theme="dark"] body{background:linear-gradient(180deg,#180b22 0%,#100713 100%);--text:#ece7f2;color:#ece7f2}',
    '[data-theme="dark"] body::before{background:radial-gradient(circle at 30% 30%,rgba(120,60,180,.42),transparent 70%);opacity:.45}',
    '[data-theme="dark"] body::after{background:radial-gradient(circle at 70% 70%,rgba(180,60,120,.36),transparent 70%);opacity:.45}',
    '[data-theme="dark"] html::before{opacity:.3}',
    // hero + shell
    '[data-theme="dark"] .hero-rich{background:linear-gradient(135deg,rgba(120,60,180,.24),rgba(60,20,90,.16));color:#f0e8ff}',
    '[data-theme="dark"] .hero-copy h1{color:#f4ecff}',
    '[data-theme="dark"] .hero-copy .lead{color:#cebbe6}',
    '[data-theme="dark"] .role-cta{color:#c9b3e0}',
    '[data-theme="dark"] .hero-cards .card{background:#241633;box-shadow:0 8px 22px rgba(0,0,0,.35)}',
    '[data-theme="dark"] .hero-cards .card h4{color:#d9b8ff}',
    '[data-theme="dark"] .hero-cards .card p{color:#c3b0dd}',
    // home explore
    '[data-theme="dark"] .stat{background:#241633;border-color:#3a2550;box-shadow:0 8px 24px rgba(0,0,0,.28)}',
    '[data-theme="dark"] .explore-title{color:#f0e6ff}',
    '[data-theme="dark"] .explore-sub{color:#c3b0dd}',
    '[data-theme="dark"] .why{background:#241633;border-color:#3a2550;color:#e5d8f5}',
    '[data-theme="dark"] .site-footer{color:#b9a6d6}',
    // generic content cards used across hubs
    '[data-theme="dark"] .card{color:#ece7f2}',
    // search overlay
    '[data-theme="dark"] #ks-box{background:#1a1027;color:#ece7f2}',
    '[data-theme="dark"] #ks-head,[data-theme="dark"] #ks-foot{border-color:#33234a}',
    '[data-theme="dark"] #ks-input{color:#f0e8ff}',
    '[data-theme="dark"] #ks-input::placeholder{color:#8a7aa8}',
    '[data-theme="dark"] .ks-title{color:#f0e8ff}',
    '[data-theme="dark"] .ks-ico{background:#2a1b3d}',
    '[data-theme="dark"] .ks-row:hover,[data-theme="dark"] .ks-row.active{background:#2a1b3d}',
    '[data-theme="dark"] #ks-esc{background:#241633;border-color:#3a2550;color:#b8a6d6}',
    // ads
    '[data-theme="dark"] .k-ad{background:#1a1027;border-color:#33234a}',
    '[data-theme="dark"] .k-ad-badge{background:rgba(26,16,39,.9);color:#b8a6d6;border-color:#3a2550}',
    '[data-theme="dark"] #k-ad-float .k-ad-close{background:#241633;border-color:#3a2550;color:#d9b8ff}',
    // Mochi panel
    '[data-theme="dark"] #pom-mascot .pom-msgs{background:#160c20}',
    '[data-theme="dark"] #pom-mascot .pom-msg.bot{background:#241633;color:#e9dcff;border-color:#3a2550}',
    '[data-theme="dark"] #pom-mascot .pom-panel{border-color:#3a2550}',
    '[data-theme="dark"] #pom-mascot .pom-input{background:#160c20;border-color:#33234a}',
    '[data-theme="dark"] #pom-mascot .pom-input input{background:#241633;color:#f0e8ff;border-color:#3a2550}',
    '[data-theme="dark"] #pom-mascot .pom-settings{background:#160c20}',
    '[data-theme="dark"] #pom-mascot .pom-care{background:#241633;border-color:#3a2550}',
    '[data-theme="dark"] #pom-mascot .pom-speech{background:#241633;color:#f0e8ff;border-color:#3a2550}',
    '[data-theme="dark"] #pom-mascot .pom-tip{background:#241633;color:#e9dcff;border-color:#3a2550}',
    // smooth flip (enabled after first paint)
    '.theme-anim body,.theme-anim .hero-rich,.theme-anim .hero-cards .card,.theme-anim .stat,.theme-anim .why{transition:background .3s ease,color .3s ease}',
    // the toggle button glyph
    '.theme-toggle{cursor:pointer}'
  ].join('');
  var st = document.createElement('style'); st.id = 'theme-css'; st.textContent = dark; document.head.appendChild(st);

  // apply immediately (reduces flash)
  document.documentElement.setAttribute('data-theme', current);
  setTimeout(function(){ document.documentElement.classList.add('theme-anim'); }, 60);

  // ---- toggle button in the nav ----
  function updateButtons(){
    Array.prototype.forEach.call(document.querySelectorAll('.theme-toggle'), function(b){
      var d = current === 'dark';
      b.innerHTML = d ? '☀️' : '🌙';
      b.setAttribute('aria-label', d ? 'Switch to light mode' : 'Switch to dark mode');
      b.setAttribute('title', d ? 'Light mode' : 'Dark mode');
    });
  }
  function addToggle(){
    var nav = document.querySelector('.main-nav');
    if (!nav || nav.querySelector('.theme-toggle')) return;
    var btn = document.createElement('button');
    btn.className = 'btn theme-toggle'; btn.type = 'button';
    btn.addEventListener('click', function(e){ e.preventDefault(); toggle(); });
    // place it right after the search trigger if present, else first
    var search = nav.querySelector('.ks-trigger');
    if (search && search.nextSibling) nav.insertBefore(btn, search.nextSibling);
    else nav.insertBefore(btn, nav.firstChild);
    updateButtons();
  }
  (function tryAdd(n){ if (document.querySelector('.theme-toggle')) return; addToggle(); if (n>0) setTimeout(function(){ tryAdd(n-1); }, 300); })(30);
  try {
    var mo = new MutationObserver(function(){ if (document.querySelector('.main-nav') && !document.querySelector('.theme-toggle')) addToggle(); if (document.querySelector('.theme-toggle')) mo.disconnect(); });
    mo.observe(document.documentElement, { childList:true, subtree:true });
    setTimeout(function(){ try{ mo.disconnect(); }catch(e){} }, 15000);
  } catch(e){}

  // follow OS changes only when the user hasn't picked explicitly
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e){
      if (!saved()) apply(e.matches ? 'dark' : 'light');
    });
  } catch(e){}

  window.KhyatiTheme = { toggle: toggle, set: apply, get: function(){ return current; } };
})();
