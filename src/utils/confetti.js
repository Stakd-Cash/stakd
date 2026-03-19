let _confettiLast = 0;
export function launchConfetti({ reduceMotion = false } = {}) {
  if (reduceMotion) return;
  const now = Date.now();
  if (now - _confettiLast < 3500) return;
  _confettiLast = now;
  const canvas = document.getElementById("confetti-canvas");
  if (!canvas) return;

  canvas.style.display = "block";
  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();

  const ctx = canvas.getContext("2d");
  const COLS = ["#3fb950", "#58a6ff", "#e3b341", "#f78166", "#bc8cff", "#ffa657"];
  const count = Math.min(140, Math.max(80, Math.floor((canvas.width * canvas.height) / 20000)));
  const ps = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: -10 - Math.random() * 200,
    vx: (Math.random() - 0.5) * 6,
    vy: 3 + Math.random() * 4,
    color: COLS[(Math.random() * COLS.length) | 0],
    w: 6 + Math.random() * 6,
    h: 10 + Math.random() * 6,
    rot: Math.random() * 360,
    rv: (Math.random() - 0.5) * 8,
    alpha: 1,
  }));

  let raf = 0;
  const stop = () => {
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = "none";
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", onVis);
  };
  const onVis = () => {
    if (document.hidden) stop();
  };

  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    for (const p of ps) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.rot += p.rv;
      p.alpha -= 0.008;
      if (p.y < canvas.height && p.alpha > 0) {
        alive++;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    }
    if (alive > 0) raf = requestAnimationFrame(tick);
    else stop();
  };

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", onVis);
  tick();
  setTimeout(stop, 5000);
}

