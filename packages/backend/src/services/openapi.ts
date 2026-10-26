/** Genera la especificación OpenAPI 3.1 a partir del catálogo compartido. */
import { CATEGORIES, ENDPOINTS, type EndpointDef, type ParamDef } from '@velora/shared';
import { config } from '../config.js';

type SchemaObject = Record<string, unknown>;

function schemaFor(param: ParamDef): SchemaObject {
  const schema: SchemaObject = {};
  switch (param.type) {
    case 'integer':
      schema.type = 'integer';
      break;
    case 'number':
      schema.type = 'number';
      break;
    case 'boolean':
      schema.type = 'boolean';
      break;
    case 'enum':
      schema.type = 'string';
      if (param.enumValues) schema.enum = param.enumValues;
      break;
    default:
      schema.type = 'string';
  }
  if (param.minimum !== undefined) schema.minimum = param.minimum;
  if (param.maximum !== undefined) schema.maximum = param.maximum;
  if (param.minLength !== undefined) schema.minLength = param.minLength;
  if (param.maxLength !== undefined) schema.maxLength = param.maxLength;
  if (param.pattern) schema.pattern = param.pattern;
  if (param.default !== undefined) schema.default = param.default;
  if (param.example !== undefined && param.example !== '') schema.example = param.example;
  return schema;
}

function parameters(endpoint: EndpointDef): Array<Record<string, unknown>> {
  return endpoint.params
    .filter((param) => param.in !== 'body')
    .map((param) => ({
      name: param.name,
      in: param.in,
      required: param.in === 'path' ? true : param.required,
      description: param.description,
      schema: schemaFor(param),
      ...(param.aliases?.length ? { 'x-aliases': param.aliases } : {}),
    }));
}

function responses(endpoint: EndpointDef): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const response of endpoint.responses) {
    const content: Record<string, unknown> = {};
    if (response.kind === 'image') {
      content['image/png'] = { schema: { type: 'string', format: 'binary' } };
      content['image/svg+xml'] = { schema: { type: 'string', format: 'binary' } };
    } else if (response.kind === 'file') {
      content['application/octet-stream'] = { schema: { type: 'string', format: 'binary' } };
    } else if (response.kind === 'text') {
      content['text/plain'] = { schema: { type: 'string' } };
    } else {
      if (response.status < 400) {
        content['application/json'] = {
          schema: { $ref: '#/components/schemas/SuccessEnvelope' },
        };
      } else {
        content['application/json'] = { schema: { $ref: '#/components/schemas/ErrorEnvelope' } };
      }
    }
    result[String(response.status)] = {
      description: response.description,
      ...(Object.keys(content).length ? { content } : {}),
    };
  }
  if (!result['400']) {
    result['400'] = {
      description: 'Parámetros inválidos o petición mal formada.',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
    };
  }
  if (!result['429']) {
    result['429'] = {
      description: 'Límite de peticiones superado.',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
    };
  }
  if (!result['500']) {
    result['500'] = {
      description: 'Error interno del servidor.',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
    };
  }
  return result;
}

