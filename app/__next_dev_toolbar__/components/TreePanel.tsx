'use client';

import { openInEditor } from '../lib/sidecar';
import type { BreadcrumbItem } from '../lib/fiber';

interface Props {
  breadcrumb: BreadcrumbItem[];
  actionName: string | null;
  onClose: () => void;
  /** The element that was hovered when X was pressed — used as data-dev-src fallback */
  targetEl?: Element;
}

export function TreePanel({ breadcrumb, actionName, onClose, targetEl }: Props) {
  return (
    <>
      {/* Backdrop — click outside to close */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99995,
          background: 'rgba(0,0,0,.5)',
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Panel — centered, 70vw */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '70vw',
          maxWidth: 900,
          minWidth: 320,
          maxHeight: '80vh',
          background: '#0a0a0a',
          border: '1px solid #1f2937',
          borderRadius: 12,
          boxShadow: '0 24px 80px rgba(0,0,0,.9)',
          zIndex: 99996,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'devSlideIn .15s ease',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #1a1a1a',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                color: '#6ee7b7',
                fontSize: 13,
                fontFamily: 'monospace',
                fontWeight: 700,
              }}
            >
              Component Tree
            </span>
            <span
              style={{
                color: '#374151',
                fontSize: 11,
                fontFamily: 'monospace',
              }}
            >
              {breadcrumb.length} levels
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid #374151',
              borderRadius: 4,
              color: '#6b7280',
              fontSize: 10,
              fontFamily: 'monospace',
              padding: '3px 10px',
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            X · Esc to close
          </button>
        </div>

        {/* ── Tree rows ───────────────────────────────────────────────────── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
          {breadcrumb.map((item, i) => {
            const isLast = i === breadcrumb.length - 1;

            // Resolve source: prefer fiber _debugSource, fall back to data-dev-src on the target element
            let fileName = item.fileName;
            let lineNumber = item.lineNumber;
            if (!fileName && isLast && targetEl) {
              const srcEl = targetEl.closest('[data-dev-src]') ?? targetEl;
              const raw = srcEl?.getAttribute('data-dev-src');
              if (raw) {
                const parts = raw.split(':');
                lineNumber = parseInt(parts[parts.length - 1], 10);
                fileName = parts.slice(0, -1).join(':');
              }
            }

            const hasSource = Boolean(fileName && lineNumber);
            const shortFile = fileName
              ? fileName.replace(/\\/g, '/').split('/').slice(-3).join('/')
              : null;
            const indent = 16 + i * 20;

            return (
              <div
                key={i}
                onClick={async () => {
                  if (fileName && lineNumber) {
                    const err = await openInEditor(fileName, lineNumber);
                    if (!err) onClose();
                  }
                }}
                title={hasSource ? `Open ${shortFile}:${lineNumber}` : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  paddingTop: 7,
                  paddingBottom: 7,
                  paddingLeft: indent,
                  paddingRight: 16,
                  cursor: hasSource ? 'pointer' : 'default',
                  background: isLast ? 'rgba(110,231,183,.06)' : 'transparent',
                  borderLeft: `2px solid ${isLast ? '#6ee7b7' : 'transparent'}`,
                  transition: 'background .1s',
                }}
                onMouseEnter={(e) => {
                  if (hasSource)
                    (e.currentTarget as HTMLElement).style.background = isLast
                      ? 'rgba(110,231,183,.14)'
                      : 'rgba(255,255,255,.04)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = isLast
                    ? 'rgba(110,231,183,.06)'
                    : 'transparent';
                }}
              >
                {/* Tree connector line */}
                <span
                  style={{
                    color: '#374151',
                    fontSize: 11,
                    fontFamily: 'monospace',
                    flexShrink: 0,
                    userSelect: 'none',
                  }}
                >
                  {i === 0 ? '┌─' : isLast ? '└─' : '├─'}
                </span>

                {/* Component name */}
                <span
                  style={{
                    color: isLast ? '#6ee7b7' : '#e5e7eb',
                    fontSize: 13,
                    fontFamily: 'monospace',
                    fontWeight: isLast ? 700 : 400,
                    flex: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.name}
                </span>

                {/* Source path */}
                {shortFile && (
                  <span
                    style={{
                      color: '#4b5563',
                      fontSize: 11,
                      fontFamily: 'monospace',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {shortFile}:{lineNumber}
                  </span>
                )}

                {/* Open arrow indicator */}
                {hasSource && (
                  <span
                    style={{ color: '#374151', fontSize: 11, flexShrink: 0 }}
                  >
                    ↗
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Server Action footer ────────────────────────────────────────── */}
        {actionName && (
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid #1a1a1a',
              background: 'rgba(245,158,11,.07)',
              color: '#f59e0b',
              fontSize: 12,
              fontFamily: 'monospace',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            🔁 Server Action:{' '}
            <span style={{ color: '#fbbf24' }}>{actionName}</span>
          </div>
        )}

        {/* ── Footer hint ─────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid #111',
            color: '#374151',
            fontSize: 10,
            fontFamily: 'monospace',
            flexShrink: 0,
          }}
        >
          Click any row to open in editor · X or Esc to close
        </div>
      </div>
    </>
  );
}
