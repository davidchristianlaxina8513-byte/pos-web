import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';

const webRoot = fileURLToPath(new URL('.', import.meta.url));

const nextConfig: NextConfig = {
  turbopack: { root: webRoot },
};

export default nextConfig;
