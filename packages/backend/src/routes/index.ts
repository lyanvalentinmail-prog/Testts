import { Router } from 'express';
import { animeRouter } from './anime.js';
import { canvasRouter } from './canvas.js';
import { downloadRouter } from './download.js';
import { searchRouter } from './search.js';
import { systemRouter } from './system.js';
import { utilsRouter } from './utils.js';

/**
 * Router raíz de la API. Cada subrouter corresponde a una categoría del
 * catálogo; la validación de parámetros se aplica por ruta con
 * `validateQuery(<id del endpoint>)`.
 */
export const apiRouter = Router();

apiRouter.use(systemRouter);
apiRouter.use('/canvas', canvasRouter);
apiRouter.use('/anime', animeRouter);
apiRouter.use('/search', searchRouter);
apiRouter.use('/download', downloadRouter);
apiRouter.use('/utils', utilsRouter);
