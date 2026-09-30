import { build } from 'esbuild';
import { config } from 'dotenv';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });
const api = new URL(process.env.MY_VIEW_API_URL || 'http://localhost:3000');
if (api.protocol !== 'https:' && !['localhost','127.0.0.1'].includes(api.hostname)) throw new Error('Use HTTPS for the deployed API');
const publishableKey = process.env.CLERK_PUBLISHABLE_KEY || '';
const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
// Chrome host match patterns cover the host; the API URL still pins its port.
manifest.host_permissions = [`${api.protocol}//${api.hostname}/*`];
if (publishableKey) {
  const domain = Buffer.from(publishableKey.replace(/^pk_(test|live)_/, ''), 'base64').toString().replace(/\$$/, '');
  if (!/^[a-z0-9.-]+$/i.test(domain)) throw new Error('Invalid Clerk publishable key');
  manifest.host_permissions.push(`https://${domain}/*`);
}
if (process.env.EXTENSION_PUBLIC_KEY) manifest.key = process.env.EXTENSION_PUBLIC_KEY;
await mkdir('dist', { recursive: true });
await writeFile('dist/manifest.json', JSON.stringify(manifest, null, 2));
await copyFile('sidepanel.html', 'dist/sidepanel.html');
const common = { bundle: true, target: 'chrome116', minify: true, define: { __API_URL__: JSON.stringify(api.origin), __CLERK_KEY__: JSON.stringify(publishableKey), 'process.env.NODE_ENV': '"production"' } };
await build({ ...common, entryPoints: ['src/background/index.ts'], outfile: 'dist/background.js', format: 'esm' });
await build({ ...common, entryPoints: ['src/content/index.ts'], outfile: 'dist/content.js', format: 'iife' });
await build({ ...common, entryPoints: ['src/sidepanel/index.tsx'], outfile: 'dist/sidepanel.js', format: 'esm' });
execFileSync(process.execPath, ['node_modules/@tailwindcss/cli/dist/index.mjs', '-i', '../../packages/ui/src/styles.css', '-o', 'dist/sidepanel.css', '--minify'], { stdio: 'inherit' });
console.log(`Extension ready: apps/extension/dist (${api.origin})`);
