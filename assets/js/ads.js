// Placeholder "house ads" for Khyati17 (fake ads — for now).
// These are clearly labeled "Ad" and only promote this site's own sections,
// so they look monetized without deceiving anyone. Fully client-side and
// self-contained; safe to drop on any page.
//
//  • Fills any <div class="ad-slot" data-ad="leaderboard|rectangle|square"></div>
//  • Auto-injects an in-flow leaderboard on normal content pages
//    (skipped on game/canvas pages so it never breaks a game layout)
//  • Shows one dismissible floating banner sitewide, anchored bottom-LEFT so
//    it never collides with Mochi (the corner buddy, bottom-right)
//
// Swap these house ads for a real ad network later by replacing renderAd().
(function(){
  if (window.__adsLoaded) return;
  window.__adsLoaded = true;

  var reduce = false;
  try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var pick = function(a){ return a[Math.floor(Math.random()*a.length)]; };

  // ---- The house-ad inventory (promotes this site's own sections) ----
  var ADS = [
    { emoji:'🎮', title:'2,000+ Free Games',   body:'Play instantly in your browser — no downloads, no sign-up.', cta:'Play now',   url:'/fun-games/index.html', bg:'linear-gradient(135deg,#6a1b9a,#c56be0)' },
    { emoji:'📖', title:'140 Original Stories',  body:'Dive into a brand-new adventure at the Story Hub.',           cta:'Read now',   url:'/stories/index.html',   bg:'linear-gradient(135deg,#1b6a9a,#4dc0cc)' },
    { emoji:'🤖', title:'180 Free AI Tools',    body:'Fancy text, ciphers, converters & more — all in your browser.', cta:'Try them',  url:'/ai-tools/index.html',  bg:'linear-gradient(135deg,#9a1b5c,#e05b8a)' },
    { emoji:'🎬', title:'Fun Videos & Shorts',  body:'Kick back and watch something fun.',                          cta:'Watch now',  url:'/videos/videos.html',   bg:'linear-gradient(135deg,#9a5c1b,#e0a24d)' },
    { emoji:'📈', title:'The Trading Zone',      body:'Explore markets and track your picks.',                       cta:'Explore',    url:'/trading/trading.html', bg:'linear-gradient(135deg,#1b9a5c,#4dcc86)' },
    { emoji:'🐶', title:'Meet Mochi',           body:'Chat with your very own AI teacup Pomeranian.',                cta:'Say hi',     url:'/others/others.html',   bg:'linear-gradient(135deg,#7550a8,#b58be0)' }
  ];
  // Don't advertise the page you're already on.
  function adPool(){
    var here = location.pathname.replace(/index\.html$/,'');
    var pool = ADS.filter(function(a){ return a.url.replace(/index\.html$/,'') !== here; });
    return pool.length ? pool : ADS;
  }

  var css = [
    '.k-ad{--k-ad-accent:#6a1b9a;position:relative;box-sizing:border-box;font-family:Inter,system-ui,sans-serif;background:#fff;border:1px solid #ead9fb;border-radius:14px;overflow:hidden}',
    '.k-ad *{box-sizing:border-box}',
    '.k-ad .k-ad-badge{position:absolute;top:6px;right:8px;z-index:2;font:700 9px Inter,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#8a7aa0;background:rgba(255,255,255,.85);border:1px solid #e6dbf5;border-radius:5px;padding:1px 5px}',
    '.k-ad a.k-ad-link{display:flex;align-items:center;gap:12px;text-decoration:none;color:#fff;padding:14px 16px;min-height:64px}',
    '.k-ad .k-ad-ico{flex:0 0 auto;font-size:30px;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,.25))}',
    '.k-ad .k-ad-txt{flex:1;min-width:0}',
    '.k-ad .k-ad-title{font:800 15px Inter,sans-serif;line-height:1.15;margin:0 0 2px}',
    '.k-ad .k-ad-body{font:500 12px/1.3 Inter,sans-serif;opacity:.94;margin:0}',
    '.k-ad .k-ad-cta{flex:0 0 auto;background:rgba(255,255,255,.92);color:#3a2058;font:800 12px Inter,sans-serif;border-radius:999px;padding:8px 14px;white-space:nowrap}',
    '.k-ad-leaderboard{max-width:970px;margin:14px auto}',
    '.k-ad-rectangle{max-width:340px;margin:14px auto}',
    '.k-ad-rectangle a.k-ad-link{flex-direction:column;text-align:center;min-height:200px;justify-content:center;gap:8px}',
    '.k-ad-rectangle .k-ad-ico{font-size:56px}',
    '.k-ad-rectangle .k-ad-title{font-size:20px}',
    '.k-ad-rectangle .k-ad-body{font-size:14px}',
    // floating banner
    '#k-ad-float{position:fixed;left:12px;bottom:12px;right:184px;max-width:440px;z-index:900}',
    '#k-ad-float .k-ad-close{position:absolute;top:-9px;left:-9px;z-index:3;width:22px;height:22px;border-radius:50%;border:1px solid #e6dbf5;background:#fff;color:#6a1b9a;font:700 12px Inter;cursor:pointer;line-height:1;box-shadow:0 3px 8px rgba(90,50,140,.25)}',
    '#k-ad-float .k-ad{box-shadow:0 12px 30px rgba(90,50,140,.28)}',
    reduce ? '' : '#k-ad-float{animation:kAdIn .5s cubic-bezier(.2,1.3,.4,1)}',
    '@keyframes kAdIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}',
    '@media (max-width:560px){#k-ad-float{right:12px;max-width:none;bottom:96px}.k-ad .k-ad-cta{padding:7px 10px}}'
  ].join('');
  var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  // Build one ad element for a given format.
  function renderAd(format){
    var a = pick(adPool());
    var wrap = document.createElement('div');
    wrap.className = 'k-ad k-ad-' + format;
    wrap.style.setProperty('--k-ad-accent', '#6a1b9a');
    var link = document.createElement('a');
    link.className = 'k-ad-link'; link.href = a.url; link.style.background = a.bg;
    link.setAttribute('aria-label', 'Ad: ' + a.title);
    var cta = format === 'leaderboard' || format === 'float'
      ? '<span class="k-ad-cta">' + a.cta + ' →</span>' : '';
    link.innerHTML =
      '<span class="k-ad-ico" aria-hidden="true">' + a.emoji + '</span>' +
      '<span class="k-ad-txt"><p class="k-ad-title">' + a.title + '</p>' +
      '<p class="k-ad-body">' + a.body + '</p></span>' + cta;
    var badge = document.createElement('span'); badge.className = 'k-ad-badge'; badge.textContent = 'Ad';
    wrap.appendChild(badge); wrap.appendChild(link);
    return wrap;
  }

  function fillSlots(){
    var slots = document.querySelectorAll('.ad-slot');
    for (var i=0;i<slots.length;i++){
      if (slots[i].getAttribute('data-ad-filled')) continue;
      var fmt = slots[i].getAttribute('data-ad') || 'leaderboard';
      slots[i].appendChild(renderAd(fmt));
      slots[i].setAttribute('data-ad-filled','1');
    }
  }

  // In-flow leaderboard on ordinary content pages — never on game/canvas pages.
  function autoInject(){
    if (document.querySelector('.ad-slot')) return;            // page placed its own slots
    if (document.querySelector('canvas')) return;              // looks like a game — skip
    if (/\/fun-games\/[^/]+\.html$/.test(location.pathname) && !/index\.html$/.test(location.pathname)) return;
    var main = document.querySelector('main') || document.querySelector('.container, .wrap, .content');
    if (!main) return;
    var box = document.createElement('div');
    box.className = 'ad-slot'; box.setAttribute('data-ad','leaderboard'); box.setAttribute('data-ad-auto','1');
    main.insertBefore(box, main.firstChild);
  }

  // The dismissible floating banner (sitewide, bottom-left).
  function floatBanner(){
    try { if (sessionStorage.getItem('kAdFloatClosed')) return; } catch(e){}
    if (document.getElementById('k-ad-float')) return;
    var host = document.createElement('div'); host.id = 'k-ad-float';
    var close = document.createElement('button');
    close.className = 'k-ad-close'; close.setAttribute('aria-label','Close ad'); close.textContent = '✕';
    close.addEventListener('click', function(){ host.remove(); try{ sessionStorage.setItem('kAdFloatClosed','1'); }catch(e){} });
    host.appendChild(close);
    host.appendChild(renderAd('float'));
    document.body.appendChild(host);
  }

  function boot(){ try{ autoInject(); fillSlots(); floatBanner(); }catch(e){} }
  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
