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
  }

  async function fetchGames(){
    try{
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
    div.setAttribute('data-src', game.embed || game.src || '');

    const img = document.createElement('img');
    img.className = 'mini';
    img.loading = 'lazy';
    img.src = game.thumbnail || '';
    img.alt = game.title || 'Game thumbnail';

    const meta = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = game.title || 'Untitled';
    const idline = document.createElement('div');
    idline.style.fontSize = '12px';
    idline.style.color = '#6a4b8f';
    idline.textContent = game.id ? ('Project ' + game.id) : '';
    const desc = document.createElement('div');
    desc.className = 'game-desc';
    desc.textContent = game.desc || '';

    meta.appendChild(title);
    meta.appendChild(idline);
    meta.appendChild(desc);

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
    if(first) selectItem(first);
  })();

  // close button if present (for older UI where player opens)
  if(closeBtn){
    closeBtn.addEventListener('click', ()=>{
      player.src = '';
      playerWrapper && playerWrapper.classList.remove('active');
    });
  }

});
