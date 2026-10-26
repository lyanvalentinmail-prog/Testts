/** Arranque del servidor Node (Render, Docker o local). */
import { createApp } from './app.js';
import { config } from './config.js';
import { ENDPOINTS, CANVASES } from '@velora/shared';
import { healthcheckAssets } from './routes/system.js';
import { verifyCatalogCoverage } from './routes/registry.js';

const app = createApp();

const server = app.listen(config.port, config.host, async () => {
  const assets = await healthcheckAssets();
  console.log('');
  console.log(`  ⚡ Velora API v${config.version} · ${config.nodeEnv}`);
  console.log(`  ▸ Servidor     http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}`);
  console.log(`  ▸ Health       /api/health`);
  console.log(`  ▸ Catálogo     /api/endpoints`);
  console.log(`  ▸ OpenAPI 3.1  /api/openapi.json`);
  console.log(`  ▸ ${ENDPOINTS.length} endpoints · ${CANVASES.length} canvas`);
  console.log(`  ▸ Assets       ${assets.ok ? assets.detail : `⚠ ${assets.detail}`}`);
  const coverage = verifyCatalogCoverage();
  if (!coverage.ok) {
    console.warn('  ▸ ⚠ Cobertura del catálogo:', { faltan: coverage.missing, sobran: coverage.extra });
  }
  if (config.serveFrontend) console.log(`  ▸ Web          ${config.frontendDir}`);
  if (config.secrets.apiKey) console.log('  ▸ API key      activa (cabecera X-API-Key)');
  console.log('');
});

function shutdown(signal: string): void {
  console.log(`\n[velora] recibido ${signal}, cerrando el servidor…`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[velora] promesa rechazada sin manejar:', reason);
});
