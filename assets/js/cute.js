// Cute interactive touches for Khyati17:
//   1) a click sparkle/heart burst, and
//   2) "Mochi" — an AI Talking Teacup White Pomeranian corner buddy.
//
// Mochi is a fully client-side animated puppy that replaces the old emoji
// chatbot. Every reply is "performed": Mochi ruffs, blinks, wags its tail,
// moves its ears, opens/closes its mouth in sync with real browser speech
// (Web Speech API), shows a matching emotion (12 emotions) with an emotion
// bubble + floating particles, and speaks inside an animated speech bubble.
//
// No backend required — the animated puppy IS the "video". Voice uses the
// browser's SpeechSynthesis; lip-sync is driven from speech boundary events
// (or a timed fallback). Personality + learn-as-you-go memory persist in
// localStorage so Mochi remembers you across pages.
//
// Self-running, pointer-safe, respects prefers-reduced-motion.
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

  // ==================================================================
  //  1. Click sparkle / heart burst
  // ==================================================================
  if (!reduce && !noBurst) {
    var BURST = ['💜','✨','⭐','🌸','💫','🥰','🎉','💖','🐾'];
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

  // ==================================================================
  //  2. Mochi — the AI Talking Teacup Pomeranian
  // ==================================================================

  // ---- Config (name, accessory, voice) persisted in localStorage --------
  var ACCESSORIES = [
    { k:'none',      label:'None',        chip:'🚫' },
    { k:'bow',       label:'Blue Bow',    chip:'🎀' },
    { k:'scarf',     label:'Yellow Scarf',chip:'🧣' },
    { k:'wizard',    label:'Wizard Hat',  chip:'🧙' },
    { k:'birthday',  label:'Birthday Hat',chip:'🎉' },
    { k:'detective', label:'Detective Hat',chip:'🕵️' },
    { k:'cape',      label:'Super Cape',  chip:'🦸' }
  ];
  var DEFAULT = { name:'Mochi', acc:'bow', voice:true };
  function loadCfg(){ try{ var c=JSON.parse(localStorage.getItem('pomConfig')||'null'); if(c&&c.name) return Object.assign({},DEFAULT,c); }catch(e){} return Object.assign({},DEFAULT); }
  function saveCfg(){ try{ localStorage.setItem('pomConfig', JSON.stringify(cfg)); }catch(e){} }
  var cfg = loadCfg();
  // random accessory-of-the-day if user never chose one explicitly
  try { if (!localStorage.getItem('pomConfig')) cfg.acc = pick(['bow','scarf','wizard','birthday','detective','cape']); } catch(e){}

  var userName = '';
  try { userName = sessionStorage.getItem('pomUserName') || ''; } catch (e) {}

  // ---- Learn-as-you-go memory -------------------------------------------
  function norm(s){ return (s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); }
  function loadLearned(){ try{ return JSON.parse(localStorage.getItem('pomLearned')||'{}') || {}; }catch(e){ return {}; } }
  function saveLearned(o){ try{ localStorage.setItem('pomLearned', JSON.stringify(o)); }catch(e){} }
  var learned = loadLearned();
  var pendingLearn = null;

  // ---- Virtual pet: baby that grows if you visit daily, shrinks if you skip
  //      Visit every day to feed 🍖, bath 🛁, brush teeth 🪥 and pet 🤚.
  //      Away 30+ days => she grows all the way back to a newborn (restart).
  function todayIndex(){ var d=new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset()*60000)/86400000); }
  function freshCare(t){ return { day:t, feed:false, bath:false, brush:false, pet:false }; }
  function petDefault(){ var t=todayIndex(); return { born:t, age:0, lastDay:t, care:freshCare(t), hearts:0 }; }
  function loadPet(){ try{ var p=JSON.parse(localStorage.getItem('pomPet')||'null'); if(p&&typeof p.age==='number'){ if(!p.care) p.care=freshCare(todayIndex()); return p; } }catch(e){} return petDefault(); }
  function savePet(){ try{ localStorage.setItem('pomPet', JSON.stringify(pet)); }catch(e){} }
  var pet = loadPet();
  // advance aging on (re)load; returns a status describing what changed today
  function tickPet(){
    var t=todayIndex(), gap=t-pet.lastDay, status={type:'sameday'};
    if(gap>=30){ pet=petDefault(); status={type:'restart', gap:gap}; }
    else if(gap>=1){ var change=2-gap; /* +1 next-day visit, -1 per extra missed day */ pet.age=Math.max(0, pet.age+change); pet.lastDay=t; pet.care=freshCare(t); status={type:(change>0?'grew':(change<0?'shrank':'same')), change:change, gap:gap}; }
    else { if(pet.care.day!==t) pet.care=freshCare(t); }
    savePet(); return status;
  }
  var STAGES=[{k:'baby',label:'Baby',emoji:'🍼',scale:.70},{k:'puppy',label:'Puppy',emoji:'🐶',scale:.86},{k:'young',label:'Young pup',emoji:'🐕',scale:1.0},{k:'grown',label:'Grown-up',emoji:'🦴',scale:1.14}];
  function stageOf(a){ return a<=1?STAGES[0]:a<=6?STAGES[1]:a<=20?STAGES[2]:STAGES[3]; }
  var CARE_META={
    feed:{emoji:'🍖',emo:'treat',done:['Nom nom nom! 🍖 Thank youuu!','*munch munch* yummiest treat ever! 😋','My tummy is so happy now! 🍖💜'],again:'I’m all full from today, thank you! 😋'},
    bath:{emoji:'🛁',emo:'happy',done:['Splish splash! 🛁 So fresh and clean! ✨','*shakes off* all sparkly now! 💦','Bubbly bath time, wheee! 🫧'],again:'Squeaky clean already today! 🛁✨'},
    brush:{emoji:'🪥',emo:'proud',done:['Sparkly clean teeth! 🪥✨','*big toothy grin* so shiny! 😁','Minty fresh, thank you! 🪥💜'],again:'My teeth already sparkle today! 😁'},
    pet:{emoji:'🤚',emo:'love',done:['*melts into a fluffy puddle* best pets everrr 🤚💜','*happy wag* I LOVE pets!! 🥰','Ooh, right behind the ears! 😌💜'],again:['*giggle* that tickles! 😹','More pets?! Yes please 🐾','*leans into your hand* 🥰','Boop! 🐽']}
  };

  // ---- Ruff system: a bark before (most) spoken lines --------------------
  var RUFFS = ['Ruff!','Arf!','Woof!','Bark bark!','Yip!','Rrrf!'];
  function maybeRuff(){ return Math.random() < 0.72 ? pick(RUFFS) + ' ' : ''; }

  // ---- Personality / reply engine (Pomeranian voice) --------------------
  function reply(raw){
    var t = norm(raw), raww = (raw||'').toLowerCase().trim(), m;

    if (pendingLearn){
      var trig = pendingLearn; pendingLearn = null;
      if (trig && raw.trim()){ learned[trig] = raw.trim(); saveLearned(learned); }
      return pick(['Got it! I buried that deep in my brain-yard 🧠🐾','Yippee, I learned a new trick! Ask me again 🥰','Ooh thank you! *tail wag* now I know what to say ✨','Saved it! Good hooman deserves a treat 🍖']);
    }
    if (learned[t]) return learned[t];

    if ((m = raww.match(/my favou?rite (\w+) is ([a-z0-9 ]{1,24})/))){ learned['__fav_'+m[1]] = m[2].trim(); saveLearned(learned); return 'Ooh, your favorite ' + m[1] + ' is ' + m[2].trim() + '? *happy spin* I’ll never forget! 💜'; }
    if ((m = raww.match(/what(?:'s| is)? my favou?rite (\w+)/))){ var fav = learned['__fav_'+m[1]]; return fav ? ('Your favorite ' + m[1] + ' is ' + fav + '! Told you I’d remember 🥰') : ('Hmm, you never told me your favorite ' + m[1] + ' yet — tell meee! 👀🐾'); }
    if ((m = raww.match(/(?:my name is|call me|name'?s)\s+([a-z][a-z'’-]{0,18})/))){ userName = cap(m[1]); try{ sessionStorage.setItem('pomUserName', userName); }catch(e){} return pick(['Best friend '+userName+'!! *zoomies* 🥰','Hi hi '+userName+'! I’m gonna remember you furrever 💜','Ooh '+userName+' — such a good name, treat-worthy! 🍖']); }

    if (/\b(bye|goodbye|see ya|cya|gtg|good night|night)\b/.test(t)) return pick(['Nooo don’t goooo 🥺 …okay bye! I’ll wait right here 🐾','Byeee best friend! Come back for belly rubs 💜','*sad tail* okay… see you soon?? 🥹']);
    if (/\b(hi|hello|hey|yo|hiya|hola|sup|howdy)\b/.test(t)) return userName ? pick(['My favorite hooman '+userName+' is back!! 🎉🐾','Hi hi '+userName+'! *spins in a happy circle* 💜','You came back!! Best day ever 🥰']) : pick(['Hi best friend!! 🐶 What’s your name??','Hello hello! I’m '+cfg.name+'! Who are you? 💜','*bounces* A visitor!! Hi hi hi! ✨']);
    if (/how are you|how r u|how you doing|hows it going|whats up|what is up/.test(t)) return pick(['Pawsome! I chased my tail 3 times already 🌀 you?','SO happy you’re here I could do zoomies! 🐾 How are you?','Living my best puppy life! 🥰 What about you?']);
    if (/\b(your name|who are you|who r u|what are you)\b/.test(t)) return 'I’m ' + cfg.name + ', a teeny teacup white Pomeranian 🐶 — your fluffy buddy on Khyati17! 💜';
    if (/\b(what can you do|what do you do|help me|your powers)\b/.test(t)) return 'I chat, tell jokes 😹, learn tricks you teach me 🧠, do the cutest zoomies, and show you around — Games 🎮, Stories 📖, Videos 🎬, AI Tools 🤖!';
    if (/\b(teach|learn|remember)\b/.test(t)) return 'Yes yes! Say something I don’t know and I’ll ask what to bark back — then I remember it furrever 🧠✨';
    if (/\b(change|customi|settings|dress|outfit|accessor|hat|bow|cape)\b/.test(t)) return 'Tap the ⚙️ to rename me or dress me up — blue bow 🎀, wizard hat 🧙, cape 🦸 and more! 🎨';
    if (/\b(joke|funny|make me laugh|lol|haha)\b/.test(t)) return pick(['Why did the puppy sit in the shade? ‘Cause it didn’t want to be a hot dog! 🌭😂','What do you call a teacup Pom with a cape? A SUPER good boy! 🦸','I told the cat a joke… he didn’t laugh. Tough crowd 😼😹','Knock knock! 🚪 (say “who’s there?”)','What’s a puppy’s favorite drink? Slobber-ade! 🥤😆']);
    if (/who.?s there|whos there/.test(t)) return pick(['Woof! …Woof who? Aww don’t cry, it’s just me being adorable! 😹','Kibble! …Kibble me a treat please! 🍖😆']);
    if (/\b(game|games|play|bored|fetch)\b/.test(t)) return pick(['FETCH?! I mean — let’s play! 🎾 Tap “Games” up top! 🎮','Bored? Never with 2000+ games! *zoomies to GameZone* 🕹️','Race you to the GameZone! 🏁🐾']);
    if (/\b(story|stories|read|book)\b/.test(t)) return pick(['Story time!! Curl up with me 📖 the Story Hub has 100+ tales ✨','I love bedtime stories 🥱📚 wanna read one together?','Once upon a time… a very good puppy… 🐶📖 check the Stories page!']);
    if (/\b(video|videos|watch|youtube|short)\b/.test(t)) return pick(['Movie night?! 🍿 The Videos page has tons of shorts 🎬','Ooh let’s watch something! *pat pat* tap Videos! 🐾']);
    if (/\b(ai|tool|tools|name generator|password)\b/.test(t)) return 'The AI Zone is full of clever tools 🤖 — try the Name Generator 🏷️ or Decision Maker 🎲!';
    if (/\b(treat|bone|food|hungry|eat|snack|pizza|cookie|cake|ice ?cream|candy|kibble)\b/.test(t)) return pick(['TREATS?! 🍖 *sits perfectly* did somebody say treats?!','Yum yum! I’d do a backflip for a cookie 🍪🐾','Is it snack o’clock?! I’m ALWAYS hungry 😋']);
    if (/\b(belly rub|belly|rub|pet you|pat|cuddle|hug)\b/.test(t)) return pick(['*rolls over* BELLY RUBS YES PLEASE 🐾🥰','Cuddles!! You’re the best hooman 💜','*melts into a fluffy puddle* ahhh that’s the spot 😌']);
    if (/\b(colou?r)\b/.test(t)) return pick(['Purple, like the sparkles here! 💜','White — like my floofy fur! 🤍✨','Ooh all of them! Rainbow! 🌈🐾']);
    if (/\b(music|song|sing|dance|dancing)\b/.test(t)) return pick(['🎵 Awoo-woo-woo! That’s me singing 🐶','I’ve got the WIGGLES! *dances* 💃🐾','Turn it up, I’m gonna do a spin! 🌀']);
    if (/\b(school|homework|test|study|teacher|exam)\b/.test(t)) return pick(['You’ve got this! Little paws, big wins 🐾🌟','Study tip from a smart pup: sniff — I mean, take breaks 😌','Good brain! Here’s a treat for trying 🍪🧠']);
    if (/\b(dog|puppy|pomeranian|pom|good boy|good girl|cute|floof|fluffy)\b/.test(t)) return pick(['WHO’S A GOOD PUP?! (it’s me) 🐶✨','*proud fluff* I AM pretty floofy huh 🤍','Teacup Poms are the cutest and I don’t make the rules 😹🐾']);
    if (/\bwhere (do|are|r) (you|u)\b/.test(t)) return 'Right here in my cozy corner of Khyati17! 🏠🐾';
    if (/\b(how old|your age|birthday)\b/.test(t)) return pick(['I’m a forever-puppy! Always 8 weeks of pure floof 🎂✨','Old enough to sit, young enough for zoomies! 😄🐾']);
    if (/\b(love|like)\s+(you|u)\b/.test(t) || new RegExp('(love|like) '+norm(cfg.name)).test(t)) return pick(['I LOVE YOU TOO!! *tail helicopter* 💜🐾','You just made my whole tail wag! 🥰','Biggest floofiest hug for you! 🤗💜']);
    if (/\b(thank|thanks|thx|ty)\b/.test(t)) return pick(['You’re welcome, best friend! 🥰','Anytime! *offers paw* 🐾','Happy to help! Treats optional 🍖✨']);
    if (/\b(good|great|awesome|cool|nice|amazing|yay|happy|wow|fun|excited)\b/.test(t)) return pick(['YIPPEE! 🎉🐾','Right?! *zoomies* 🌀','You’re pawsome too! ✨','Woohoo! *happy jump* 🙌']);
    if (/\b(sad|tired|bad|sick|upset|cry|angry|mad|lonely|scared|worried|anxious)\b/.test(t)) return pick(['Aww *nuzzles you* here’s a big floofy hug 🤗💜','I brought you a treat 🍖 and my whole tail. Feel better?','You’ve got this, I believe in you! 🌟🐾','Deep breath… in 🌬️ out 😌 I’m right here with you 💜']);
    if (/^(yes|yeah|yep|sure|ok|okay|yup)\b/.test(t)) return pick(['YAY! 🎉','Zoomies incoming! 🚀🐾','Knew it! *wag wag* 😸']);
    if (/^(no|nope|nah)\b/.test(t)) return pick(['Aw okie! 💜','No worries, more belly rubs then 🐾','Maybe later! ✨']);
    if ((m = raww.match(/^(?:i am|i'?m)\s+([a-z][a-z'’-]{1,18})\s*$/)) && !/^(bored|sad|tired|happy|good|fine|ok|okay|hungry|sick|mad|angry|cool|great|here|back|sorry|sure|sleepy|busy|done|fun|nice)$/.test(m[1])){ userName = cap(m[1]); try{ sessionStorage.setItem('pomUserName', userName); }catch(e){} return pick(['Best friend '+userName+'! *tail wag* 🥰','Yay hi '+userName+'! 💜🐾']); }
    if (/\?$/.test(t)) return pick(['Ooh great question! *tilts head* 🤔🐾','Let’s sniff out the answer together! 🚀','Hmm hmm, I’m a curious pup, I wonder too! 🐶']);

    // Default: sometimes ask to be taught so Mochi grows
    if (Math.random() < 0.55){ pendingLearn = t || 'that'; return pick(['Ooh I don’t know that trick yet 🤔 Teach me — what should I bark back? I’ll remember! 🧠','*tilts head* that’s new to me! Tell me a good reply and I’ll keep it furrever 🐾✨','I’m still a puppy, still learning! Teach me what to say 💜']); }
    return pick(['Tee-hee! *nose boop* 🐾','Ooh, interesting! *tilts head* 👀','You’re so fun to talk to'+(userName?(', '+userName):'')+'! 💜','Wanna play a game 🎮 or read a story 📖?','Teach me a new trick — say anything! 🧠','*does a little spin* ✨','I like chatting with you! 🥰','Pawsome! Tell me more! 🐾']);
  }

  // ---- Emotion detection -------------------------------------------------
  // Each emotion drives face/ears/tail (via a CSS class on the dog),
  // the emotion bubble, and floating particles.
  var EMOTIONS = {
    love:       { bubble:'❤️',  parts:['💜','💗','❤️','🥰'], wag:'.5s' },
    laughing:   { bubble:'😂',  parts:['😂','😹','✨'],       wag:'.45s' },
    excited:    { bubble:'🎉',  parts:['🎉','⭐','🐾','✨'],   wag:'.4s' },
    happy:      { bubble:'⭐',  parts:['✨','🐾','💜'],        wag:'.6s' },
    proud:      { bubble:'🏆',  parts:['🏆','⭐','✨'],        wag:'.55s' },
    treat:      { bubble:'🍖',  parts:['🍖','🦴','😋'],        wag:'.4s' },
    surprised:  { bubble:'😲',  parts:['❗','✨','💫'],        wag:'.7s' },
    thinking:   { bubble:'🤔',  parts:['💭','❓','.'],          wag:'1.4s' },
    confused:   { bubble:'❓',  parts:['❓','💫','?'],          wag:'1.3s' },
    sleepy:     { bubble:'😴',  parts:['😴','💤','z'],          wag:'2s' },
    scared:     { bubble:'😨',  parts:['💦','💧','!'],          wag:'.9s' },
    sad:        { bubble:'😢',  parts:['💧','😢','🥺'],        wag:'1.6s' },
    neutral:    { bubble:'',    parts:['🐾','✨'],             wag:'1s' }
  };
  function detectEmotion(text){
    var t = (text||'').toLowerCase();
    if (/😂|😹|🤣|haha|lol|joke|hot dog|slobber/.test(t)) return 'laughing';
    if (/💜|💗|❤️|🥰|love you|belly rub|cuddle|hug|nuzzle/.test(t)) return 'love';
    if (/🎉|🎾|zoomies|yippee|yay|woohoo|fetch|happy jump|backflip/.test(t)) return 'excited';
    if (/🍖|🦴|treat|cookie|snack|kibble|hungry|yum/.test(t)) return 'treat';
    if (/🏆|proud|good boy|good girl|good pup|who’s a good|whos a good/.test(t)) return 'proud';
    if (/😴|💤|sleep|nap|bedtime|yawn|🥱/.test(t)) return 'sleepy';
    if (/🤔|hmm|wonder|great question|think/.test(t)) return 'thinking';
    if (/❓|don’t know|dont know|new to me|tilts head|teach me/.test(t)) return 'confused';
    if (/😲|❗|whoa|wow|surprise|guess what/.test(t)) return 'surprised';
    if (/😨|😰|scared|worried|anxious|💦/.test(t)) return 'scared';
    if (/😢|🥺|sad|sorry|feel better|nooo|don’t go|dont go/.test(t)) return 'sad';
    if (/✨|💜|🐾|🥰|good|great|awesome|nice|pawsome/.test(t)) return 'happy';
    return 'neutral';
  }

  // ---- The Pomeranian SVG (fully vector, animatable parts) ---------------
  // Fluffy silhouettes are built from overlapping circles; each moving part
  // (ears, eyes, lids, brows, mouth, tongue, tail, paws) has an id/class so
  // JS + CSS can pose it per-emotion and lip-sync it while talking.
  function dogSVG(){
    return '' +
    '<svg class="pom-dog" viewBox="0 0 240 230" role="img" aria-label="Mochi the teacup Pomeranian">' +
      '<defs>' +
        '<radialGradient id="pomFur" cx="45%" cy="38%" r="70%"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#f0e9f7"/></radialGradient>' +
      '</defs>' +
      // cape (behind everything)
      '<g class="acc acc-cape"><path d="M78 120 Q120 108 162 120 L150 208 Q120 196 90 208 Z" fill="#e53935"/><path d="M78 120 Q120 130 162 120 L162 132 Q120 142 78 132 Z" fill="#ffd54f"/></g>' +
      // tail
      '<g class="pom-tail"><g class="pom-tail-inner">' +
        '<circle cx="0" cy="0" r="20" fill="url(#pomFur)"/><circle cx="-12" cy="-10" r="15" fill="url(#pomFur)"/><circle cx="10" cy="-12" r="14" fill="url(#pomFur)"/><circle cx="0" cy="-22" r="13" fill="url(#pomFur)"/><circle cx="-14" cy="6" r="12" fill="url(#pomFur)"/>' +
      '</g></g>' +
      // body fluff
      '<g class="pom-body">' +
        '<circle cx="120" cy="180" r="46" fill="url(#pomFur)"/><circle cx="86" cy="176" r="30" fill="url(#pomFur)"/><circle cx="154" cy="176" r="30" fill="url(#pomFur)"/><circle cx="100" cy="205" r="26" fill="url(#pomFur)"/><circle cx="140" cy="205" r="26" fill="url(#pomFur)"/><circle cx="120" cy="150" r="30" fill="url(#pomFur)"/>' +
      '</g>' +
      // front paws
      '<g class="pom-paws"><ellipse cx="103" cy="216" rx="13" ry="10" fill="#ffffff"/><ellipse cx="137" cy="216" rx="13" ry="10" fill="#ffffff"/><ellipse cx="103" cy="220" rx="6" ry="4" fill="#f4d9e6"/><ellipse cx="137" cy="220" rx="6" ry="4" fill="#f4d9e6"/></g>' +
      // ears (behind head fluff edges)
      '<g class="pom-ear pom-ear-l"><path d="M70 70 L52 24 Q78 34 92 66 Z" fill="url(#pomFur)"/><path d="M72 66 L62 38 Q78 44 86 64 Z" fill="#f3d7e6"/></g>' +
      '<g class="pom-ear pom-ear-r"><path d="M170 70 L188 24 Q162 34 148 66 Z" fill="url(#pomFur)"/><path d="M168 66 L178 38 Q162 44 154 64 Z" fill="#f3d7e6"/></g>' +
      // head fluff
      '<g class="pom-head">' +
        '<circle cx="120" cy="100" r="56" fill="url(#pomFur)"/><circle cx="78" cy="96" r="26" fill="url(#pomFur)"/><circle cx="162" cy="96" r="26" fill="url(#pomFur)"/><circle cx="90" cy="60" r="24" fill="url(#pomFur)"/><circle cx="150" cy="60" r="24" fill="url(#pomFur)"/><circle cx="120" cy="52" r="24" fill="url(#pomFur)"/><circle cx="82" cy="128" r="22" fill="url(#pomFur)"/><circle cx="158" cy="128" r="22" fill="url(#pomFur)"/>' +
      '</g>' +
      // face group
      '<g class="pom-face">' +
        // brows
        '<g class="pom-brows"><path class="pom-brow pom-brow-l" d="M92 78 Q102 74 112 78" fill="none" stroke="#b98db0" stroke-width="3" stroke-linecap="round"/><path class="pom-brow pom-brow-r" d="M128 78 Q138 74 148 78" fill="none" stroke="#b98db0" stroke-width="3" stroke-linecap="round"/></g>' +
        // eyes: round (default)
        '<g class="pom-eyes-round">' +
          '<circle cx="102" cy="98" r="10" fill="#241726"/><circle cx="138" cy="98" r="10" fill="#241726"/>' +
          '<circle cx="99" cy="94" r="3.4" fill="#fff"/><circle cx="135" cy="94" r="3.4" fill="#fff"/>' +
          '<circle cx="105" cy="101" r="1.6" fill="#fff" opacity=".7"/><circle cx="141" cy="101" r="1.6" fill="#fff" opacity=".7"/>' +
          // eyelids for blink / sleepy (scale from top)
          '<rect class="pom-lid pom-lid-l" x="90" y="86" width="24" height="24" rx="11" fill="url(#pomFur)"/>' +
          '<rect class="pom-lid pom-lid-r" x="126" y="86" width="24" height="24" rx="11" fill="url(#pomFur)"/>' +
        '</g>' +
        // happy arc eyes (^ ^)
        '<g class="pom-eyes-happy"><path d="M92 100 Q102 88 112 100" fill="none" stroke="#241726" stroke-width="4" stroke-linecap="round"/><path d="M128 100 Q138 88 148 100" fill="none" stroke="#241726" stroke-width="4" stroke-linecap="round"/></g>' +
        // heart eyes
        '<g class="pom-eyes-heart"><path d="M102 92 l6 6 l6-6 a4 4 0 0 0-6-2 a4 4 0 0 0-6 2z" fill="#ff5a8a"/><path d="M132 92 l6 6 l6-6 a4 4 0 0 0-6-2 a4 4 0 0 0-6 2z" fill="#ff5a8a"/></g>' +
        // blush
        '<g class="pom-blush"><ellipse cx="84" cy="112" rx="9" ry="5" fill="#ffb6cf" opacity=".7"/><ellipse cx="156" cy="112" rx="9" ry="5" fill="#ffb6cf" opacity=".7"/></g>' +
        // nose
        '<path class="pom-nose" d="M114 116 h12 l-6 8 z" fill="#241726"/>' +
        // mouth: closed smile + open mouth (talk)
        '<g class="pom-mouth">' +
          '<path class="pom-smile" d="M120 124 Q110 134 100 128 M120 124 Q130 134 140 128" fill="none" stroke="#241726" stroke-width="2.6" stroke-linecap="round"/>' +
          '<g class="pom-mouth-open"><ellipse class="pom-mouth-hole" cx="120" cy="134" rx="12" ry="9" fill="#7a2e3e"/><ellipse class="pom-tongue" cx="120" cy="139" rx="8" ry="5" fill="#ff7a99"/></g>' +
        '</g>' +
      '</g>' +
      // accessories on head/neck
      '<g class="acc acc-bow"><path d="M104 46 l-16-8 v18 z" fill="#4f8cff"/><path d="M136 46 l16-8 v18 z" fill="#4f8cff"/><circle cx="120" cy="47" r="7" fill="#2f6fe0"/></g>' +
      '<g class="acc acc-scarf"><path d="M84 138 Q120 156 156 138 L152 150 Q120 166 88 150 Z" fill="#ffca28"/><path d="M150 148 l12 26 l-12 -4 l-6 8 z" fill="#ffb300"/></g>' +
      '<g class="acc acc-wizard"><path d="M120 8 L150 62 Q120 54 90 62 Z" fill="#5e35b1"/><path d="M84 60 h72 v9 h-72 z" fill="#4527a0"/><circle cx="120" cy="30" r="3" fill="#ffe082"/><circle cx="112" cy="45" r="2.4" fill="#ffe082"/><circle cx="132" cy="48" r="2.4" fill="#ffe082"/></g>' +
      '<g class="acc acc-birthday"><path d="M120 6 L146 58 Q120 50 94 58 Z" fill="#ff5a8a"/><path d="M108 30 l24 0 M104 44 l32 0" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="120" cy="6" r="5" fill="#ffd54f"/></g>' +
      '<g class="acc acc-detective"><ellipse cx="120" cy="58" rx="46" ry="12" fill="#8d6e63"/><path d="M84 58 Q120 22 156 58 Z" fill="#a1887f"/><rect x="112" y="30" width="16" height="10" rx="3" fill="#6d4c41"/></g>' +
    '</svg>';
  }

  // ==================================================================
  //  Build the widget
  // ==================================================================
  function buildBuddy(){
    if (document.getElementById('pom-mascot')) return;

    var style = document.createElement('style');
    style.textContent = [
      '#pom-mascot{position:fixed;right:14px;bottom:14px;z-index:901;display:flex;flex-direction:column;align-items:flex-end;gap:8px;user-select:none;font-family:Inter,system-ui,sans-serif}',
      '#pom-mascot *{box-sizing:border-box}',
      // chat panel
      '#pom-mascot .pom-panel{width:278px;max-width:84vw;background:#fff;border:1px solid #ead9fb;border-radius:18px;box-shadow:0 16px 40px rgba(117,80,168,.30);overflow:hidden;display:none;flex-direction:column}',
      '#pom-mascot .pom-panel.open{display:flex;animation:pomPop .3s cubic-bezier(.2,1.4,.4,1)}',
      '@keyframes pomPop{from{opacity:0;transform:translateY(12px) scale(.9)}to{opacity:1;transform:none}}',
      '#pom-mascot .pom-head{background:linear-gradient(90deg,#6a1b9a,#c56be0);color:#fff;font:700 13px Inter,sans-serif;padding:9px 10px;display:flex;align-items:center;gap:6px}',
      '#pom-mascot .pom-title{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#pom-mascot .pom-head button{background:rgba(255,255,255,.25);border:none;color:#fff;width:24px;height:24px;border-radius:50%;cursor:pointer;font-size:13px;line-height:1;flex:0 0 auto}',
      '#pom-mascot .pom-head button:hover{background:rgba(255,255,255,.4)}',
      '#pom-mascot .pom-msgs{padding:10px;max-height:210px;overflow:auto;display:flex;flex-direction:column;gap:8px;background:#faf5ff}',
      '#pom-mascot .pom-msg{font:500 13px/1.4 Inter,sans-serif;padding:7px 10px;border-radius:12px;max-width:85%;word-wrap:break-word}',
      '#pom-mascot .pom-msg.bot{background:#fff;border:1px solid #ead9fb;color:#4a2370;align-self:flex-start;border-bottom-left-radius:4px}',
      '#pom-mascot .pom-msg.me{background:linear-gradient(90deg,#6a1b9a,#c56be0);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}',
      '#pom-mascot .pom-input{display:flex;gap:6px;padding:8px;border-top:1px solid #f0e6fb;background:#fff}',
      '#pom-mascot .pom-input input{flex:1;min-width:0;border:1px solid #d9c7ee;border-radius:999px;padding:8px 12px;font:500 13px Inter,sans-serif;outline:none}',
      '#pom-mascot .pom-input button{background:linear-gradient(90deg,#6a1b9a,#c56be0);border:none;color:#fff;border-radius:999px;padding:0 14px;font-weight:700;cursor:pointer}',
      // settings
      '#pom-mascot .pom-settings{display:none;padding:10px;max-height:260px;overflow:auto;background:#faf5ff}',
      '#pom-mascot .pom-settings label{display:block;font:700 11px Inter,sans-serif;color:#6a1b9a;margin:8px 0 4px;text-transform:uppercase;letter-spacing:.03em}',
      '#pom-mascot .pom-name{width:100%;border:1px solid #d9c7ee;border-radius:8px;padding:7px 10px;font:500 13px Inter;outline:none}',
      '#pom-mascot .pom-grid{display:flex;flex-wrap:wrap;gap:5px}',
      '#pom-mascot .pom-grid button{font-size:12px;font-weight:600;padding:6px 8px;border:1px solid #ead9fb;background:#fff;border-radius:9px;cursor:pointer;color:#4a2370;display:flex;align-items:center;gap:4px}',
      '#pom-mascot .pom-grid button.sel{outline:2px solid #c56be0;border-color:#c56be0;background:#f3e9fd}',
      '#pom-mascot .pom-toggle{display:flex;align-items:center;gap:8px;font:600 12px Inter;color:#4a2370;cursor:pointer}',
      '#pom-mascot .pom-done{margin-top:12px;width:100%;background:linear-gradient(90deg,#6a1b9a,#c56be0);color:#fff;border:none;border-radius:999px;padding:9px;font-weight:700;cursor:pointer}',
      // stage (the puppy)
      '#pom-mascot .pom-stage{position:relative;width:150px;height:158px;cursor:pointer;overflow:visible}',
      '#pom-mascot .pom-dog{width:150px;height:auto;filter:drop-shadow(0 6px 10px rgba(90,50,140,.28));display:block' + (reduce?'':';animation:pomBreathe 3.2s ease-in-out infinite') + '}',
      '@keyframes pomBreathe{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-4px) scale(1.015)}}',
      '#pom-mascot.talking .pom-dog{animation:pomBounceTalk .4s ease-in-out infinite}',
      '@keyframes pomBounceTalk{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}',
      // tail wag (speed via --wag)
      '#pom-mascot .pom-tail{transform:translate(46px,168px)}',
      '#pom-mascot .pom-tail-inner{transform-origin:0 0' + (reduce?'':';animation:pomWag var(--wag,1s) ease-in-out infinite') + '}',
      '@keyframes pomWag{0%,100%{transform:rotate(-16deg)}50%{transform:rotate(24deg)}}',
      // ears idle + emotion poses set via classes
      '#pom-mascot .pom-ear{transform-origin:center 70px;transition:transform .3s}',
      (reduce?'':'#pom-mascot .pom-ear-l{animation:pomEarL 2.6s ease-in-out infinite}#pom-mascot .pom-ear-r{animation:pomEarR 2.6s ease-in-out infinite}'),
      '@keyframes pomEarL{0%,100%{transform:rotate(0)}50%{transform:rotate(-6deg)}}',
      '@keyframes pomEarR{0%,100%{transform:rotate(0)}50%{transform:rotate(6deg)}}',
      // blink
      '#pom-mascot .pom-lid{transform-origin:center top;transform:scaleY(0);transition:transform .12s ease}',
      '#pom-mascot.blink .pom-lid{transform:scaleY(1)}',
      // eye variants (default: round)
      '#pom-mascot .pom-eyes-happy,#pom-mascot .pom-eyes-heart{display:none}',
      '#pom-mascot.emo-happy .pom-eyes-round,#pom-mascot.emo-excited .pom-eyes-round,#pom-mascot.emo-laughing .pom-eyes-round,#pom-mascot.emo-proud .pom-eyes-round,#pom-mascot.emo-treat .pom-eyes-round{display:none}',
      '#pom-mascot.emo-happy .pom-eyes-happy,#pom-mascot.emo-excited .pom-eyes-happy,#pom-mascot.emo-laughing .pom-eyes-happy,#pom-mascot.emo-proud .pom-eyes-happy,#pom-mascot.emo-treat .pom-eyes-happy{display:block}',
      '#pom-mascot.emo-love .pom-eyes-round{display:none}#pom-mascot.emo-love .pom-eyes-heart{display:block}',
      // sleepy/sad: half-closed lids
      '#pom-mascot.emo-sleepy .pom-lid,#pom-mascot.emo-sad .pom-lid{transform:scaleY(.55)}',
      // mouth open (talk / big-smile emotions)
      '#pom-mascot .pom-mouth-open{transform-box:fill-box;transform-origin:center top;transform:scaleY(var(--mouth,0));opacity:var(--mouth,0);transition:opacity .08s}',
      '#pom-mascot .pom-smile{opacity:calc(1 - var(--mouth,0))}',
      // brows per emotion
      '#pom-mascot .pom-brow{transition:transform .3s}',
      '#pom-mascot.emo-sad .pom-brow-l,#pom-mascot.emo-scared .pom-brow-l,#pom-mascot.emo-confused .pom-brow-l{transform:translateY(-3px) rotate(12deg)}',
      '#pom-mascot.emo-sad .pom-brow-r,#pom-mascot.emo-scared .pom-brow-r,#pom-mascot.emo-confused .pom-brow-r{transform:translateY(-3px) rotate(-12deg)}',
      '#pom-mascot.emo-thinking .pom-brow-r{transform:translateY(-4px)}',
      '#pom-mascot.emo-surprised .pom-brows,#pom-mascot.emo-scared .pom-brows{transform:translateY(-4px)}',
      // head tilt for thinking/confused
      '#pom-mascot.emo-thinking .pom-dog,#pom-mascot.emo-confused .pom-dog{transform:rotate(-6deg)}',
      // scared shiver
      (reduce?'':'#pom-mascot.emo-scared .pom-dog{animation:pomShiver .12s linear infinite}'),
      '@keyframes pomShiver{0%,100%{transform:translateX(0)}25%{transform:translateX(-1.5px)}75%{transform:translateX(1.5px)}}',
      // accessories (hidden unless selected)
      '#pom-mascot .acc{display:none}',
      '#pom-mascot.acc-bow .acc-bow,#pom-mascot.acc-scarf .acc-scarf,#pom-mascot.acc-wizard .acc-wizard,#pom-mascot.acc-birthday .acc-birthday,#pom-mascot.acc-detective .acc-detective,#pom-mascot.acc-cape .acc-cape{display:block}',
      // speech bubble
      '#pom-mascot .pom-speech{position:absolute;right:8px;bottom:118px;max-width:230px;min-width:64px;background:#fff;color:#3a2058;font:600 13px/1.45 Inter,sans-serif;padding:9px 12px;border-radius:16px 16px 4px 16px;border:1px solid #ead9fb;box-shadow:0 10px 26px rgba(117,80,168,.24);opacity:0;transform:translateY(8px) scale(.85);transform-origin:bottom right;pointer-events:none}',
      '#pom-mascot .pom-speech.show{opacity:1;transform:none;animation:pomBubble .4s cubic-bezier(.2,1.5,.4,1)' + (reduce?'':',pomBubbleWiggle 2.6s ease-in-out .4s infinite') + '}',
      '@keyframes pomBubble{from{opacity:0;transform:translateY(10px) scale(.7)}to{opacity:1;transform:none}}',
      '@keyframes pomBubbleWiggle{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}',
      // emotion bubble
      '#pom-mascot .pom-emobubble{position:absolute;left:16px;top:0;font-size:26px;opacity:0;transform:scale(.4);pointer-events:none;filter:drop-shadow(0 3px 4px rgba(0,0,0,.15))}',
      '#pom-mascot .pom-emobubble.show{animation:pomEmo 2.4s ease forwards}',
      '@keyframes pomEmo{0%{opacity:0;transform:scale(.3) translateY(6px)}15%{opacity:1;transform:scale(1.15) translateY(-4px)}30%{transform:scale(1) translateY(-6px)}80%{opacity:1;transform:scale(1) translateY(-12px)}100%{opacity:0;transform:scale(.8) translateY(-20px)}}',
      // particles
      '#pom-mascot .pom-particle{position:absolute;pointer-events:none;font-size:15px;will-change:transform,opacity}',
      // tip
      '#pom-mascot .pom-tip{background:#fff;color:#4a2370;font:600 12px Inter,sans-serif;padding:7px 11px;border-radius:14px 14px 4px 14px;border:1px solid #ead9fb;box-shadow:0 6px 18px rgba(117,80,168,.18);opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s;pointer-events:none}',
      '#pom-mascot .pom-tip.show{opacity:1;transform:translateY(0)}'
    ].join('');
    document.head.appendChild(style);

    // care-bar + growth-stage styling
    var style2 = document.createElement('style');
    style2.textContent = [
      '#pom-mascot .pom-care{display:flex;align-items:center;gap:6px;padding:7px 9px;background:#f3e9fd;border-bottom:1px solid #ead9fb}',
      '#pom-mascot .pom-agebadge{flex:1;font:700 10.5px Inter,sans-serif;color:#6a1b9a;line-height:1.25;min-width:0}',
      '#pom-mascot .pom-carebtns{display:flex;gap:4px;flex:0 0 auto}',
      '#pom-mascot .pom-carebtn{position:relative;width:29px;height:29px;border:1px solid #e0cdf5;background:#fff;border-radius:9px;cursor:pointer;font-size:15px;line-height:1;padding:0;transition:transform .15s,background .2s}',
      '#pom-mascot .pom-carebtn:hover{transform:translateY(-2px)}',
      '#pom-mascot .pom-carebtn:active{transform:scale(.9)}',
      '#pom-mascot .pom-carebtn.done{background:#e5f7e8;border-color:#9fe0b0}',
      '#pom-mascot .pom-carebtn.done::after{content:"✓";position:absolute;right:-3px;top:-4px;background:#3fae63;color:#fff;font-size:8px;font-weight:800;width:12px;height:12px;border-radius:50%;display:flex;align-items:center;justify-content:center;line-height:1}',
      '#pom-mascot .pom-dogwrap{transform-box:border-box;transform:scale(var(--dogScale,1));transform-origin:bottom center;transition:transform .8s cubic-bezier(.2,1.25,.4,1)}'
    ].join('');
    document.head.appendChild(style2);

    var wrap = document.createElement('div');
    wrap.id = 'pom-mascot';
    wrap.innerHTML =
      '<div class="pom-tip">Ruff! Chat &amp; pet me 🐶</div>' +
      '<div class="pom-panel" role="dialog" aria-label="Chat with Mochi the Pomeranian">' +
        '<div class="pom-head"><span class="pom-title"></span>' +
          '<button class="pom-gear" title="Customize" aria-label="Customize">⚙️</button>' +
          '<button class="pom-x" title="Close" aria-label="Close">✕</button></div>' +
        '<div class="pom-care">' +
          '<div class="pom-agebadge"></div>' +
          '<div class="pom-carebtns">' +
            '<button class="pom-carebtn" data-care="feed" title="Feed her 🍖">🍖</button>' +
            '<button class="pom-carebtn" data-care="bath" title="Give her a bath 🛁">🛁</button>' +
            '<button class="pom-carebtn" data-care="brush" title="Brush her teeth 🪥">🪥</button>' +
            '<button class="pom-carebtn" data-care="pet" title="Pet her 🤚">🤚</button>' +
          '</div>' +
        '</div>' +
        '<div class="pom-msgs"></div>' +
        '<div class="pom-settings">' +
          '<label>Name</label><input class="pom-name" type="text" maxlength="14" />' +
          '<label>Accessory</label><div class="pom-grid pom-accs"></div>' +
          '<label>Voice</label><label class="pom-toggle"><input type="checkbox" class="pom-voice"/> Speak replies out loud 🔊</label>' +
          '<button class="pom-done">Done ✓</button>' +
        '</div>' +
        '<div class="pom-input"><input type="text" maxlength="140" aria-label="Message Mochi"/><button class="pom-send">Send</button></div>' +
      '</div>' +
      '<div class="pom-stage" title="Chat with Mochi">' +
        '<div class="pom-particles"></div>' +
        '<div class="pom-emobubble" aria-hidden="true"></div>' +
        '<div class="pom-speech" aria-live="polite"></div>' +
        '<div class="pom-dogwrap">' + dogSVG() + '</div>' +
      '</div>';
    document.body.appendChild(wrap);

    var panel    = wrap.querySelector('.pom-panel');
    var msgs     = wrap.querySelector('.pom-msgs');
    var settings = wrap.querySelector('.pom-settings');
    var inputWrap= wrap.querySelector('.pom-input');
    var input    = inputWrap.querySelector('input');
    var tip      = wrap.querySelector('.pom-tip');
    var titleEl  = wrap.querySelector('.pom-title');
    var nameInput= settings.querySelector('.pom-name');
    var voiceChk = settings.querySelector('.pom-voice');
    var stage    = wrap.querySelector('.pom-stage');
    var speech   = wrap.querySelector('.pom-speech');
    var emoBubble= wrap.querySelector('.pom-emobubble');
    var particles= wrap.querySelector('.pom-particles');
    var dogEl    = wrap.querySelector('.pom-dog');
    var dogWrap  = wrap.querySelector('.pom-dogwrap');
    var ageBadge = wrap.querySelector('.pom-agebadge');
    var careBtns = Array.prototype.slice.call(wrap.querySelectorAll('.pom-carebtn'));
    var greeted  = false;
    var petStatus = tickPet();   // advance aging as soon as the page loads

    // ---------- config UI ----------
    function applyCfg(){
      titleEl.textContent = cfg.name + ' 🐶';
      input.placeholder = 'Say hi to ' + cfg.name + '…';
      stage.title = 'Chat with ' + cfg.name;
      ACCESSORIES.forEach(function(a){ wrap.classList.remove('acc-'+a.k); });
      if (cfg.acc && cfg.acc !== 'none') wrap.classList.add('acc-'+cfg.acc);
      wrap.querySelector('.pom-dog').setAttribute('aria-label', cfg.name + ' the puppy');
    }

    // ---------- care + aging UI ----------
    function applyStage(){ var st=stageOf(pet.age); if(dogWrap) dogWrap.style.setProperty('--dogScale', st.scale); wrap.setAttribute('data-stage', st.k); }
    function renderCare(){
      var t=todayIndex(); if(pet.care.day!==t){ pet.care=freshCare(t); savePet(); }
      var st=stageOf(pet.age);
      ageBadge.textContent = st.emoji + ' ' + st.label + ' ' + cfg.name + ' · ' + pet.age + ' day' + (pet.age===1?'':'s') + ' old';
      careBtns.forEach(function(b){ b.classList.toggle('done', !!pet.care[b.getAttribute('data-care')]); });
      applyStage();
    }
    function statusLine(s){
      var a=pet.age, d=function(n){ return n + ' day' + (n===1?'':'s'); };
      if(!s) return '';
      if(s.type==='restart') return 'Whoaa, you were away ' + s.gap + ' days… I grew aaaall the way back into a teeny newborn! 🍼 Let’s start over — visit me every day! 💜';
      if(s.type==='grew')   return 'Yay, you came back!! I grew a little — I’m ' + d(a) + ' old now! 🎉 Will you feed me, bathe me & brush my teeth today?';
      if(s.type==='shrank') return 'Aww, you missed ' + d(s.gap-1) + ' so I got a bit smaller 🥺 Please visit every day so I grow big and strong!';
      var todo=[]; if(!pet.care.feed)todo.push('feed me 🍖'); if(!pet.care.bath)todo.push('bathe me 🛁'); if(!pet.care.brush)todo.push('brush my teeth 🪥'); if(!pet.care.pet)todo.push('pet me 🤚');
      if(todo.length) return 'I’m ' + d(a) + ' old today! Don’t forget to ' + todo.join(', ') + '!';
      return 'I’m ' + d(a) + ' old and allll cared for today — you’re the best! 💜 Come back tomorrow so I grow!';
    }
    function doCare(kind){
      var t=todayIndex(); if(pet.care.day!==t) pet.care=freshCare(t);
      var meta=CARE_META[kind]; if(!meta) return;
      var first=!pet.care[kind];
      if(first){ pet.care[kind]=true; pet.hearts=(pet.hearts||0)+1; }
      savePet(); renderCare();
      var line = first ? pick(meta.done) : (Array.isArray(meta.again)?pick(meta.again):meta.again);
      setEmotion(meta.emo); showBubble(line); speak(line, meta.emo);
      if(first){
        addMsg(line,'bot');
        if(pet.care.feed && pet.care.bath && pet.care.brush && pet.care.pet){
          var bonus='🌟 Yippee! You fed me, bathed me, brushed my teeth AND petted me today — I feel amazing! Come back tomorrow so I grow! 💜';
          setTimeout(function(){ setEmotion('excited'); showBubble(bonus); speak(bonus,'excited'); addMsg(bonus,'bot'); }, 950);
        }
      }
    }
    var accsBox = settings.querySelector('.pom-accs');
    ACCESSORIES.forEach(function(a){
      var btn = document.createElement('button');
      btn.innerHTML = a.chip + ' ' + a.label;
      if (a.k === cfg.acc) btn.className = 'sel';
      btn.addEventListener('click', function(){
        cfg.acc = a.k; saveCfg(); applyCfg();
        accsBox.querySelectorAll('button').forEach(function(b){ b.className=''; }); btn.className='sel';
      });
      accsBox.appendChild(btn);
    });
    nameInput.value = cfg.name;
    nameInput.addEventListener('input', function(){ cfg.name = (nameInput.value.trim() || 'Mochi'); saveCfg(); applyCfg(); });
    nameInput.addEventListener('keydown', function(e){ e.stopPropagation(); });
    voiceChk.checked = !!cfg.voice;
    voiceChk.addEventListener('change', function(){ cfg.voice = voiceChk.checked; saveCfg(); });
    applyCfg();

    // ---------- idle blink loop ----------
    (function blinkLoop(){
      if (reduce) return;
      var delay = 2600 + Math.random()*3200;
      setTimeout(function(){
        if (!wrap.classList.contains('emo-sleepy')){
          wrap.classList.add('blink');
          setTimeout(function(){ wrap.classList.remove('blink'); if (Math.random()<0.25){ // double blink
            setTimeout(function(){ wrap.classList.add('blink'); setTimeout(function(){ wrap.classList.remove('blink'); }, 130); }, 150); } }, 130);
        }
        blinkLoop();
      }, delay);
    })();

    // ---------- emotion + particles ----------
    var EMO_KEYS = Object.keys(EMOTIONS);
    var emoTimer = null;
    function setEmotion(key){
      var e = EMOTIONS[key] || EMOTIONS.neutral;
      EMO_KEYS.forEach(function(k){ wrap.classList.remove('emo-'+k); });
      wrap.classList.add('emo-'+key);
      dogEl.style.setProperty('--wag', e.wag);
      // emotion bubble
      if (e.bubble){
        emoBubble.textContent = e.bubble;
        emoBubble.classList.remove('show'); void emoBubble.offsetWidth; emoBubble.classList.add('show');
      }
      // particles
      if (!reduce) spawnParticles(e.parts);
      // relax back to neutral after a while
      if (emoTimer) clearTimeout(emoTimer);
      emoTimer = setTimeout(function(){
        EMO_KEYS.forEach(function(k){ wrap.classList.remove('emo-'+k); });
        wrap.classList.add('emo-neutral');
        dogEl.style.setProperty('--wag', EMOTIONS.neutral.wag);
      }, 6000);
    }
    function spawnParticles(set){
      for (var i=0;i<6;i++){
        (function(i){
          var p = document.createElement('span');
          p.className = 'pom-particle';
          p.textContent = set[i % set.length];
          var startX = 20 + Math.random()*110;
          p.style.left = startX + 'px';
          p.style.bottom = (30 + Math.random()*30) + 'px';
          p.style.opacity = '0';
          p.style.transition = 'transform 1.7s cubic-bezier(.2,.6,.3,1), opacity 1.7s ease-out';
          particles.appendChild(p);
          var dx = (Math.random()*2-1)*40, dy = -(60 + Math.random()*60);
          requestAnimationFrame(function(){
            p.style.opacity = '1';
            p.style.transform = 'translate('+dx+'px,'+dy+'px) rotate('+((Math.random()*60-30)|0)+'deg)';
            requestAnimationFrame(function(){ p.style.opacity = '0'; });
          });
          setTimeout(function(){ p.remove(); }, 1800);
        })(i);
      }
    }

    // ---------- talking / lip-sync ----------
    var talkRAF = null, talkStop = 0, mouthPhase = 0;
    function startMouth(durationMs){
      wrap.classList.add('talking');
      talkStop = performance.now() + durationMs;
      cancelAnimationFrame(talkRAF);
      (function frame(now){
        if (now >= talkStop){ stopMouth(); return; }
        // oscillate mouth open amount for a chatty look
        mouthPhase += 0.35;
        var open = 0.35 + Math.abs(Math.sin(mouthPhase)) * 0.6;
        dogEl.style.setProperty('--mouth', open.toFixed(2));
        talkRAF = requestAnimationFrame(frame);
      })(performance.now());
    }
    function stopMouth(){
      cancelAnimationFrame(talkRAF);
      wrap.classList.remove('talking');
      dogEl.style.setProperty('--mouth', 0);
    }

    // Pick the sweetest, least-robotic voice available. Neural / "Natural" /
    // "Online" voices (Edge, Google, Apple) sound far warmer than the built-in
    // eSpeak fallback, so we rank strongly toward those and toward soft female
    // timbres, and away from robotic engines.
    var chosenVoice = null;
    function scoreVoice(v){
      var n = (v.name||'') + ' ' + (v.voiceURI||'');
      var s = 0;
      if (/en[-_]?(us|gb|au)/i.test(v.lang)) s += 6; else if (/^en/i.test(v.lang)) s += 4;
      if (/natural|neural|online|premium|enhanced/i.test(n)) s += 20;     // smoothest engines
      if (/google/i.test(n)) s += 12;                                     // Google voices are warm
      if (/\b(jenny|aria|ava|allison|samantha|michelle|sonia|libby|nanci|zira|clara|emma|amelie|karen|tessa|serena)\b/i.test(n)) s += 8;
      if (/female|woman|girl/i.test(n)) s += 5;
      if (/espeak|robo|synth(?!e)|festival|pico/i.test(n)) s -= 15;       // avoid robotic
      if (v.localService === false) s += 3;                               // cloud = higher quality
      return s;
    }
    function pickVoice(){
      try{
        var vs = window.speechSynthesis.getVoices() || [];
        if (!vs.length) return;
        chosenVoice = vs.slice().sort(function(a,b){ return scoreVoice(b) - scoreVoice(a); })[0] || null;
      }catch(e){}
    }
    if ('speechSynthesis' in window){
      pickVoice();
      window.speechSynthesis.onvoiceschanged = pickVoice;
    }

    function speak(text, emotion){
      var clean = text.replace(/[*_~`>#]/g,'')
                      .replace(/[\u{1F000}-\u{1FAFF}☀-➿←-⇿⬀-⯿]/gu,'')
                      .replace(/\s+/g,' ').trim();
      var duration = Math.min(6500, Math.max(1100, clean.length * 62));
      var canSpeak = cfg.voice && 'speechSynthesis' in window && clean;
      if (canSpeak){
        try{
          window.speechSynthesis.cancel();
          var u = new SpeechSynthesisUtterance(clean);
          if (chosenVoice) u.voice = chosenVoice;
          // Sweet, warm puppy voice — gently bright, never chipmunk-robotic.
          // Softer pitch + a touch of per-line variation keeps it from sounding
          // flat/synthetic; each emotion nudges the warmth.
          var TONE = {
            excited:  { p:1.45, r:1.06 }, laughing:{ p:1.42, r:1.05 },
            love:     { p:1.34, r:0.94 }, happy:   { p:1.38, r:0.99 },
            proud:    { p:1.36, r:1.00 }, treat:   { p:1.40, r:1.02 },
            surprised:{ p:1.46, r:1.03 }, thinking:{ p:1.28, r:0.95 },
            confused: { p:1.30, r:0.95 }, sleepy:  { p:1.12, r:0.84 },
            scared:   { p:1.40, r:1.05 }, sad:     { p:1.16, r:0.90 }
          };
          var tone = TONE[emotion] || { p:1.34, r:0.98 };
          var jitter = (Math.random() - 0.5) * 0.06;   // subtle, natural inflection
          u.pitch  = Math.max(0.8, Math.min(2, tone.p + jitter));
          u.rate   = tone.r;
          u.volume = 1;
          var started = false;
          u.onstart = function(){ started = true; startMouth(999999); };
          u.onboundary = function(){ mouthPhase += 1.4; };
          u.onend = u.onerror = function(){ stopMouth(); };
          window.speechSynthesis.speak(u);
          // fallback if speech never starts (autoplay/gesture issues)
          setTimeout(function(){ if (!started) startMouth(duration); }, 260);
        }catch(e){ startMouth(duration); }
      } else {
        startMouth(duration); // silent lip-flap so the puppy still "talks"
      }
    }

    // ---------- speech bubble ----------
    var bubbleTimer = null;
    function showBubble(text){
      speech.textContent = text;
      speech.classList.remove('show'); void speech.offsetWidth; speech.classList.add('show');
      if (bubbleTimer) clearTimeout(bubbleTimer);
      var hold = Math.min(8000, Math.max(3200, text.length*70));
      bubbleTimer = setTimeout(function(){ speech.classList.remove('show'); }, hold);
    }

    // ---------- chat log ----------
    function addMsg(text, who){
      var d = document.createElement('div'); d.className = 'pom-msg ' + (who==='me'?'me':'bot'); d.textContent = text;
      msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
    }

    // The full "perform a reply" pipeline: reply -> ruff -> emotion -> bubble+voice+log
    function perform(userText){
      var body = reply(userText);
      var line = (/^(ruff|arf|woof|bark|yip|rrrf)/i.test(body) ? '' : maybeRuff()) + body;
      var emotion = detectEmotion(line);
      setEmotion(emotion);
      showBubble(line);
      speak(line, emotion);
      addMsg(line, 'bot');
    }

    function showSettings(on){ settings.style.display = on?'block':'none'; msgs.style.display = on?'none':'flex'; inputWrap.style.display = on?'none':'flex'; }
    function open(){
      panel.classList.add('open'); tip.classList.remove('show'); showSettings(false); renderCare();
      if (!greeted){
        greeted = true;
        if (petStatus) addMsg(statusLine(petStatus), 'bot');
        var hi = (userName ? ('Best friend '+userName+'!! ') : '') + 'I’m ' + cfg.name + '! Feed me 🍖, bathe me 🛁, brush my teeth 🪥 and pet me 🤚 every day so I grow! Or just ask me anything 💜';
        var line = maybeRuff() + hi;
        setEmotion('excited'); showBubble(line); speak(line, 'excited'); addMsg(line, 'bot');
      }
      setTimeout(function(){ try{ input.focus(); }catch(e){} }, 60);
    }
    function close(){ panel.classList.remove('open'); try{ window.speechSynthesis.cancel(); }catch(e){} stopMouth(); }
    function send(){
      var v = input.value.trim(); if (!v) return;
      addMsg(v,'me'); input.value='';
      setEmotion('thinking');
      setTimeout(function(){ perform(v); }, 400);
    }

    // ---------- wiring ----------
    // Tap the puppy to open the chat; once open, tapping her = petting her.
    stage.addEventListener('click', function(){ panel.classList.contains('open') ? doCare('pet') : open(); });
    careBtns.forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); doCare(b.getAttribute('data-care')); }); });
    wrap.querySelector('.pom-x').addEventListener('click', function(e){ e.stopPropagation(); close(); });
    wrap.querySelector('.pom-gear').addEventListener('click', function(e){ e.stopPropagation(); showSettings(settings.style.display!=='block'); });
    settings.querySelector('.pom-done').addEventListener('click', function(){ showSettings(false); });
    wrap.querySelector('.pom-send').addEventListener('click', send);
    input.addEventListener('keydown', function(e){ e.stopPropagation(); if (e.key === 'Enter') send(); });
    wrap.addEventListener('click', function(e){ e.stopPropagation(); });

    setEmotion('neutral');
    renderCare();   // reflect age/size + today's care state right away
    setTimeout(function(){ if (!panel.classList.contains('open')) tip.classList.add('show'); }, 1400);
    setTimeout(function(){ tip.classList.remove('show'); }, 6500);
  }

  if (document.body) buildBuddy();
  else document.addEventListener('DOMContentLoaded', buildBuddy);
})();
