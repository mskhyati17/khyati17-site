// Health-check every GameZone game: dead links, missing files, JS errors,
// broken sub-resources, and (for Scratch embeds) whether the project still exists.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const projectDir = join(__dirname, '..');

// --- parse the GAMES array from the hub (each game is one line) ---
const hub = readFileSync(join(projectDir, 'fun-games', 'index.html'), 'utf8');
const GAMES = [];
for (const line of hub.split('\n')) {
  const nm = line.match(/name:\s*"([^"]+)"/);
  const url = line.match(/url:\s*"([^"]+)"/);
  if (nm && url) GAMES.push({ name: nm[1], url: url[1] });
}

const MIME={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.wav':'audio/wav','.mp3':'audio/mpeg','.woff':'font/woff','.woff2':'font/woff2'};
const server=createServer((req,res)=>{let f=decodeURIComponent(join(projectDir,req.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{res.writeHead(404);res.end('Not Found');return;}}res.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});res.end(readFileSync(f));});
await new Promise(r=>server.listen(8136,r));
const base='http://localhost:8136';

async function scratchOk(id){
  try{ const r=await fetch(`https://api.scratch.mit.edu/projects/${id}`,{signal:AbortSignal.timeout(12000)});
    if(r.status!==200) return {ok:false, why:`API ${r.status}`};
    const d=await r.json(); if(d && d.id) return {ok:true, vis:d.visibility||'?'}; return {ok:false, why:'no data'};
  }catch(e){ return {ok:false, why:'fetch failed'}; }
}

async function canvasHash(page){
  return page.evaluate(()=>{ const c=document.querySelector('canvas'); if(!c) return null;
    try{ const ctx=c.getContext('2d'); if(!ctx) return 'webgl'; const w=Math.min(c.width||300,200),h=Math.min(c.height||150,200); const d=ctx.getImageData(0,0,w,h).data; let s=0; for(let i=0;i<d.length;i+=503) s=(s+d[i])%999983; return s; }catch(e){ return 'err'; }
  });
}

const results=[];
const browser=await chromium.launch({headless:true});
try{
  for(const g of GAMES){
    if(/scratch\.mit\.edu/.test(g.url)){
      const id=(g.url.match(/projects\/(\d+)/)||[])[1];
      const r=await scratchOk(id);
      results.push({name:g.name, kind:'Scratch', url:g.url, verdict: r.ok?'OK':'BROKEN', detail: r.ok?`project live (${r.vis})`:`project unavailable (${r.why})`});
      continue;
    }
    // local file
    const filePath=join(projectDir, g.url.split('?')[0].replace(/\/$/,'/index.html'));
    if(!existsSync(filePath)){ results.push({name:g.name, kind:'Local', url:g.url, verdict:'BROKEN', detail:'file not found on disk'}); continue; }
    const page=await browser.newPage();
    const pageErrs=[]; const badRes=[];
    page.on('pageerror',e=>pageErrs.push(e.message.split('\n')[0]));
    page.on('response',res=>{ const u=res.url(); if(res.status()>=400 && u.startsWith(base)) badRes.push(`${res.status()} ${u.replace(base,'')}`); });
    let docStatus=0;
    try{ const resp=await page.goto(`${base}${g.url}`,{waitUntil:'load',timeout:20000}); docStatus=resp?resp.status():0; }
    catch(e){ pageErrs.push('navigation: '+e.message.split('\n')[0]); }
    await page.waitForTimeout(2500);
    // liveness probe for canvas games
    let live=null;
    const before=await canvasHash(page).catch(()=>null);
    if(typeof before==='number'){
      try{ const c=await page.$('canvas'); const box=c&&await c.boundingBox(); if(box){ await page.mouse.click(box.x+box.width/2, box.y+box.height/2); } }catch(e){}
      for(const k of ['Space','ArrowUp','ArrowRight','Enter']){ try{ await page.keyboard.press(k); }catch(e){} }
      await page.waitForTimeout(1300);
      const after=await canvasHash(page).catch(()=>null);
      live = (typeof after==='number') ? (after!==before) : null;
    }
    const hasCanvas = (await page.$('canvas'))!==null;
    let verdict='OK', detail=[];
    if(docStatus>=400){ verdict='BROKEN'; detail.push('page '+docStatus); }
    else {
      if(pageErrs.length){ verdict='LIKELY BROKEN'; detail.push('JS error: '+pageErrs[0]); }
      if(badRes.length){ verdict= verdict==='OK'?'LIKELY BROKEN':verdict; detail.push('missing asset: '+badRes[0]); }
      if(verdict==='OK'){
        if(hasCanvas && live===true) detail.push('canvas responds to input');
        else if(hasCanvas && live===false) detail.push('canvas present but no visible response to input');
        else if(hasCanvas) detail.push('canvas present (WebGL/uncheckable)');
        else detail.push('loads, no errors (DOM game)');
      }
    }
    results.push({name:g.name, kind:'Local', url:g.url, verdict, detail:detail.join('; ')});
    await page.close();
  }
} finally { await browser.close(); server.close(); }

const order={'BROKEN':0,'LIKELY BROKEN':1,'OK':2};
results.sort((a,b)=>order[a.verdict]-order[b.verdict]);
console.log('\n================ GAME HEALTH REPORT ('+GAMES.length+' games) ================');
for(const r of results){ const tag=r.verdict==='OK'?'✅ OK          ':r.verdict==='BROKEN'?'❌ BROKEN      ':'⚠  LIKELY BROKEN'; console.log(`${tag} | ${r.name.padEnd(22)} | ${r.detail}`); }
const broken=results.filter(r=>r.verdict!=='OK');
console.log('\nSummary: '+(GAMES.length-broken.length)+' OK, '+broken.length+' need attention');
