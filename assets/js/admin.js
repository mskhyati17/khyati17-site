import { Auth } from './auth.js';

const ADMIN_EMAIL = 'mskhyati.17@gmail.com';

async function isAdmin(){
  try{
    const u = await Auth.currentUser();
    return !!(u && (u.email === ADMIN_EMAIL || u.id === ADMIN_EMAIL));
  }catch(e){ return false }
}

async function addGame(payload){
  if(window.supabase){
    const r = await window.supabase.from('games').insert([payload]);
    if(r.error) throw r.error; return r.data[0];
  }
  // local fallback
  const key = 'khyati_games_admin'; const list = JSON.parse(localStorage.getItem(key)||'[]'); list.push(payload); localStorage.setItem(key, JSON.stringify(list)); return payload;
}

async function addVideo(payload){
  if(window.supabase){
    const r = await window.supabase.from('videos').insert([payload]);
    if(r.error) throw r.error; return r.data[0];
  }
  const key = 'khyati_videos_admin'; const list = JSON.parse(localStorage.getItem(key)||'[]'); list.push(payload); localStorage.setItem(key, JSON.stringify(list)); return payload;
}

async function addStory(payload){
  if(window.supabase){
    const r = await window.supabase.from('stories').insert([payload]);
    if(r.error) throw r.error; return r.data[0];
  }
  const key = 'khyati_stories_admin'; const list = JSON.parse(localStorage.getItem(key)||'[]'); list.push(payload); localStorage.setItem(key, JSON.stringify(list)); return payload;
}

function el(tag,attrs={},inner=''){ const e=document.createElement(tag); for(const k in attrs) e.setAttribute(k, attrs[k]); if(typeof inner === 'string') e.innerHTML=inner; else if(inner) e.appendChild(inner); return e }

// Helper to escape attribute values (used for embedding Google Doc URL into iframe src)
function escapeAttr(s){
  return String(s)
    .replace(/\x22/g, '\x26quot\x3B')
    .replace(/\x27/g, '\x26#39\x3B')
    .replace(/</g, '\x26lt\x3B')
    .replace(/>/g, '\x26gt\x3B');
}

export async function mountAdminUI(page){
  if(!(await isAdmin())) return; // not admin — nothing to render
  const root = document.getElementById('admin-area');
  if(!root) return;
  root.innerHTML = '';
  if(page === 'games'){
    const form = el('div',{},`
      <h3>Add Game</h3>
      <label>Title<br/><input id="admin-game-title"/></label><br/>
      <label>Embed URL<br/><input id="admin-game-embed"/></label><br/>
      <label>Thumbnail URL<br/><input id="admin-game-thumb"/></label><br/>
      <button id="admin-add-game" class="btn">Add game</button>
      <div id="admin-game-msg" style="color:#7a2a9b;margin-top:8px"></div>
    `);
    root.appendChild(form);
    document.getElementById('admin-add-game').addEventListener('click', async ()=>{
      const title = document.getElementById('admin-game-title').value.trim();
      const embed = document.getElementById('admin-game-embed').value.trim();
      const thumb = document.getElementById('admin-game-thumb').value.trim();
      const payload = { title, embed, thumbnail: thumb, created_at: new Date().toISOString() };
      try{ await addGame(payload); document.getElementById('admin-game-msg').textContent = 'Game added'; location.reload(); }catch(e){ document.getElementById('admin-game-msg').textContent = 'Failed: '+(e.message||e); }
    });
    return;
  }
  if(page === 'videos'){
    const form = el('div',{},`
      <h3>Add Video</h3>
      <label>Title<br/><input id="admin-video-title"/></label><br/>
      <label>Video Link (YouTube URL or any video page URL)<br/><input id="admin-video-link" placeholder="e.g. https://www.youtube.com/watch?v=..."/></label><br/>
      <label>Thumbnail URL<br/><input id="admin-video-thumb"/></label><br/>
      <button id="admin-add-video" class="btn">Add video</button>
      <div id="admin-video-msg" style="color:#7a2a9b;margin-top:8px"></div>
    `);
    root.appendChild(form);
    document.getElementById('admin-add-video').addEventListener('click', async ()=>{
      const title = document.getElementById('admin-video-title').value.trim();
      const link = document.getElementById('admin-video-link').value.trim();
      const thumb = document.getElementById('admin-video-thumb').value.trim();
      // Convert YouTube watch URL to embed URL automatically
      let embed = link;
      if(link.includes('youtube.com/watch?v=') || link.includes('youtu.be/')){
        const m = link.match(/(?:v=|youtu\.be\/)([\w-]+)/);
        if(m) embed = 'https://www.youtube.com/embed/' + m[1];
      }
      const payload = { title, embed, link, thumbnail: thumb, created_at: new Date().toISOString() };
      try{ await addVideo(payload); document.getElementById('admin-video-msg').textContent = 'Video added'; location.reload(); }catch(e){ document.getElementById('admin-video-msg').textContent = 'Failed: '+(e.message||e); }
    });
    return;
  }
  if(page === 'stories'){
    const form = el('div',{},`
      <h3>Add Story (Google Doc)</h3>
      <label>Title<br/><input id="admin-story-title"/></label><br/>
      <label>Slug (unique id)<br/><input id="admin-story-slug"/></label><br/>
      <label>Excerpt / Short description<br/><input id="admin-story-excerpt"/></label><br/>
      <label>Google Doc Embed URL<br/><input id="admin-story-doc-url" placeholder="e.g. https://docs.google.com/document/d/e/.../pub"/></label><br/>
      <p style="font-size:0.9em;color:#666">
        To publish a Google Doc: File → Share → Publish to web → Embed → copy the <iframe> src URL (the URL inside the src attribute).
      </p>
      <button id="admin-add-story" class="btn">Add story</button>
      <div id="admin-story-msg" style="color:#7a2a9b;margin-top:8px"></div>
    `);
    root.appendChild(form);
    document.getElementById('admin-add-story').addEventListener('click', async ()=>{
      const title = document.getElementById('admin-story-title').value.trim();
      const slug = document.getElementById('admin-story-slug').value.trim();
      const excerpt = document.getElementById('admin-story-excerpt').value.trim();
      const docUrl = document.getElementById('admin-story-doc-url').value.trim();
      if(!slug){ document.getElementById('admin-story-msg').textContent='Slug required'; return; }
      // Build the story body as an iframe embed of the Google Doc
      const body = docUrl ? `<iframe src="${escapeAttr(docUrl)}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>` : '';
      const payload = { title, slug, excerpt, body, doc_url: docUrl, created_at: new Date().toISOString() };
      try{ await addStory(payload); document.getElementById('admin-story-msg').textContent = 'Story added'; location.reload(); }catch(e){ document.getElementById('admin-story-msg').textContent = 'Failed: '+(e.message||e); }
    });
    return;
  }
}

export default { mountAdminUI };
