'use client';

import { useEffect, useRef } from 'react';

/**
 * The interactive sibling of HeroBackground — same 20px dot grid, but a
 * magnifying-glass lens follows the cursor: nearby dots grow, shift into
 * --gradient-primary, and displace outward from the cursor (a fisheye
 * distortion), so it reads as looking through glass rather than a plain
 * hover-color-change. A one-shot intro sweep plays on load (and re-arms if
 * this section scrolls back into view later, still untouched) so the
 * interaction announces itself instead of waiting to be discovered.
 *
 * Kept as its own component rather than folded into HeroBackground —
 * HeroBackground stays a zero-JS server component for the CTA band's
 * non-interactive dots; this one opts into the canvas/mouse-tracking cost
 * only where it's actually used.
 *
 * Listens on `window` rather than this element, and checks its own
 * bounding rect per-event, so it never needs pointer-events enabled here —
 * matches HeroBackground's pointer-events-none, and never risks intercepting
 * clicks on the hero content stacked above it.
 */
export function HeroGridLens() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const SPACING = 20;
    const BASE_RADIUS = 1;
    const LENS_RADIUS = 110;
    const MAX_RADIUS = 2.8;
    const MAGNIFY = 1.28;
    // How far a dot's rendered position can reach beyond LENS_RADIUS — the
    // fisheye displacement can push a dot out to LENS_RADIUS * MAGNIFY.
    const AFFECT_RADIUS = LENS_RADIUS * MAGNIFY + MAX_RADIUS + 2;

    // Canvas can't consume `var(--token)` directly the way CSS/SVG can, so
    // the colors this draws with are resolved once from the real tokens
    // here rather than duplicated as hardcoded hex.
    const rootStyle = getComputedStyle(document.documentElement);

    function hexToRgb(hex: string): [number, number, number] {
      const clean = hex.trim().replace('#', '');
      return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
    }

    function firstHexColors(value: string, count: number): [number, number, number][] {
      const matches = value.match(/#[0-9a-fA-F]{6,8}/g) ?? [];
      return matches.slice(0, count).map(hexToRgb);
    }

    const COLOR_MUTED = hexToRgb(rootStyle.getPropertyValue('--color-text-muted') || '#94a3b8');
    const gradientStops = firstHexColors(rootStyle.getPropertyValue('--gradient-primary'), 2);
    const COLOR_A = gradientStops[0] ?? ([99, 102, 241] as [number, number, number]);
    const COLOR_B = gradientStops[1] ?? ([67, 59, 202] as [number, number, number]);

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;

    const baseCanvas = document.createElement('canvas');
    const baseCtx = baseCanvas.getContext('2d');

    const pointer = { x: -9999, y: -9999, active: 0 };
    const target = { x: -9999, y: -9999, active: 0 };
    let lastRealInteraction = -Infinity;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    let rafId = 0;

    function renderBaseGrid() {
      if (!baseCtx) return;
      baseCanvas.width = canvas!.width;
      baseCanvas.height = canvas!.height;
      baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      baseCtx.clearRect(0, 0, width, height);
      baseCtx.fillStyle = `rgba(${COLOR_MUTED[0]}, ${COLOR_MUTED[1]}, ${COLOR_MUTED[2]}, 0.5)`;
      baseCtx.beginPath();
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          baseCtx.moveTo(c * SPACING + BASE_RADIUS, r * SPACING);
          baseCtx.arc(c * SPACING, r * SPACING, BASE_RADIUS, 0, Math.PI * 2);
        }
      }
      baseCtx.fill();
    }

    function resize() {
      if (!canvas || !container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / SPACING) + 1;
      rows = Math.ceil(height / SPACING) + 1;
      renderBaseGrid();
    }

    function scheduleResize() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 100);
    }

    function smoothstep(t: number): number {
      const clamped = Math.max(0, Math.min(1, t));
      return clamped * clamped * (3 - 2 * clamped);
    }

    function mixColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
      return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t),
      ];
    }

    function draw() {
      const lx = pointer.x;
      const ly = pointer.y;
      const active = pointer.active;

      ctx!.clearRect(0, 0, width, height);
      ctx!.drawImage(baseCanvas, 0, 0, width, height);

      if (active <= 0.01) return;

      const colMin = Math.max(0, Math.floor((lx - AFFECT_RADIUS) / SPACING));
      const colMax = Math.min(cols - 1, Math.ceil((lx + AFFECT_RADIUS) / SPACING));
      const rowMin = Math.max(0, Math.floor((ly - AFFECT_RADIUS) / SPACING));
      const rowMax = Math.min(rows - 1, Math.ceil((ly + AFFECT_RADIUS) / SPACING));

      ctx!.clearRect(
        colMin * SPACING - MAX_RADIUS - 2,
        rowMin * SPACING - MAX_RADIUS - 2,
        (colMax - colMin) * SPACING + MAX_RADIUS * 2 + 4,
        (rowMax - rowMin) * SPACING + MAX_RADIUS * 2 + 4,
      );

      for (let r = rowMin; r <= rowMax; r++) {
        for (let c = colMin; c <= colMax; c++) {
          const dxo = c * SPACING;
          const dyo = r * SPACING;
          const dx = dxo - lx;
          const dy = dyo - ly;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let rx = dxo;
          let ry = dyo;
          let radius = BASE_RADIUS;
          let color: [number, number, number] = COLOR_MUTED;
          let alpha = 0.5;

          if (dist < LENS_RADIUS) {
            const t = dist / LENS_RADIUS;
            const inner = 1 - smoothstep(t);
            const eased = inner * active;

            const mag = 1 + (MAGNIFY - 1) * eased;
            rx = lx + dx * mag;
            ry = ly + dy * mag;

            radius = BASE_RADIUS + (MAX_RADIUS - BASE_RADIUS) * eased;
            const mixed = mixColor(COLOR_A, COLOR_B, 1 - inner);
            color = mixColor(COLOR_MUTED, mixed, eased);
            alpha = 0.5 + 0.35 * eased;
          }

          ctx!.beginPath();
          ctx!.arc(rx, ry, radius, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha.toFixed(3)})`;
          ctx!.fill();
        }
      }

      ctx!.save();
      ctx!.globalAlpha = 0.1 * active;
      const glare = ctx!.createRadialGradient(
        lx - LENS_RADIUS * 0.35,
        ly - LENS_RADIUS * 0.35,
        2,
        lx - LENS_RADIUS * 0.35,
        ly - LENS_RADIUS * 0.35,
        LENS_RADIUS * 0.5,
      );
      glare.addColorStop(0, '#ffffff');
      glare.addColorStop(1, 'rgba(255,255,255,0)');
      ctx!.fillStyle = glare;
      ctx!.beginPath();
      ctx!.arc(lx, ly, LENS_RADIUS, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.restore();
    }

    function tick() {
      if (reducedMotion) {
        pointer.x = target.x;
        pointer.y = target.y;
        pointer.active = target.active;
      } else {
        pointer.x += (target.x - pointer.x) * 0.18;
        pointer.y += (target.y - pointer.y) * 0.18;
        pointer.active += (target.active - pointer.active) * 0.12;
      }
      draw();
      rafId = requestAnimationFrame(tick);
    }

    function setTargetFromViewport(clientX: number, clientY: number) {
      const rect = container!.getBoundingClientRect();
      target.x = clientX - rect.left;
      target.y = clientY - rect.top;
      target.active = rect.width > 0 && clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom ? 1 : 0;
    }

    function markRealInteraction() {
      lastRealInteraction = performance.now();
    }

    function handleWindowMouseMove(e: MouseEvent) {
      setTargetFromViewport(e.clientX, e.clientY);
      if (target.active > 0) markRealInteraction();
    }

    function handleWindowTouchMove(e: TouchEvent) {
      const touch = e.touches[0];
      if (!touch) return;
      setTargetFromViewport(touch.clientX, touch.clientY);
      if (target.active > 0) markRealInteraction();
    }

    function handleTouchEnd() {
      target.active = 0;
    }

    function playIdleDemo() {
      if (reducedMotion) return;
      const demoStart = performance.now();
      const DEMO_DURATION = 4200;

      function demoStep(now: number) {
        if (lastRealInteraction > demoStart) return;
        const elapsed = now - demoStart;
        if (elapsed > DEMO_DURATION) {
          target.active = 0;
          return;
        }
        const t = elapsed / DEMO_DURATION;
        const cx = width * 0.5;
        const cy = height * 0.42;
        const rangeX = Math.min(260, width * 0.28);
        const rangeY = Math.min(90, height * 0.18);
        target.x = cx + Math.sin(t * Math.PI * 1.6) * rangeX;
        target.y = cy + Math.sin(t * Math.PI * 3.1) * rangeY;
        target.active = Math.min(1, elapsed / 400) * (elapsed > DEMO_DURATION - 500 ? (DEMO_DURATION - elapsed) / 500 : 1);
        requestAnimationFrame(demoStep);
      }

      requestAnimationFrame(demoStep);
    }

    resize();
    rafId = requestAnimationFrame(tick);
    playIdleDemo();

    window.addEventListener('resize', scheduleResize);
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    let observer: IntersectionObserver | undefined;
    let wasVisible = false;
    let hiddenSince = 0;

    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          const isVisible = entries[0]?.isIntersecting ?? false;

          if (!isVisible) {
            wasVisible = false;
            hiddenSince = performance.now();
            return;
          }

          const beenHiddenLongEnough = hiddenSince > 0 && performance.now() - hiddenSince > 2500;
          const noRecentInteraction = performance.now() - lastRealInteraction > 5000;

          if (!wasVisible && beenHiddenLongEnough && noRecentInteraction) {
            playIdleDemo();
          }

          wasVisible = true;
        },
        { threshold: 0.4 },
      );
      observer.observe(container);
    }

    return () => {
      cancelAnimationFrame(rafId);
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener('resize', scheduleResize);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      observer?.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
