// Cute interactive touches:
//  1) a click sparkle/heart burst, and
//  2) a friendly, fully-customizable corner buddy you can chat with.
// The user can change the buddy's name, animal, gender and accessory; choices
// are saved in localStorage so they persist across pages. Self-running, safe
// anywhere. Decorative + pointer-safe; respects prefers-reduced-motion.
// Pages can pass ?nb=1 on the script src to skip the click-burst (e.g. games).
(function(){
  if (window.__cuteLoaded) return;
  window.__cuteLoaded = true;
  var reduce = false;
  try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
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

  // ---------- 2. Customizable chat buddy ----------
  var ANIMALS = [
    {e:'🦊',n:'fox'},{e:'🐱',n:'cat'},{e:'🐶',n:'dog'},{e:'🐰',n:'bunny'},
    {e:'🐻',n:'bear'},{e:'🐼',n:'panda'},{e:'🐯',n:'tiger'},{e:'🦁',n:'lion'},
    {e:'🐸',n:'frog'},{e:'🐥',n:'chick'},{e:'🦄',n:'unicorn'},{e:'🐲',n:'dragon'},
    {e:'🐧',n:'penguin'},{e:'🐨',n:'koala'},{e:'🐵',n:'monkey'},{e:'🐙',n:'octopus'}
  ];
  var ACCS = ['','👑','🎀','🎩','🧢','🕶️','👓','🎓','🧣','🌸','⭐','💎'];
  var GENDERS = [{k:'he',label:'He/Him',word:'boy',heart:'💙'},{k:'she',label:'She/Her',word:'girl',heart:'💗'},{k:'they',label:'They/Them',word:'friend',heart:'💜'}];

  var DEFAULT = { name:'Milo', animal:'🦊', species:'fox', acc:'👑', gender:'he' };
  function loadCfg(){ try{ var c=JSON.parse(localStorage.getItem('miloConfig')||'null'); if(c&&c.name) return Object.assign({},DEFAULT,c); }catch(e){} return Object.assign({},DEFAULT); }
  function saveCfg(){ try{ localStorage.setItem('miloConfig', JSON.stringify(cfg)); }catch(e){} }
  var cfg = loadCfg();
  function genderInfo(){ for(var i=0;i<GENDERS.length;i++) if(GENDERS[i].k===cfg.gender) return GENDERS[i]; return GENDERS[0]; }

  var userName = '';
  try { userName = sessionStorage.getItem('miloUserName') || ''; } catch (e) {}

  // ---- ChatGPT (bring-your-own-key) ----
  function getKey(){ try { return (localStorage.getItem('openai_api_key') || '').trim(); } catch (e) { return ''; } }
  var history = [];
  function persuade(){
    return pick([
      'Add your API key first 🔑 and then I can really chat and have fun with you! 💜',
      'Pop in your ChatGPT API key 🔑 so we can explore together! ✨',
      'I’d love to chat for real! Just add your API key 🔑 first 🥰',
      'Psst… give me your API key 🔑 and I’ll come to life and play with you! 🦊',
      'Add your key in ⚙️ (or when you log in) 🔑 — then I can chat about anything! 🌟'
    ]);
  }
  function callOpenAI(text){
    var key = getKey();
    history.push({ role:'user', content:text });
    var sys = 'You are ' + cfg.name + ', a cute, cheerful, kid-friendly ' + cfg.species +
      ' mascot (pronouns: ' + cfg.gender + ') for Khyati17 — a fun website with Games, Stories, AI Tools and Videos. ' +
      'Reply briefly (1–3 short sentences), playful and warm, with a few emojis. Keep it wholesome and encouraging, ' +
      'and suggest exploring a section of the site when it fits.';
    return fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + key },
      body: JSON.stringify({ model:'gpt-4o-mini', messages:[{ role:'system', content:sys }].concat(history.slice(-10)), max_tokens:150, temperature:0.8 })
    }).then(function(r){ return r.json(); }).then(function(d){
      if (d.error) throw new Error(d.error.message || 'API error');
      var msg = ((d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '').trim() || ('🦊 ' + cfg.name + ' is here!');
      history.push({ role:'assistant', content:msg });
      return msg;
    });
  }

  function reply(raw){
    var t = (raw||'').toLowerCase().trim(), m;
    if (/\b(boy or girl|boy or a girl|gender|are you a (boy|girl)|he or she)\b/.test(t)) { var g=genderInfo(); return 'I’m a ' + g.word + '! ' + g.heart; }
    if (/\b(bye|goodbye|see ya|cya|gtg|good night)\b/.test(t)) return pick(['Bye-bye! Come back soon 👋','Aww, see you later! 💜','Take care, friend! '+cfg.animal+'✨']);
    if ((m = t.match(/(?:my name is|i am|i'm|im|call me)\s+([a-z][a-z'’-]{0,18})/))) { userName = cap(m[1]); try{ sessionStorage.setItem('miloUserName', userName); }catch(e){} return 'Nice to meet you, ' + userName + '! 🥰 I’m ' + cfg.name + ' the ' + cfg.species + '.'; }
    if (/\b(hi|hello|hey|yo|hiya|hola|sup)\b/.test(t)) return userName ? ('Hi again, ' + userName + '! 💜') : ('Hi there! 💜 I’m ' + cfg.name + '. What’s your name?');
    if (/how are you|how r u|how you doing|how's it going/.test(t)) return pick(['Pawsome, thanks! 🐾 How about you?','Feeling great today! '+cfg.animal+'✨','So happy you’re here! 🥰']);
    if (/\b(your name|who are you|who r u|what are you)\b/.test(t)) return 'I’m ' + cfg.name + ' the ' + cfg.species + ' ' + cfg.animal + (cfg.acc||'') + ' — your buddy here on Khyati17!';
    if (/\b(change|customi|settings|dress|outfit)\b/.test(t)) return 'Tap the ⚙️ at the top to change my name, animal, gender and accessory! 🎨';
    if (/\b(joke|funny|make me laugh|lol)\b/.test(t)) return pick(['Why did the '+cfg.species+' cross the road? To get to the GameZone! 🎮😂','What do you call a '+cfg.species+' with a crown? Royalty! 👑','Why was the computer cold? It left its Windows open! 💻😹']);
    if (/\b(game|games|play|bored)\b/.test(t)) return 'Ooh, let’s play! 🎮 Tap “Games” at the top for GameZone!';
    if (/\b(story|stories|read|book)\b/.test(t)) return 'I love stories! 📖 Check out the Story Hub ✨';
    if (/\b(video|videos|watch)\b/.test(t)) return 'Wanna watch something? 🎬 The Videos page has 50 shorts!';
    if (/\b(ai|tool|tools)\b/.test(t)) return 'The AI Zone has fun tools 🤖 — try the Name Generator 🏷️';
    if (/\b(love|like)\s+(you|u|milo|'+cfg.name.toLowerCase()+')\b/.test(t)) return 'Aww, I love you too! 💜' + cfg.animal;
    if (/\b(thank|thanks|thx|ty)\b/.test(t)) return pick(['You’re welcome! 🥰','Anytime, friend! 🐾']);
    if (/\b(good|great|awesome|cool|nice|amazing|yay|happy)\b/.test(t)) return pick(['Yay! 🎉','Right?! 😸','You’re awesome too! ✨']);
    if (/\b(sad|tired|bad|sick|upset|cry)\b/.test(t)) return pick(['Aww, sending you a big hug 🤗💜','Here’s a cookie 🍪 — feel better!','You’ve got this! 🌟']);
    if (/\?$/.test(t)) return pick(['Hmm, great question! 🤔','I’m just a little '+cfg.species+', but I think you’re awesome! '+cfg.animal,'Let’s explore and find out! 🚀']);
    return pick(['Tee-hee! '+cfg.animal, userName ? ('You’re fun to chat with, ' + userName + '! 💜') : 'Psst… tell me your name! 🥰','Ooh, tell me more! 👀','Wanna play a game 🎮 or read a story 📖?','✨ Tap ⚙️ to give me a makeover!']);
  }

  function buildBuddy(){
    if (document.getElementById('cute-mascot')) return;
    var style = document.createElement('style');
    style.textContent =
      '#cute-mascot{position:fixed;right:14px;bottom:14px;z-index:901;display:flex;flex-direction:column;align-items:flex-end;gap:8px;user-select:none}' +
      '#cute-mascot .cm-panel{width:262px;max-width:82vw;background:#fff;border:1px solid #ead9fb;border-radius:16px;box-shadow:0 14px 36px rgba(117,80,168,.28);overflow:hidden;display:none;flex-direction:column}' +
      '#cute-mascot .cm-panel.open{display:flex}' +
      '#cute-mascot .cm-head{background:linear-gradient(90deg,#6a1b9a,#9c4dcc);color:#fff;font:700 13px Inter,system-ui,sans-serif;padding:9px 10px;display:flex;align-items:center;gap:6px}' +
      '#cute-mascot .cm-title{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#cute-mascot .cm-head button{background:rgba(255,255,255,.25);border:none;color:#fff;width:24px;height:24px;border-radius:50%;cursor:pointer;font-size:13px;line-height:1;flex:0 0 auto}' +
      '#cute-mascot .cm-msgs{padding:10px;max-height:230px;overflow:auto;display:flex;flex-direction:column;gap:8px;background:#faf5ff}' +
      '#cute-mascot .cm-msg{font:500 13px/1.4 Inter,system-ui,sans-serif;padding:7px 10px;border-radius:12px;max-width:85%;word-wrap:break-word}' +
      '#cute-mascot .cm-msg.bot{background:#fff;border:1px solid #ead9fb;color:#4a2370;align-self:flex-start;border-bottom-left-radius:4px}' +
      '#cute-mascot .cm-msg.me{background:linear-gradient(90deg,#6a1b9a,#9c4dcc);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}' +
      '#cute-mascot .cm-input{display:flex;gap:6px;padding:8px;border-top:1px solid #f0e6fb;background:#fff}' +
      '#cute-mascot .cm-input input{flex:1;min-width:0;border:1px solid #d9c7ee;border-radius:999px;padding:8px 12px;font:500 13px Inter,system-ui,sans-serif;outline:none}' +
      '#cute-mascot .cm-input button{background:linear-gradient(90deg,#6a1b9a,#9c4dcc);border:none;color:#fff;border-radius:999px;padding:0 14px;font-weight:700;cursor:pointer}' +
      '#cute-mascot .cm-settings{display:none;padding:10px;max-height:280px;overflow:auto;background:#faf5ff}' +
      '#cute-mascot .cm-settings label{display:block;font:700 11px Inter,system-ui,sans-serif;color:#6a1b9a;margin:8px 0 4px;text-transform:uppercase;letter-spacing:.03em}' +
      '#cute-mascot .cm-settings .cm-name{width:100%;border:1px solid #d9c7ee;border-radius:8px;padding:7px 10px;font:500 13px Inter;outline:none}' +
      '#cute-mascot .cm-grid{display:flex;flex-wrap:wrap;gap:5px}' +
      '#cute-mascot .cm-grid button{font-size:18px;width:32px;height:32px;border:1px solid #ead9fb;background:#fff;border-radius:8px;cursor:pointer;line-height:1;padding:0}' +
      '#cute-mascot .cm-grid button.sel{outline:2px solid #9c4dcc;border-color:#9c4dcc;background:#f3e9fd}' +
      '#cute-mascot .cm-gen{display:flex;gap:5px}' +
      '#cute-mascot .cm-gen button{flex:1;border:1px solid #ead9fb;background:#fff;border-radius:8px;padding:6px 4px;font:600 11px Inter;cursor:pointer;color:#4a2370}' +
      '#cute-mascot .cm-gen button.sel{background:linear-gradient(90deg,#6a1b9a,#9c4dcc);color:#fff;border-color:transparent}' +
      '#cute-mascot .cm-done{margin-top:12px;width:100%;background:linear-gradient(90deg,#6a1b9a,#9c4dcc);color:#fff;border:none;border-radius:999px;padding:9px;font-weight:700;cursor:pointer}' +
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
      '<div class="cm-panel" role="dialog" aria-label="Chat buddy">' +
        '<div class="cm-head"><span class="cm-title"></span><button class="cm-gear" title="Customize" aria-label="Customize">⚙️</button><button class="cm-x" title="Close" aria-label="Close">✕</button></div>' +
        '<div class="cm-msgs"></div>' +
        '<div class="cm-settings">' +
          '<label>Name</label><input class="cm-name" type="text" maxlength="14" />' +
          '<label>Animal</label><div class="cm-grid cm-animals"></div>' +
          '<label>Accessory</label><div class="cm-grid cm-accs"></div>' +
          '<label>Gender</label><div class="cm-gen"></div>' +
          '<label>ChatGPT API key (optional)</label>' +
          '<div style="display:flex;gap:5px"><input class="cm-key" type="password" placeholder="sk-…" autocomplete="off" style="flex:1;min-width:0;border:1px solid #d9c7ee;border-radius:8px;padding:7px 10px;font:500 12px Inter;outline:none" /><button class="cm-key-save" style="background:linear-gradient(90deg,#6a1b9a,#9c4dcc);color:#fff;border:none;border-radius:8px;padding:0 12px;font-weight:700;cursor:pointer">Save</button></div>' +
          '<div class="cm-key-note" style="font:500 10.5px Inter;color:#8a76a3;margin-top:4px">Stored only in your browser. Lets me chat with AI 🤖</div>' +
          '<button class="cm-done">Done ✓</button>' +
        '</div>' +
        '<div class="cm-input"><input type="text" maxlength="120" aria-label="Message buddy"/><button class="cm-send">Send</button></div>' +
      '</div>' +
      '<div class="cm-buddy" title="Chat with your buddy"><span class="cm-animal"></span><span class="cm-acc"></span></div>';
    document.body.appendChild(wrap);

    var panel = wrap.querySelector('.cm-panel');
    var msgs = wrap.querySelector('.cm-msgs');
    var settings = wrap.querySelector('.cm-settings');
    var inputWrap = wrap.querySelector('.cm-input');
    var input = inputWrap.querySelector('input');
    var tip = wrap.querySelector('.cm-tip');
    var titleEl = wrap.querySelector('.cm-title');
    var animalEl = wrap.querySelector('.cm-buddy .cm-animal');
    var accEl = wrap.querySelector('.cm-buddy .cm-acc');
    var nameInput = settings.querySelector('.cm-name');
    var greeted = false;

    function applyCfg(){
      titleEl.textContent = (cfg.acc ? cfg.acc + ' ' : '') + cfg.name + ' the ' + cfg.species + ' ' + cfg.animal;
      animalEl.textContent = cfg.animal;
      accEl.textContent = cfg.acc || '';
      input.placeholder = 'Say hi to ' + cfg.name + '…';
      wrap.querySelector('.cm-buddy').title = 'Chat with ' + cfg.name;
    }

    // build settings option grids
    var animalsBox = settings.querySelector('.cm-animals');
    ANIMALS.forEach(function(a){
      var btn = document.createElement('button'); btn.textContent = a.e; btn.title = a.n;
      if (a.e === cfg.animal) btn.className = 'sel';
      btn.addEventListener('click', function(){
        cfg.animal = a.e; cfg.species = a.n; saveCfg(); applyCfg();
        animalsBox.querySelectorAll('button').forEach(function(b){ b.className=''; }); btn.className='sel';
      });
      animalsBox.appendChild(btn);
    });
    var accsBox = settings.querySelector('.cm-accs');
    ACCS.forEach(function(a){
      var btn = document.createElement('button'); btn.textContent = a || '—'; btn.title = a ? 'accessory' : 'none';
      if (a === cfg.acc) btn.className = 'sel';
      btn.addEventListener('click', function(){
        cfg.acc = a; saveCfg(); applyCfg();
        accsBox.querySelectorAll('button').forEach(function(b){ b.className=''; }); btn.className='sel';
      });
      accsBox.appendChild(btn);
    });
    var genBox = settings.querySelector('.cm-gen');
    GENDERS.forEach(function(g){
      var btn = document.createElement('button'); btn.textContent = g.label;
      if (g.k === cfg.gender) btn.className = 'sel';
      btn.addEventListener('click', function(){
        cfg.gender = g.k; saveCfg();
        genBox.querySelectorAll('button').forEach(function(b){ b.className=''; }); btn.className='sel';
      });
      genBox.appendChild(btn);
    });
    nameInput.value = cfg.name;
    nameInput.addEventListener('input', function(){ cfg.name = (nameInput.value.trim() || 'Buddy'); saveCfg(); applyCfg(); });
    nameInput.addEventListener('keydown', function(e){ e.stopPropagation(); });
    // API key field
    var keyInput = settings.querySelector('.cm-key');
    try { keyInput.value = localStorage.getItem('openai_api_key') || ''; } catch (e) {}
    keyInput.addEventListener('keydown', function(e){ e.stopPropagation(); });
    settings.querySelector('.cm-key-save').addEventListener('click', function(){
      var k = (keyInput.value || '').trim();
      try { if (k) localStorage.setItem('openai_api_key', k); else localStorage.removeItem('openai_api_key'); } catch (e) {}
      var note = settings.querySelector('.cm-key-note'); var prev = note.textContent;
      note.textContent = k ? 'Saved ✓ — now ask me anything! 🤖' : 'Cleared — add a key to chat with AI.';
      setTimeout(function(){ note.textContent = prev; }, 2600);
    });

    applyCfg();

    function addMsg(text, who){
      var d = document.createElement('div'); d.className = 'cm-msg ' + (who==='me'?'me':'bot'); d.textContent = text;
      msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
    }
    function showSettings(on){ settings.style.display = on?'block':'none'; msgs.style.display = on?'none':'flex'; inputWrap.style.display = on?'none':'flex'; }
    function open(){
      panel.classList.add('open'); tip.classList.remove('show'); showSettings(false);
      if (!greeted){ greeted = true; addMsg((userName ? ('Hi ' + userName + '! ') : 'Hi! ') + 'I’m ' + cfg.name + ' the ' + cfg.species + ' ' + cfg.animal + (cfg.acc||'') + (getKey() ? ' Ask me anything! ✨ (Tap ⚙️ to customize me.)' : ' Add your API key 🔑 in ⚙️ (or at login) so we can really chat! 💜'), 'bot'); }
      setTimeout(function(){ try{ input.focus(); }catch(e){} }, 50);
    }
    function close(){ panel.classList.remove('open'); }
    function addTyping(){ var d=document.createElement('div'); d.className='cm-msg bot'; d.textContent='💭 …'; msgs.appendChild(d); msgs.scrollTop=msgs.scrollHeight; return d; }
    function send(){
      var v = input.value.trim(); if (!v) return; addMsg(v,'me'); input.value='';
      if (!getKey()){ setTimeout(function(){ addMsg(persuade(),'bot'); }, 300); return; }
      var typ = addTyping();
      callOpenAI(v).then(function(resp){ typ.remove(); addMsg(resp,'bot'); })
        .catch(function(e){ typ.remove(); addMsg('Hmm, I couldn’t reach ChatGPT 😿 — check your API key in ⚙️. (' + (e.message||'error') + ')', 'bot'); });
    }

    wrap.querySelector('.cm-buddy').addEventListener('click', function(){ panel.classList.contains('open') ? close() : open(); });
    wrap.querySelector('.cm-x').addEventListener('click', close);
    wrap.querySelector('.cm-gear').addEventListener('click', function(){ showSettings(settings.style.display!=='block'); });
    settings.querySelector('.cm-done').addEventListener('click', function(){ showSettings(false); });
    wrap.querySelector('.cm-send').addEventListener('click', send);
    input.addEventListener('keydown', function(e){ e.stopPropagation(); if (e.key === 'Enter') send(); });
    wrap.addEventListener('click', function(e){ e.stopPropagation(); });

    setTimeout(function(){ if (!panel.classList.contains('open')) tip.classList.add('show'); }, 1300);
    setTimeout(function(){ tip.classList.remove('show'); }, 6000);
  }

  if (document.body) buildBuddy();
  else document.addEventListener('DOMContentLoaded', buildBuddy);
})();
