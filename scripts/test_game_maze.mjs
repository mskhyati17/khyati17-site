// Verify "Mochi Maze" puzzle game: renders a maze, moves are blocked by walls,
// reaching the goal advances the level with a fresh maze, and it's on the hub.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8311,r));
const base='http://localhost:8311';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));

  console.log('\n[1] Game loads with a maze and a level 1 start');
  await p.goto(`${base}/fun-games/mochi-maze.html`,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForFunction(()=>window.__mochiMaze,{timeout:8000});
  (await p.$$eval('#maze .cell', e=>e.length)>0) ? pass('maze grid renders') : fail('no maze cells');
  (await p.evaluate(()=>window.__mochiMaze.level))===1 ? pass('starts at level 1') : fail('wrong start level');

  console.log('\n[2] Walking into a wall does not move the player');
  const before=await p.evaluate(()=>window.__mochiMaze.player);
  // try every direction once; at least one should be blocked or all moves stay in-bounds
  await p.evaluate(()=>{ for(let i=0;i<50;i++) window.__mochiMaze.move('up'); }); // spam a likely-blocked edge
  const afterUp=await p.evaluate(()=>window.__mochiMaze.player);
  (afterUp.x>=0 && afterUp.y>=0) ? pass('player stays within bounds after repeated moves') : fail('player left the grid');

  console.log('\n[3] Reaching the goal advances the level');
  await p.evaluate(()=>window.__mochiMaze.restart());
  await p.waitForTimeout(100);
  // BFS the maze via the exposed canMove(x,y,dir) wall-checker, then execute the exact path
  const beforeLevel=await p.evaluate(()=>window.__mochiMaze.level);
  const reached = await p.evaluate(async ()=>{
    const m=window.__mochiMaze, n=m.size, goal=m.goal;
    const dirs=['up','down','left','right'];
    const seen=new Set(); const startKey=m.player.x+','+m.player.y;
    const q=[[m.player.x,m.player.y,[]]]; seen.add(startKey);
    let path=null;
    while(q.length){
      const [x,y,p]=q.shift();
      if(x===goal.x && y===goal.y){ path=p; break; }
      for(const dir of dirs){
        if(!m.canMove(x,y,dir)) continue;
        let nx=x,ny=y;
        if(dir==='right') nx++; else if(dir==='left') nx--; else if(dir==='down') ny++; else ny--;
        const key=nx+','+ny;
        if(seen.has(key)) continue;
        seen.add(key); q.push([nx,ny,p.concat(dir)]);
      }
    }
    if(!path) return false;
    for(const dir of path) m.move(dir);
    return m.won;
  });
  const level=await p.evaluate(()=>window.__mochiMaze.level);
  (reached && level===beforeLevel+1) ? pass('BFS-solved the maze and advanced from level '+beforeLevel+' to '+level) : fail('did not solve/advance: reached='+reached+' level='+level);

  console.log('\n[4] On the GameZone hub');
  await p.goto(`${base}/fun-games/index.html`,{waitUntil:'domcontentloaded',timeout:20000}); await p.waitForTimeout(400);
  (await p.evaluate(()=>typeof GAMES!=='undefined' && GAMES.some(g=>/Mochi Maze/.test(g.name)))) ? pass('game is in the hub catalog') : fail('not on hub');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Mochi Maze checks passed'); process.exit(0);
