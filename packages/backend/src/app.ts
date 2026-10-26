import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';
import { config } from './config.js';
import { apiKeyGuard, applySecurity } from './middleware/setup.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { apiRouter } from './routes/index.js';

/**
 * Fábrica de la aplicación Express.
 *
 * Se usa en tres contextos:
 *   · `src/server.ts`      → servidor Node en Render o local (sirve la web).
 *   · `api/index.mjs`      → función serverless en Vercel.
 *   · pruebas              → instancia en memoria con supertest-like fetch.
 */
export function createApp(): Express {
  const app = express();
  applySecurity(app);

  app.use('/api', apiKeyGuard, apiRouter);

  // Frontend compilado (Render sirve la web y la API desde el mismo servicio).
  const frontendDir = config.frontendDir;
  const hasFrontend = existsSync(path.join(frontendDir, 'index.html'));
  if (config.serveFrontend && hasFrontend) {
    app.use(
      express.static(frontendDir, {
        maxAge: '7d',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
        },
      })
    );
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
      return res.sendFile(path.join(frontendDir, 'index.html'));
    });
  } else if (config.serveFrontend) {
    app.get('/', (_req, res) => {
      res.type('text/plain').send(
        [
          'Velora API — el frontend no está compilado.',
          '',
          'Ejecuta `npm run build` (o `npm run dev:web` en otra terminal) para servir la web.',
          'La API ya está disponible:',
          '  · GET /api/health',
          '  · GET /api/endpoints',
          '  · GET /api/openapi.json',
        ].join('\n')
      );
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
