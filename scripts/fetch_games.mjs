// Fetch real Scratch projects (the same source the catalogue already uses) and
// append them to games.json as working turbowarp-embed games. Dedups by project id.
import { readFileSync, writeFileSync } from 'fs';
const TARGET = Number(process.env.TARGET || 10000);
const QUERIES = (process.env.QUERIES || 'platformer,adventure,puzzle,racing,shooter,rpg,maze,jump,dodge,clicker,tycoon,simulator,arcade,tower defense,parkour,run,catch,snake,quiz,dress up,cooking,animal,dog,cat,pixel,ninja,robot,space,car,bike,soccer,basketball,fighting,survival,escape,fly,music,art,pet,farm,fish,dragon,candy,ball,rocket,zombie,magic,hero,city,island,jungle,ocean,winter,fashion,paint,draw,type,math,word,memory,color,flappy,geometry,minecraft,roblox,sonic,mario,pokemon,among us,fnf,idle,merge,match,bounce,slide,tap,click,fun,game,cool,best').split(',');
const MAXOFF = Number(process.env.MAXOFF || 200); // per-query pages (offset step 40)
const DELAY = Number(process.env.DELAY || 120);

const g = JSON.parse(readFileSync('./fun-games/games.json','utf8'));
const idOf = e => { const m = (e.embed||'').match(/turbowarp\.org\/(\d+)/); return m?m[1]:null; };
const have = new Set(g.map(idOf).filter(Boolean));
const startCount = g.length;
console.log('start:', startCount, '| existing ids:', have.size, '| target:', TARGET);

const sleep = ms => new Promise(r=>setTimeout(r,ms));
let added = 0, reqs = 0, fails = 0;

outer:
for(const q of QUERIES){
  for(let off=0; off<=MAXOFF; off+=40){
    if(g.length >= TARGET) break outer;
    const url = `https://api.scratch.mit.edu/search/projects?limit=40&offset=${off}&language=en&mode=popular&q=${encodeURIComponent(q.trim())}`;
    let arr=null;
    for(let retry=0; retry<3 && !arr; retry++){
      try{
        const r = await fetch(url, {headers:{'User-Agent':'Mozilla/5.0'}});
        if(r.status===429){ await sleep(1500); continue; }
        if(!r.ok){ break; }
        arr = await r.json();
      }catch(e){ await sleep(400); }
    }
    reqs++;
    if(!Array.isArray(arr)){ fails++; if(fails>40){ console.log('too many failures, stopping'); break outer; } continue; }
    if(arr.length===0) break; // no more for this query
    for(const p of arr){
      const id=String(p.id);
      if(have.has(id)) continue;
      const title=(p.title||'Untitled').toString().slice(0,90);
      have.add(id);
      g.push({ title, thumbnail:`https://cdn2.scratch.mit.edu/get_image/project/${id}_480x360.png`, embed:`https://turbowarp.org/${id}/embed` });
      added++;
      if(g.length>=TARGET) break;
    }
    if(reqs % 20 === 0){ console.log(`  …${reqs} reqs, +${added} games (total ${g.length})`); writeFileSync('./fun-games/games.json', JSON.stringify(g,null,2)); }
    await sleep(DELAY);
  }
}
writeFileSync('./fun-games/games.json', JSON.stringify(g,null,2));
console.log(`DONE: +${added} games, total now ${g.length} (reqs ${reqs}, fails ${fails})`);
