import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import {
  CANVASES,
  CANVAS_BY_SLUG,
  CANVAS_GROUPS,
  endpointById,
  validateParams,
  type CanvasGroup,
  type ParamValue,
} from '@velora/shared';
import { config } from '../config.js';
import { renderCanvas } from '../canvases/engine.js';
import { validateQuery } from '../middleware/validate.js';
import { loadTemplate, templateFilePath } from '../lib/assets.js';
import { ApiError } from '../lib/errors.js';
import { renderImage, type ImageFormat } from '../lib/image.js';
import { binary, ok } from '../lib/respond.js';
import { safeFilename } from '../lib/text.js';

export const canvasRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.uploads.maxBytes, files: config.uploads.maxFiles },
});

function canvasFromSlug(slug: string) {
  const canvas = CANVAS_BY_SLUG[slug];
  if (!canvas) {
    throw ApiError.notFound(`El canvas «${slug}» no existe.`, {
      disponibles: CANVASES.map((item) => item.slug),
    });
  }
  return canvas;
}

/** Comprueba que el canvas exista en el catálogo. */
const validateCanvasSlug = (req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction) => {
  const slug = String(req.params.slug ?? '');
  if (!CANVAS_BY_SLUG[slug]) {
    return next(
      ApiError.notFound(`El canvas «${slug}» no existe.`, {
        pista: 'Consulta GET /api/canvas para ver los canvas disponibles.',
      })
    );
  }
  return next();
};

/** Valida la query usando la definición del canvas indicado en la ruta. */
const validateCanvas = (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) =>
  validateCanvasSlug(req, res, () => validateQuery(`canvas.${req.params.slug}`)(req, res, next));

function parseFormat(value: unknown): ImageFormat {
  const format = String(value ?? 'png').toLowerCase();
  const normalized = format === 'jpg' ? 'jpeg' : format;
  if (!['png', 'jpeg', 'webp', 'svg'].includes(normalized)) {
    throw ApiError.badRequest('El formato debe ser png, jpeg, webp o svg.', { formato: value });
  }
  return normalized as ImageFormat;
}

/** Índice de canvas con vista previa y parámetros. */
canvasRouter.get('/', validateQuery('system.canvases'), (req, res) => {
  const group = typeof req.query.group === 'string' ? (req.query.group as CanvasGroup) : undefined;
  if (group && !(group in CANVAS_GROUPS)) {
    throw ApiError.badRequest(`El grupo «${group}» no existe.`, { disponibles: Object.keys(CANVAS_GROUPS) });
  }
  const rows = CANVASES.filter((canvas) => !group || canvas.group === group).map((canvas) => {
    const endpoint = endpointById(`canvas.${canvas.slug}`);
    return {
      slug: canvas.slug,
      title: canvas.title,
      description: canvas.description,
      group: canvas.group,
      groupLabel: CANVAS_GROUPS[canvas.group].label,
      width: canvas.width,
      height: canvas.height,
      animated: canvas.slug === 'bratvideo' || canvas.slug === 'attp',
      template: canvas.template,
      origin: canvas.origin,
      preview: `/api/canvas/${canvas.slug}/preview`,
      endpoint: `/api/canvas/${canvas.slug}`,
      docs: endpoint ? `/api/endpoints/${endpoint.id}` : null,
      params: canvas.params.map((param) => ({
        name: param.name,
        type: param.type,
        required: param.required,
        description: param.description,
        ...(param.default !== undefined ? { default: param.default } : {}),
        ...(param.enumValues ? { enumValues: param.enumValues } : {}),
      })),
    };
  });

  ok(res, {
    total: rows.length,
    groups: Object.entries(CANVAS_GROUPS).map(([id, info]) => ({
      id,
      label: info.label,
      description: info.description,
      count: CANVASES.filter((canvas) => canvas.group === id).length,
    })),
    canvases: rows,
  });
});

/** Vista previa: la plantilla original, redimensionada. */
canvasRouter.get('/:slug/preview', validateQuery('system.template'), async (req, res) => {
  const canvas = canvasFromSlug(req.params.slug as string);
  const file = await templateFilePath(canvas.template);
  if (!file) throw ApiError.notFound(`La plantilla «${canvas.template}» no está disponible.`);
  const width = Math.min(1280, Math.max(64, Number(req.query.width ?? 480) || 480));

  if (file.mime === 'image/svg+xml') {
    const { readFile } = await import('node:fs/promises');
    return binary(res, await readFile(file.file), file.mime, { cacheSeconds: 86400 });
  }

  const buffer = await sharp(file.file)
    .resize({ width, withoutEnlargement: false })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  return binary(res, buffer, 'image/jpeg', {
    cacheSeconds: 604800,
    filename: `plantilla-${canvas.slug}.jpg`,
  });
});

