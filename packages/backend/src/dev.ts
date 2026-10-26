/**
 * Servidor de desarrollo.
 *
 * Se ejecuta con `npm run dev:api` (tsx watch). No sirve el frontend: Vite se
 * encarga de eso y reenvía /api a este proceso.
 */
import { createApp } from './app.js';
import { config } from './config.js';
import { ENDPOINTS, CANVASES } from '@velora/shared';

const app = createApp();

app.listen(config.port, config.host, () => {
  console.log('');
  console.log(`  ⚡ Velora API (dev) · ${config.nodeEnv}`);
  console.log(`  ▸ http://localhost:${config.port}/api/health`);
  console.log(`  ▸ ${ENDPOINTS.length} endpoints · ${CANVASES.length} canvas`);
  console.log('');
});
