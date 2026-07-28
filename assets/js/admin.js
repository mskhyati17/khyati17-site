import { Auth } from './auth.js';

// Owner/admin login IDs. Any of these (signed in with the admin password)
// can add stories to the story hub and games to the GameZone.
const ADMIN_IDS = ['mskhyati.17@gmail.com','mskhyati17@gmail.com'];

async function isAdmin(){
  try{
    const u = await Auth.currentUser();
    if(!u) return false;
    return ADMIN_IDS.includes(u.email) || ADMIN_IDS.includes(u.id);
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

// Escapes text for safe use as HTML content (story paragraphs, byline).
// `&` must be escaped first — otherwise it would double-escape the entities
// the later replacements just inserted.
function escapeAttr(s){
  return String(s)
    .replace(/&/g, '\x26amp\x3B')
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
      <h3>Add Story</h3>
      <label>Title<br/><input id="admin-story-title"/></label><br/>
      <label>Description<br/><input id="admin-story-excerpt"/></label><br/>
      <label>Story text file (.txt)<br/><input id="admin-story-file" type="file" accept=".txt,text/plain"/></label><br/>
      <p style="font-size:0.9em;color:#666">
        Write your story in a plain .txt file first — leave a blank line between paragraphs — then choose it here. The story appears as a normal page on the site (readers can't edit it); there's no separate slug or link to manage.
      </p>
      <button id="admin-add-story" class="btn">Add story</button>
      <div id="admin-story-msg" style="color:#7a2a9b;margin-top:8px"></div>
    `);
    root.appendChild(form);
    document.getElementById('admin-add-story').addEventListener('click', async ()=>{
      const msgEl = document.getElementById('admin-story-msg');
      const title = document.getElementById('admin-story-title').value.trim();
      const excerpt = document.getElementById('admin-story-excerpt').value.trim();
      const fileInput = document.getElementById('admin-story-file');
      const file = fileInput.files && fileInput.files[0];
      if(!title){ msgEl.textContent = 'Please enter a title'; return; }
      if(!file){ msgEl.textContent = 'Please choose a .txt file with your story'; return; }
      msgEl.textContent = 'Reading file…';
      try{
        const text = await file.text();
        if(!text.trim()){ msgEl.textContent = 'That file looks empty'; return; }
        const slug = (title.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-+|-+$)/g,'') || 'story') + '-' + Date.now().toString(36);
        const body = textFileToStoryBody(text, 'Khyati Srivastava');
        const payload = { title, slug, excerpt, body, created_at: new Date().toISOString() };
        await addStory(payload);
        msgEl.textContent = 'Story added!';
        location.reload();
      }catch(e){ msgEl.textContent = 'Failed: '+(e.message||e); }
    });
    return;
  }
}

// Converts a plain-text file's contents into the same paragraph-based HTML
// every other story on the site uses (byline + one <p> per paragraph),
// instead of embedding an external, publicly-editable Google Doc — a reader
// landing on the story page now sees a normal, read-only page like any
// other, not something they can click into and edit.
function textFileToStoryBody(text, author){
  const byline = `<p style='color:#6a4b8f;font-style:italic;margin-bottom:18px'>By ${escapeAttr(author)}</p>`;
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${escapeAttr(p).replace(/\n/g, '<br>')}</p>`);
  return byline + (paragraphs.join('') || `<p>${escapeAttr(text.trim())}</p>`);
}

export { isAdmin, ADMIN_IDS };
export default { mountAdminUI, isAdmin, ADMIN_IDS };
