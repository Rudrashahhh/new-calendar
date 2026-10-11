/* Adapted from Magic UI Particles (MIT). See MAGICUI-LICENSE.txt.
 * https://magicui.design/docs/components/particles
 * Canvas implementation for Carolina Day's buildless HTML app. */
(() => {
  const layer = document.createElement('div');
  layer.className = 'particles-background';
  layer.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  layer.append(canvas);
  document.body.prepend(layer);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mouse = { x: 0, y: 0 };
  let width = 0, height = 0, dpr = 1, circles = [], frame = 0, lastTime = 0;
  const circleParams = () => ({
    x: Math.random() * width, y: Math.random() * height,
    translateX: 0, translateY: 0, size: Math.random() * 1.6 + 0.7,
    alpha: 0, targetAlpha: Math.random() * 0.28 + 0.16,
    dx: (Math.random() - 0.5) * 0.12,
    dy: (Math.random() - 0.5) * 0.12 - 0.04,
    magnetism: 0.1 + Math.random() * 4,
  });
  function paint(step = 0) {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < circles.length; i++) {
      const p = circles[i];
      p.x += p.dx * step; p.y += p.dy * step;
      const easing = 1 - Math.pow(1 - 1 / 80, step);
      p.translateX += (mouse.x / (70 / p.magnetism) - p.translateX) * easing;
      p.translateY += (mouse.y / (70 / p.magnetism) - p.translateY) * easing;
      const edge = Math.min(p.x + p.translateX - p.size, width - p.x - p.translateX - p.size,
        p.y + p.translateY - p.size, height - p.y - p.translateY - p.size);
      p.alpha = p.targetAlpha * Math.max(0, Math.min(1, edge / 24));
      ctx.beginPath();
      ctx.arc(p.x + p.translateX, p.y + p.translateY, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(75,156,211,${p.alpha})`;
      ctx.fill();
      if (p.x < -p.size || p.x > width + p.size || p.y < -p.size || p.y > height + p.size)
        circles[i] = circleParams();
    }
  }
  function resize() {
    width = layer.clientWidth; height = layer.clientHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const quantity = Math.max(35, Math.min(110, Math.round(width * height / 12000)));
    circles = Array.from({ length: quantity }, circleParams);
    paint();
  }
  function animate(time) {
    const step = lastTime ? Math.min((time - lastTime) / 16.667, 3) : 1;
    lastTime = time; paint(step);
    frame = requestAnimationFrame(animate);
  }
  function syncMotion() {
    cancelAnimationFrame(frame); frame = 0; lastTime = 0;
    if (!document.hidden && !reduced.matches) frame = requestAnimationFrame(animate);
    else { mouse.x = mouse.y = 0; paint(); }
  }
  addEventListener('pointermove', e => {
    if (!reduced.matches && e.pointerType !== 'touch') {
      mouse.x = e.clientX - width / 2; mouse.y = e.clientY - height / 2;
    }
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { mouse.x = mouse.y = 0; });
  new ResizeObserver(resize).observe(layer);
  document.addEventListener('visibilitychange', syncMotion);
  reduced.addEventListener('change', syncMotion);
  addEventListener('pagehide', () => cancelAnimationFrame(frame));
  addEventListener('pageshow', syncMotion);
  resize(); syncMotion();
})();
