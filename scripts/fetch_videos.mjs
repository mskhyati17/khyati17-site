// Grow the Videos gallery from the SAME channels the curated 50 videos come from
// (already-vetted, kid-friendly sources) — fetch each channel's recent uploads via
// YouTube's keyless RSS, filter titles for safety, dedup, and append.
import { readFileSync, writeFileSync } from 'fs';
const src = readFileSync('./videos/videos-data.js','utf8');
const existingIds = new Set([...src.matchAll(/id:"([\w-]{11})"/g)].map(m=>m[1]));
const seedIds = [...existingIds];
const sleep = ms=>new Promise(r=>setTimeout(r,ms));
const BAD=/\b(sex|sexy|nude|naked|porn|xxx|kill|gore|blood|drug|weed|gun|onlyfans|nsfw|18\+|hot girl|twerk|hentai|slur)\b/i;
function classify(t){ const s=(t||'').toLowerCase();
  if(/dog|cat|puppy|kitten|animal|pet|panda|fox|bird|penguin/.test(s)) return 'Animals';
  if(/asmr|satisfy|kinetic|slime|soap|relax/.test(s)) return 'Satisfying';
  if(/soccer|football|goal|messi|ronaldo/.test(s)) return 'Soccer';
  if(/basketball|nba|dunk|sport|skate|parkour/.test(s)) return 'Sports';
  if(/magic|trick|illusion/.test(s)) return 'Magic';
  if(/science|experiment|space|physics|chem/.test(s)) return 'Science';
  if(/food|cook|recipe|cake|bake|kitchen/.test(s)) return 'Food';
  if(/art|draw|paint|craft|diy/.test(s)) return 'Art';
  if(/hack|tip|life ?hack/.test(s)) return 'Life Hacks';
  return 'More';
}
// Phase 1: channel IDs from seed videos' watch pages
const channels = new Set();
let wf=0;
for(const id of seedIds){
  if(channels.size>=60 || wf>=70) break;
  try{ const html = await (await fetch('https://www.youtube.com/watch?v='+id,{headers:{'User-Agent':'Mozilla/5.0'}})).text();
    const m = html.match(/"channelId":"(UC[\w-]{22})"/); if(m) channels.add(m[1]);
  }catch(e){}
  wf++; await sleep(120);
}
console.log('discovered channels:', channels.size, '(from '+wf+' watch pages)');
// Phase 2: each channel's RSS
const added=[]; let cf=0;
for(const ch of channels){
  try{ const xml = await (await fetch('https://www.youtube.com/feeds/videos.xml?channel_id='+ch)).text();
    const author = (xml.match(/<name>([^<]+)<\/name>/)||[])[1] || 'YouTube';
    const entries = [...xml.matchAll(/<entry>[\s\S]*?<yt:videoId>([\w-]{11})<\/yt:videoId>[\s\S]*?<title>([^<]+)<\/title>[\s\S]*?<\/entry>/g)];
    for(const [,vid,title] of entries){
      if(existingIds.has(vid)) continue; if(BAD.test(title)) continue;
      existingIds.add(vid); added.push({ id:vid, title:title.slice(0,90).replace(/"/g,"'"), channel:author.slice(0,50).replace(/"/g,"'"), cat:classify(title) });
    }
  }catch(e){}
  cf++; await sleep(150);
}
console.log('new videos gathered:', added.length, '(from '+cf+' channel feeds)');
// Phase 3: append to videos-data.js (before the closing ];)
if(added.length){
  const block = added.map(v=>`  { id:"${v.id}", title:"${v.title}", channel:"${v.channel}", cat:"${v.cat}" },`).join('\n');
  const out = src.replace(/\n\];\s*$/, '\n'+block+'\n];\n');
  writeFileSync('./videos/videos-data.js', out);
  console.log('wrote videos-data.js — new total ~', existingIds.size);
}
