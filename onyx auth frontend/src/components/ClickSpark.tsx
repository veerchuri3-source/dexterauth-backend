import React, { useRef, useEffect, useCallback } from 'react';

interface ClickSparkProps {
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  extraScale?: number;
  children?: React.ReactNode;
}

interface Spark {
  x: number;
  y: number;
  angle: number;
  startTime: number;
}

/**
 * Global click-spark overlay.
 *
 * Renders a single FIXED, full-viewport canvas that sits ON TOP of the page
 * (pointer-events: none, so it never blocks clicks) and listens for clicks on
 * `window`. A burst of fading line "sparks" radiates from each click point.
 *
 * The animation loop runs ON DEMAND — it starts when a click adds sparks and
 * stops itself once the last spark fades, so there is zero per-frame work while
 * the page is idle.
 */
const ClickSpark: React.FC<ClickSparkProps> = ({
  sparkColor = '#fff',
  sparkSize = 10,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  easing = 'ease-out',
  extraScale = 1.0,
  children
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);
  const rafRef = useRef<number | null>(null);
  // Set by the render-loop effect; lets the click handler (re)start the loop on
  // demand instead of animating an empty canvas forever.
  const startLoopRef = useRef<(() => void) | null>(null);

  const easeFunc = useCallback(
    (t: number) => {
      switch (easing) {
        case 'linear':
          return t;
        case 'ease-in':
          return t * t;
        case 'ease-in-out':
          return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        default:
          return t * (2 - t);
      }
    },
    [easing]
  );

  // --- Render loop: runs only while sparks exist, then self-stops. ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = performance.now();

      let active = false;
      sparksRef.current = sparksRef.current.filter((spark: Spark) => {
        const elapsed = now - spark.startTime;
        if (elapsed >= duration) return false;

        const progress = elapsed / duration;
        const eased = easeFunc(progress);

        const distance = eased * sparkRadius * extraScale;
        const lineLength = sparkSize * (1 - eased);

        const x1 = spark.x + distance * Math.cos(spark.angle);
        const y1 = spark.y + distance * Math.sin(spark.angle);
        const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
        const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

        ctx.strokeStyle = sparkColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        active = true;
        return true;
      });

      if (active) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        rafRef.current = null;
      }
    };

    const startLoop = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(draw);
    };
    // Exposed via a ref so the click handler can (re)start the loop.
    startLoopRef.current = startLoop;
    if (sparksRef.current.length > 0) startLoop();

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [sparkColor, sparkSize, sparkRadius, sparkCount, duration, easeFunc, extraScale]);

  // --- Canvas sizing: track the viewport, with DPI scaling for crisp lines. ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // --- Click handler: listen on `window` so it works across every route. ---
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const now = performance.now();
      sparksRef.current.push(
        ...Array.from({ length: sparkCount }, (_, i) => ({
          x: e.clientX,
          y: e.clientY,
          angle: (2 * Math.PI * i) / sparkCount,
          startTime: now
        }))
      );
      startLoopRef.current?.();
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [sparkCount]);

  return (
    <>
      {/* Fixed full-viewport canvas overlay. Above the page (z-50) but clicks
          pass straight through via pointer-events-none, so real UI keeps working. */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-50"
        aria-hidden="true"
      />
      {children}
    </>
  );
};

export default ClickSpark;
