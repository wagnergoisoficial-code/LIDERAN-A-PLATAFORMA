// Micro-interações da plataforma (Web Animations API, sem bibliotecas).
// Só transform/opacity; tudo é ignorado quando o sistema pede movimento reduzido.
import { useEffect, useRef, useState } from 'react';

const SPRING = 'linear(0, 0.065, 0.226, 0.439, 0.662, 0.865, 1.03, 1.145, 1.211, 1.234, 1.221, 1.185, 1.136, 1.083, 1.035, 0.996, 0.968, 0.952, 0.946, 0.948, 0.956, 0.967, 0.979, 0.991, 1, 1.007, 1.011, 1.013, 1.012, 1.01, 1.008, 1.005, 1.002, 1, 0.998, 0.997, 0.997, 0.997, 0.998, 0.998, 1)';
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

type Origin = Element | DOMRect | null | undefined;

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const cssColor = (name: string) =>
  name.startsWith('--') ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() : name;

const centerOf = (origin: Origin) => {
  if (!origin) return null;
  const rect = origin instanceof Element ? origin.getBoundingClientRect() : origin;
  if (!rect.width && !rect.height) return null;
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

const spawnLayer = () => {
  const layer = document.createElement('div');
  layer.className = 'fx-layer';
  document.body.appendChild(layer);
  return layer;
};

/** Salto curto no ícone de um botão — confirma que o toque foi registado. */
export function pop(target: Element | null | undefined, scale = 1.28) {
  if (!target || prefersReducedMotion()) return;
  const el = (target.querySelector('[uk-icon], svg') as HTMLElement | null) || (target as HTMLElement);
  el.animate(
    [
      { transform: 'scale(1)' },
      { transform: `scale(${scale})`, offset: 0.28, easing: SPRING },
      { transform: 'scale(1)' },
    ],
    { duration: 520, easing: EASE_OUT }
  );
}

/** Pequena explosão de partículas à volta de um elemento (reagir, orar, votar…).
 *  As partículas nascem no contorno do elemento e saem numa elipse à sua volta. */
export function burst(
  origin: Origin,
  { count = 8, colors = ['--accent'], spread = 14, size = 4 }: { count?: number; colors?: string[]; spread?: number; size?: number } = {}
) {
  const rect = origin instanceof Element ? origin.getBoundingClientRect() : origin;
  if (!rect || (!rect.width && !rect.height) || prefersReducedMotion()) return;

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const rx = rect.width / 2 + spread;
  const ry = rect.height / 2 + spread;
  const layer = spawnLayer();
  const palette = colors.map(cssColor);
  const done: Promise<unknown>[] = [];

  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const reach = 0.9 + Math.random() * 0.25;
    const dx = Math.cos(angle) * rx * reach;
    const dy = Math.sin(angle) * ry * reach;
    const long = i % 2 === 0; // alterna pontos e traços curtos
    p.className = 'fx-particle';
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    p.style.width = `${size}px`;
    p.style.height = `${long ? size * 2.2 : size}px`;
    p.style.background = palette[i % palette.length];
    layer.appendChild(p);

    const rotate = `rotate(${(angle * 180) / Math.PI + 90}deg)`;
    const at = (k: number, scale: number) => `translate(calc(-50% + ${dx * k}px), calc(-50% + ${dy * k}px)) ${rotate} scale(${scale})`;
    done.push(
      p.animate(
        [
          { transform: at(0.55, 0.4), opacity: 0 },
          { transform: at(0.75, 1), opacity: 1, offset: 0.3 },
          { transform: at(0.92, 0.9), opacity: 1, offset: 0.6 },
          { transform: at(1.05, 0.3), opacity: 0 },
        ],
        { duration: 620 + Math.random() * 120, easing: 'cubic-bezier(0.2, 0.6, 0.35, 1)', fill: 'forwards' }
      ).finished
    );
  }

  Promise.allSettled(done).then(() => layer.remove());
}

/** Celebração para momentos marcantes (publicar, oração respondida, nova comunidade). */
export function celebrate(origin: Origin, colors: string[] = ['--accent', '--success', '--accent-dark']) {
  const center = centerOf(origin);
  if (!center || prefersReducedMotion()) return;

  const layer = spawnLayer();
  const palette = colors.map(cssColor);
  const done: Promise<unknown>[] = [];

  for (let i = 0; i < 22; i++) {
    const p = document.createElement('span');
    // Leque para cima, com "gravidade" na segunda metade
    const angle = (-90 + (Math.random() - 0.5) * 140) * (Math.PI / 180);
    const velocity = 70 + Math.random() * 70;
    const dx = Math.cos(angle) * velocity;
    const dy = Math.sin(angle) * velocity;
    const spin = (Math.random() - 0.5) * 540;
    const w = 4 + Math.random() * 3;
    p.className = 'fx-particle';
    p.style.left = `${center.x}px`;
    p.style.top = `${center.y}px`;
    p.style.width = `${w}px`;
    p.style.height = `${w * (i % 3 === 0 ? 1 : 2.2)}px`;
    p.style.borderRadius = i % 3 === 0 ? '999px' : '2px';
    p.style.background = palette[i % palette.length];
    layer.appendChild(p);

    done.push(
      p.animate(
        [
          { transform: 'translate(-50%, -50%) rotate(0deg) scale(0.6)', opacity: 0 },
          { transform: `translate(calc(-50% + ${dx * 0.15}px), calc(-50% + ${dy * 0.15}px)) rotate(${spin * 0.1}deg) scale(1)`, opacity: 1, offset: 0.08 },
          { transform: `translate(calc(-50% + ${dx * 0.85}px), calc(-50% + ${dy}px)) rotate(${spin * 0.6}deg) scale(1)`, opacity: 1, offset: 0.5, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 90}px)) rotate(${spin}deg) scale(0.8)`, opacity: 0 },
        ],
        { duration: 1000 + Math.random() * 300, easing: EASE_OUT, fill: 'forwards', delay: Math.random() * 60 }
      ).finished
    );
  }

  Promise.allSettled(done).then(() => layer.remove());
}

/** Conta até ao valor (relatórios, números de destaque). Parte do valor anterior. */
export function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  const current = useRef(value);

  useEffect(() => {
    if (prefersReducedMotion()) {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      const next = Math.round(from + (target - from) * eased);
      current.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
