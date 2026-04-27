/* eslint-disable @typescript-eslint/no-explicit-any */
// next-dev-toolbar — optional dev dep (safely skipped if not installed)
/* eslint-disable @typescript-eslint/no-require-imports */
let _devWrap: (c: any) => any = (c: any) => c;
try { _devWrap = require('next-dev-toolbar/plugin').withDevToolbar(); } catch {}
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
  },
};

export default _devWrap(nextConfig);
