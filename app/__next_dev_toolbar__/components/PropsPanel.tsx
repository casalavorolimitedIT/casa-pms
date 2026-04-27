'use client';

import { openInEditor } from '../lib/sidecar';
import type { PropsPanelData } from '../lib/props';

interface Props {
  panel: PropsPanelData;
  onClose: () => void;
}

function shortPath(file: string | null) {
  if (!file) return null;
  return file.replace(/\\/g, '/').split('/').slice(-3).join('/');
}

export function PropsPanel({ panel, onClose }: Props) {
  const compactFile = shortPath(panel.file);
  const statusTone = panel.loading
    ? '#f59e0b'
    : panel.missingRequiredCount > 0
      ? '#ef4444'
      : '#10b981';
  const footerLabel = panel.loading
    ? 'Inspecting source props…'
    : panel.missingRequiredCount > 0
      ? `${panel.missingRequiredCount} required prop${panel.missingRequiredCount === 1 ? '' : 's'} missing`
      : panel.rows.length > 0
        ? 'All required props passed'
        : 'No inspectable props found';

  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        width: 420,
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: '78vh',
        background: '#09090b',
        border: `1px solid ${panel.missingRequiredCount > 0 ? '#7f1d1d' : '#1f2937'}`,
        borderRadius: 14,
        boxShadow: '0 24px 80px rgba(0,0,0,.55)',
        overflow: 'hidden',
        zIndex: 99997,
        animation: 'devSlideIn .15s ease',
        fontFamily: 'monospace',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          padding: '14px 16px 12px',
          borderBottom: '1px solid #161b22',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: '#f3f4f6',
              fontSize: 15,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>🧩</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {panel.componentName}
            </span>
          </div>

          {compactFile && panel.file && (
            <button
              onClick={() => {
                void openInEditor(panel.file!, panel.line);
              }}
              title={panel.file}
              style={{
                marginTop: 6,
                padding: 0,
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: 11,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
              }}
            >
              {compactFile}:{panel.line}
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: '1px solid #334155',
            borderRadius: 6,
            color: '#94a3b8',
            fontSize: 10,
            padding: '4px 8px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontFamily: 'inherit',
          }}
        >
          P · Esc
        </button>
      </div>

      <div style={{ padding: '12px 16px 8px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#94a3b8',
            fontSize: 10,
            letterSpacing: '0.08em',
            marginBottom: 10,
          }}
        >
          <span>PROPS</span>
          <span style={{ color: '#475569' }}>
            {panel.schemaSource === 'unknown' ? 'live' : panel.schemaSource}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(92px, 1fr) minmax(92px, .95fr) minmax(132px, 1.3fr)',
            gap: 12,
            color: '#475569',
            fontSize: 10,
            padding: '0 0 8px',
            borderBottom: '1px solid #111827',
          }}
        >
          <span>Name</span>
          <span>Type</span>
          <span>Value</span>
        </div>
      </div>

      <div style={{ maxHeight: '42vh', overflowY: 'auto', padding: '0 16px 8px' }}>
        {panel.rows.length > 0 ? (
          panel.rows.map((row) => (
            <div
              key={row.name}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(92px, 1fr) minmax(92px, .95fr) minmax(132px, 1.3fr)',
                gap: 12,
                alignItems: 'start',
                padding: '8px 0',
                borderBottom: '1px solid rgba(15,23,42,.65)',
                color: row.missing ? '#fca5a5' : '#e2e8f0',
                background: row.missing ? 'rgba(127,29,29,.18)' : 'transparent',
              }}
            >
              <span style={{ fontWeight: row.required ? 700 : 500, wordBreak: 'break-word' }}>
                {row.name}
              </span>
              <span style={{ color: row.missing ? '#fca5a5' : '#93c5fd', wordBreak: 'break-word' }}>
                {row.type}
              </span>
              <span
                style={{
                  color: row.missing ? '#f87171' : row.hasLiveValue ? '#cbd5e1' : '#64748b',
                  wordBreak: 'break-word',
                }}
              >
                {row.valuePreview}
              </span>
            </div>
          ))
        ) : (
          <div
            style={{
              padding: '18px 0 14px',
              color: '#64748b',
              fontSize: 12,
            }}
          >
            No props were found for this component.
          </div>
        )}
      </div>

      <div
        style={{
          borderTop: '1px solid #161b22',
          padding: '11px 16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          background: 'rgba(15,23,42,.45)',
        }}
      >
        <div
          style={{
            color: statusTone,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {panel.loading ? '🟠' : panel.missingRequiredCount > 0 ? '🔴' : '🟢'} {footerLabel}
        </div>

        {panel.note && (
          <div style={{ color: '#94a3b8', fontSize: 10, lineHeight: 1.5 }}>
            {panel.note}
          </div>
        )}
      </div>
    </div>
  );
}