// ─── React Fiber utilities ────────────────────────────────────────────────────

export function getFiber(el: Element): any {
  const key = Object.keys(el).find(
    (k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternals'),
  );
  return key ? (el as any)[key] : null;
}

export interface DebugSource {
  fileName: string;
  lineNumber: number;
  columnNumber: number;
}

export function getSourceFromFiber(fiber: any): DebugSource | null {
  let n = fiber;
  while (n) {
    if (n._debugSource?.fileName) return n._debugSource;
    n = n.return;
  }
  return null;
}

export function getComponentName(fiber: any): string | null {
  let n = fiber;
  while (n) {
    const t = n.type;
    if (typeof t === 'function' && t.name) return t.name;
    n = n.return;
  }
  return null;
}

/** One item in the component tree, with optional source location for click-to-source. */
export interface BreadcrumbItem {
  name: string;
  fileName?: string;
  lineNumber?: number;
}

const SKIP_NAMES = new Set(['DevToolbar', 'Suspense', 'ErrorBoundary']);

/**
 * Walk the fiber tree upward and return components from root → leaf,
 * each with their source location so tree rows are clickable.
 */
export function getBreadcrumb(fiber: any): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [];
  const seen = new Set<string>();
  let n = fiber;

  // Collect the leaf DOM element tag first
  const startType = fiber?.type;
  if (typeof startType === 'string') {
    const src = fiber?._debugSource;
    items.push({
      name: startType,
      fileName: src?.fileName,
      lineNumber: src?.lineNumber,
    });
    seen.add(startType);
  }

  // Walk upward collecting named components
  n = fiber?.return;
  while (n) {
    const t = n.type;
    if (typeof t === 'function' && t.name && !seen.has(t.name)) {
      if (SKIP_NAMES.has(t.name) || t.name.startsWith('_')) {
        n = n.return;
        continue;
      }
      const src = n._debugSource;
      items.push({
        name: t.name,
        fileName: src?.fileName,
        lineNumber: src?.lineNumber,
      });
      seen.add(t.name);
    }
    n = n.return;
  }

  // Reverse so it reads root → leaf
  items.reverse();
  return items;
}
