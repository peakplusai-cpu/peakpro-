'use client';

import { useEffect, useRef } from 'react';

type Star = { x: number; y: number; z: number; tint: number };

const STAR_COUNT = 150;

/** Depth field: parallax stars that drift toward the viewer, with cyan/violet tint. */
function StarField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let raf = 0;
    let running = true;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const stars: Star[] = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      z: Math.random() * 0.9 + 0.1,
      tint: Math.random(),
    }));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;

      for (const star of stars) {
        if (!reduced) {
          star.z -= 0.0007;
          if (star.z <= 0.04) {
            star.x = Math.random() * 2 - 1;
            star.y = Math.random() * 2 - 1;
            star.z = 1;
          }
        }
        const scale = 1 / star.z;
        const px = width / 2 + (star.x * scale * width) / 5 + pointer.x * (1.2 - star.z) * 26;
        const py = height / 2 + (star.y * scale * height) / 5 + pointer.y * (1.2 - star.z) * 26;
        if (px < -20 || px > width + 20 || py < -20 || py > height + 20) {
          star.z = 1;
          continue;
        }
        const size = Math.min(2.2, 0.35 + (1 - star.z) * 1.9);
        const alpha = Math.min(0.95, 0.15 + (1 - star.z) * 0.85);
        const color = star.tint > 0.72 ? '183,148,255' : '125,235,255';

        if (!reduced && star.z < 0.35) {
          const streak = (0.35 - star.z) * 46;
          const dx = px - width / 2;
          const dy = py - height / 2;
          const len = Math.hypot(dx, dy) || 1;
          ctx.strokeStyle = `rgba(${color},${alpha * 0.4})`;
          ctx.lineWidth = size * 0.8;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px - (dx / len) * streak, py - (dy / len) * streak);
          ctx.stroke();
        }
        ctx.fillStyle = `rgba(${color},${alpha})`;
        ctx.fillRect(px, py, size, size);
      }
      if (running && !reduced) raf = requestAnimationFrame(draw);
    };

    const onMove = (event: PointerEvent) => {
      pointer.tx = (event.clientX / width - 0.5) * 2;
      pointer.ty = (event.clientY / height - 0.5) * 2;
    };
    const onVisibility = () => {
      running = !document.hidden;
      if (running && !reduced) raf = requestAnimationFrame(draw);
      else cancelAnimationFrame(raf);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="peakpro-stars" aria-hidden />;
}

export function PeakProAtmosphere() {
  return (
    <>
      <div className="peakpro-aurora" aria-hidden />
      <div className="peakpro-horizon" aria-hidden />
      <StarField />
      <div className="peakpro-vignette" aria-hidden />
      <div className="peakpro-scanband" aria-hidden />
      <div className="peakpro-scanlines" aria-hidden />
    </>
  );
}
