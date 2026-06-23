// Cute interactive touches: a click sparkle/heart burst and a friendly corner
// buddy that bobs and says nice things. Self-running, safe to include anywhere.
// Decorative + pointer-safe; respects prefers-reduced-motion.
(function(){
  if (window.__cuteLoaded) return;
  window.__cuteLoaded = true;
  var reduce = false;
  try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  // ---------- 1. Click sparkle / heart burst ----------
  if (!reduce) {
    var BURST = ['💜','✨','⭐','🌸','💫','🥰','🎉','💖'];
    document.addEventListener('click', function (e) {
      for (var i = 0; i < 5; i++) {
        var s = document.createElement('span');
        s.textContent = BURST[Math.floor(Math.random() * BURST.length)];
        s.style.cssText = 'position:fixed;left:' + e.clientX + 'px;top:' + e.clientY +
          'px;font-size:' + (14 + Math.random() * 16).toFixed(0) +
          'px;pointer-events:none;z-index:99998;transform:translate(-50%,-50%);' +
          'transition:transform .85s cubic-bezier(.2,.7,.3,1),opacity .85s ease-out;opacity:1';
        document.body.appendChild(s);
        (function (el) {
          var dx = (Math.random() * 2 - 1) * 70, dy = -(45 + Math.random() * 70);
          var rot = (Math.random() * 60 - 30).toFixed(0);
          requestAnimationFrame(function () {
            el.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) rotate(' + rot + 'deg)';
            el.style.opacity = '0';
          });
          setTimeout(function () { el.remove(); }, 900);
        })(s);
      }
    }, { passive: true });
  }

  // ---------- 2. Friendly corner buddy ----------
  function buildBuddy() {
    if (document.getElementById('cute-mascot')) return;
    var MSGS = ['Hi there! 💜','You’re awesome! ✨','Have fun! 🎉','Glad you’re here 🥰',
                'Explore away! 🚀','Stay curious 🌟','Hello, friend! 🐾','Made with love 💖'];
    var style = document.createElement('style');
    style.textContent =
      '#cute-mascot{position:fixed;right:14px;bottom:14px;z-index:900;display:flex;align-items:flex-end;gap:8px;cursor:pointer;user-select:none}' +
      '#cute-mascot .cm-buddy{font-size:38px;line-height:1;filter:drop-shadow(0 3px 6px rgba(0,0,0,.2));' + (reduce ? '' : 'animation:cmBob 2.4s ease-in-out infinite') + '}' +
      '#cute-mascot .cm-bubble{max-width:170px;background:#fff;color:#4a2370;font:600 13px/1.35 Inter,system-ui,sans-serif;padding:8px 12px;border-radius:14px 14px 4px 14px;border:1px solid #ead9fb;box-shadow:0 6px 18px rgba(117,80,168,.18);opacity:0;transform:translateY(6px) scale(.96);transition:opacity .25s,transform .25s;pointer-events:none}' +
      '#cute-mascot .cm-bubble.show{opacity:1;transform:translateY(0) scale(1)}' +
      '@keyframes cmBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}';
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.id = 'cute-mascot'; wrap.setAttribute('aria-hidden', 'true'); wrap.title = 'Hi!';
    wrap.innerHTML = '<div class="cm-bubble"></div><div class="cm-buddy">🐱</div>';
    document.body.appendChild(wrap);

    var bubble = wrap.querySelector('.cm-bubble');
    var idx = Math.floor(Math.random() * MSGS.length);
    function say() {
      bubble.textContent = MSGS[idx % MSGS.length]; idx++;
      bubble.classList.add('show');
      clearTimeout(say._t);
      say._t = setTimeout(function () { bubble.classList.remove('show'); }, 3400);
    }
    wrap.addEventListener('click', function (ev) { ev.stopPropagation(); say(); });
    setTimeout(say, 1200); // greet shortly after arriving
  }

  if (document.body) buildBuddy();
  else document.addEventListener('DOMContentLoaded', buildBuddy);
})();
