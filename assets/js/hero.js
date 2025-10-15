// Small hero utilities: reveal cards on scroll + mini sparkline simulator

function revealCards(){
  const cards = document.querySelectorAll('.hero-cards .card');
  if(!cards.length) return;
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  },{threshold:0.18});
  cards.forEach(c=>io.observe(c));
}

/* Mini sparkline: simple random walk, draws to canvas, hover to pause */
function startSparkline(){
  const canvas = document.querySelector('.mini-sparkline');
  const toggle = document.querySelector('.spark-toggle');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width; const h = canvas.height; const margin = 6;
  let data = new Array(40).fill(0).map((_,i)=>50 + Math.sin(i/6)*6 + (Math.random()-0.5)*6);
  let running = true;
  let raf = null;

  function draw(){
    ctx.clearRect(0,0,w,h);
    // background gradient
    const g = ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'rgba(106,27,154,0.06)');
    g.addColorStop(1,'rgba(154,68,204,0.02)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);
    // line
    ctx.beginPath();
    const step = (w - margin*2) / (data.length - 1);
    data.forEach((v,i)=>{
      const x = margin + i*step;
      const y = h - (v/100)*(h - margin*2) - margin;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.strokeStyle = '#2b0b3a';
    ctx.lineWidth = 2;
    ctx.stroke();
    // small fill under line
    ctx.lineTo(w-margin, h-margin);
    ctx.lineTo(margin, h-margin);
    ctx.closePath();
    ctx.fillStyle = 'rgba(106,27,154,0.06)';
    ctx.fill();
  }

  function step(){
    // random walk
    const last = data[data.length-1];
    const next = Math.max(10, Math.min(90, last + (Math.random()-0.5)*6));
    data.push(next); data.shift();
    draw();
    if(running) raf = requestAnimationFrame(()=> setTimeout(step, 350));
  }

  canvas.addEventListener('mouseenter', ()=>{ running = false; toggle.textContent = 'Resume'; });
  canvas.addEventListener('mouseleave', ()=>{ running = true; toggle.textContent = 'Pause'; step(); });
  toggle.addEventListener('click', ()=>{ running = !running; toggle.textContent = running ? 'Pause' : 'Resume'; if(running) step(); });

  // start
  draw(); step();
}

export function initHero(){ revealCards(); startSparkline(); }

// auto-run on module load
window.addEventListener('load', ()=>{ try{ initHero(); }catch(e){ console.error('hero init failed', e)} });
