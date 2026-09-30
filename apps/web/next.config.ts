import type { NextConfig } from 'next';
const config: NextConfig = { transpilePackages: ['@my-view/shared', '@my-view/db', '@my-view/ui'] };
export default config;
