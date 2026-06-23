// Floating-emoji background decoration. Self-running, safe to include anywhere.
// Renders a fixed layer of emojis gently drifting upward, behind all content
// (z-index:-1, pointer-events:none). Skipped when the user prefers reduced motion.
(function(){
  if (window.__emojiDecoLoaded) return;
  window.__emojiDecoLoaded = true;
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  } catch (e) {}

  var EMOJIS = ['🎮','📖','⭐','🤖','🎬','✨','🚀','🎨','🎯','🌟','💜','🕹️','📚','🎧','🏆','🌈','🦄','🍿'];
  var COUNT = 16;

  function build(){
    if (document.getElementById('emoji-deco')) return;
    var style = document.createElement('style');
    style.textContent =
      '#emoji-deco{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}' +
      '#emoji-deco span{position:absolute;bottom:-8vh;will-change:transform,opacity;animation:emojiFloat linear infinite}' +
      '@keyframes emojiFloat{' +
        '0%{transform:translateY(0) translateX(0) rotate(0deg);opacity:0}' +
        '10%{opacity:1}' +
        '90%{opacity:1}' +
        '100%{transform:translateY(-118vh) translateX(var(--drift)) rotate(var(--spin));opacity:0}' +
      '}';
    document.head.appendChild(style);

    var layer = document.createElement('div');
    layer.id = 'emoji-deco';
    layer.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < COUNT; i++) {
      var s = document.createElement('span');
      s.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      var size = 20 + Math.random() * 28;          // 20–48px
      var dur = 16 + Math.random() * 18;           // 16–34s
      var delay = -Math.random() * dur;            // spread across the screen at load
      var drift = Math.round(Math.random() * 60 - 30) + 'px';
      var spin = Math.round(Math.random() * 80 - 40) + 'deg';
      s.style.left = (Math.random() * 100).toFixed(2) + 'vw';
      s.style.fontSize = size.toFixed(0) + 'px';
      s.style.opacity = (0.18 + Math.random() * 0.27).toFixed(2);
      s.style.animationDuration = dur.toFixed(1) + 's';
      s.style.animationDelay = delay.toFixed(1) + 's';
      s.style.setProperty('--drift', drift);
      s.style.setProperty('--spin', spin);
      layer.appendChild(s);
    }
    document.body.appendChild(layer);
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();
