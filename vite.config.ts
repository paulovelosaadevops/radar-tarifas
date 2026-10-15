import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Em desenvolvimento, serve /api/ai com o mesmo código da função da Vercel
function devApi(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);

        const { POST } = await server.ssrLoadModule('/server/ai.ts');
        const response: Response = await POST(
          new Request(`http://localhost${req.originalUrl}`, {
            method: 'POST',
            headers: { 'Content-Type': req.headers['content-type'] ?? 'application/json' },
            body: Buffer.concat(chunks),
          }),
        );

        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(await response.text());
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Disponibiliza APINEX_* (de .env.local) só para o código do servidor
  Object.assign(process.env, loadEnv(mode, process.cwd(), 'APINEX_'));

  const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

  return {
    define: { __APP_VERSION__: JSON.stringify(version) },
    plugins: [
      react(),
      devApi(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        // O manifest é mantido à mão em public/manifest.webmanifest
        manifest: false,
        includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'logo.svg', 'icons/*.png'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
  };
});
