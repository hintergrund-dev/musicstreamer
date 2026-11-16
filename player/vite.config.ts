import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

// Configuration comes from PUBLIC_* variables (see .env.example), inlined at build time.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'PUBLIC_'), ...process.env };
  return {
    define: {
      __APPVIEW_URL__: JSON.stringify(env.PUBLIC_APPVIEW_URL ?? 'https://musicstreamer.eu'),
      __APP_URL__: JSON.stringify(env.PUBLIC_APP_URL ?? 'https://app.musicstreamer.eu'),
      __STORE_BUILD__: JSON.stringify(env.PUBLIC_STORE_BUILD === '1'),
    },
    plugins: [
      sveltekit({
        adapter: adapter({ fallback: 'index.html' }),
        serviceWorker: { register: false },
        prerender: { entries: ['/oauth/client-metadata.json', '/oauth/client-metadata-native.json'] },
      }),
    ],
  };
});
