// Expand the videos gallery further: BFS-discover more channels starting from the
// channels of the already-added videos (staying near the vetted kid neighbourhood),
// fetch each channel's RSS, strict safety title-filter, dedup, append.
import { readFileSync, writeFileSync } from 'fs';
const TARGET = Number(process.env.TARGET || 3000);
const MAXCH = Number(process.env.MAXCH || 300);
const src = readFileSync('./videos/videos-data.js','utf8');
const existingIds = new Set([...src.matchAll(/id:"([\w-]{11})"/g)].map(m=>m[1]));
const seedVideoIds = [...existingIds];
const sleep = ms=>new Promise(r=>setTimeout(r,ms));
const BAD=/\b(sex|sexy|nude|naked|porn|xxx|kill|killed|gore|blood|bloody|murder|drug|weed|vape|gun|shoot|onlyfans|nsfw|18\+|hot girl|twerk|hentai|creepy|scary|horror|died|death|suicide|gambl|casino|bet)\b/i;
function classify(t){ const s=(t||'').toLowerCase();
  if(/dog|cat|puppy|kitten|animal|pet|panda|fox|bird|penguin|bunny|hamster/.test(s)) return 'Animals';
  if(/asmr|satisfy|kinetic|slime|soap|relax|calm/.test(s)) return 'Satisfying';
  if(/soccer|football|goal|messi|ronaldo/.test(s)) return 'Soccer';
  if(/basketball|nba|dunk|sport|skate|parkour|gymnast/.test(s)) return 'Sports';
  if(/magic|trick|illusion/.test(s)) return 'Magic';
  if(/science|experiment|space|physics|chem|how it/.test(s)) return 'Science';
  if(/food|cook|recipe|cake|bake|kitchen|candy|choco/.test(s)) return 'Food';
  if(/art|draw|paint|craft|diy|origami|lego/.test(s)) return 'Art';
  if(/hack|tip|life ?hack|trick/.test(s)) return 'Life Hacks';
  return 'More';
}
const channels = new Set();
// Phase 1: channels from a sample of existing videos' watch pages (+ related channels)
let wf=0;
for(const id of seedVideoIds){
  if(channels.size>=MAXCH || wf>=Math.min(seedVideoIds.length,200)) break;
  try{ const html = await (await fetch('https://www.youtube.com/watch?v='+id,{headers:{'User-Agent':'Mozilla/5.0'}})).text();
    for(const m of html.matchAll(/"channelId":"(UC[\w-]{22})"/g)){ channels.add(m[1]); if(channels.size>=MAXCH) break; }
  }catch(e){}
  wf++; await sleep(90);
}
console.log('channels discovered:', channels.size, '(from '+wf+' watch pages)');
// Phase 2: each channel's RSS
const added=[]; let cf=0;
for(const ch of channels){
  if(existingIds.size + added.length >= TARGET) break;
  try{ const xml = await (await fetch('https://www.youtube.com/feeds/videos.xml?channel_id='+ch)).text();
    const author=(xml.match(/<name>([^<]+)<\/name>/)||[])[1]||'YouTube';
    for(const [,vid,title] of xml.matchAll(/<entry>[\s\S]*?<yt:videoId>([\w-]{11})<\/yt:videoId>[\s\S]*?<title>([^<]+)<\/title>[\s\S]*?<\/entry>/g)){
      if(existingIds.has(vid)||BAD.test(title)) continue;
      existingIds.add(vid); added.push({id:vid,title:title.slice(0,90).replace(/"/g,"'"),channel:author.slice(0,50).replace(/"/g,"'"),cat:classify(title)});
    }
  }catch(e){}
  cf++; if(cf%25===0) console.log('  …'+cf+' channels, +'+added.length+' videos'); await sleep(110);
}
console.log('new videos:', added.length, '(from '+cf+' channels)');
if(added.length){
  const block = added.map(v=>`  { id:"${v.id}", title:"${v.title}", channel:"${v.channel}", cat:"${v.cat}" },`).join('\n');
  writeFileSync('./videos/videos-data.js', src.replace(/\n\];\s*$/, '\n'+block+'\n];\n'));
  console.log('wrote videos-data.js — total ~'+existingIds.size);
}