/** Render de un canvas (GET). */
canvasRouter.get('/:slug', validateCanvas, async (req, res) => {
  const canvas = canvasFromSlug(req.params.slug as string);
  const values: Record<string, ParamValue> = { ...req.query_ };

  const result = await renderCanvas({ canvas, values, baseUrl: req.meta.baseUrl });
  const format = parseFormat(values.format);
  const image = await renderImage(result.svg, {
    width: result.width,
    ...(format === 'png' || format === 'svg' ? { height: result.height } : {}),
    format,
    quality: Number(values.quality ?? 90),
    ...(values.transparent === false ? { background: String(values.background ?? '#ffffff') } : {}),
  });

  const download = values.download === true;
  const filename = `velora-${safeFilename(canvas.slug)}.${image.extension}`;

  res.setHeader('X-Velora-Canvas', canvas.slug);
  res.setHeader('X-Velora-Template', canvas.template);
  res.setHeader('X-Velora-Format', image.format);
  res.setHeader('X-Velora-Dimensions', `${image.width}x${image.height}`);
  if (result.warnings.length) res.setHeader('X-Velora-Warnings', encodeURIComponent(result.warnings.join(' | ')));

  return binary(res, image.buffer, image.mime, {
    filename,
    download,
    cacheSeconds: 3600,
  });
});

/** Render con imágenes subidas (POST multipart o JSON con data URI). */
canvasRouter.post('/:slug', validateCanvasSlug, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
]), async (req, res) => {
  const canvas = canvasFromSlug(req.params.slug as string);
  const endpoint = endpointById(`canvas.${canvas.slug}`);
  if (!endpoint) throw ApiError.internal('El canvas no está registrado en el catálogo.');

  // 1. Query + cuerpo (multipart o JSON) validados juntos: el POST permite
  //    enviar cualquier parámetro como campo del formulario.
  const mergedInput: Record<string, unknown> = {
    ...(req.query as Record<string, unknown>),
    ...(req.body as Record<string, unknown>),
  };
  const { values: bodyValues, errors } = validateParams(endpoint.params, mergedInput);
  if (errors.length) {
    throw ApiError.validation(
      errors.map((error) => ({ parameter: error.parameter, in: 'body', message: error.message }))
    );
  }

  // 2. Archivos subidos.
  const files = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
  const uploads: Record<string, string> = {};
  const { normalizeUpload } = await import('../lib/image.js');
  for (const [field, list] of Object.entries(files)) {
    const file = list?.[0];
    if (!file) continue;
    const normalized = await normalizeUpload(file.buffer, config.uploads.maxBytes);
    uploads[field] = normalized.dataUri;
  }

  // 3. Data URIs enviados en el JSON.
  for (const param of endpoint.params.filter((item) => item.type === 'image')) {
    const raw = bodyValues[param.name];
    if (typeof raw === 'string' && raw.startsWith('data:image/') && !uploads[param.name]) {
      uploads[param.name] = raw;
    }
  }

  const values: Record<string, ParamValue> = { ...bodyValues };
  const result = await renderCanvas({ canvas, values, uploads, baseUrl: req.meta.baseUrl });
  const format = parseFormat(values.format);
  const image = await renderImage(result.svg, {
    width: result.width,
    ...(format === 'png' || format === 'svg' ? { height: result.height } : {}),
    format,
    quality: Number(values.quality ?? 90),
  });

  const filename = `velora-${safeFilename(canvas.slug)}.${image.extension}`;
  res.setHeader('X-Velora-Canvas', canvas.slug);
  res.setHeader('X-Velora-Uploads', String(Object.keys(uploads).length));
  if (result.warnings.length) res.setHeader('X-Velora-Warnings', encodeURIComponent(result.warnings.join(' | ')));

  return binary(res, image.buffer, image.mime, {
    filename,
    download: values.download === true,
    cacheSeconds: 0,
  });
});
