'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchComponentTypes } from '../lib/sidecar';

interface OverlayItem {
  rect: DOMRect;
  type: 'client' | 'server';
}

/**
 * Scans all [data-dev-src] elements in the DOM and draws colour-coded outlines:
 *   green  = Server Component
 *   blue   = Client Component  ('use client' detected in source file)
 *
 * Toggle with the B key.
 */
export function BoundaryOverlay({ enabled }: { enabled: boolean }) {
  const [items, setItems] = useState<OverlayItem[]>([]);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      return;
    }

    const types = await fetchComponentTypes();
    const next: OverlayItem[] = [];

    document.querySelectorAll<HTMLElement>('[data-dev-src]').forEach((el) => {
      const src = el.getAttribute('data-dev-src') ?? '';
      // Strip the trailing :lineNumber to get the file path
      const file = src.split(':').slice(0, -1).join(':');
      const type = types[file] ?? 'server';
      next.push({ rect: el.getBoundingClientRect(), type });
    });

    setItems(next);
  }, [enabled]);

  // Refresh on enable/disable and on scroll/resize
  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    const opts = { passive: true } as const;
    window.addEventListener('scroll', refresh, opts);
    window.addEventListener('resize', refresh, opts);
    return () => {
      window.removeEventListener('scroll', refresh);
      window.removeEventListener('resize', refresh);
    };
  }, [enabled, refresh]);

  if (!enabled || items.length === 0) return null;

  return (
    <>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            position: 'fixed',
            top: item.rect.top,
            left: item.rect.left,
            width: item.rect.width,
            height: item.rect.height,
            border: `1.5px solid ${
              item.type === 'client'
                ? 'rgba(59,130,246,.75)'
                : 'rgba(34,197,94,.75)'
            }`,
            background:
              item.type === 'client'
                ? 'rgba(59,130,246,.04)'
                : 'rgba(34,197,94,.04)',
            borderRadius: 2,
            pointerEvents: 'none',
            zIndex: 99994,
          }}
        />
      ))}

      {/* Legend */}
      <div
        style={{
          position: 'fixed',
          top: 16,
          right: 76,
          zIndex: 99998,
          background: '#111',
          border: '1px solid #2a2a2a',
          borderRadius: 8,
          padding: '8px 12px',
          fontFamily: 'monospace',
          fontSize: 11,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          pointerEvents: 'none',
        }}
      >
        <div style={{ color: '#6b7280', fontWeight: 700, marginBottom: 2 }}>
          Component Boundaries
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              border: '2px solid rgba(34,197,94,.8)',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span style={{ color: '#d1d5db' }}>Server Component</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              border: '2px solid rgba(59,130,246,.8)',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span style={{ color: '#d1d5db' }}>Client Component</span>
        </div>
        <div style={{ color: '#4b5563', marginTop: 2 }}>Press B to toggle</div>
      </div>
    </>
  );
}
