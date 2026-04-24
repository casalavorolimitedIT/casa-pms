'use client';

import { useEffect, useState, useCallback } from 'react';
import { getFiber, getSourceFromFiber, getBreadcrumb } from './lib/fiber';
import type { BreadcrumbItem } from './lib/fiber';
import { openInEditor } from './lib/sidecar';
import { Toast } from './components/Toast';
import { HoverOutline } from './components/HoverOutline';
import { TreePanel } from './components/TreePanel';
import { SearchPalette } from './components/SearchPalette';
import { BoundaryOverlay } from './features/BoundaryOverlay';
import { RerenderFlash } from './features/RerenderFlash';

interface HoverState {
  el: Element;
  breadcrumb: BreadcrumbItem[];
  actionName: string | null;
}

export function DevToolbar() {
  const [toast, setToast] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // hovered = live state while ⌥ is held — drives the inline tooltip
  const [hovered, setHovered] = useState<HoverState | null>(null);

  // pinnedHover + treeOpen = persistent state after pressing X
  // These are NOT cleared by mouse movement — only by X / Esc / backdrop click
  const [treeOpen, setTreeOpen] = useState(false);
  const [pinnedHover, setPinnedHover] = useState<HoverState | null>(null);

  const [boundaryOn, setBoundaryOn] = useState(false);
  const [rerenderOn, setRerenderOn] = useState(false);

  // clearHover only clears the live hover tooltip — never touches the pinned tree
  const clearHover = useCallback(() => setHovered(null), []);

  const closeTree = useCallback(() => {
    setTreeOpen(false);
    setPinnedHover(null);
  }, []);

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
      }

      if (e.key === 'Escape') {
        setSearchOpen(false);
        setBoundaryOn(false);
        closeTree();
      }

      // B — boundary overlay
      if (e.key === 'b' || e.key === 'B') setBoundaryOn((v) => !v);

      // R — re-render flash
      if (e.key === 'r' || e.key === 'R') setRerenderOn((v) => !v);

      // X — open tree (pin current hover) or close if already open
      if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        if (treeOpen) {
          closeTree();
        } else if (hovered) {
          setPinnedHover(hovered);
          setTreeOpen(true);
        }
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hovered, treeOpen, closeTree]);

  // ─── ⌥ hover → inline breadcrumb tooltip ────────────────────────────────
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!e.altKey) {
        clearHover();
        return;
      }

      const target = e.target as Element;
      const fiber = getFiber(target);
      const formEl = target.closest('form[data-dev-action]');
      const actionName = formEl?.getAttribute('data-dev-action') ?? null;

      if (fiber) {
        const breadcrumb = getBreadcrumb(fiber);
        if (breadcrumb.length > 0) {
          setHovered({ el: target, breadcrumb, actionName });
          return;
        }
      }

      // Fallback: data-dev-src from webpack loader (covers RSC)
      const srcEl = target.closest('[data-dev-src]');
      const srcAttr = srcEl?.getAttribute('data-dev-src');
      if (srcAttr) {
        const parts = srcAttr.split(':');
        const lineNum = parseInt(parts[parts.length - 1], 10);
        const fileName = parts.slice(0, -1).join(':');
        setHovered({
          el: target,
          breadcrumb: [{ name: target.tagName.toLowerCase(), fileName, lineNumber: lineNum }],
          actionName,
        });
        return;
      }

      if (actionName) {
        setHovered({
          el: target,
          breadcrumb: [{ name: target.tagName.toLowerCase() }],
          actionName,
        });
        return;
      }

      clearHover();
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', clearHover);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', clearHover);
    };
  }, [clearHover]);

  // ─── ⌥ + click → open in editor ─────────────────────────────────────────
  useEffect(() => {
    async function onClick(e: MouseEvent) {
      if (!e.altKey) return;
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as Element;
      const fiber = getFiber(target);

      let file: string | null = null;
      let line = 1;
      let column = 1;

      if (fiber) {
        const src = getSourceFromFiber(fiber);
        if (src) {
          file = src.fileName;
          line = src.lineNumber;
          column = src.columnNumber;
        }
      }

      if (!file) {
        const srcEl = target.closest('[data-dev-src]');
        if (srcEl) {
          const raw = srcEl.getAttribute('data-dev-src')!;
          const parts = raw.split(':');
          line = parseInt(parts[parts.length - 1], 10);
          file = parts.slice(0, -1).join(':');
        }
      }

      if (!file) {
        setToast('No source info — add withDevToolbar() to next.config');
        return;
      }

      // Show optimistic toast with short path, then replace with error if it fails
      const shortPath = file.replace(/\\/g, '/').split('/').slice(-3).join('/');
      setToast(`Opening ${shortPath}:${line}…`);
      const err = await openInEditor(file, line, column);
      if (err) setToast(`Error: ${err}`);
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return (
    <>
      <style>{`
        @keyframes devFadeIn  { from { opacity:0;transform:translateX(-50%) translateY(6px) } to { opacity:1;transform:translateX(-50%) translateY(0) } }
        @keyframes devSlideIn { from { opacity:0;transform:translateY(-8px) } to { opacity:1;transform:translateY(0) } }
        @keyframes devPulse   { 0%,100%{opacity:.6}50%{opacity:1} }
      `}</style>

      {/* ── Toolbar badge ──────────────────────────────────────────────────── */}
      <div
        data-dev-toolbar
        title={[
          'next-dev-toolbar',
          '⌥+click  open in editor',
          '⌥+hover  breadcrumb  (X to pin tree)',
          '/  search',
          'B  boundary overlay',
          'R  re-render flash',
        ].join('  ·  ')}
        onClick={() => setSearchOpen(true)}
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 99996,
          background: '#111',
          border: `1px solid ${boundaryOn || rerenderOn || treeOpen ? '#6ee7b7' : '#2a2a2a'}`,
          borderRadius: 20,
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          fontSize: 11,
          color: '#555',
          fontFamily: 'monospace',
          fontWeight: 600,
          boxShadow: '0 2px 12px rgba(0,0,0,.4)',
          userSelect: 'none',
          transition: 'all .2s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = '#6ee7b7';
          (e.currentTarget as HTMLElement).style.color = '#6ee7b7';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor =
            boundaryOn || rerenderOn || treeOpen ? '#6ee7b7' : '#2a2a2a';
          (e.currentTarget as HTMLElement).style.color = '#555';
        }}
      >
        <span style={{ animation: 'devPulse 2s infinite' }}>⌥</span>
        <span>DEV</span>
        <span style={{ color: '#2a2a2a' }}>|</span>
        <span>/ search</span>
        {boundaryOn && <span style={{ color: '#34d399', fontSize: 10 }}>B</span>}
        {rerenderOn && <span style={{ color: 'rgba(239,68,68,.9)', fontSize: 10 }}>R</span>}
        {treeOpen && <span style={{ color: '#6ee7b7', fontSize: 10 }}>tree</span>}
      </div>

      {/* ── Feature panels ─────────────────────────────────────────────────── */}

      {/* Inline hover tooltip (disappears when ⌥ released) */}
      {hovered && !treeOpen && (
        <HoverOutline
          target={hovered.el}
          breadcrumb={hovered.breadcrumb}
          actionName={hovered.actionName}
        />
      )}

      {/* Persistent tree panel (stays until X / Esc / backdrop) */}
      {treeOpen && pinnedHover && (
        <TreePanel
          breadcrumb={pinnedHover.breadcrumb}
          actionName={pinnedHover.actionName}
          targetEl={pinnedHover.el}
          onClose={closeTree}
        />
      )}

      {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
      <BoundaryOverlay enabled={boundaryOn} />
      <RerenderFlash enabled={rerenderOn} />
    </>
  );
}
