'use client';

import type { BreadcrumbItem } from '../lib/fiber';

const COLLAPSE_THRESHOLD = 3;

interface Props {
  target: Element;
  breadcrumb: BreadcrumbItem[];
  actionName?: string | null;
}

export function HoverOutline({ target, breadcrumb, actionName }: Props) {
  const rect = target.getBoundingClientRect();
  const hasAction = Boolean(actionName);
  const names = breadcrumb.map((i) => i.name);
  const overflowCount = names.length - COLLAPSE_THRESHOLD;
  const isCollapsed = overflowCount > 0;
  const visibleNames = isCollapsed ? names.slice(-COLLAPSE_THRESHOLD) : names;
  const borderColor = hasAction ? '#f59e0b' : '#6ee7b7';

  return (
    <>
      {/* Border around hovered element */}
      <div
        style={{
          position: 'fixed',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          border: `1.5px solid ${borderColor}`,
          borderRadius: 3,
          pointerEvents: 'none',
          zIndex: 99997,
        }}
      />

      {/* Inline tooltip above the element */}
      <div
        style={{
          position: 'fixed',
          top: rect.top - (hasAction ? 48 : 26) - 2,
          left: rect.left,
          background: '#0a0a0a',
          border: `1px solid ${hasAction ? '#78350f' : '#1f2937'}`,
          borderRadius: '4px 4px 0 0',
          padding: '4px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          pointerEvents: 'none',
          zIndex: 99997,
          maxWidth: 520,
          minWidth: 120,
        }}
      >
        {/* Breadcrumb row */}
        <span
          style={{
            color: '#6ee7b7',
            fontSize: 10,
            fontFamily: 'monospace',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {isCollapsed && <span style={{ color: '#4b5563' }}>···</span>}
          {visibleNames.join(' → ')}
          {isCollapsed && (
            <span
              style={{
                color: '#4b5563',
                fontSize: 9,
                border: '1px solid #374151',
                borderRadius: 3,
                padding: '0 4px',
                marginLeft: 2,
              }}
            >
              +{overflowCount} · X to expand
            </span>
          )}
          {!isCollapsed && names.length > 1 && (
            <span
              style={{
                color: '#4b5563',
                fontSize: 9,
                border: '1px solid #374151',
                borderRadius: 3,
                padding: '0 4px',
                marginLeft: 2,
              }}
            >
              X to expand
            </span>
          )}
        </span>

        {/* Server Action row */}
        {hasAction && (
          <span
            style={{
              color: '#f59e0b',
              fontSize: 10,
              fontFamily: 'monospace',
              fontWeight: 600,
            }}
          >
            🔁 Server Action: {actionName}
          </span>
        )}
      </div>
    </>
  );
}

