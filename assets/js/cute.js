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

  // ---- learn-as-you-go: Milo builds up his own replies ----
  function norm(s){ return (s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); }
  function loadLearned(){ try{ return JSON.parse(localStorage.getItem('miloLearned')||'{}') || {}; }catch(e){ return {}; } }
  function saveLearned(o){ try{ localStorage.setItem('miloLearned', JSON.stringify(o)); }catch(e){} }
  var learned = loadLearned();
  var pendingLearn = null; // when set, the next message is taught as the reply

  function reply(raw){
    var t = norm(raw), raww = (raw||'').toLowerCase().trim(), m;

    // If Milo just asked to be taught, remember this message as the reply.
    if (pendingLearn){
      var trig = pendingLearn; pendingLearn = null;
      if (trig && raw.trim()){ learned[trig] = raw.trim(); saveLearned(learned); }
      return pick(['Got it! I’ll remember that 🧠💜','Yay, I learned something new! Ask me that again 🥰','Ooh thanks! Now I know what to say 🦊✨','Cool — that’s saved in my brain! 🧠⭐']);
    }
    // Something this user taught me before
    if (learned[t]) return learned[t];

    // remember favorites
    if ((m = raww.match(/my favou?rite (\w+) is ([a-z0-9 ]{1,24})/))){ learned['__fav_'+m[1]] = m[2].trim(); saveLearned(learned); return 'Ooh, your favorite ' + m[1] + ' is ' + m[2].trim() + '? Love that! 💜 I’ll remember!'; }
    if ((m = raww.match(/what(?:'s| is)? my favou?rite (\w+)/))){ var fav = learned['__fav_'+m[1]]; return fav ? ('Your favorite ' + m[1] + ' is ' + fav + '! 🥰') : ('Hmm, you haven’t told me your favorite ' + m[1] + ' yet — tell me! 👀'); }
    // name memory
    if ((m = raww.match(/(?:my name is|call me|name'?s)\s+([a-z][a-z'’-]{0,18})/))){ userName = cap(m[1]); try{ sessionStorage.setItem('miloUserName', userName); }catch(e){} return pick(['Nice to meet you, '+userName+'! 🥰','Yay, hi '+userName+'! 💜','Ooh, '+userName+' — cool name! ✨']); }

    // ---- intents (each with several replies for variety) ----
    if (/\b(boy or girl|boy or a girl|gender|are you a (boy|girl)|he or she)\b/.test(t)) { var g=genderInfo(); return 'I’m a ' + g.word + '! ' + g.heart; }
    if (/\b(bye|goodbye|see ya|cya|gtg|good night|night)\b/.test(t)) return pick(['Bye-bye! Come back soon 👋','Aww, see you later! 💜','Take care, friend! '+cfg.animal+'✨','Byeee! I’ll wait right here 🥹']);
    if (/\b(hi|hello|hey|yo|hiya|hola|sup|howdy)\b/.test(t)) return userName ? pick(['Hi again, '+userName+'! 💜','Yay, you’re back '+userName+'! 🎉','Hello hello, '+userName+'! 🦊']) : pick(['Hi there! 💜 What’s your name?','Hello! 🥰 I’m '+cfg.name+'! Who are you?','Hey hey! ✨ So glad you said hi!']);
    if (/how are you|how r u|how you doing|hows it going|whats up|what is up/.test(t)) return pick(['Pawsome, thanks! 🐾 How about you?','Feeling great today! '+cfg.animal+'✨','So happy you’re here! 🥰','Bouncing with joy! 🎉 You?']);
    if (/\b(your name|who are you|who r u|what are you)\b/.test(t)) return 'I’m ' + cfg.name + ' the ' + cfg.species + ' ' + cfg.animal + (cfg.acc||'') + ' — your buddy on Khyati17! 💜';
    if (/\b(what can you do|what do you do|help me|your powers)\b/.test(t)) return 'I chat, tell jokes 😹, learn new replies you teach me 🧠, and show you around — Games 🎮, Stories 📖, Videos 🎬, AI Tools 🤖!';
    if (/\b(teach|learn|remember)\b/.test(t)) return 'Yes! Say something I don’t know and I’ll ask what to reply — then I’ll remember it forever 🧠✨';
    if (/\b(change|customi|settings|dress|outfit|accessor)\b/.test(t)) return 'Tap the ⚙️ at the top to change my name, animal, gender and accessory! 🎨';
    if (/\b(joke|funny|make me laugh|lol|haha)\b/.test(t)) return pick(['Why did the '+cfg.species+' cross the road? To get to the GameZone! 🎮😂','What do you call a '+cfg.species+' with a crown? Royalty! 👑','Why was the computer cold? It left its Windows open! 💻😹','Knock knock! 🚪 (say “who’s there?”)','What do you call a sleepy '+cfg.species+'? A nap-imal! 😴']);
    if (/who.?s there|whos there/.test(t)) return pick(['Boo! 👻 …Boo who? Aww don’t cry, it’s just me! 😹','Lettuce! 🥬 …Lettuce in, it’s chilly out here! 🥶']);
    if (/\b(game|games|play|bored)\b/.test(t)) return pick(['Ooh, let’s play! 🎮 Tap “Games” up top for GameZone!','Bored? Never — there are 30 games! 🕹️','Race you to GameZone! 🏁🎮']);
    if (/\b(story|stories|read|book)\b/.test(t)) return pick(['I love stories! 📖 Check out the Story Hub ✨','Story time! 📚 There are 12 to read!','Wanna read about a Gloomy Crown? 👑📖']);
    if (/\b(video|videos|watch|youtube|short)\b/.test(t)) return pick(['Wanna watch something? 🎬 The Videos page has 50 shorts!','Movie night? 🍿 Tap Videos!']);
    if (/\b(ai|tool|tools|name generator|password)\b/.test(t)) return 'The AI Zone has fun tools 🤖 — try the Name Generator 🏷️ or Decision Maker 🎲!';
    if (/\b(food|hungry|eat|snack|pizza|cookie|cake|ice ?cream|candy)\b/.test(t)) return pick(['Yum! I love snacks 🍪 What’s your favorite?','Pizza 🍕 …or cake 🎂? Tough call!','Is it snack time?! 🥨 I’m always hungry 😋']);
    if (/\b(colou?r)\b/.test(t)) return pick(['Purple, obviously! 💜 (it’s everywhere here!)','I love all the rainbow 🌈','Sparkly purple is my fave ✨💜']);
    if (/\b(music|song|sing|dance|dancing)\b/.test(t)) return pick(['🎵 La la la! I love to dance 💃','Turn up the music! 🎧','I’ve got moves! 🕺✨']);
    if (/\b(school|homework|test|study|teacher|exam)\b/.test(t)) return pick(['You’ve got this! 📚 Little steps win big 🌟','Study tip: take breaks and breathe 😌','Smart cookie alert! 🍪🧠']);
    if (/\b(pet|dog|cat|puppy|kitten|cute)\b/.test(t)) return pick(['Animals are the best! 🐾','I’m a '+cfg.species+' '+cfg.animal+' so… biased! 😹','Aww, so cute! 🥰']);
    if (/\bwhere (do|are|r) (you|u)\b/.test(t)) return 'Right here in the cozy corner of Khyati17! 🏠'+cfg.animal;
    if (/\b(how old|your age|birthday)\b/.test(t)) return pick(['I’m a forever-young '+cfg.species+'! 🎂✨','Old enough to be wise, young enough to be silly! 😄']);
    if (/\b(love|like)\s+(you|u)\b/.test(t) || new RegExp('(love|like) '+norm(cfg.name)).test(t)) return pick(['Aww, I love you too! 💜'+cfg.animal,'You just made my whole day! 🥰','Biggest hug for you! 🤗💜']);
    if (/\b(thank|thanks|thx|ty)\b/.test(t)) return pick(['You’re welcome! 🥰','Anytime, friend! 🐾','Happy to help! ✨']);
    if (/\b(good|great|awesome|cool|nice|amazing|yay|happy|wow|fun)\b/.test(t)) return pick(['Yay! 🎉','Right?! 😸','You’re awesome too! ✨','Woohoo! 🙌']);
    if (/\b(sad|tired|bad|sick|upset|cry|angry|mad|lonely|scared)\b/.test(t)) return pick(['Aww, sending you a big hug 🤗💜','Here’s a cookie 🍪 — feel better!','You’ve got this! 🌟','Deep breath… in 🌬️ out 😌 I’m with you 💜']);
    if (/^(yes|yeah|yep|sure|ok|okay|yup)\b/.test(t)) return pick(['Yay! 🎉','Awesome — let’s go! 🚀','Knew it! 😸']);
    if (/^(no|nope|nah)\b/.test(t)) return pick(['Aw, okay! 💜','No worries! 🐾','Maybe later then! ✨']);
    // "i'm Luna" style name (only a lone word, after topic intents, not a feeling)
    if ((m = raww.match(/^(?:i am|i'?m)\s+([a-z][a-z'’-]{1,18})\s*$/)) && !/^(bored|sad|tired|happy|good|fine|ok|okay|hungry|sick|mad|angry|cool|great|here|back|sorry|sure|sleepy|busy|done|fun|nice)$/.test(m[1])){ userName = cap(m[1]); try{ sessionStorage.setItem('miloUserName', userName); }catch(e){} return pick(['Nice to meet you, '+userName+'! 🥰','Yay, hi '+userName+'! 💜']); }
    if (/\?$/.test(t)) return pick(['Hmm, great question! 🤔','Let’s figure it out together! 🚀','I’m a curious '+cfg.species+' — I wonder too! '+cfg.animal]);

    // Default: about half the time, ask to be taught so Milo grows his own replies
    if (Math.random() < 0.55){ pendingLearn = t || 'that'; return pick(['Ooh, I don’t know that one yet 🤔 Teach me — what should I say back? I’ll remember it! 🧠','Teach me! That’s new to me — tell me a good reply and I’ll keep it forever 🦊✨','I’m still learning! Teach me what to say when you say that 💜']); }
    return pick(['Tee-hee! '+cfg.animal,'Ooh, interesting! 👀','You’re fun to talk to'+(userName?(', '+userName):'')+'! 💜','Wanna play a game 🎮 or read a story 📖?','Teach me something new — say anything! 🧠','✨ Tap ⚙️ to give me a makeover!','I like chatting with you! 🥰','Pawsome! 🐾 Tell me more!']);
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

    applyCfg();

    function addMsg(text, who){
      var d = document.createElement('div'); d.className = 'cm-msg ' + (who==='me'?'me':'bot'); d.textContent = text;
      msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
    }
    function showSettings(on){ settings.style.display = on?'block':'none'; msgs.style.display = on?'none':'flex'; inputWrap.style.display = on?'none':'flex'; }
    function open(){
      panel.classList.add('open'); tip.classList.remove('show'); showSettings(false);
      if (!greeted){ greeted = true; addMsg((userName ? ('Hi ' + userName + '! ') : 'Hi! ') + 'I’m ' + cfg.name + ' the ' + cfg.species + ' ' + cfg.animal + (cfg.acc||'') + ' Tap ⚙️ to customize me, or ask me anything!', 'bot'); }
      setTimeout(function(){ try{ input.focus(); }catch(e){} }, 50);
    }
    function close(){ panel.classList.remove('open'); }
    function send(){ var v = input.value.trim(); if (!v) return; addMsg(v,'me'); input.value=''; setTimeout(function(){ addMsg(reply(v),'bot'); }, 350); }

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
