document.addEventListener('DOMContentLoaded', ()=>{
  const player = document.getElementById('games-player-iframe');
  const playerWrapper = document.getElementById('player-area');
  const closeBtn = document.getElementById('player-close');
  const cards = document.querySelectorAll('.game-card');

  function loadGame(url){
    if(!player) return;
    player.src = url;
    playerWrapper.classList.add('active');
    // scroll to player area
    playerWrapper.scrollIntoView({behavior:'smooth',block:'center'});
  }

  cards.forEach(card=>{
    card.addEventListener('click', ()=>{
      const url = card.dataset.src;
      loadGame(url);
    });
  });

  closeBtn && closeBtn.addEventListener('click', ()=>{
    if(player) player.src = '';
    playerWrapper.classList.remove('active');
  });
});
