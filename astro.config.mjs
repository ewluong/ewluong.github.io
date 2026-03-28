import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  integrations: [svelte(), sitemap()],
  output: 'static',
  site: 'https://ewluong.com',
});
