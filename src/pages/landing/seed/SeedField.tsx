import { useEffect, useRef } from 'react';
import styles from './SeedField.module.css';

/**
 * Drifting seeds behind the hero: maize kernels, paddy grains, soybeans,
 * wheat and sunflower seeds, drawn on a canvas so dozens of them cost almost
 * nothing. They float slowly upward with a little rotation and parallax with
 * the pointer.
 *
 * The animation pauses when the hero scrolls out of view or the tab is
 * hidden, and draws a single still frame for users who prefer reduced motion.
 */

type SeedKind = 'maize' | 'paddy' | 'soy' | 'wheat' | 'sunflower';

interface Seed {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  depth: number; // 0.3 (far) .. 1 (near)
  kind: SeedKind;
  phase: number;
}

const KINDS: SeedKind[] = ['maize', 'maize', 'paddy', 'paddy', 'soy', 'wheat', 'sunflower'];

function drawSeed(ctx: CanvasRenderingContext2D, s: Seed) {
  const r = s.size;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rot);
  ctx.globalAlpha = 0.14 + s.depth * 0.42;

  switch (s.kind) {
    case 'maize': {
      // Flat-topped teardrop kernel with a pale germ.
      ctx.beginPath();
      ctx.moveTo(0, r * 1.15);
      ctx.bezierCurveTo(r * 0.95, r * 0.55, r * 1.05, -r * 0.75, r * 0.55, -r * 1.0);
      ctx.quadraticCurveTo(0, -r * 1.18, -r * 0.55, -r * 1.0);
      ctx.bezierCurveTo(-r * 1.05, -r * 0.75, -r * 0.95, r * 0.55, 0, r * 1.15);
      ctx.fillStyle = '#E3A92B';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, r * 0.15, r * 0.32, r * 0.55, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#F7DD97';
      ctx.fill();
      break;
    }
    case 'paddy': {
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.42, r * 1.35, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#C79A4E';
      ctx.fill();
      ctx.strokeStyle = 'rgba(120, 82, 28, 0.55)';
      ctx.lineWidth = Math.max(0.6, r * 0.08);
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.25);
      ctx.lineTo(0, r * 1.25);
      ctx.stroke();
      // awn tip
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.35);
      ctx.lineTo(0, -r * 1.75);
      ctx.stroke();
      break;
    }
    case 'soy': {
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.95, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#E6CF8E';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(r * 0.35, 0, r * 0.12, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#8A6A2E';
      ctx.fill();
      break;
    }
    case 'wheat': {
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.6, r * 1.05, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#D29B4C';
      ctx.fill();
      ctx.strokeStyle = 'rgba(110, 70, 20, 0.5)';
      ctx.lineWidth = Math.max(0.6, r * 0.09);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.85);
      ctx.quadraticCurveTo(r * 0.12, 0, 0, r * 0.85);
      ctx.stroke();
      break;
    }
    case 'sunflower': {
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.3);
      ctx.bezierCurveTo(r * 0.75, -r * 0.8, r * 0.6, r * 0.9, 0, r * 1.2);
      ctx.bezierCurveTo(-r * 0.6, r * 0.9, -r * 0.75, -r * 0.8, 0, -r * 1.3);
      ctx.fillStyle = '#2E2B2A';
      ctx.fill();
      ctx.strokeStyle = 'rgba(240, 236, 226, 0.75)';
      ctx.lineWidth = Math.max(0.5, r * 0.08);
      for (const dx of [-0.25, 0, 0.25]) {
        ctx.beginPath();
        ctx.moveTo(dx * r, -r * 0.95);
        ctx.lineTo(dx * r * 0.7, r * 0.9);
        ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
}

function makeSeed(w: number, h: number, anywhere: boolean): Seed {
  const depth = 0.3 + Math.random() * 0.7;
  return {
    x: Math.random() * w,
    y: anywhere ? Math.random() * h : h + 20 + Math.random() * 60,
    vx: (Math.random() - 0.5) * 0.12,
    vy: -(0.08 + Math.random() * 0.22) * depth,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.006,
    size: 3.2 + depth * 6.5,
    depth,
    kind: KINDS[Math.floor(Math.random() * KINDS.length)],
    phase: Math.random() * Math.PI * 2,
  };
}

export default function SeedField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let w = 0;
    let h = 0;
    let seeds: Seed[] = [];
    let raf = 0;
    let running = false;
    let visible = true;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(Math.min(60, Math.max(18, (w * h) / 22000)));
      if (seeds.length === 0) seeds = Array.from({ length: target }, () => makeSeed(w, h, true));
      else if (seeds.length < target) seeds.push(...Array.from({ length: target - seeds.length }, () => makeSeed(w, h, true)));
      else seeds.length = target;
      if (reduce) frame(0);
    };

    const frame = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      for (const s of seeds) {
        if (!reduce) {
          s.x += s.vx + Math.sin(t / 2400 + s.phase) * 0.08 * s.depth;
          s.y += s.vy;
          s.rot += s.vr;
          if (s.y < -30 || s.x < -40 || s.x > w + 40) Object.assign(s, makeSeed(w, h, false));
        }
        const px = s.x + pointer.x * s.depth * 14;
        const py = s.y + pointer.y * s.depth * 10;
        drawSeed(ctx, { ...s, x: px, y: py });
      }
    };

    const loop = (t: number) => {
      frame(t);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (reduce || running || !visible || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const onPointer = (e: PointerEvent) => {
      pointer.tx = e.clientX / window.innerWidth - 0.5;
      pointer.ty = e.clientY / window.innerHeight - 0.5;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(canvas);
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    resize();
    start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
