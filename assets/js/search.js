// Global site search for Khyati17 — one box to find any Game, Story, AI Tool
// or Video across the whole site. Opens with the "🔍 Search" nav button, the
// "/" key, or ⌘K / Ctrl-K. Datasets are lazy-loaded on first open so every
// page stays light. Self-contained; loaded sitewide via loadHeader.js.
(function(){
  if (window.__searchLoaded) return;
  window.__searchLoaded = true;

  var reduce = false;
  try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var TYPES = {
    Game:  { emoji:'🎮', color:'#6a1b9a' },
    Story: { emoji:'📖', color:'#1b6a9a' },
    Tool:  { emoji:'🤖', color:'#9a1b5c' },
    Video: { emoji:'🎬', color:'#9a5c1b' }
  };

  // ---- lazy index (built once, on first open) ----
  var indexPromise = null;
  function buildIndex(){
    if (indexPromise) return indexPromise;
    indexPromise = (async function(){
      var out = [];
      // Games (fetch the shared catalog)
      try {
        var g = await fetch('/fun-games/games.json').then(r=>r.json());
        g.forEach(function(x){ if(x && x.title && x.embed) out.push({ title:String(x.title), sub:'Game', url:x.embed, type:'Game' }); });
      } catch(e){}
      // Stories
      try {
        var sm = await import('/stories/stories-data.js');
        (sm.STORIES||[]).forEach(function(s){ var slug = s.slug || s.id || (s.title||'').replace(/\s+/g,'-').toLowerCase(); if(s.title) out.push({ title:String(s.title), sub:'Story', url:'/stories/stories.html?story='+encodeURIComponent(slug), type:'Story' }); });
      } catch(e){}
      // AI Tools
      try {
        var tm = await import('/ai-tools/tools-data.js');
        (tm.TOOLS||[]).forEach(function(t){ if(t.name) out.push({ title:String(t.name), sub:t.desc||'AI Tool', url:'/ai-tools/tool.html?t='+t.id, type:'Tool' }); });
      } catch(e){}
      // Videos
      try {
        var vm = await import('/videos/videos-data.js');
        (vm.VIDEOS||[]).forEach(function(v){ if(v.title) out.push({ title:String(v.title), sub:(v.channel||'Video'), url:'/videos/videos.html#'+(v.id||''), type:'Video' }); });
      } catch(e){}
      return out;
    })();
    return indexPromise;
  }

  // ---- scoring: startsWith > word-start > substring ----
  function score(title, q){
    var t = title.toLowerCase();
    var i = t.indexOf(q);
    if (i < 0) return -1;
    if (i === 0) return 100 - title.length*0.01;
    if (/\s/.test(t[i-1]) || /[^a-z0-9]/.test(t[i-1])) return 60 - i*0.1;
    return 30 - i*0.1;
  }
  function search(list, raw){
    var q = raw.trim().toLowerCase();
    if (!q) return [];
    var scored = [];
    for (var i=0;i<list.length;i++){
      var s = score(list[i].title, q);
      if (s < 0 && list[i].sub) s = list[i].sub.toLowerCase().indexOf(q) >= 0 ? 10 : -1;
      if (s >= 0) scored.push({ item:list[i], s:s });
    }
    scored.sort(function(a,b){ return b.s - a.s; });
    return scored.slice(0, 40).map(function(x){ return x.item; });
  }

  // ---- UI ----
  var overlay, input, results, countEl, data = null, active = -1, rendered = [];

  function css(){
    return [
      '#ks-overlay{position:fixed;inset:0;z-index:100000;display:none;align-items:flex-start;justify-content:center;background:rgba(30,12,50,.55);backdrop-filter:blur(3px);padding:10vh 16px 16px}',
      '#ks-overlay.open{display:flex}',
      '#ks-box{width:100%;max-width:600px;background:#fff;border-radius:18px;box-shadow:0 30px 80px rgba(40,10,70,.45);overflow:hidden;font-family:Inter,system-ui,sans-serif;' + (reduce?'':'animation:ksIn .22s cubic-bezier(.2,1.2,.4,1)') + '}',
      '@keyframes ksIn{from{opacity:0;transform:translateY(-12px) scale(.98)}to{opacity:1;transform:none}}',
      '#ks-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #eee}',
      '#ks-head .ks-mag{font-size:18px}',
      '#ks-input{flex:1;border:none;outline:none;font:600 16px Inter,system-ui,sans-serif;color:#2b1444;background:transparent}',
      '#ks-input::placeholder{color:#b0a0c4}',
      '#ks-esc{font:700 10px Inter;color:#8a7aa0;border:1px solid #e6dbf5;border-radius:6px;padding:3px 6px}',
      '#ks-results{max-height:52vh;overflow:auto;padding:6px}',
      '.ks-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;cursor:pointer;text-decoration:none;color:inherit}',
      '.ks-row:hover,.ks-row.active{background:#f4ecff}',
      '.ks-ico{flex:0 0 auto;width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px;background:#f3e9fd}',
      '.ks-txt{flex:1;min-width:0}',
      '.ks-title{font:600 14px Inter;color:#2b1444;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.ks-sub{font:500 11px Inter;color:#8a7aa0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}',
      '.ks-badge{flex:0 0 auto;font:700 10px Inter;color:#fff;border-radius:999px;padding:3px 8px}',
      '#ks-foot{padding:9px 14px;border-top:1px solid #eee;font:500 11px Inter;color:#9a8ab0;display:flex;justify-content:space-between;gap:8px}',
      '#ks-empty{padding:28px 16px;text-align:center;color:#9a8ab0;font:500 14px Inter}',
      // nav trigger button
      '.ks-trigger{cursor:pointer}',
      '@media (max-width:520px){#ks-overlay{padding:6vh 10px 10px}}'
    ].join('');
  }

  function build(){
    var st = document.createElement('style'); st.textContent = css(); document.head.appendChild(st);
    overlay = document.createElement('div'); overlay.id = 'ks-overlay';
    overlay.innerHTML =
      '<div id="ks-box" role="dialog" aria-label="Search Khyati17" aria-modal="true">' +
        '<div id="ks-head"><span class="ks-mag" aria-hidden="true">🔍</span>' +
          '<input id="ks-input" type="text" placeholder="Search games, stories, tools, videos…" autocomplete="off" spellcheck="false" aria-label="Search"/>' +
          '<span id="ks-esc">esc</span></div>' +
        '<div id="ks-results" role="listbox"></div>' +
        '<div id="ks-foot"><span id="ks-count">Type to search across the whole site</span><span>↑↓ move · ↵ open</span></div>' +
      '</div>';
    document.body.appendChild(overlay);
    input = overlay.querySelector('#ks-input');
    results = overlay.querySelector('#ks-results');
    countEl = overlay.querySelector('#ks-count');

    overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKey);
    overlay.querySelector('#ks-esc').addEventListener('click', close);
  }

  function open(){
    if (!overlay) build();
    overlay.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
    setTimeout(function(){ try{ input.focus(); }catch(e){} }, 30);
    if (!data){ countEl.textContent = 'Loading the catalog…'; buildIndex().then(function(d){ data = d; countEl.textContent = data.length.toLocaleString() + ' things to search'; if (input.value) onInput(); }); }
  }
  function close(){ if(!overlay) return; overlay.classList.remove('open'); document.documentElement.style.overflow=''; try{ input.blur(); }catch(e){} }

  function onInput(){
    if (!data){ return; }
    rendered = search(data, input.value);
    active = rendered.length ? 0 : -1;
    draw();
    countEl.textContent = input.value.trim() ? (rendered.length + ' result' + (rendered.length===1?'':'s')) : (data.length.toLocaleString() + ' things to search');
  }
  function draw(){
    if (!input.value.trim()){ results.innerHTML = '<div id="ks-empty">Find any game, story, tool or video ✨</div>'; return; }
    if (!rendered.length){ results.innerHTML = '<div id="ks-empty">No matches — try another word 🐾</div>'; return; }
    results.innerHTML = rendered.map(function(r,i){
      var m = TYPES[r.type] || { emoji:'✨', color:'#6a1b9a' };
      return '<a class="ks-row'+(i===active?' active':'')+'" data-i="'+i+'" href="'+r.url.replace(/"/g,'&quot;')+'" role="option">' +
        '<span class="ks-ico" style="background:'+m.color+'22">'+m.emoji+'</span>' +
        '<span class="ks-txt"><div class="ks-title">'+esc(r.title)+'</div><div class="ks-sub">'+esc(r.sub||'')+'</div></span>' +
        '<span class="ks-badge" style="background:'+m.color+'">'+r.type+'</span></a>';
    }).join('');
    Array.prototype.forEach.call(results.querySelectorAll('.ks-row'), function(row){
      row.addEventListener('mousemove', function(){ active = +row.getAttribute('data-i'); highlight(); });
    });
  }
  function highlight(){
    Array.prototype.forEach.call(results.querySelectorAll('.ks-row'), function(row){
      var on = +row.getAttribute('data-i') === active; row.classList.toggle('active', on); if (on) row.scrollIntoView({ block:'nearest' });
    });
  }
  function onKey(e){
    if (e.key === 'Escape'){ close(); return; }
    if (e.key === 'ArrowDown'){ e.preventDefault(); if(rendered.length){ active=(active+1)%rendered.length; highlight(); } }
    else if (e.key === 'ArrowUp'){ e.preventDefault(); if(rendered.length){ active=(active-1+rendered.length)%rendered.length; highlight(); } }
    else if (e.key === 'Enter'){ if(active>=0 && rendered[active]){ location.href = rendered[active].url; } }
  }
  function esc(s){ return String(s).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }

  // ---- triggers: nav button + keyboard ----
  function addTrigger(){
    var nav = document.querySelector('.main-nav');
    if (!nav || nav.querySelector('.ks-trigger')) return true;
    var btn = document.createElement('button');
    btn.className = 'btn ks-trigger'; btn.type = 'button';
    btn.setAttribute('aria-label','Search the site'); btn.innerHTML = '🔍 Search';
    btn.addEventListener('click', function(e){ e.preventDefault(); open(); });
    nav.insertBefore(btn, nav.firstChild);
    return true;
  }
  // The shared header is injected asynchronously — retry, and also watch the
  // DOM so the trigger always lands once the nav appears (however late).
  (function tryTrigger(n){ if (document.querySelector('.main-nav .ks-trigger')) return; addTrigger(); if (n>0) setTimeout(function(){ tryTrigger(n-1); }, 300); })(30);
  try {
    var mo = new MutationObserver(function(){ if (document.querySelector('.main-nav') && !document.querySelector('.main-nav .ks-trigger')) addTrigger(); if (document.querySelector('.main-nav .ks-trigger')) mo.disconnect(); });
    mo.observe(document.documentElement, { childList:true, subtree:true });
    setTimeout(function(){ try{ mo.disconnect(); }catch(e){} }, 15000);
  } catch(e){}

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && overlay && overlay.classList.contains('open')){ close(); return; }
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)){ e.preventDefault(); open(); return; }
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName||'')) && !e.target.isContentEditable){ e.preventDefault(); open(); }
  });

  window.KhyatiSearch = { open: open };
})();
