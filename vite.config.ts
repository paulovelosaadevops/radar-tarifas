import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Rotas /api/* → mesmo código das funções da Vercel (pasta api/)
const API_ROUTES: Record<string, string> = {
  '/api/ai': '/server/ai.ts',
  '/api/precos': '/server/prices.ts',
  '/api/cota': '/server/quota.ts',
};

// Em desenvolvimento, serve as rotas /api/* sem precisar da Vercel
function devApi(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      for (const [route, file] of Object.entries(API_ROUTES)) {
        server.middlewares.use(route, async (req, res) => {
          const method = req.method ?? 'GET';
          const mod = await server.ssrLoadModule(file);
          const handler = mod[method];
          if (typeof handler !== 'function') {
            res.statusCode = 405;
            res.end();
            return;
          }

          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);

          const response: Response = await handler(
            new Request(`http://localhost${req.originalUrl}`, {
              method,
              headers: { 'Content-Type': req.headers['content-type'] ?? 'application/json' },
              body: method === 'GET' || method === 'HEAD' ? undefined : Buffer.concat(chunks),
            }),
          );

          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(await response.text());
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  // Disponibiliza APINEX_* e SERPAPI_* (de .env.local) só para o código do servidor
  Object.assign(process.env, loadEnv(mode, process.cwd(), ['APINEX_', 'SERPAPI_']));

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
