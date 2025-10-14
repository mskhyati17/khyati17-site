// Shared comments logic: fetch, post, edit, and render
import { Auth, supabase as SUPABASE } from './auth.js';

export async function fetchComments(contentType, contentId){
  try{
    if(window.supabase){
      const { data, error } = await window.supabase.from('comments').select('*').eq('content_type', contentType).eq('content_id', contentId).order('created_at', {ascending:false});
      if(error) throw error;
      return data;
    }
    const key = 'khyati_comments';
    const map = JSON.parse(localStorage.getItem(key) || '[]');
    return map.filter(c=>c.content_type===contentType && c.content_id===contentId).sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
  }catch(e){ console.error('fetchComments error', e); return []; }
}

export async function postComment(contentType, contentId, body){
  try{
    const user = await Auth.currentUser();
    if(!user) throw new Error('Not authenticated');
    if(window.supabase){
      const r = await window.supabase.from('comments').insert([{ user_id: user.id, content_type: contentType, content_id: contentId, body }]);
      if(r.error) throw r.error; return r.data[0];
    }else{
      const payload = { user_id: user.id || user.email, user_email: user.email, content_type: contentType, content_id: contentId, body, created_at: new Date().toISOString(), display_name: user.metadata?.first_name || user.metadata?.name || user.email };
      const key = 'khyati_comments'; const list = JSON.parse(localStorage.getItem(key) || '[]'); list.push(payload); localStorage.setItem(key, JSON.stringify(list)); return payload;
    }
  }catch(e){ console.error('postComment error', e); throw e }
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
