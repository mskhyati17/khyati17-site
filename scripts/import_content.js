/*
  Small Node import script to upsert local JSON content into Supabase using the upsert helpers.

  Usage:
    - Set environment variables SUPABASE_URL and SUPABASE_KEY (service role or anon depending on needs)
    - node scripts/import_content.js
*/
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;
if(!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_KEY env vars');
const supabase = createClient(url, key);

async function importGames(){
  const p = path.resolve('assets/data/games.json');
  if(!fs.existsSync(p)){ console.log('games.json not found at', p); return; }
  const data = JSON.parse(fs.readFileSync(p,'utf8'));
  for(const g of data){
    const title = g.title || null;
    const embed = g.embed || g.src || null;
    const src = g.src || null;
    const thumb = g.thumbnail || null;
    const meta = g.metadata || {};
    // Call the SQL upsert function
    const { data:res, error } = await supabase.rpc('upsert_game', { _title: title, _embed: embed, _src: src, _thumbnail: thumb, _metadata: meta });
    if(error) console.error('upsert_game error', error);
    else console.log('upsert_game ->', res);
  }
}

async function importVideos(){
  // Example: you might have assets/data/videos.json with objects { title, video_id, embed, thumbnail }
  const p = path.resolve('assets/data/videos.json');
  if(!fs.existsSync(p)){ console.log('videos.json not found at', p); return; }
  const data = JSON.parse(fs.readFileSync(p,'utf8'));
  for(const v of data){
    const { data:res, error } = await supabase.rpc('upsert_video', { _title: v.title || null, _video_id: v.video_id || null, _embed: v.embed || null, _thumbnail: v.thumbnail || null, _metadata: v.metadata || {} });
    if(error) console.error('upsert_video error', error);
    else console.log('upsert_video ->', res);
  }
}

async function importStories(){
  const p = path.resolve('assets/data/stories.json');
  if(!fs.existsSync(p)){ console.log('stories.json not found at', p); return; }
  const data = JSON.parse(fs.readFileSync(p,'utf8'));
  for(const s of data){
    const { data:res, error } = await supabase.rpc('upsert_story', { _title: s.title || null, _slug: s.slug || null, _body: s.body || null, _excerpt: s.excerpt || null, _metadata: s.metadata || {} });
    if(error) console.error('upsert_story error', error);
    else console.log('upsert_story ->', res);
  }
}

(async ()=>{
  try{
    await importGames();
    await importVideos();
    await importStories();
  }catch(e){ console.error(e); process.exit(1); }
})();
