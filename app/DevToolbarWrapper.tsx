'use client';
import { DevToolbar } from './__next_dev_toolbar__/DevToolbar';
export function DevToolbarWrapper() {
  if (process.env.NODE_ENV !== 'development') return null;
  return <DevToolbar />;
}
