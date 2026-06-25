// 50 client-side mini AI tools. Each: { id, name, emoji, cat, desc, gen?, run(input)->string }
// Rendered by tool.html and listed in the AI Zone. All run in the browser.
const MORSE={A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..','0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.','.':'.-.-.-',',':'--..--','?':'..--..','!':'-.-.--','/':'-..-.','-':'-....-','@':'.--.-.'};
const MORSE_REV=Object.fromEntries(Object.entries(MORSE).map(([k,v])=>[v,k]));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const words=s=>(s.match(/[A-Za-z0-9]+/g)||[]);
function b64enc(s){ try{ return btoa(unescape(encodeURIComponent(s))); }catch(e){ return 'Could not encode'; } }
function b64dec(s){ try{ return decodeURIComponent(escape(atob(s.trim()))); }catch(e){ return 'Invalid Base64'; } }
function toRoman(x){ let n=parseInt(x,10); if(isNaN(n)||n<1||n>3999) return 'Enter a whole number 1–3999'; const m=[['M',1000],['CM',900],['D',500],['CD',400],['C',100],['XC',90],['L',50],['XL',40],['X',10],['IX',9],['V',5],['IV',4],['I',1]]; let r=''; for(const [s,v] of m){ while(n>=v){ r+=s; n-=v; } } return r; }
function numWords(x){ let num=parseInt(x,10); if(isNaN(num)) return 'Enter a whole number'; if(num===0) return 'zero'; if(Math.abs(num)>999999999999) return 'Too big!'; const o=['','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'],t=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety']; const ch=n=>{ let s=''; if(n>=100){ s+=o[Math.floor(n/100)]+' hundred'; n%=100; if(n)s+=' '; } if(n>=20){ s+=t[Math.floor(n/10)]; n%=10; if(n)s+='-'+o[n]; } else if(n>0) s+=o[n]; return s; }; let neg=num<0; num=Math.abs(num); const sc=['','thousand','million','billion']; let p=[],i=0; while(num>0){ const c=num%1000; if(c)p.unshift(ch(c)+(sc[i]?' '+sc[i]:'')); num=Math.floor(num/1000); i++; } return (neg?'negative ':'')+p.join(' '); }

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
];
