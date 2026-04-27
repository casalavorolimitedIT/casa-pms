import type { ParsedPropDescriptor, PropsDefinitionSource } from './sidecar';

export interface PropsPanelRow {
  name: string;
  type: string;
  valuePreview: string;
  required: boolean;
  missing: boolean;
  hasLiveValue: boolean;
  source: ParsedPropDescriptor['source'] | 'runtime';
}

export interface PropsPanelData {
  componentName: string;
  file: string | null;
  line: number;
  rows: PropsPanelRow[];
  schemaSource: PropsDefinitionSource;
  missingRequiredCount: number;
  livePropsAvailable: boolean;
  loading: boolean;
  note: string | null;
}

interface BuildPropsPanelDataOptions {
  componentName: string;
  file: string | null;
  line: number;
  schemaProps?: ParsedPropDescriptor[];
  liveProps?: Record<string, unknown>;
  schemaSource?: PropsDefinitionSource;
  loading?: boolean;
  note?: string | null;
}

function hasOwn(obj: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function truncate(value: string, max = 44) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function isReactElementLike(value: unknown): value is { type?: unknown } {
  return Boolean(
    value &&
      typeof value === 'object' &&
      '$$typeof' in (value as Record<string, unknown>) &&
      'type' in (value as Record<string, unknown>),
  );
}

function getElementTypeName(value: { type?: unknown }) {
  if (typeof value.type === 'string') return value.type;
    if (typeof value.type === 'function') {
      const typedFn = value.type as Function & { displayName?: string };
      return typedFn.displayName || typedFn.name || 'Anonymous';
    }
  if (value.type && typeof value.type === 'object') {
    const typeRecord = value.type as Record<string, unknown>;
    if (typeof typeRecord.displayName === 'string') return typeRecord.displayName;
    if (typeof typeRecord.render === 'function') {
        const typedRender = typeRecord.render as Function & { displayName?: string };
        return typedRender.displayName || typedRender.name || 'Anonymous';
    }
  }
  return 'Anonymous';
}

export function inferRuntimeType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (isReactElementLike(value)) return 'ReactElement';
  if (value instanceof Date) return 'Date';
  if (value instanceof RegExp) return 'RegExp';

  switch (typeof value) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'bigint':
      return 'bigint';
    case 'symbol':
      return 'symbol';
    case 'function':
      return 'function';
    case 'undefined':
      return 'undefined';
    case 'object':
      return 'object';
    default:
      return 'unknown';
  }
}

export function formatPropValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (typeof value === 'string') return truncate(JSON.stringify(value));
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (typeof value === 'symbol') return truncate(String(value));
  if (typeof value === 'function') {
    return value.name ? `fn ${value.name}()` : 'function';
  }
  if (value instanceof Date) return value.toISOString();
  if (value instanceof RegExp) return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const preview = value.slice(0, 3).map((item) => formatPropValue(item)).join(', ');
    return truncate(`[${preview}${value.length > 3 ? ', …' : ''}]`);
  }
  if (isReactElementLike(value)) {
    return `<${getElementTypeName(value)} />`;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length === 0) return '{}';
    const preview = keys.slice(0, 3).map((key) => `${key}: ${formatPropValue(record[key])}`).join(', ');
    return truncate(`{ ${preview}${keys.length > 3 ? ', …' : ''} }`);
  }

  return truncate(String(value));
}

function buildRow(
  name: string,
  schema: ParsedPropDescriptor | undefined,
  liveProps: Record<string, unknown>,
): PropsPanelRow {
  const hasLiveValue = hasOwn(liveProps, name);
  const liveValue = hasLiveValue ? liveProps[name] : undefined;
  const missing = Boolean(schema?.required) && (!hasLiveValue || liveValue === undefined);

  return {
    name,
    type: schema?.type || (hasLiveValue ? inferRuntimeType(liveValue) : 'unknown'),
    valuePreview: missing ? 'missing' : hasLiveValue ? formatPropValue(liveValue) : '—',
    required: Boolean(schema?.required),
    missing,
    hasLiveValue,
    source: schema?.source || 'runtime',
  };
}

export function buildPropsPanelData({
  componentName,
  file,
  line,
  schemaProps = [],
  liveProps = {},
  schemaSource = 'unknown',
  loading = false,
  note = null,
}: BuildPropsPanelDataOptions): PropsPanelData {
  const rows: PropsPanelRow[] = [];
  const seen = new Set<string>();
  const safeLiveProps = liveProps ?? {};

  for (const schema of schemaProps) {
    rows.push(buildRow(schema.name, schema, safeLiveProps));
    seen.add(schema.name);
  }

  for (const name of Object.keys(safeLiveProps).sort()) {
    if (seen.has(name)) continue;
    rows.push(buildRow(name, undefined, safeLiveProps));
  }

  return {
    componentName,
    file,
    line,
    rows,
    schemaSource,
    missingRequiredCount: rows.filter((row) => row.missing).length,
    livePropsAvailable: Object.keys(safeLiveProps).length > 0,
    loading,
    note,
  };
}