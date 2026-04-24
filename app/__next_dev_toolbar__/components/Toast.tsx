'use client';

import { useEffect } from 'react';

export function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  const short = msg.replace(/\\/g, '/').split('/').slice(-3).join('/');

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#0f0f0f',
        color: '#e4e4e7',
        fontFamily: 'monospace',
        fontSize: 12,
        padding: '8px 14px',
        borderRadius: 8,
        border: '1px solid #27272a',
        boxShadow: '0 8px 32px rgba(0,0,0,.55)',
        zIndex: 99999,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        animation: 'devFadeIn .15s ease',
      }}
    >
      📍 {short}
    </div>
  );
}
