// ── PARTICLES MODULE ───────────────────────────────────────────────────────────
const Particles = (() => {

  class Particle {
    constructor(x, y, color) {
      this.x = x; this.y = y; this.color = color;
      this.size = Math.random() * 8 + 3;
      this.vx = (Math.random() - 0.5) * 6;
      this.vy = (Math.random() - 0.5) * 6 - 2;
      this.life = 1;
      this.decay = 0.02 + Math.random() * 0.025;
      this.pixel = Math.random() > 0.35;
    }
    update() { this.x += this.vx; this.y += this.vy; this.vy += 0.15; this.life -= this.decay; }
    draw(ctx) {
      if (this.life <= 0) return;
      ctx.globalAlpha = this.life; ctx.fillStyle = this.color;
      if (this.pixel) ctx.fillRect(this.x, this.y, this.size, this.size);
      else { ctx.beginPath(); ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  }

  let pCanvas = null, pCtx = null, raf = null;
  const particles = [];

  function init(canvas) {
    pCanvas = canvas;
    pCtx = canvas.getContext('2d');
    pCanvas.width = window.innerWidth;
    pCanvas.height = window.innerHeight;
    tick();
  }

  function tick() {
    if (!pCtx) return;
    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update(); particles[i].draw(pCtx);
      if (particles[i].life <= 0) particles.splice(i, 1);
    }
    raf = requestAnimationFrame(tick);
  }

  function burst(color, isBeat) {
    if (!pCanvas) return;
    const x = isBeat ? pCanvas.width / 2 : Math.random() * pCanvas.width;
    const y = isBeat ? pCanvas.height * 0.3 : Math.random() * pCanvas.height * 0.3;
    const n = isBeat ? 14 : 6;
    for (let i = 0; i < n; i++) particles.push(new Particle(x, y, color));
  }

  function destroy() {
    if (raf) cancelAnimationFrame(raf);
    raf = null; pCanvas = null; pCtx = null;
    particles.length = 0;
  }

  return { init, burst, destroy };
})();

export default Particles;