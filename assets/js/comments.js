// Shared comments logic: fetch, post, edit, and render
import { Auth, supabase as SUPABASE } from './auth.js';

function localComments(contentType, contentId){
  try{
    const map = JSON.parse(localStorage.getItem('khyati_comments') || '[]');
    return map.filter(c=>c.content_type===contentType && c.content_id===contentId).sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
  }catch(e){ return []; }
}

export async function fetchComments(contentType, contentId){
  if(window.supabase){
    try{
      const { data, error } = await window.supabase.from('comments').select('*').eq('content_type', contentType).eq('content_id', contentId).order('created_at', {ascending:false});
      if(error) throw error;
      return data || [];
    }catch(e){ console.warn('fetchComments supabase failed, using local', e); return localComments(contentType, contentId); }
  }
  return localComments(contentType, contentId);
}

function saveLocalComment(user, contentType, contentId, body){
  const payload = { user_id: user.id || user.email, user_email: user.email, content_type: contentType, content_id: contentId, body, created_at: new Date().toISOString(), display_name: user.metadata?.first_name || user.metadata?.name || user.email };
  const key = 'khyati_comments'; const list = JSON.parse(localStorage.getItem(key) || '[]'); list.push(payload); localStorage.setItem(key, JSON.stringify(list)); return payload;
}

export async function postComment(contentType, contentId, body){
  const user = await Auth.currentUser();
  if(!user) throw new Error('Not authenticated');
  if(window.supabase){
    try{
      const r = await window.supabase.from('comments').insert([{ user_id: user.id, content_type: contentType, content_id: contentId, body }]).select();
      if(r.error) throw r.error;
      return (r.data && r.data[0]) || { body };
    }catch(e){
      // If the backend rejects (e.g. table/RLS not set up), don't lose the
      // comment — fall back to saving it locally so posting always works.
      console.warn('postComment supabase failed, saving locally', e);
      return saveLocalComment(user, contentType, contentId, body);
    }
  }
  return saveLocalComment(user, contentType, contentId, body);
}

function esc(s){ return String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

// Render a comment form into wrapperEl. Shows a textarea + Post button when the
// visitor is signed in, otherwise a friendly "sign in to comment" prompt.
// After a successful post it refreshes the list rendered in listEl.
export async function renderCommentForm(wrapperEl, contentType, contentId, listEl){
  if(!wrapperEl) return;
  // Wait for auth to settle, but never hang on it — cap the wait so the form
  // always renders even if AuthReady stalls.
  if(window.AuthReady){ try{ await Promise.race([window.AuthReady, new Promise(r=>setTimeout(r,2000))]); }catch(e){} }
  wrapperEl.innerHTML = '';
  let user = null;
  try{ user = await Auth.currentUser(); }catch(e){ user = null; }

  if(!user){
    wrapperEl.innerHTML = '<p style="color:#5b3a78">Please <a href="/admin/login.html" style="color:#6a1b9a;font-weight:700">sign in</a> to add a comment.</p>';
    return;
  }

  const name = user.metadata?.first_name || user.metadata?.name || user.email || 'You';
  const form = document.createElement('div');
  form.innerHTML =
    '<textarea id="cmt-body" rows="3" placeholder="Write a comment…" style="width:100%;padding:10px;border:1px solid #d9c7ee;border-radius:8px;font-family:inherit;font-size:.95rem;box-sizing:border-box"></textarea>' +
    '<div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">' +
      '<span style="font-size:12px;color:#6a4b8f">Signed in as ' + esc(name) + '</span>' +
      '<button id="cmt-post" type="button" style="background:linear-gradient(90deg,#6a1b9a,#9c4dcc);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-weight:600;cursor:pointer">Post comment</button>' +
    '</div>' +
    '<div id="cmt-msg" style="color:#b00020;font-size:.85rem;margin-top:6px"></div>';
  wrapperEl.appendChild(form);

  const btn = wrapperEl.querySelector('#cmt-post');
  btn.addEventListener('click', async ()=>{
    const ta = wrapperEl.querySelector('#cmt-body');
    const msg = wrapperEl.querySelector('#cmt-msg');
    const body = (ta.value || '').trim();
    if(!body){ msg.textContent = 'Comment cannot be empty.'; return; }
    btn.disabled = true; msg.textContent = '';
    try{
      await postComment(contentType, contentId, body);
      ta.value = '';
      const comments = await fetchComments(contentType, contentId);
      if(listEl) renderCommentsInto(listEl, comments);
    }catch(e){ msg.textContent = 'Failed to post: ' + (e.message || e); }
    finally{ btn.disabled = false; }
  });
}

export function renderCommentsInto(containerEl, comments){
  containerEl.innerHTML = '';
  if(!comments || comments.length === 0){ containerEl.innerHTML = '<p style="color:#5b3a78">No comments yet.</p>'; return; }
  comments.forEach(c=>{
    const d = document.createElement('div'); d.style.borderTop = '1px solid rgba(106,27,154,0.06)'; d.style.padding = '8px 0';
    const who = document.createElement('div'); who.style.fontWeight='700'; who.style.color='#4a2370'; who.textContent = c.display_name || (c.user_email || 'Anonymous');
    const when = document.createElement('div'); when.style.fontSize='12px'; when.style.color='#6a4b8f'; when.textContent = new Date(c.created_at || c.created || Date.now()).toLocaleString();
    const body = document.createElement('div'); body.style.marginTop='6px'; body.textContent = c.body;
    d.appendChild(who); d.appendChild(when); d.appendChild(body);
    containerEl.appendChild(d);
  });
}
