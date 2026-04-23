import { withDevToolbar } from 'next-dev-toolbar/plugin';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
  },
};

export default withDevToolbar()(nextConfig);
