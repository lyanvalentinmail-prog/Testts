/**
 * Tipos compartidos entre backend y frontend.
 *
 * El catálogo es la única fuente de verdad: de aquí salen la documentación,
 * los formularios del explorador, la especificación OpenAPI y los enlaces.
 * Añadir un endpoint = añadir una entrada aquí + registrar su handler.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type CategoryId =
  | 'anime'
  | 'canvas'
  | 'download'
  | 'search'
  | 'utilidades'
  | 'sistema';

export type ParamLocation = 'query' | 'path' | 'body';

export type ParamType =
  | 'string'
  | 'text'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'enum'
  | 'color'
  | 'url'
  | 'image'
  | 'file'
  | 'json';

export type ParamWidget =
  | 'input'
  | 'textarea'
  | 'color'
  | 'select'
  | 'slider'
  | 'toggle'
  | 'file'
  | 'url'
  | 'code'
  | 'image';

export type ParamGroup =
  | 'Contenido'
  | 'Estilo'
  | 'Salida'
  | 'Filtros'
  | 'Fuente'
  | 'Opciones';

export type ParamValue = string | number | boolean;

export interface ParamDef {
  /** Nombre exacto del parámetro en la petición. */
  name: string;
  /** Dónde viaja: query string, segmento de ruta o cuerpo JSON. */
  in: ParamLocation;
  type: ParamType;
  /** Etiqueta corta que se muestra en el formulario. */
  label: string;
  description: string;
  required: boolean;
  default?: ParamValue;
  example?: ParamValue;
  enumValues?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  /** Expresión regular (sin delimitadores) que debe cumplir el valor. */
  pattern?: string;
  step?: number;
  widget?: ParamWidget;
  accept?: string;
  group?: ParamGroup;
  /** Otros nombres aceptados por compatibilidad (?texto=, ?q=...). */
  aliases?: string[];
  advanced?: boolean;
  /** Nota corta para la documentación (p. ej. "solo con format=jpeg"). */
  hint?: string;
}

export interface RequestBodyDef {
  contentType: string;
  description: string;
  required: boolean;
  /** Ejemplo de cuerpo listo para enviar. */
  example: unknown;
}

export type ResponseKind = 'json' | 'image' | 'file' | 'text' | 'video';

export interface ResponseDoc {
  status: number;
  description: string;
  kind: ResponseKind;
  example?: unknown;
}

export interface CallExample {
  label: string;
  description?: string;
  params?: Record<string, ParamValue>;
  body?: unknown;
}

export interface SourceRef {
  name: string;
  url: string;
  license?: string;
  note?: string;
}

export interface CanvasRef {
  slug: string;
  title: string;
  group: CanvasGroup;
  template: string;
  width: number;
  height: number;
  preview: string;
  animated?: boolean;
}

export interface EndpointDef {
  /** Identificador estable usado en la URL de documentación y en el registro de handlers. */
  id: string;
  name: string;
  category: CategoryId;
  method: HttpMethod;
  /** Ruta pública, con `{param}` para los segmentos dinámicos. */
  path: string;
  summary: string;
  description: string;
  tags?: string[];
  auth: 'none' | 'optional-api-key';
  params: ParamDef[];
  requestBody?: RequestBodyDef;
  responses: ResponseDoc[];
  examples: CallExample[];
  notes?: string[];
  output: ResponseKind;
  featured?: boolean;
  deprecated?: boolean;
  source?: SourceRef;
  canvas?: CanvasRef;
  /** Métodos alternativos aceptados en la misma ruta (p. ej. POST para subir imágenes). */
  altMethods?: HttpMethod[];
  /** Estimación orientativa del tiempo de respuesta. */
  latency?: 'rápido' | 'medio' | 'lento';
}

export interface CategoryDef {
  id: CategoryId;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  /** Clave del icono en el frontend (components/Icon.tsx). */
  icon: string;
  accent: string;
  order: number;
  featured: boolean;
}

export type CanvasGroup =
  | 'imagenes'
  | 'texto'
  | 'perfiles'
  | 'edicion'
  | 'fondos'
  | 'avatares'
  | 'efectos'
  | 'banners'
  | 'plantillas';

export const CANVAS_GROUPS: Record<CanvasGroup, { label: string; description: string }> = {
  imagenes: {
    label: 'Canvas de imágenes',
    description: 'Plantillas donde se inserta una foto o una captura dentro de un marco.',
  },
  texto: {
    label: 'Canvas de texto',
    description: 'Carteles tipográficos y logos generados con tu texto.',
  },
  perfiles: {
    label: 'Canvas de perfiles',
    description: 'Tarjetas de perfil, chats y publicaciones estilo red social.',
  },
  edicion: {
    label: 'Edición y composición',
    description: 'Composiciones con pantallas, hojas y escenarios para pegar contenido.',
  },
  fondos: {
    label: 'Fondos personalizados',
    description: 'Fondos, colores y filtros aplicados a la plantilla.',
  },
  avatares: {
    label: 'Canvas con avatares',
    description: 'Tarjetas que combinan dos avatares y un porcentaje calculado.',
  },
  efectos: {
    label: 'Efectos visuales',
    description: 'Rotaciones, inversión de color, arcoíris y animaciones.',
  },
  banners: {
    label: 'Perfiles y banners',
    description: 'Cabeceras y banners para perfiles y proyectos.',
  },
  plantillas: {
    label: 'Otras plantillas',
    description: 'Plantillas de personajes con huecos para tu imagen o texto.',
  },
};

export type CanvasEffect =
  | 'bars'
  | 'percentage'
  | 'ship'
  | 'rotate'
  | 'invert'
  | 'rainbow'
  | 'blink';

export interface CanvasZone {
  /** Coordenadas relativas (0..1) sobre el lienzo. */
  x: number;
  y: number;
  w: number;
  h: number;
  mode: 'text' | 'image' | 'both';
  shape?: 'rect' | 'circle' | 'ellipse';
  /** Color de relleno por defecto (tapa el texto de ejemplo de la plantilla). */
  fill?: string;
  /** Nombre del parámetro que puede sobrescribir `fill`. */
  fillParam?: string;
  imageParam?: string;
  textParam?: string;
  /** Tamaño de fuente en px para un lienzo de 736 px de ancho. */
  fontSize?: number;
  /** Nombre del parámetro que puede sobrescribir `fontSize`. */
  sizeParam?: string;
  color?: string;
  /** Nombre del parámetro que puede sobrescribir `color`. */
  colorParam?: string;
  weight?: number;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  padding?: number;
  radius?: number;
  opacity?: number;
  transform?: 'none' | 'upper' | 'lower';
}

export interface CanvasDef {
  slug: string;
  title: string;
  description: string;
  group: CanvasGroup;
  /** Nombre del archivo de plantilla en backend/assets/canvas (sin extensión para imágenes). */
  template: string;
  width: number;
  height: number;
  effects?: CanvasEffect[];
  zones: CanvasZone[];
  params: ParamDef[];
  notes?: string[];
  featured?: boolean;
  /** Procedencia real del archivo. */
  origin: { drive: string; file: string };
  /** true si la plantilla es un vídeo (webm/mp4) en lugar de una imagen. */
  media?: 'image' | 'video';
}

export interface CatalogStats {
  endpoints: number;
  categories: number;
  canvases: number;
  imageEndpoints: number;
}
