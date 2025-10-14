document.addEventListener('DOMContentLoaded', ()=>{
  const listContainer = document.getElementById('games-list-container');
  const player = document.getElementById('games-player-iframe');
  const playerWrapper = document.getElementById('player-area');
  const closeBtn = document.getElementById('player-close');

  if(!listContainer || !player) return;

  function flashPlayer(){
    if(!playerWrapper) return;
    playerWrapper.classList.remove('player-flash');
    // trigger reflow
    void playerWrapper.offsetWidth;
    playerWrapper.classList.add('player-flash');
  }

  function loadGame(url){
    if(!player) return;
    player.src = url;
    flashPlayer();
    // bring into view for smaller screens
    playerWrapper && playerWrapper.scrollIntoView({behavior:'smooth',block:'center'});
    // load comments for this content: prefer canonical game.id when available
    const contentId = player.getAttribute('data-content-id') || url.split('/').pop();
    loadComments('game', contentId);
  }

  async function fetchGames(){
    try{
      // If supabase client is available, fetch from public.games
      if(window.supabase){
        const { data, error } = await window.supabase.from('games').select('*').order('created_at', {ascending:true});
        if(error) throw error;
        return data;
      }
      const res = await fetch('/assets/data/games.json', {cache: 'no-store'});
      if(!res.ok) throw new Error('Failed to fetch games.json: ' + res.status);
      return await res.json();
    }catch(err){
      console.error(err);
      return [];
    }
  }

  function clearSelection(){
    const prev = listContainer.querySelectorAll('.game-item');
    prev.forEach(p=>p.classList.remove('selected'));
  }

  function selectItem(el){
    if(!el) return;
    clearSelection();
    el.classList.add('selected');
    const src = el.getAttribute('data-src');
    loadGame(src);
  }

  function makeItem(game, isFirst){
    const div = document.createElement('div');
    div.className = 'game-item';
    if(isFirst) div.classList.add('selected');
  const src = game.embed || game.src || '';
  div.setAttribute('data-src', src);
  // store canonical content id (prefer game.id)
  if(game.id) div.setAttribute('data-content-id', game.id);

    const img = document.createElement('img');
    img.className = 'mini';
    img.loading = 'lazy';
    img.src = game.thumbnail || '';
  // keep alt empty since we don't show titles
  img.alt = '';

  const meta = document.createElement('div');
  // show title if provided, otherwise show the project id
  if(game.title){
    const label = document.createElement('div');
    label.style.fontSize = '14px';
    label.style.fontWeight = '600';
    label.style.color = '#332244';
    label.textContent = game.title;
    meta.appendChild(label);
  }
  const idline = document.createElement('div');
  idline.style.fontSize = '12px';
  idline.style.color = '#6a4b8f';
  idline.textContent = game.title ? ('') : (game.id ? ('Project ' + game.id) : '');
  meta.appendChild(idline);

    div.appendChild(img);
    div.appendChild(meta);

    div.addEventListener('click', ()=> selectItem(div));
    return div;
  }

  // render list from JSON
  (async ()=>{
    const games = await fetchGames();
    if(!games || games.length === 0){
      listContainer.innerHTML = '<p>No games found. Add entries to <code>assets/data/games.json</code>.</p>';
      return;
    }

    games.forEach((g, idx)=>{
      const item = makeItem(g, idx===0);
      listContainer.appendChild(item);
    });

    // auto-load first
    const first = listContainer.querySelector('.game-item');
    if(first){
      selectItem(first);
      // ensure player iframe has the content id attribute set when selected
      const src = first.getAttribute('data-src');
      const cid = first.getAttribute('data-content-id') || src.split('/').pop();
      player.setAttribute('data-content-id', cid);
    }
  })();

  // --- Comments support ---
  const commentsListEl = document.getElementById('comments-list');
  const commentFormWrapper = document.getElementById('comment-form-wrapper');

  function renderComments(comments){
    if(!commentsListEl) return;
    commentsListEl.innerHTML = '';
    if(!comments || comments.length === 0){ commentsListEl.innerHTML = '<p style="color:#5b3a78">No comments yet.</p>'; return; }
    comments.forEach(c=>{
      const d = document.createElement('div');
      d.style.borderTop = '1px solid rgba(106,27,154,0.06)';
      d.style.padding = '8px 0';
      const who = document.createElement('div'); who.style.fontWeight='700'; who.style.color='#4a2370'; who.textContent = c.display_name || (c.user_email || 'Anonymous');
      const when = document.createElement('div'); when.style.fontSize='12px'; when.style.color='#6a4b8f'; when.textContent = new Date(c.created_at || c.created || Date.now()).toLocaleString();
      const body = document.createElement('div'); body.style.marginTop='6px'; body.textContent = c.body;
      // allow editing if this comment belongs to the current user
      const editWrap = document.createElement('div'); editWrap.style.marginTop = '6px';
      (async ()=>{
        try{
          const u = await window.Auth.currentUser();
          const uid = u && (u.id || u.email);
          if(uid && (c.user_id === uid || c.user_id === (u.email))){
            const editBtn = document.createElement('button'); editBtn.textContent = 'Edit'; editBtn.className = 'btn'; editBtn.style.marginLeft='8px';
            editBtn.addEventListener('click', ()=>{
              // replace body with an editable textarea
              const ta = document.createElement('textarea'); ta.value = c.body; ta.style.width='100%'; ta.rows = 3; ta.style.marginTop='6px';
              const save = document.createElement('button'); save.textContent = 'Save'; save.className = 'btn'; save.style.marginLeft='8px';
              const cancel = document.createElement('button'); cancel.textContent = 'Cancel'; cancel.className = 'btn btn-ghost'; cancel.style.marginLeft='8px';
              editWrap.innerHTML = '';
              editWrap.appendChild(ta); editWrap.appendChild(save); editWrap.appendChild(cancel);
              save.addEventListener('click', async ()=>{
                const newBody = ta.value.trim();
                if(!newBody) return alert('Comment cannot be empty');
                try{
                  // attempt update via supabase if available
                  if(window.supabase){
                    const r = await window.supabase.from('comments').update({ body: newBody }).eq('id', c.id);
                    if(r.error) throw r.error;
                  }else{
                    // localStorage fallback: update the entry
                    const key = 'khyati_comments'; const list = JSON.parse(localStorage.getItem(key)||'[]');
                    const idx = list.findIndex(x=>x.created_at===c.created_at && (x.user_id===c.user_id || x.user_email===c.user_email));
                    if(idx!==-1){ list[idx].body = newBody; localStorage.setItem(key, JSON.stringify(list)); }
                  }
                  const refreshed = await fetchComments('game', contentId);
                  renderComments(refreshed);
                }catch(e){ alert('Failed to update comment: ' + (e.message||e)); }
              });
              cancel.addEventListener('click', ()=>{ renderComments(comments); });
            });
            editWrap.appendChild(editBtn);
          }
        }catch(e){ /* ignore */ }
      })();
      d.appendChild(who); d.appendChild(when); d.appendChild(body);
      d.appendChild(editWrap);
      commentsListEl.appendChild(d);
    });
  }

  async function fetchComments(contentType, contentId){
    // If Supabase is available via Auth, use REST endpoint; otherwise use localStorage demo
    try{
      if(window.Auth && window.Auth.isSupabase){
        // Use the Supabase REST endpoint via the client if available
        // We'll try to use the supabase client if exposed on window (auth.js creates it locally)
        if(window.supabase){
          const { data, error } = await window.supabase.from('comments').select('*').eq('content_type', contentType).eq('content_id', contentId).order('created_at', {ascending:false});
          if(error) throw error;
          return data;
        } else {
          // fallback to REST endpoint using fetch (assumes anon key and url accessible)
          const res = await fetch(`/rest/v1/comments?content_type=eq.${encodeURIComponent(contentType)}&content_id=eq.${encodeURIComponent(contentId)}&order=created_at.desc`);
          if(!res.ok) throw new Error('Failed to fetch comments');
          return await res.json();
        }
      }else{
        const key = 'khyati_comments';
        const map = JSON.parse(localStorage.getItem(key) || '[]');
        return map.filter(c=>c.content_type===contentType && c.content_id===contentId).sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
      }
    }catch(e){ console.error('fetchComments error', e); return []; }
  }

  async function postComment(contentType, contentId, body){
    try{
      const user = await window.Auth.currentUser();
      if(!user) throw new Error('Not authenticated');
      const payload = { user_id: user.id || user.email, content_type: contentType, content_id: contentId, body, created_at: new Date().toISOString(), display_name: user.metadata?.first_name || user.metadata?.name || user.metadata?.username || user.email };
      if(window.Auth && window.Auth.isSupabase){
        if(window.supabase){
          const r = await window.supabase.from('comments').insert([{ user_id: user.id, content_type: contentType, content_id: contentId, body }]);
          if(r.error) throw r.error;
          return r.data[0];
        } else {
          const res = await fetch('/rest/v1/comments', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ user_id: user.id, content_type: contentType, content_id: contentId, body }) });
          if(!res.ok) throw new Error('Failed to post comment');
          return await res.json();
        }
      }else{
        const key = 'khyati_comments';
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        list.push(payload);
        localStorage.setItem(key, JSON.stringify(list));
        return payload;
      }
    }catch(e){ console.error('postComment error', e); throw e }
  }

  async function loadComments(contentType, contentId){
    const comments = await fetchComments(contentType, contentId);
  // wait for Auth to finish initializing if present to avoid false 'not logged in' states
  if(window.AuthReady) try{ await window.AuthReady }catch(e){/* ignore */}
  renderComments(comments);
  renderCommentForm(contentType, contentId);
  }

  async function renderCommentForm(contentType, contentId){
    if(!commentFormWrapper) return;
    commentFormWrapper.innerHTML = '';
    const form = document.createElement('div');
    try{
        // ensure Auth finished initializing
        if(window.AuthReady) try{ await window.AuthReady }catch(e){/* ignore */}
        const user = await window.Auth.currentUser();
      if(!user){
        form.innerHTML = `<p>Please login to add your comment. Thanks!</p>`;
        commentFormWrapper.appendChild(form); return;
      }
      form.innerHTML = `
        <textarea id="comment-body" rows="3" style="width:100%;padding:8px;border:1px solid rgba(106,27,154,0.08);border-radius:6px"></textarea>
        <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center"><div style="font-size:12px;color:#6a4b8f">Signed in as ${escapeHtml(user.metadata?.first_name || user.metadata?.name || user.email)}</div><div><button id="post-comment-btn" class="btn">Post comment</button></div></div>
      `;
      commentFormWrapper.appendChild(form);
      const btn = document.getElementById('post-comment-btn');
      btn && btn.addEventListener('click', async ()=>{
        const body = document.getElementById('comment-body').value.trim();
        if(!body) return alert('Comment cannot be empty');
        try{
          await postComment(contentType, contentId, body);
          document.getElementById('comment-body').value = '';
          const comments = await fetchComments(contentType, contentId);
          renderComments(comments);
        }catch(e){ alert('Failed to post comment: ' + (e.message || e)); }
      });
    }catch(e){ form.innerHTML = `<p>Please login to add your comment. Thanks!</p>`; commentFormWrapper.appendChild(form); }
  }

  // close button if present (for older UI where player opens)
  if(closeBtn){
    closeBtn.addEventListener('click', ()=>{
      player.src = '';
      playerWrapper && playerWrapper.classList.remove('active');
    });
  }

});
