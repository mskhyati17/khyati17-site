// Verify Random Team Picker: every name is preserved across teams (no drops,
// no duplicates), team count is respected, sizes are balanced, and it's
// listed in the AI Zone.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8342,r));
const base='http://localhost:8342';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/ai-tools/team-picker.html`,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForFunction(()=>!!window.__teamPicker,{timeout:8000});

  console.log('\n[1] 9 names into 3 teams: every name preserved exactly once');
  const names9=['Ava','Noah','Mia','Leo','Zoe','Sam','Kai','Isla','Theo'];
  await p.evaluate(n=>window.__teamPicker.setNames(n), names9);
  await p.evaluate(()=>window.__teamPicker.setTeamCount(3));
  const teams=await p.evaluate(()=>window.__teamPicker.shuffle());
  (teams.length===3) ? pass('3 teams created') : fail('got '+teams.length+' teams');
  const flat=teams.flat();
  const allPresent=names9.every(n=>flat.includes(n)) && flat.length===names9.length;
  allPresent ? pass('all 9 names present exactly once, no drops/dupes') : fail('mismatch: '+flat.join(','));
  const sizes=teams.map(t=>t.length).sort();
  (sizes[0]===3 && sizes[2]===3) ? pass('perfectly balanced 3/3/3') : fail('sizes: '+sizes.join(','));

  console.log('\n[2] Uneven split (10 names, 3 teams) stays balanced within 1');
  const names10=names9.concat(['Rio']);
  await p.evaluate(n=>window.__teamPicker.setNames(n), names10);
  const teams2=await p.evaluate(()=>window.__teamPicker.shuffle());
  const sizes2=teams2.map(t=>t.length).sort();
  (sizes2[2]-sizes2[0]<=1 && teams2.flat().length===10) ? pass('sizes balanced within 1: '+sizes2.join(',')) : fail('unbalanced: '+sizes2.join(','));

  console.log('\n[3] Team count more than names clamps sensibly (2 names, 5 teams requested)');
  await p.evaluate(n=>window.__teamPicker.setNames(n), ['Only','Two']);
  await p.evaluate(()=>window.__teamPicker.setTeamCount(5));
  const teams3=await p.evaluate(()=>window.__teamPicker.shuffle());
  (teams3.flat().length===2 && teams3.length<=2) ? pass('clamped to '+teams3.length+' team(s), both names present') : fail('got '+JSON.stringify(teams3));

  console.log('\n[4] Shuffling twice can reorder (not the same output every time)');
  await p.evaluate(n=>window.__teamPicker.setNames(n), names9);
  await p.evaluate(()=>window.__teamPicker.setTeamCount(3));
  const run1=await p.evaluate(()=>window.__teamPicker.shuffle());
  let differed=false;
  for(let i=0;i<8 && !differed;i++){
    const run2=await p.evaluate(()=>window.__teamPicker.shuffle());
    if(JSON.stringify(run2)!==JSON.stringify(run1)) differed=true;
  }
  differed ? pass('shuffle produces different arrangements') : fail('shuffle looks deterministic/stuck');

  console.log('\n[5] In the AI Zone');
  await p.goto(`${base}/ai-tools/index.html`,{waitUntil:'networkidle',timeout:20000}); await p.waitForTimeout(600);
  const labels=await p.$$eval('#grid .card .label', e=>e.map(x=>x.textContent.trim()));
  labels.some(l=>/Random Team Picker/.test(l)) ? pass('Random Team Picker card in AI Zone') : fail('not in AI Zone');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Team Picker checks passed'); process.exit(0);
