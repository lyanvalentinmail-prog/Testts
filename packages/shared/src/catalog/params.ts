import type { ParamDef, ParamGroup, ParamType, ParamWidget, ParamValue } from '../types.js';

interface ParamOptions {
  in?: ParamDef['in'];
  type?: ParamType;
  label?: string;
  description?: string;
  required?: boolean;
  default?: ParamValue;
  example?: ParamValue;
  enumValues?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  step?: number;
  widget?: ParamWidget;
  accept?: string;
  group?: ParamGroup;
  aliases?: string[];
  advanced?: boolean;
  hint?: string;
}

/** Crea una definición de parámetro con valores por defecto sensatos. */
export function param(name: string, options: ParamOptions = {}): ParamDef {
  const def: ParamDef = {
    name,
    in: options.in ?? 'query',
    type: options.type ?? 'string',
    label: options.label ?? name,
    description: options.description ?? '',
    required: options.required ?? false,
  };
  if (options.default !== undefined) def.default = options.default;
  if (options.example !== undefined) def.example = options.example;
  if (options.enumValues) {
    def.enumValues = options.enumValues;
    def.type = options.type ?? 'enum';
    def.widget = options.widget ?? 'select';
  }
  if (options.minimum !== undefined) def.minimum = options.minimum;
  if (options.maximum !== undefined) def.maximum = options.maximum;
  if (options.minLength !== undefined) def.minLength = options.minLength;
  if (options.maxLength !== undefined) def.maxLength = options.maxLength;
  if (options.pattern) def.pattern = options.pattern;
  if (options.step !== undefined) def.step = options.step;
  if (options.widget) def.widget = options.widget;
  if (options.accept) def.accept = options.accept;
  if (options.group) def.group = options.group;
  if (options.aliases) def.aliases = options.aliases;
  if (options.advanced) def.advanced = true;
  if (options.hint) def.hint = options.hint;
  return def;
}

export const textParam = (name = 'text', example = 'Hola mundo', extra: ParamOptions = {}): ParamDef =>
  param(name, {
    type: 'text',
    label: 'Texto',
    description: 'Texto que se dibuja en la plantilla. Admite varias líneas y se ajusta automáticamente.',
    example,
    default: example,
    minLength: 1,
    maxLength: 220,
    widget: 'textarea',
    required: true,
    group: 'Contenido',
    aliases: name === 'text' ? ['texto', 'q', 'mensaje', 'message'] : undefined,
    ...extra,
  });

export const imageParam = (name = 'image', description = 'URL pública de una imagen (JPG, PNG, WebP o GIF) o data URI base64.', extra: ParamOptions = {}): ParamDef =>
  param(name, {
    type: 'image',
    label: name === 'image' ? 'Imagen' : `Imagen ${name.replace('image', '')}`,
    description,
    example: '',
    widget: 'image',
    group: 'Contenido',
    maxLength: 4096,
    aliases: name === 'image' ? ['imagen', 'url', 'avatar', 'foto', 'img'] : undefined,
    ...extra,
  });

export const textColorParam = (extra: ParamOptions = {}): ParamDef =>
  param('color', {
    type: 'color',
    label: 'Color del texto',
    description: 'Color del texto en hexadecimal (#ffffff) o nombre CSS (white, tomato…).',
    default: '#111111',
    example: '#111111',
    pattern: '^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20}|rgba?\\([^)]*\\))$',
    widget: 'color',
    group: 'Estilo',
    ...extra,
  });

export const backgroundParam = (defaultColor = '#ffffff', extra: ParamOptions = {}): ParamDef =>
  param('background', {
    type: 'color',
    label: 'Fondo',
    description: 'Color de relleno de la zona de contenido.',
    default: defaultColor,
    example: defaultColor,
    pattern: '^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20}|rgba?\\([^)]*\\))$',
    widget: 'color',
    group: 'Estilo',
    aliases: ['fondo', 'bg'],
    ...extra,
  });

export const fontSizeParam = (min = 10, max = 160, def = 42, extra: ParamOptions = {}): ParamDef =>
  param('fontSize', {
    type: 'integer',
    label: 'Tamaño de fuente',
    description: 'Tamaño de la tipografía principal en píxeles (sobre el ancho de referencia).',
    default: def,
    example: def,
    minimum: min,
    maximum: max,
    widget: 'slider',
    group: 'Estilo',
    ...extra,
  });

export const widthParam = (def: number, extra: ParamOptions = {}): ParamDef =>
  param('width', {
    type: 'integer',
    label: 'Ancho',
    description: 'Ancho de salida en píxeles.',
    default: def,
    example: def,
    minimum: 120,
    maximum: 2048,
    widget: 'slider',
    group: 'Salida',
    ...extra,
  });

export const heightParam = (def: number, extra: ParamOptions = {}): ParamDef =>
  param('height', {
    type: 'integer',
    label: 'Alto',
    description: 'Alto de salida en píxeles.',
    default: def,
    example: def,
    minimum: 120,
    maximum: 2048,
    widget: 'slider',
    group: 'Salida',
    ...extra,
  });

export const formatParam = (formats = ['png', 'jpeg', 'webp', 'svg'], def = 'png'): ParamDef =>
  param('format', {
    type: 'enum',
    label: 'Formato',
    description: `Formato del archivo generado: ${formats.join(', ')}.`,
    enumValues: formats,
    default: def,
    example: def,
    widget: 'select',
    group: 'Salida',
    aliases: ['formato'],
  });

export const qualityParam = (def = 90): ParamDef =>
  param('quality', {
    type: 'integer',
    label: 'Calidad',
    description: 'Calidad de compresión para JPEG y WebP (1-100). Se ignora en PNG y SVG.',
    default: def,
    example: def,
    minimum: 1,
    maximum: 100,
    widget: 'slider',
    group: 'Salida',
    advanced: true,
  });

export const downloadParam = (): ParamDef =>
  param('download', {
    type: 'boolean',
    label: 'Forzar descarga',
    description: 'Si es true, la respuesta incluye Content-Disposition: attachment.',
    default: false,
    example: false,
    widget: 'toggle',
    group: 'Salida',
    advanced: true,
  });

export const limitParam = (def = 10, max = 25, extra: ParamOptions = {}): ParamDef =>
  param('limit', {
    type: 'integer',
    label: 'Límite',
    description: `Número máximo de resultados (1-${max}).`,
    default: def,
    example: def,
    minimum: 1,
    maximum: max,
    widget: 'slider',
    group: 'Filtros',
    aliases: ['limite'],
    ...extra,
  });

export const pageParam = (def = 1, max = 100): ParamDef =>
  param('page', {
    type: 'integer',
    label: 'Página',
    description: 'Número de página (empezando en 1).',
    default: def,
    example: def,
    minimum: 1,
    maximum: max,
    group: 'Filtros',
    aliases: ['pagina'],
    advanced: true,
  });

export const queryParam = (example = 'naruto', extra: ParamOptions = {}): ParamDef =>
  param('q', {
    type: 'string',
    label: 'Búsqueda',
    description: 'Término de búsqueda.',
    required: true,
    example,
    default: example,
    minLength: 1,
    maxLength: 120,
    group: 'Contenido',
    aliases: ['query', 'buscar', 'texto', 'search'],
    ...extra,
  });
