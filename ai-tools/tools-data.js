// 100 client-side mini AI tools. Each: { id, name, emoji, cat, desc, gen?, placeholder?, run(input)->string }
// Rendered by tool.html and listed in the AI Zone. All run in the browser.
const MORSE={A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..','0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.','.':'.-.-.-',',':'--..--','?':'..--..','!':'-.-.--','/':'-..-.','-':'-....-','@':'.--.-.'};
const MORSE_REV=Object.fromEntries(Object.entries(MORSE).map(([k,v])=>[v,k]));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const words=s=>(s.match(/[A-Za-z0-9]+/g)||[]);
function b64enc(s){ try{ return btoa(unescape(encodeURIComponent(s))); }catch(e){ return 'Could not encode'; } }
function b64dec(s){ try{ return decodeURIComponent(escape(atob(s.trim()))); }catch(e){ return 'Invalid Base64'; } }
function toRoman(x){ let n=parseInt(x,10); if(isNaN(n)||n<1||n>3999) return 'Enter a whole number 1–3999'; const m=[['M',1000],['CM',900],['D',500],['CD',400],['C',100],['XC',90],['L',50],['XL',40],['X',10],['IX',9],['V',5],['IV',4],['I',1]]; let r=''; for(const [s,v] of m){ while(n>=v){ r+=s; n-=v; } } return r; }
function numWords(x){ let num=parseInt(x,10); if(isNaN(num)) return 'Enter a whole number'; if(num===0) return 'zero'; if(Math.abs(num)>999999999999) return 'Too big!'; const o=['','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'],t=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety']; const ch=n=>{ let s=''; if(n>=100){ s+=o[Math.floor(n/100)]+' hundred'; n%=100; if(n)s+=' '; } if(n>=20){ s+=t[Math.floor(n/10)]; n%=10; if(n)s+='-'+o[n]; } else if(n>0) s+=o[n]; return s; }; let neg=num<0; num=Math.abs(num); const sc=['','thousand','million','billion']; let p=[],i=0; while(num>0){ const c=num%1000; if(c)p.unshift(ch(c)+(sc[i]?' '+sc[i]:'')); num=Math.floor(num/1000); i++; } return (neg?'negative ':'')+p.join(' '); }

// ---- helpers for the extra 50 tools ----
const nums=s=>(s.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);
function fancyMap(s,U,L,D){ return Array.from(s).map(ch=>{ const c=ch.codePointAt(0); if(U&&c>=65&&c<=90)return String.fromCodePoint(U+c-65); if(L&&c>=97&&c<=122)return String.fromCodePoint(L+c-97); if(D&&c>=48&&c<=57)return String.fromCodePoint(D+c-48); return ch; }).join(''); }
const NATO={A:'Alpha',B:'Bravo',C:'Charlie',D:'Delta',E:'Echo',F:'Foxtrot',G:'Golf',H:'Hotel',I:'India',J:'Juliett',K:'Kilo',L:'Lima',M:'Mike',N:'November',O:'Oscar',P:'Papa',Q:'Quebec',R:'Romeo',S:'Sierra',T:'Tango',U:'Uniform',V:'Victor',W:'Whiskey',X:'X-ray',Y:'Yankee',Z:'Zulu','0':'Zero','1':'One','2':'Two','3':'Three','4':'Four','5':'Five','6':'Six','7':'Seven','8':'Eight','9':'Nine'};
const SMALLCAPS={a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ꞯ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ'};
const SUPER={a:'ᵃ',b:'ᵇ',c:'ᶜ',d:'ᵈ',e:'ᵉ',f:'ᶠ',g:'ᵍ',h:'ʰ',i:'ⁱ',j:'ʲ',k:'ᵏ',l:'ˡ',m:'ᵐ',n:'ⁿ',o:'ᵒ',p:'ᵖ',q:'q',r:'ʳ',s:'ˢ',t:'ᵗ',u:'ᵘ',v:'ᵛ',w:'ʷ',x:'ˣ',y:'ʸ',z:'ᶻ','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
const FLIP=(()=>{ const n='abcdefghijklmnopqrstuvwxyz0123456789', f='ɐqɔpǝɟƃɥıɾʞlɯuodbɹsʇnʌʍxʎz0ƖᄅƐㄣϛ9ㄥ86', m={}; for(let i=0;i<n.length;i++) m[n[i]]=f[i]; return m; })();
function pigWord(w){ const m=w.match(/^([^a-zA-Z]*)([a-zA-Z]+)([^a-zA-Z]*)$/); if(!m) return w; const lead=m[1], core=m[2], tail=m[3]; if(/^[aeiouAEIOU]/.test(core)) return lead+core+'way'+tail; const c=core.match(/^[^aeiouAEIOU]+/)[0]; return lead+core.slice(c.length)+c.toLowerCase()+'ay'+tail; }
function hexToRgb(h){ const m=(h||'').trim().replace(/^#/,'').match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i); if(!m) return null; let x=m[1]; if(x.length===3) x=x.split('').map(c=>c+c).join(''); return [parseInt(x.slice(0,2),16),parseInt(x.slice(2,4),16),parseInt(x.slice(4,6),16)]; }
const toHex2=n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,'0');
function parseDate(s){ s=(s||'').trim(); const m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); const d=m?new Date(+m[1],+m[2]-1,+m[3]):new Date(s); return isNaN(d)?null:d; }
const LOREM='lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(' ');
function randHex(){ return '#'+Math.floor(Math.random()*16777215).toString(16).padStart(6,'0').toUpperCase(); }

export const TOOLS = [
  // ---- Text (15) ----
  { id:'word-counter', name:'Word Counter', emoji:'🔢', cat:'Text', desc:'Count words, characters, sentences and lines.', run:s=>{ const w=(s.trim().match(/\S+/g)||[]).length; const c=s.length; const cn=s.replace(/\s/g,'').length; const se=(s.match(/[.!?]+/g)||[]).length; const ln=s?s.split(/\n/).length:0; return `Words: ${w}\nCharacters: ${c}\nCharacters (no spaces): ${cn}\nSentences: ${se}\nLines: ${ln}`; } },
  { id:'character-counter', name:'Character Counter', emoji:'🔡', cat:'Text', desc:'Count characters with and without spaces.', run:s=>`With spaces: ${s.length}\nWithout spaces: ${s.replace(/\s/g,'').length}` },
  { id:'uppercase', name:'UPPERCASE', emoji:'🔠', cat:'Text', desc:'Convert text to UPPERCASE.', run:s=>s.toUpperCase() },
  { id:'lowercase', name:'lowercase', emoji:'🔟', cat:'Text', desc:'Convert text to lowercase.', run:s=>s.toLowerCase() },
  { id:'title-case', name:'Title Case', emoji:'🆎', cat:'Text', desc:'Capitalize The First Letter Of Each Word.', run:s=>s.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()) },
  { id:'sentence-case', name:'Sentence case', emoji:'✍️', cat:'Text', desc:'Capitalize the first letter of each sentence.', run:s=>s.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g,c=>c.toUpperCase()) },
  { id:'reverse-text', name:'Reverse Text', emoji:'🔄', cat:'Text', desc:'Reverse your text character by character.', run:s=>s.split('').reverse().join('') },
  { id:'reverse-words', name:'Reverse Word Order', emoji:'↩️', cat:'Text', desc:'Flip the order of the words.', run:s=>s.trim().split(/\s+/).reverse().join(' ') },
  { id:'remove-spaces', name:'Remove Extra Spaces', emoji:'🧹', cat:'Text', desc:'Collapse multiple spaces and trim.', run:s=>s.replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').trim() },
  { id:'remove-breaks', name:'Remove Line Breaks', emoji:'📏', cat:'Text', desc:'Turn line breaks into spaces.', run:s=>s.replace(/\s*\n\s*/g,' ').trim() },
  { id:'sort-lines', name:'Sort Lines A→Z', emoji:'🔤', cat:'Text', desc:'Sort each line alphabetically.', run:s=>s.split('\n').sort((a,b)=>a.localeCompare(b)).join('\n') },
  { id:'dedupe-lines', name:'Remove Duplicate Lines', emoji:'🗑️', cat:'Text', desc:'Keep only the first of each repeated line.', run:s=>[...new Set(s.split('\n'))].join('\n') },
  { id:'shuffle-lines', name:'Shuffle Lines', emoji:'🎴', cat:'Text', desc:'Randomly reorder the lines.', run:s=>{ const a=s.split('\n'); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a.join('\n'); } },
  { id:'number-lines', name:'Number the Lines', emoji:'🔢', cat:'Text', desc:'Add 1., 2., 3. before each line.', run:s=>s.split('\n').map((l,i)=>`${i+1}. ${l}`).join('\n') },
  { id:'count-vowels', name:'Count Vowels', emoji:'🅰️', cat:'Text', desc:'Count vowels and consonants.', run:s=>{ const v=(s.match(/[aeiou]/gi)||[]).length; const c=(s.match(/[bcdfghjklmnpqrstvwxyz]/gi)||[]).length; return `Vowels: ${v}\nConsonants: ${c}`; } },

  // ---- Format (10) ----
  { id:'slugify', name:'Slugify (URL)', emoji:'🔗', cat:'Format', desc:'Make a clean url-slug.', run:s=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') },
  { id:'snake-case', name:'snake_case', emoji:'🐍', cat:'Format', desc:'convert_text_like_this.', run:s=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'') },
  { id:'kebab-case', name:'kebab-case', emoji:'🍢', cat:'Format', desc:'convert-text-like-this.', run:s=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') },
  { id:'camel-case', name:'camelCase', emoji:'🐫', cat:'Format', desc:'convertTextLikeThis.', run:s=>{ const w=words(s); return w.map((x,i)=>i?x[0].toUpperCase()+x.slice(1).toLowerCase():x.toLowerCase()).join(''); } },
  { id:'constant-case', name:'CONSTANT_CASE', emoji:'🧱', cat:'Format', desc:'CONVERT_TEXT_LIKE_THIS.', run:s=>words(s).join('_').toUpperCase() },
  { id:'capitalize-first', name:'Capitalize First Letter', emoji:'⬆️', cat:'Format', desc:'Capitalize only the first letter.', run:s=>s.charAt(0).toUpperCase()+s.slice(1) },
  { id:'strikethrough', name:'S̶t̶r̶i̶k̶e̶t̶h̶r̶o̶u̶g̶h̶', emoji:'✂️', cat:'Format', desc:'Add strike-through to your text.', run:s=>s.split('').map(c=>c+'̶').join('') },
  { id:'bubble-text', name:'Ⓑⓤⓑⓑⓛⓔ Text', emoji:'🫧', cat:'Format', desc:'Turn text into bubble letters.', run:s=>s.replace(/[a-z]/g,c=>String.fromCodePoint(0x24D0+c.charCodeAt(0)-97)).replace(/[A-Z]/g,c=>String.fromCodePoint(0x24B6+c.charCodeAt(0)-65)).replace(/[1-9]/g,c=>String.fromCodePoint(0x2460+ +c-1)).replace(/0/g,'⓪') },
  { id:'wide-text', name:'Ｗｉｄｅ Text', emoji:'🌐', cat:'Format', desc:'Aesthetic full-width / vaporwave text.', run:s=>s.replace(/[!-~]/g,c=>String.fromCodePoint(0xFF01+c.charCodeAt(0)-33)).replace(/ /g,'　') },
  { id:'clap-text', name:'Clap 👏 Text', emoji:'👏', cat:'Format', desc:'Put 👏 between 👏 every 👏 word.', run:s=>s.trim().split(/\s+/).join(' 👏 ') },

  // ---- Encode (12) ----
  { id:'base64-encode', name:'Base64 Encode', emoji:'🔐', cat:'Encode', desc:'Encode text to Base64.', run:b64enc },
  { id:'base64-decode', name:'Base64 Decode', emoji:'🔓', cat:'Encode', desc:'Decode Base64 back to text.', run:b64dec },
  { id:'url-encode', name:'URL Encode', emoji:'🌍', cat:'Encode', desc:'Percent-encode text for URLs.', run:s=>{ try{ return encodeURIComponent(s); }catch(e){ return 'Could not encode'; } } },
  { id:'url-decode', name:'URL Decode', emoji:'🗺️', cat:'Encode', desc:'Decode percent-encoded text.', run:s=>{ try{ return decodeURIComponent(s); }catch(e){ return 'Invalid input'; } } },
  { id:'binary-encode', name:'Text → Binary', emoji:'1️⃣', cat:'Encode', desc:'Convert text to 0s and 1s.', run:s=>s.split('').map(c=>c.charCodeAt(0).toString(2).padStart(8,'0')).join(' ') },
  { id:'binary-decode', name:'Binary → Text', emoji:'0️⃣', cat:'Encode', desc:'Convert binary back to text.', run:s=>{ try{ return s.trim().split(/\s+/).map(b=>String.fromCharCode(parseInt(b,2))).join(''); }catch(e){ return 'Invalid binary'; } } },
  { id:'morse-encode', name:'Text → Morse', emoji:'📡', cat:'Encode', desc:'Encode to Morse code.', run:s=>s.toUpperCase().split('').map(c=>c===' '?'/':(MORSE[c]||'')).filter(x=>x!=='').join(' ') },
  { id:'morse-decode', name:'Morse → Text', emoji:'📶', cat:'Encode', desc:'Decode Morse code (use / for space).', run:s=>s.trim().split(/\s+/).map(t=>t==='/'?' ':(MORSE_REV[t]||'')).join('') },
  { id:'rot13', name:'ROT13', emoji:'🔁', cat:'Encode', desc:'Classic ROT13 letter cipher.', run:s=>s.replace(/[a-z]/gi,c=>String.fromCharCode((c<='Z'?90:122)>=(c.charCodeAt(0)+13)?c.charCodeAt(0)+13:c.charCodeAt(0)-13)) },
  { id:'caesar-cipher', name:'Caesar Cipher (+3)', emoji:'🏛️', cat:'Encode', desc:'Shift each letter by 3.', run:s=>s.replace(/[a-z]/gi,c=>{ const base=c<='Z'?65:97; return String.fromCharCode((c.charCodeAt(0)-base+3)%26+base); }) },
  { id:'leetspeak', name:'L33t Speak', emoji:'👾', cat:'Encode', desc:'Convert to 1337 / leetspeak.', run:s=>s.replace(/a/gi,'4').replace(/e/gi,'3').replace(/i/gi,'1').replace(/o/gi,'0').replace(/s/gi,'5').replace(/t/gi,'7') },
  { id:'hex-encode', name:'Text → Hex', emoji:'#️⃣', cat:'Encode', desc:'Convert text to hex codes.', run:s=>s.split('').map(c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join(' ') },

  // ---- Calc (6) ----
  { id:'temp-converter', name:'Temperature Converter', emoji:'🌡️', cat:'Calc', desc:'Type a number; see °C and °F.', placeholder:'e.g. 100', run:s=>{ const n=parseFloat(s); if(isNaN(n)) return 'Enter a number'; return `${n}°C = ${(n*9/5+32).toFixed(2)}°F\n${n}°F = ${((n-32)*5/9).toFixed(2)}°C`; } },
  { id:'tip-calculator', name:'Tip Calculator', emoji:'🧾', cat:'Calc', desc:'Type the bill; see tip amounts.', placeholder:'e.g. 48.50', run:s=>{ const b=parseFloat(s); if(isNaN(b)) return 'Enter the bill amount'; return [10,15,18,20].map(p=>`${p}% tip: $${(b*p/100).toFixed(2)}  (total $${(b*(1+p/100)).toFixed(2)})`).join('\n'); } },
  { id:'average-calculator', name:'Average Calculator', emoji:'📊', cat:'Calc', desc:'Enter numbers; get sum, average, min, max.', placeholder:'e.g. 4, 8, 15, 16, 23', run:s=>{ const n=(s.match(/-?\d+(\.\d+)?/g)||[]).map(Number); if(!n.length) return 'Enter some numbers'; const sum=n.reduce((a,b)=>a+b,0); return `Count: ${n.length}\nSum: ${sum}\nAverage: ${(sum/n.length).toFixed(2)}\nMin: ${Math.min(...n)}\nMax: ${Math.max(...n)}`; } },
  { id:'percentage', name:'Percentage Calculator', emoji:'💯', cat:'Calc', desc:'Enter two numbers x y → x% of y & x of y.', placeholder:'e.g. 20 80', run:s=>{ const n=(s.match(/-?\d+(\.\d+)?/g)||[]).map(Number); if(n.length<2) return 'Enter two numbers, e.g. "20 80"'; const [x,y]=n; return `${x}% of ${y} = ${(x/100*y)}\n${x} is ${(y?(x/y*100).toFixed(2):'∞')}% of ${y}`; } },
  { id:'roman-numeral', name:'Roman Numerals', emoji:'🏛️', cat:'Calc', desc:'Convert a number (1–3999) to Roman.', placeholder:'e.g. 2025', run:toRoman },
  { id:'number-to-words', name:'Number to Words', emoji:'🔢', cat:'Calc', desc:'Spell a number in English.', placeholder:'e.g. 1234', run:numWords },

  // ---- Fun / Random (7) ----
  { id:'magic-8-ball', name:'Magic 8-Ball', emoji:'🎱', cat:'Fun', desc:'Ask anything — get an answer.', gen:true, run:()=>pick(['It is certain ✅','Without a doubt 💯','Yes – definitely 👍','Most likely 🙂','Ask again later 🤔','Cannot predict now 🌫️','Don’t count on it 🙅','My reply is no ❌','Very doubtful 😬','Signs point to yes ✨']) },
  { id:'dice-roller', name:'Dice Roller', emoji:'🎲', cat:'Fun', desc:'Roll two six-sided dice.', gen:true, run:()=>{ const a=1+Math.floor(Math.random()*6), b=1+Math.floor(Math.random()*6); return `🎲 ${a}  🎲 ${b}   (total ${a+b})`; } },
  { id:'coin-flip', name:'Coin Flip', emoji:'🪙', cat:'Fun', desc:'Heads or tails?', gen:true, run:()=>pick(['🪙 Heads','🪙 Tails']) },
  { id:'random-number', name:'Random Number (1–100)', emoji:'🔢', cat:'Fun', desc:'Get a random number from 1 to 100.', gen:true, run:()=>'🎯 '+(1+Math.floor(Math.random()*100)) },
  { id:'random-emoji', name:'Random Emoji', emoji:'😀', cat:'Fun', desc:'Get a handful of random emojis.', gen:true, run:()=>{ const E=['😀','😎','🥳','🐶','🐱','🦊','🍕','🌈','🚀','⭐','🎮','🎨','🐉','🦄','🍩','⚡','🌸','🎧','🏆','💎']; return Array.from({length:6},()=>pick(E)).join(' '); } },
  { id:'random-color', name:'Random Color', emoji:'🎨', cat:'Fun', desc:'Get a random hex color.', gen:true, run:()=>{ const h='#'+Math.floor(Math.random()*16777215).toString(16).padStart(6,'0').toUpperCase(); return h; } },
  { id:'affirmation', name:'Daily Affirmation', emoji:'🌟', cat:'Fun', desc:'A little boost of positivity.', gen:true, run:()=>pick(['You are capable of amazing things 💜','Every day is a fresh start 🌅','You’ve got this! 💪','Your effort matters 🌟','Be proud of how far you’ve come ✨','Mistakes help you grow 🌱','You make the world brighter 🌈']) },

  // ================= 50 MORE TOOLS =================

  // ---- Text / analysis (7) ----
  { id:'reading-time', name:'Reading Time', emoji:'⏱️', cat:'Text', desc:'Estimate how long your text takes to read.', run:s=>{ const w=(s.trim().match(/\S+/g)||[]).length; const mins=w/200; const sec=Math.round(mins*60); return `${w} words\n~${mins<1?'<1':Math.round(mins)} min read  (about ${sec}s at 200 wpm)`; } },
  { id:'word-frequency', name:'Word Frequency', emoji:'📊', cat:'Text', desc:'See your most-used words.', run:s=>{ const w=(s.toLowerCase().match(/[a-z0-9']+/g)||[]); if(!w.length) return 'Enter some text'; const f={}; w.forEach(x=>f[x]=(f[x]||0)+1); return Object.entries(f).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=>`${v} × ${k}`).join('\n'); } },
  { id:'longest-word', name:'Longest Word', emoji:'📏', cat:'Text', desc:'Find the longest word in your text.', run:s=>{ const w=(s.match(/[A-Za-z']+/g)||[]); if(!w.length) return 'No words found'; const l=w.reduce((a,b)=>b.length>a.length?b:a); return `“${l}” (${l.length} letters)`; } },
  { id:'pig-latin', name:'Pig Latin', emoji:'🐷', cat:'Text', desc:'Translate text into Pig Latin.', run:s=>s.replace(/\S+/g,pigWord) },
  { id:'remove-punct', name:'Remove Punctuation', emoji:'🚫', cat:'Text', desc:'Strip out all punctuation marks.', run:s=>s.replace(/[^\p{L}\p{N}\s]/gu,'') },
  { id:'strip-html', name:'Remove HTML Tags', emoji:'🧼', cat:'Text', desc:'Strip HTML tags, keep the text.', run:s=>s.replace(/<[^>]*>/g,'').replace(/[ \t]+/g,' ').trim() },
  { id:'extract-emails', name:'Extract Emails', emoji:'📧', cat:'Text', desc:'Pull every email address out of the text.', run:s=>{ const m=s.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g); return m?[...new Set(m)].join('\n'):'No email addresses found'; } },

  // ---- Web / data (6) ----
  { id:'extract-urls', name:'Extract Links', emoji:'🔗', cat:'Web', desc:'Pull every URL out of the text.', run:s=>{ const m=s.match(/https?:\/\/[^\s<>"')]+/g); return m?[...new Set(m)].join('\n'):'No links found'; } },
  { id:'extract-numbers', name:'Extract Numbers', emoji:'🔢', cat:'Web', desc:'Pull all the numbers out of the text.', run:s=>{ const m=s.match(/-?\d[\d,]*(?:\.\d+)?/g); return m?m.join('\n'):'No numbers found'; } },
  { id:'extract-hashtags', name:'Extract Hashtags', emoji:'#️⃣', cat:'Web', desc:'Grab every #hashtag from the text.', run:s=>{ const m=s.match(/#[A-Za-z0-9_]+/g); return m?[...new Set(m)].join(' '):'No hashtags found'; } },
  { id:'json-format', name:'JSON Pretty Print', emoji:'🧩', cat:'Web', desc:'Format & indent messy JSON.', placeholder:'{"a":1,"b":[2,3]}', run:s=>{ try{ return JSON.stringify(JSON.parse(s),null,2); }catch(e){ return 'Invalid JSON: '+e.message; } } },
  { id:'html-encode', name:'HTML Encode', emoji:'📜', cat:'Web', desc:'Escape text for safe HTML.', run:s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') },
  { id:'html-decode', name:'HTML Decode', emoji:'📄', cat:'Web', desc:'Turn HTML entities back into text.', run:s=>s.replace(/&#39;/g,"'").replace(/&apos;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&') },

  // ---- Encode / cipher (6) ----
  { id:'rot47', name:'ROT47', emoji:'🔃', cat:'Encode', desc:'ROT47 cipher (letters, digits & symbols).', run:s=>s.replace(/[!-~]/g,c=>String.fromCharCode(33+(c.charCodeAt(0)-33+47)%94)) },
  { id:'atbash', name:'Atbash Cipher', emoji:'🔯', cat:'Encode', desc:'Mirror-alphabet cipher (a↔z, b↔y…).', run:s=>s.replace(/[a-z]/gi,c=>{ const base=c<='Z'?65:97; return String.fromCharCode(base+25-(c.charCodeAt(0)-base)); }) },
  { id:'nato-phonetic', name:'NATO Phonetic', emoji:'📻', cat:'Encode', desc:'Spell it out: Alpha Bravo Charlie…', run:s=>s.toUpperCase().split('').map(c=>NATO[c]||(c===' '?'/':'')).filter(Boolean).join(' ') },
  { id:'ascii-encode', name:'Text → ASCII Codes', emoji:'🔟', cat:'Encode', desc:'Character codes (decimal).', run:s=>Array.from(s).map(c=>c.codePointAt(0)).join(' ') },
  { id:'ascii-decode', name:'ASCII Codes → Text', emoji:'🔡', cat:'Encode', desc:'Turn decimal codes back into text.', placeholder:'72 105 33', run:s=>{ try{ return (s.trim().match(/\d+/g)||[]).map(n=>String.fromCodePoint(+n)).join(''); }catch(e){ return 'Invalid codes'; } } },
  { id:'unicode-escape', name:'Text → \\u Escapes', emoji:'⌨️', cat:'Encode', desc:'JavaScript-style \\uXXXX escapes.', run:s=>s.split('').map(c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')).join('') },

  // ---- Format / fancy text (10) ----
  { id:'mocking-case', name:'MoCkInG cAsE', emoji:'🧽', cat:'Format', desc:'aLtErNaTiNg SpOnGeBoB text.', run:s=>{ let i=0; return s.split('').map(ch=>{ if(/[a-z]/i.test(ch)){ const r=i%2?ch.toUpperCase():ch.toLowerCase(); i++; return r; } return ch; }).join(''); } },
  { id:'bold-unicode', name:'𝗕𝗼𝗹𝗱 Text', emoji:'🅱️', cat:'Format', desc:'Unicode bold that works anywhere.', run:s=>fancyMap(s,0x1D5D4,0x1D5EE,0x1D7EC) },
  { id:'italic-unicode', name:'𝘐𝘵𝘢𝘭𝘪𝘤 Text', emoji:'🎭', cat:'Format', desc:'Unicode italic that works anywhere.', run:s=>fancyMap(s,0x1D608,0x1D622,0) },
  { id:'script-unicode', name:'𝓒𝓾𝓻𝓼𝓲𝓿𝓮 Text', emoji:'✒️', cat:'Format', desc:'Fancy cursive / script letters.', run:s=>fancyMap(s,0x1D4D0,0x1D4EA,0) },
  { id:'monospace-unicode', name:'Ｍｏｎｏ Text', emoji:'⌗', cat:'Format', desc:'Unicode monospace letters.', run:s=>fancyMap(s,0x1D670,0x1D68A,0x1D7F6) },
  { id:'small-caps', name:'ꜱᴍᴀʟʟ ᴄᴀᴘꜱ', emoji:'🔤', cat:'Format', desc:'Turn text into tiny small-caps.', run:s=>s.toLowerCase().split('').map(c=>SMALLCAPS[c]||c).join('') },
  { id:'upside-down', name:'Upside-Down', emoji:'🙃', cat:'Format', desc:'Flip your text ┴ǝsdn.', run:s=>s.toLowerCase().split('').map(c=>FLIP[c]||c).reverse().join('') },
  { id:'superscript', name:'ˢᵘᵖᵉʳ Text', emoji:'⤴️', cat:'Format', desc:'Turn text into tiny superscript.', run:s=>s.toLowerCase().split('').map(c=>SUPER[c]||c).join('') },
  { id:'underline-text', name:'U̲n̲d̲e̲r̲l̲i̲n̲e̲', emoji:'📉', cat:'Format', desc:'Add an underline to every character.', run:s=>s.split('').map(c=>c+'̲').join('') },
  { id:'squared-text', name:'🅂🅀🅄🄰🅁🄴🄳', emoji:'🔲', cat:'Format', desc:'Boxy squared letters.', run:s=>s.toUpperCase().split('').map(c=>c>='A'&&c<='Z'?String.fromCodePoint(0x1F130+c.charCodeAt(0)-65):c).join('') },

  // ---- Calc / numbers (8) ----
  { id:'prime-check', name:'Prime Checker', emoji:'🧮', cat:'Calc', desc:'Is your number prime?', placeholder:'e.g. 97', run:s=>{ const n=parseInt(s,10); if(isNaN(n)||n<0) return 'Enter a whole number ≥ 0'; if(n<2) return `${n} is not prime`; for(let i=2;i*i<=n;i++) if(n%i===0) return `${n} is not prime (divisible by ${i})`; return `${n} is prime ✅`; } },
  { id:'factorial', name:'Factorial (n!)', emoji:'❗', cat:'Calc', desc:'Compute n! exactly.', placeholder:'e.g. 20', run:s=>{ const n=parseInt(s,10); if(isNaN(n)||n<0) return 'Enter a whole number ≥ 0'; if(n>2000) return 'Keep it ≤ 2000 please!'; let r=1n; for(let i=2n;i<=BigInt(n);i++) r*=i; return `${n}! = ${r.toString()}`; } },
  { id:'fibonacci', name:'Fibonacci Sequence', emoji:'🌀', cat:'Calc', desc:'First N Fibonacci numbers.', placeholder:'e.g. 12', run:s=>{ const n=parseInt(s,10); if(isNaN(n)||n<1) return 'Enter how many terms (≥ 1)'; if(n>200) return 'Keep it ≤ 200 terms!'; let a=0n,b=1n,out=[]; for(let i=0;i<n;i++){ out.push(a.toString()); [a,b]=[b,a+b]; } return out.join(', '); } },
  { id:'gcd-lcm', name:'GCD & LCM', emoji:'➗', cat:'Calc', desc:'Greatest common divisor & least common multiple.', placeholder:'e.g. 12 18', run:s=>{ const n=nums(s).map(x=>Math.abs(Math.round(x))).filter(x=>x>0); if(n.length<2) return 'Enter two whole numbers, e.g. "12 18"'; const g=(a,b)=>b?g(b,a%b):a; const G=n.reduce((a,b)=>g(a,b)); const L=n.reduce((a,b)=>a/g(a,b)*b); return `GCD = ${G}\nLCM = ${L}`; } },
  { id:'base-converter', name:'Number Base Converter', emoji:'🔢', cat:'Calc', desc:'Decimal → binary, octal & hex.', placeholder:'e.g. 255', run:s=>{ const n=parseInt(s,10); if(isNaN(n)) return 'Enter a whole number'; return `Binary: ${n.toString(2)}\nOctal: ${n.toString(8)}\nHex: ${n.toString(16).toUpperCase()}`; } },
  { id:'percent-change', name:'Percentage Change', emoji:'📈', cat:'Calc', desc:'From an old value to a new one.', placeholder:'old new  e.g. 80 100', run:s=>{ const n=nums(s); if(n.length<2) return 'Enter old & new, e.g. "80 100"'; const [o,v]=n; if(o===0) return 'Old value can’t be 0'; const p=(v-o)/o*100; return `${p>=0?'+':''}${p.toFixed(2)}%  (${p>=0?'increase':'decrease'})`; } },
  { id:'discount-calc', name:'Discount Calculator', emoji:'🏷️', cat:'Calc', desc:'Price after a % off.', placeholder:'price %  e.g. 60 25', run:s=>{ const n=nums(s); if(n.length<2) return 'Enter price & percent, e.g. "60 25"'; const [p,d]=n; const save=p*d/100; return `You save $${save.toFixed(2)}\nFinal price: $${(p-save).toFixed(2)}`; } },
  { id:'median-mode', name:'Median & Mode', emoji:'📐', cat:'Calc', desc:'Middle value and most common value.', placeholder:'e.g. 3, 5, 5, 7, 9', run:s=>{ const n=nums(s).sort((a,b)=>a-b); if(!n.length) return 'Enter some numbers'; const mid=Math.floor(n.length/2); const med=n.length%2?n[mid]:(n[mid-1]+n[mid])/2; const f={}; n.forEach(x=>f[x]=(f[x]||0)+1); const mx=Math.max(...Object.values(f)); const mode=Object.keys(f).filter(k=>f[k]===mx); return `Median: ${med}\nMode: ${mx===1?'no repeats':mode.join(', ')+' (×'+mx+')'}`; } },

  // ---- Time & date (5) ----
  { id:'days-between', name:'Days Between Dates', emoji:'📅', cat:'Time', desc:'Count the days between two dates.', placeholder:'2024-01-01 to 2025-01-01', run:s=>{ const parts=s.split(/\s+to\s+|,|\n/).map(x=>x.trim()).filter(Boolean); if(parts.length<2) return 'Enter two dates, e.g. "2024-01-01 to 2025-01-01"'; const a=parseDate(parts[0]), b=parseDate(parts[1]); if(!a||!b) return 'Couldn’t read those dates (try YYYY-MM-DD)'; const d=Math.round(Math.abs(b-a)/86400000); return `${d} day${d===1?'':'s'} apart\n(${(d/7).toFixed(1)} weeks · ${(d/365).toFixed(2)} years)`; } },
  { id:'age-calc', name:'Age Calculator', emoji:'🎂', cat:'Time', desc:'How old are you (or anything)?', placeholder:'your birthday e.g. 2000-06-15', run:s=>{ const b=parseDate(s); if(!b) return 'Enter a date, e.g. 2000-06-15'; const now=new Date(); if(b>now) return 'That date is in the future!'; let y=now.getFullYear()-b.getFullYear(), m=now.getMonth()-b.getMonth(), d=now.getDate()-b.getDate(); if(d<0){ m--; d+=new Date(now.getFullYear(),now.getMonth(),0).getDate(); } if(m<0){ y--; m+=12; } const days=Math.floor((now-b)/86400000); return `${y} years, ${m} months, ${d} days\n(that’s ${days.toLocaleString()} days!)`; } },
  { id:'countdown', name:'Countdown to Date', emoji:'⏳', cat:'Time', desc:'How long until a future date?', placeholder:'e.g. 2026-12-25', run:s=>{ const t=parseDate(s); if(!t) return 'Enter a date, e.g. 2026-12-25'; const now=new Date(); const ms=t-now; if(ms<0) return 'That date has already passed!'; const d=Math.floor(ms/86400000), h=Math.floor(ms/3600000)%24, mi=Math.floor(ms/60000)%60; return `${d} days, ${h} hours, ${mi} minutes to go! 🎉`; } },
  { id:'seconds-to-hms', name:'Seconds → H:M:S', emoji:'⏰', cat:'Time', desc:'Turn seconds into hours:minutes:seconds.', placeholder:'e.g. 3725', run:s=>{ const t=parseInt(s,10); if(isNaN(t)||t<0) return 'Enter a number of seconds'; const h=Math.floor(t/3600), m=Math.floor(t/60)%60, sec=t%60; const pad=x=>String(x).padStart(2,'0'); return `${pad(h)}:${pad(m)}:${pad(sec)}\n(${h}h ${m}m ${sec}s)`; } },
  { id:'day-of-week', name:'Day of the Week', emoji:'🗓️', cat:'Time', desc:'What weekday is any date?', placeholder:'e.g. 2026-07-04', run:s=>{ const d=parseDate(s); if(!d) return 'Enter a date, e.g. 2026-07-04'; return d.toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'}); } },

  // ---- Color (4) ----
  { id:'hex-to-rgb', name:'HEX → RGB', emoji:'🎨', cat:'Color', desc:'Convert a hex color to RGB.', placeholder:'#4f8cff', run:s=>{ const r=hexToRgb(s); return r?`rgb(${r[0]}, ${r[1]}, ${r[2]})`:'Enter a hex color like #4f8cff'; } },
  { id:'rgb-to-hex', name:'RGB → HEX', emoji:'🖌️', cat:'Color', desc:'Convert RGB values to a hex color.', placeholder:'79, 140, 255', run:s=>{ const n=nums(s); if(n.length<3) return 'Enter three numbers, e.g. "79, 140, 255"'; return '#'+toHex2(n[0])+toHex2(n[1])+toHex2(n[2]); } },
  { id:'complementary-color', name:'Complementary Color', emoji:'🌗', cat:'Color', desc:'Find the opposite color on the wheel.', placeholder:'#4f8cff', run:s=>{ const r=hexToRgb(s); if(!r) return 'Enter a hex color like #4f8cff'; const c='#'+toHex2(255-r[0])+toHex2(255-r[1])+toHex2(255-r[2]); return `Complement: ${c.toUpperCase()}`; } },
  { id:'random-gradient', name:'Random Gradient', emoji:'🌈', cat:'Color', desc:'Get a fresh CSS gradient.', gen:true, run:()=>{ const a=randHex(), b=randHex(), deg=Math.floor(Math.random()*360); return `${a} → ${b}\n\nbackground: linear-gradient(${deg}deg, ${a}, ${b});`; } },

  // ---- Random / generators (4) ----
  { id:'uuid-gen', name:'UUID Generator', emoji:'🆔', cat:'Random', desc:'Generate a random UUID v4.', gen:true, run:()=>{ if(typeof crypto!=='undefined'&&crypto.randomUUID) return crypto.randomUUID(); return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{ const r=Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16); }); } },
  { id:'lorem-ipsum', name:'Lorem Ipsum', emoji:'📝', cat:'Random', desc:'Generate placeholder text (type a word count).', placeholder:'e.g. 40', run:s=>{ let n=parseInt(s,10); if(isNaN(n)||n<1) n=30; n=Math.min(n,300); let out=[]; for(let i=0;i<n;i++) out.push(pick(LOREM)); let t=out.join(' '); return t.charAt(0).toUpperCase()+t.slice(1)+'.'; } },
  { id:'team-picker', name:'Team Picker', emoji:'🧑‍🤝‍🧑', cat:'Random', desc:'Split a list into two fair teams.', placeholder:'Ava, Ben, Cara, Dan…', run:s=>{ const p=s.split(/[,\n]/).map(x=>x.trim()).filter(Boolean); if(p.length<2) return 'Enter at least two names (comma or line separated)'; for(let i=p.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [p[i],p[j]]=[p[j],p[i]]; } const h=Math.ceil(p.length/2); return `Team A: ${p.slice(0,h).join(', ')}\nTeam B: ${p.slice(h).join(', ')}`; } },
  { id:'pick-winner', name:'Pick a Winner', emoji:'🏆', cat:'Random', desc:'Randomly choose one from your list.', placeholder:'pizza, tacos, sushi…', run:s=>{ const p=s.split(/[,\n]/).map(x=>x.trim()).filter(Boolean); if(!p.length) return 'Enter some options (comma or line separated)'; return '🏆 '+pick(p); } },
];
