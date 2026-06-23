// Cute interactive touches:
//  1) a click sparkle/heart burst, and
//  2) "Milo" the fox — a friendly corner buddy you can chat with.
// Self-running, safe to include anywhere. Decorative + pointer-safe; respects
// prefers-reduced-motion. The chat is rule-based (no backend needed).
(function(){
  if (window.__cuteLoaded) return;
  window.__cuteLoaded = true;
  var reduce = false;
  try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  // Pages can opt out of the click-burst (e.g. games) with ?nb=1 on the script src,
  // while still getting Milo the chat buddy.
  var noBurst = false;
  try { var _cs = document.currentScript; if (_cs && /[?&]nb=1/.test(_cs.src || '')) noBurst = true; } catch (e) {}
  var pick = function(a){ return a[Math.floor(Math.random()*a.length)]; };
  var cap = function(s){ return s.charAt(0).toUpperCase()+s.slice(1); };

  // ---------- 1. Click sparkle / heart burst ----------
  if (!reduce && !noBurst) {
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

  // ---------- 2. Milo the fox — chat buddy ----------
  var NAME = 'Milo', ANIMAL = '🦊', ACCESSORY = '👑';
  var userName = '';
  try { userName = sessionStorage.getItem('miloUserName') || ''; } catch (e) {}

  function reply(raw){
    var t = (raw||'').toLowerCase().trim(), m;
    if (/\b(bye|goodbye|see ya|cya|gtg|good night)\b/.test(t)) return pick(['Bye-bye! Come back soon 👋','Aww, see you later! 💜','Take care, friend! 🦊✨']);
    if ((m = t.match(/(?:my name is|i am|i'm|im|call me)\s+([a-z][a-z'’-]{0,18})/))) { userName = cap(m[1]); try{ sessionStorage.setItem('miloUserName', userName); }catch(e){} return 'Nice to meet you, ' + userName + '! 🥰 I’m ' + NAME + ' the fox.'; }
    if (/\b(hi|hello|hey|yo|hiya|hola|sup)\b/.test(t)) return userName ? ('Hi again, ' + userName + '! 💜') : ('Hi there! 💜 I’m ' + NAME + '. What’s your name?');
    if (/how are you|how r u|how you doing|how's it going/.test(t)) return pick(['Pawsome, thanks! 🐾 How about you?','Feeling foxy today! 🦊✨','So happy you’re here! 🥰']);
    if (/\b(your name|who are you|who r u|what are you)\b/.test(t)) return 'I’m ' + NAME + ' the fox 🦊👑 — your buddy here on Khyati17!';
    if (/\b(joke|funny|make me laugh|lol)\b/.test(t)) return pick(['Why did the fox cross the road? To get to the GameZone! 🎮😂','What do you call a fox with a crown? Royalty! 👑🦊','Why was the computer cold? It left its Windows open! 💻😹']);
    if (/\b(game|games|play|bored)\b/.test(t)) return 'Ooh, let’s play! 🎮 Tap “Games” at the top for GameZone!';
    if (/\b(story|stories|read|book)\b/.test(t)) return 'I love stories! 📖 Check out the Story Hub ✨';
    if (/\b(video|videos|watch)\b/.test(t)) return 'Wanna watch something? 🎬 The Videos page has 50 shorts!';
    if (/\b(ai|tool|tools)\b/.test(t)) return 'The AI Zone has fun tools 🤖 — try the Name Generator 🏷️';
    if (/\b(love|like)\s+(you|u|milo)\b/.test(t)) return 'Aww, I love you too! 💜🦊';
    if (/\b(thank|thanks|thx|ty)\b/.test(t)) return pick(['You’re welcome! 🥰','Anytime, friend! 🐾']);
    if (/\b(good|great|awesome|cool|nice|amazing|yay|happy)\b/.test(t)) return pick(['Yay! 🎉','Right?! 😸','You’re awesome too! ✨']);
    if (/\b(sad|tired|bad|sick|upset|cry)\b/.test(t)) return pick(['Aww, sending you a big hug 🤗💜','Here’s a cookie 🍪 — feel better!','You’ve got this! 🌟']);
    if (/\b(how old|your age)\b/.test(t)) return 'I’m a forever-young fox! 🦊✨';
    if (/\?$/.test(t)) return pick(['Hmm, great question! 🤔','I’m just a little fox, but I think you’re awesome! 🦊','Let’s explore and find out! 🚀']);
    return pick([
      'Tee-hee! 🦊',
      userName ? ('You’re fun to chat with, ' + userName + '! 💜') : 'Psst… tell me your name! 🥰',
      'Ooh, tell me more! 👀',
      'Wanna play a game 🎮 or read a story 📖?',
      '✨ I’m always here in the corner if you need me!'
    ]);
  }

  function buildBuddy(){
    if (document.getElementById('cute-mascot')) return;
    var style = document.createElement('style');
    style.textContent =
      '#cute-mascot{position:fixed;right:14px;bottom:14px;z-index:901;display:flex;flex-direction:column;align-items:flex-end;gap:8px;user-select:none}' +
      '#cute-mascot .cm-panel{width:255px;max-width:80vw;background:#fff;border:1px solid #ead9fb;border-radius:16px;box-shadow:0 14px 36px rgba(117,80,168,.28);overflow:hidden;display:none;flex-direction:column}' +
      '#cute-mascot .cm-panel.open{display:flex}' +
      '#cute-mascot .cm-head{background:linear-gradient(90deg,#6a1b9a,#9c4dcc);color:#fff;font:700 13px Inter,system-ui,sans-serif;padding:9px 12px;display:flex;align-items:center;justify-content:space-between}' +
      '#cute-mascot .cm-head button{background:rgba(255,255,255,.25);border:none;color:#fff;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:13px;line-height:1}' +
      '#cute-mascot .cm-msgs{padding:10px;max-height:240px;overflow:auto;display:flex;flex-direction:column;gap:8px;background:#faf5ff}' +
      '#cute-mascot .cm-msg{font:500 13px/1.4 Inter,system-ui,sans-serif;padding:7px 10px;border-radius:12px;max-width:85%;word-wrap:break-word}' +
      '#cute-mascot .cm-msg.bot{background:#fff;border:1px solid #ead9fb;color:#4a2370;align-self:flex-start;border-bottom-left-radius:4px}' +
      '#cute-mascot .cm-msg.me{background:linear-gradient(90deg,#6a1b9a,#9c4dcc);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}' +
      '#cute-mascot .cm-input{display:flex;gap:6px;padding:8px;border-top:1px solid #f0e6fb;background:#fff}' +
      '#cute-mascot .cm-input input{flex:1;min-width:0;border:1px solid #d9c7ee;border-radius:999px;padding:8px 12px;font:500 13px Inter,system-ui,sans-serif;outline:none}' +
      '#cute-mascot .cm-input button{background:linear-gradient(90deg,#6a1b9a,#9c4dcc);border:none;color:#fff;border-radius:999px;padding:0 14px;font-weight:700;cursor:pointer}' +
      '#cute-mascot .cm-buddy{position:relative;align-self:flex-end;cursor:pointer;font-size:42px;line-height:1;filter:drop-shadow(0 3px 6px rgba(0,0,0,.22));' + (reduce ? '' : 'animation:cmBob 2.4s ease-in-out infinite') + '}' +
      '#cute-mascot .cm-buddy .cm-acc{position:absolute;top:-13px;left:50%;transform:translateX(-58%) rotate(-12deg);font-size:22px;filter:none}' +
      '#cute-mascot .cm-tip{background:#fff;color:#4a2370;font:600 12px Inter,system-ui,sans-serif;padding:7px 11px;border-radius:14px 14px 4px 14px;border:1px solid #ead9fb;box-shadow:0 6px 18px rgba(117,80,168,.18);opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s}' +
      '#cute-mascot .cm-tip.show{opacity:1;transform:translateY(0)}' +
      '@keyframes cmBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}';
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.id = 'cute-mascot';
    wrap.innerHTML =
      '<div class="cm-tip">Hi! Chat with me 💬</div>' +
      '<div class="cm-panel" role="dialog" aria-label="Chat with ' + NAME + '">' +
        '<div class="cm-head"><span>' + ACCESSORY + ' ' + NAME + ' the fox ' + ANIMAL + '</span><button class="cm-x" aria-label="Close">✕</button></div>' +
        '<div class="cm-msgs"></div>' +
        '<div class="cm-input"><input type="text" maxlength="120" placeholder="Say hi to ' + NAME + '…" aria-label="Message ' + NAME + '"/><button class="cm-send">Send</button></div>' +
      '</div>' +
      '<div class="cm-buddy" title="Chat with ' + NAME + '"><span class="cm-animal">' + ANIMAL + '</span><span class="cm-acc">' + ACCESSORY + '</span></div>';
    document.body.appendChild(wrap);

    var panel = wrap.querySelector('.cm-panel');
    var msgs = wrap.querySelector('.cm-msgs');
    var input = wrap.querySelector('.cm-input input');
    var tip = wrap.querySelector('.cm-tip');
    var greeted = false;

    function addMsg(text, who){
      var d = document.createElement('div');
      d.className = 'cm-msg ' + (who === 'me' ? 'me' : 'bot');
      d.textContent = text;
      msgs.appendChild(d);
      msgs.scrollTop = msgs.scrollHeight;
    }
    function open(){
      panel.classList.add('open'); tip.classList.remove('show');
      if (!greeted){ greeted = true; addMsg((userName ? ('Hi ' + userName + '! ' ) : 'Hi! ') + 'I’m ' + NAME + ' the fox 🦊👑 Ask me anything!', 'bot'); }
      setTimeout(function(){ try{ input.focus(); }catch(e){} }, 50);
    }
    function close(){ panel.classList.remove('open'); }
    function send(){
      var v = input.value.trim(); if (!v) return;
      addMsg(v, 'me'); input.value = '';
      setTimeout(function(){ addMsg(reply(v), 'bot'); }, 350);
    }

    wrap.querySelector('.cm-buddy').addEventListener('click', function(){ panel.classList.contains('open') ? close() : open(); });
    wrap.querySelector('.cm-x').addEventListener('click', close);
    wrap.querySelector('.cm-send').addEventListener('click', send);
    input.addEventListener('keydown', function(e){ e.stopPropagation(); if (e.key === 'Enter') send(); });
    // keep the click-burst from firing inside the buddy/chat
    wrap.addEventListener('click', function(e){ e.stopPropagation(); });

    // gentle one-time hint after arriving
    setTimeout(function(){ if (!panel.classList.contains('open')) tip.classList.add('show'); }, 1300);
    setTimeout(function(){ tip.classList.remove('show'); }, 6000);
  }

  if (document.body) buildBuddy();
  else document.addEventListener('DOMContentLoaded', buildBuddy);
})();
