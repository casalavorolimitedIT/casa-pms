'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchSearch, openInEditor } from '../lib/sidecar';
import type { SearchResult } from '../lib/sidecar';

export function SearchPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await fetchSearch(query));
        setActive(0);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }, 200);
  }, [query]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, results.length - 1));
    if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
    if (e.key === 'Enter' && results[active]) {
      openInEditor(results[active].file, results[active].line);
      onClose();
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99998,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        background: 'rgba(0,0,0,.6)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
          background: '#111',
          border: '1px solid #2a2a2a',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,.8)',
          animation: 'devSlideIn .15s ease',
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid #1e1e1e',
          }}
        >
          <span style={{ color: '#555', marginRight: 8 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search components, text, file names…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#e4e4e7',
              fontSize: 14,
              fontFamily: 'inherit',
            }}
          />
          {loading && (
            <span style={{ color: '#555', fontSize: 11 }}>searching…</span>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul
            style={{
              margin: 0,
              padding: '6px 0',
              listStyle: 'none',
              maxHeight: 380,
              overflowY: 'auto',
            }}
          >
            {results.map((r, i) => {
              const shortFile = r.file
                .replace(/\\/g, '/')
                .split('/')
                .slice(-3)
                .join('/');
              return (
                <li
                  key={`${r.file}:${r.line}:${i}`}
                  onClick={() => {
                    openInEditor(r.file, r.line);
                    onClose();
                  }}
                  onMouseEnter={() => setActive(i)}
                  style={{
                    padding: '8px 16px',
                    cursor: 'pointer',
                    background: i === active ? '#1c1c1c' : 'transparent',
                    borderLeft: `2px solid ${i === active ? '#6ee7b7' : 'transparent'}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    {r.componentName && (
                      <span
                        style={{
                          color: '#6ee7b7',
                          fontSize: 11,
                          fontFamily: 'monospace',
                          fontWeight: 700,
                        }}
                      >
                        {r.componentName}
                      </span>
                    )}
                    <span
                      style={{
                        color: '#555',
                        fontSize: 11,
                        fontFamily: 'monospace',
                      }}
                    >
                      {shortFile}
                      <span style={{ color: '#3a3a3a' }}>:{r.line}</span>
                    </span>
                  </div>
                  <div
                    style={{
                      color: '#6b7280',
                      fontSize: 11,
                      fontFamily: 'monospace',
                      marginTop: 2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {r.preview.trim()}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {query && !loading && results.length === 0 && (
          <div
            style={{
              padding: '24px 16px',
              color: '#555',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            No results for &ldquo;{query}&rdquo;
          </div>
        )}

        {/* Footer hints */}
        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid #1a1a1a',
            display: 'flex',
            gap: 12,
            color: '#3a3a3a',
            fontSize: 10,
          }}
        >
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>⌥ + click any element</span>
        </div>
      </div>
    </div>
  );
}
