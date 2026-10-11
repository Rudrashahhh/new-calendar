/* Animated List and Text Reveal adapted for buildless HTML from Magic UI (MIT).
 * https://magicui.design/docs/components/animated-list
 * https://magicui.design/docs/components/text-reveal
 * License: MAGICUI-LICENSE.txt */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const states = new WeakMap(), animations = new Set();
  const clamp = x => Math.max(0, Math.min(1, x));
  function animate(node, frames, options) {
    if (reduced.matches || !node.animate) return;
    const a = node.animate(frames, options);
    animations.add(a);
    a.finished.catch(() => {}).finally(() => animations.delete(a));
  }
  function render(container, html, resetKey = '') {
    const visible = container.getClientRects().length > 0;
    const previous = states.get(container);
    const reset = !previous || previous.resetKey !== resetKey || !previous.visible;
    const old = new Map(Array.from(container.children, (node, i) =>
      [node.dataset.listKey || `static-${i}`, { node, rect: node.getBoundingClientRect(), html: node.outerHTML }]));
    const template = document.createElement('template');
    template.innerHTML = html;
    const fresh = Array.from(template.content.children);
    const focus = document.activeElement;
    const focusedKey = focus?.closest('[data-list-key]')?.dataset.listKey;
    const focusIndex = focusedKey ? Array.from(focus.closest('[data-list-key]').querySelectorAll('button,input,a')).indexOf(focus) : -1;
    let entranceIndex = 0;
    const transitions = [];
    fresh.forEach((incoming, i) => {
      const key = incoming.dataset.listKey || `static-${i}`;
      const before = old.get(key);
      const node = before?.html === incoming.outerHTML ? before.node : incoming;
      // Keep matching nodes (and their keyboard focus) rather than rebuilding unchanged lists.
      if (container.children[i] !== node) container.insertBefore(node, container.children[i] || null);
      transitions.push({ node, before, enter: reset || !before, index: entranceIndex });
      if (node.dataset.listKey && (reset || !before)) entranceIndex++;
      old.delete(key);
    });
    // Remove old and replaced nodes after reconciliation.
    const retained = new Set(transitions.map(x => x.node));
    Array.from(container.children).forEach(node => { if (!retained.has(node)) node.remove(); });
    if (focusedKey && !focus.isConnected) {
      const replacement = transitions.find(x => x.node.dataset.listKey === focusedKey)?.node;
      replacement?.querySelectorAll('button,input,a')[focusIndex]?.focus({ preventScroll: true });
    }
    if (visible && !reduced.matches) transitions.forEach(({ node, before, enter, index }) => {
      if (!node.dataset.listKey) return;
      if (enter && index < (container.id === 'month-grid' ? 42 : 16)) animate(node,
        [{ opacity: 0, transform: 'translateY(12px) scale(.96)' },
          { opacity: 1, transform: 'translateY(-1px) scale(1.005)', offset: .8 },
          { opacity: 1, transform: 'translateY(0) scale(1)' }],
        { duration: 420, delay: Math.min(index * 65, 390), easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
      else if (before) {
        const after = node.getBoundingClientRect(), dy = before.rect.top - after.top;
        if (Math.abs(dy) > 1) animate(node, [{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }],
          { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
        else if (before.html !== node.outerHTML) animate(node, [{ opacity: .6 }, { opacity: 1 }], { duration: 200 });
      }
    });
    states.set(container, { visible, resetKey });
  }
  window.CarolinaAnimatedList = { render };

  // Word-by-word scroll reveal; the full sentence remains available to screen readers.
  const reveals = Array.from(document.querySelectorAll('[data-text-reveal]'), node => {
    const text = node.textContent.trim();
    node.setAttribute('aria-label', text);
    const visual = document.createElement('span');
    visual.className = 'text-reveal-words'; visual.setAttribute('aria-hidden', 'true');
    text.split(/\s+/).forEach(word => {
      const span = document.createElement('span'); span.className = 'text-reveal-word'; span.textContent = word;
      visual.append(span, document.createTextNode(' '));
    });
    node.replaceChildren(visual);
    return { node, words: Array.from(visual.children) };
  });
  let pending = 0;
  function paintReveal() {
    pending = 0;
    for (const { node, words } of reveals) {
      if (!node.getClientRects().length) continue;
      const rect = node.getBoundingClientRect();
      const progress = reduced.matches ? 1 : clamp((innerHeight * .98 - rect.top) / (innerHeight * .28));
      words.forEach((word, i) => { word.style.opacity = String(.3 + .7 * clamp(progress * words.length - i)); });
    }
  }
  function scheduleReveal() { if (!pending) pending = requestAnimationFrame(paintReveal); }
  addEventListener('scroll', scheduleReveal, { passive: true });
  addEventListener('resize', scheduleReveal, { passive: true });
  addEventListener('hashchange', scheduleReveal);
  reduced.addEventListener('change', () => { if (reduced.matches) for (const a of animations) a.cancel(); scheduleReveal(); });
  addEventListener('pagehide', () => { cancelAnimationFrame(pending); pending = 0; for (const a of animations) a.cancel(); });
  addEventListener('pageshow', scheduleReveal);
  scheduleReveal();
})();