export function buildOpenApi(serverUrl: string) {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const endpoint of ENDPOINTS) {
    const path = endpoint.path.replace(/\{([a-zA-Z0-9_]+)\}/g, '{$1}');
    const methods = [endpoint.method, ...(endpoint.altMethods ?? [])];
    const entry = (paths[path] ??= {});

    for (const method of methods) {
      const operation: Record<string, unknown> = {
        operationId: `${endpoint.id}${method === endpoint.method ? '' : `_${method.toLowerCase()}`}`,
        summary: endpoint.summary,
        description: `${endpoint.description}\n\nCategoría: **${endpoint.category}**.`,
        tags: [CATEGORIES.find((category) => category.id === endpoint.category)?.name ?? endpoint.category],
        security: config.secrets.apiKey ? [{ ApiKeyAuth: [] }] : [],
        responses: responses(endpoint),
        'x-velora-id': endpoint.id,
        'x-velora-category': endpoint.category,
        'x-velora-output': endpoint.output,
      };

      const params = parameters(endpoint);
      if (params.length && method === endpoint.method) operation.parameters = params;
      if (params.length && method !== endpoint.method) {
        // En POST los parámetros viajan en el cuerpo: solo se documentan los de ruta.
        const pathParams = params.filter((param) => param.in === 'path');
        if (pathParams.length) operation.parameters = pathParams;
      }

      if (endpoint.requestBody && (method === 'POST' || method === 'PUT')) {
        operation.requestBody = {
          required: endpoint.requestBody.required,
          description: endpoint.requestBody.description,
          content: {
            [endpoint.requestBody.contentType]: {
              schema: { type: 'object', additionalProperties: true },
              example: endpoint.requestBody.example,
            },
            ...(endpoint.altMethods?.includes('POST')
              ? {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        image: { type: 'string', format: 'binary' },
                        image2: { type: 'string', format: 'binary' },
                      },
                    },
                  },
                }
              : {}),
          },
        };
      }

      entry[method.toLowerCase()] = operation;
    }
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'Velora API',
      version: config.version,
      summary: 'Canvas con plantillas reales, anime, búsquedas, descargas y utilidades.',
      description:
        'API REST pública sin clave (opcionalmente protegida con VELORA_API_KEY). Todas las respuestas JSON usan el sobre `{ success, data, meta }` y los errores `{ success: false, error, meta }`.',
      license: { name: 'MIT', identifier: 'MIT' },
      contact: { name: 'Velora API', url: 'https://github.com/lyanvalentinmail-prog/Testts' },
    },
    servers: [{ url: serverUrl, description: 'Servidor actual' }],
    tags: CATEGORIES.map((category) => ({ name: category.name, description: category.description })),
    paths,
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key', description: 'Solo si el servidor define VELORA_API_KEY.' },
      },
      schemas: {
        SuccessEnvelope: {
          type: 'object',
          required: ['success', 'data', 'meta'],
          properties: {
            success: { type: 'boolean', const: true },
            data: {},
            meta: {
              type: 'object',
              properties: {
                requestId: { type: 'string' },
                durationMs: { type: 'integer' },
                cached: { type: 'boolean' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        ErrorEnvelope: {
          type: 'object',
          required: ['success', 'error', 'meta'],
          properties: {
            success: { type: 'boolean', const: false },
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: { type: 'string', examples: ['VALIDATION_ERROR'] },
                message: { type: 'string' },
                details: {},
                hint: { type: 'string' },
              },
            },
            meta: {
              type: 'object',
              properties: {
                requestId: { type: 'string' },
                durationMs: { type: 'integer' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
  };
}

/** Serializador YAML mínimo para el documento OpenAPI (sin dependencias). */
export function toYaml(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (value === null) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') {
    if (value === '' || /[:#\-{}[\],&*?|<>=!%@`"'\n]/.test(value) || /^\s|\s$/.test(value)) {
      return JSON.stringify(value);
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return value
      .map((item) => {
        const serialized = toYaml(item, indent + 1);
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          return `${pad}- ${serialized.trimStart()}`;
        }
        return `${pad}- ${serialized}`;
      })
      .join('\n');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined);
    if (entries.length === 0) return '{}';
    return entries
      .map(([key, item]) => {
        if (typeof item === 'object' && item !== null && (Array.isArray(item) ? item.length > 0 : Object.keys(item).length > 0)) {
          return `${pad}${key}:\n${toYaml(item, indent + 1)}`;
        }
        if (typeof item === 'object' && item !== null) {
          return `${pad}${key}: ${Array.isArray(item) ? '[]' : '{}'}`;
        }
        return `${pad}${key}: ${toYaml(item, indent)}`;
      })
      .join('\n');
  }
  return String(value);
}
