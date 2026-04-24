'use client';

import { useEffect } from 'react';

const FLASH_STYLE_ID = '__dev-toolbar-rerender-flash';
const FLASH_ATTR = 'data-dev-rerender';
const FLASH_DURATION_MS = 600;

/**
 * Watches for DOM mutations triggered by React re-renders and flashes the
 * nearest [data-dev-src] boundary with a red outline.
 *
 * Uses MutationObserver so it catches both client-side state updates and
 * RSC-driven DOM patches without needing to patch React internals.
 *
 * Toggle with the R key.
 */
export function RerenderFlash({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Inject CSS once
    if (!document.getElementById(FLASH_STYLE_ID)) {
      const style = document.createElement('style');
      style.id = FLASH_STYLE_ID;
      style.textContent = `
        @keyframes devRerenderFlash {
          0%   { outline: 2px solid rgba(239,68,68,.9); background-color: rgba(239,68,68,.12); }
          100% { outline: 2px solid rgba(239,68,68,0);  background-color: transparent; }
        }
        [${FLASH_ATTR}] {
          animation: devRerenderFlash ${FLASH_DURATION_MS}ms ease-out forwards !important;
        }
      `;
      document.head.appendChild(style);
    }

    const timers = new Map<Element, ReturnType<typeof setTimeout>>();

    function flash(el: Element) {
      // Skip our own toolbar UI
      if (el.closest('[data-dev-toolbar]')) return;
      // Skip injected style/script nodes (loader / hot reload)
      if (el.tagName === 'STYLE' || el.tagName === 'SCRIPT') return;

      if (timers.has(el)) {
        clearTimeout(timers.get(el));
        el.removeAttribute(FLASH_ATTR);
        // Force reflow so the animation restarts cleanly
        void (el as HTMLElement).offsetHeight;
      }

      el.setAttribute(FLASH_ATTR, '1');
      timers.set(
        el,
        setTimeout(() => {
          el.removeAttribute(FLASH_ATTR);
          timers.delete(el);
        }, FLASH_DURATION_MS),
      );
    }

    const observer = new MutationObserver((mutations) => {
      const queued = new Set<Element>();

      for (const m of mutations) {
        const node = m.target;
        const el = node instanceof Element ? node : node.parentElement;
        if (!el || el.closest('[data-dev-toolbar]')) continue;
        if (el.tagName === 'STYLE' || el.tagName === 'SCRIPT') continue;

        // Climb to the nearest annotated component boundary
        const boundary = el.closest('[data-dev-src]') ?? el;
        if (boundary instanceof Element && !queued.has(boundary)) {
          queued.add(boundary);
        }
      }

      for (const el of queued) flash(el);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, [enabled]);

  // Render an on-screen indicator so the user knows the mode is active
  if (!enabled) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 56,
        right: 16,
        zIndex: 99998,
        background: 'rgba(239,68,68,.15)',
        border: '1px solid rgba(239,68,68,.4)',
        borderRadius: 6,
        padding: '4px 10px',
        fontFamily: 'monospace',
        fontSize: 10,
        color: 'rgba(239,68,68,.9)',
        pointerEvents: 'none',
      }}
    >
      ● re-render flash ON · R to toggle
    </div>
  );
}
