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

export interface InspectableFiberInfo {
  fiber: any;
  componentName: string;
  props: Record<string, unknown>;
  source: DebugSource | null;
}

const INTERNAL_PROP_NAMES = new Set(['__self', '__source']);

function getFiberDisplayName(type: any): string | null {
  if (!type) return null;

  if (typeof type === 'function') {
    return type.displayName || type.name || null;
  }

  if (typeof type === 'object') {
    if (typeof type.displayName === 'string' && type.displayName) return type.displayName;
    if (typeof type.render === 'function') {
      return type.render.displayName || type.render.name || null;
    }
    if (typeof type.type === 'function') {
      return type.type.displayName || type.type.name || null;
    }
  }

  return null;
}

function sanitizeProps(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      ([key]) => !INTERNAL_PROP_NAMES.has(key),
    ),
  );
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
    const name = getFiberDisplayName(n.type);
    if (name) return name;
    n = n.return;
  }
  return null;
}

export function getSourceFromElement(el: Element): DebugSource | null {
  const srcEl = el.closest('[data-dev-src]');
  const raw = srcEl?.getAttribute('data-dev-src');
  if (!raw) return null;

  const parts = raw.split(':');
  const lineNumber = parseInt(parts[parts.length - 1], 10);
  const fileName = parts.slice(0, -1).join(':');
  if (!fileName || Number.isNaN(lineNumber)) return null;

  return {
    fileName,
    lineNumber,
    columnNumber: 1,
  };
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
    const name = getFiberDisplayName(n.type);
    if (name && !seen.has(name)) {
      if (SKIP_NAMES.has(name) || name.startsWith('_')) {
        n = n.return;
        continue;
      }
      const src = n._debugSource;
      items.push({
        name,
        fileName: src?.fileName,
        lineNumber: src?.lineNumber,
      });
      seen.add(name);
    }
    n = n.return;
  }

  // Reverse so it reads root → leaf
  items.reverse();
  return items;
}

export function getInspectableFiber(target: Element | any): InspectableFiberInfo | null {
  let n = target instanceof Element ? getFiber(target) : target;

  while (n) {
    const componentName = getFiberDisplayName(n.type);
    if (componentName && !SKIP_NAMES.has(componentName) && !componentName.startsWith('_')) {
      return {
        fiber: n,
        componentName,
        props: sanitizeProps(n.memoizedProps),
        source: n._debugSource?.fileName ? n._debugSource : getSourceFromFiber(n),
      };
    }
    n = n.return;
  }

  return null;
}
