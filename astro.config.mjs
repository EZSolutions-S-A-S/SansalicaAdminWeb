// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: netlify(),
  integrations: [react()],
  // We roll our own auth/session handling via httpOnly JWT cookies
  // (src/repositories/session.ts) — Astro's built-in Sessions API is unused,
  // so skip the adapter's automatic Netlify Blobs wiring for it.
  session: false,
});
