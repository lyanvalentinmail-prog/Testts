/**
 * Protección SSRF: solo se permiten URLs http(s) que resuelvan a direcciones
 * públicas. Se bloquean loopback, rangos privados, link-local (incluido el
 * endpoint de metadatos de nube 169.254.169.254), CGNAT, multicast y IPv6
 * equivalentes.
 */
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { config } from '../config.js';
import { ApiError } from './errors.js';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata',
  'metadata.google.internal',
  'instance-data',
  'kubernetes.default',
  'host.docker.internal',
]);

const dnsCache = new Map<string, { addresses: string[]; expiresAt: number }>();
const DNS_TTL_MS = 60_000;

export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts as [number, number, number, number];
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local + metadatos de nube
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast y reservados
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  return false;
}

export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (normalized === '::' || normalized === '::1') return true;
  if (normalized.startsWith('fe80') || normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('ff')) return true;
  if (normalized.startsWith('::ffff:')) return isPrivateIPv4(normalized.slice(7));
  if (normalized.startsWith('2001:db8')) return true;
  return false;
}

export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPrivateIPv4(address);
  if (version === 6) return isPrivateIPv6(address);
  return true;
}

function hostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (config.allowedPrivateHosts.includes(host)) return true;
  return config.allowedPrivateHosts.some((allowed) => allowed.startsWith('.') && host.endsWith(allowed));
}

async function resolveHost(hostname: string): Promise<string[]> {
  const cached = dnsCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) return cached.addresses;
  const records = await lookup(hostname, { all: true, verbatim: true });
  const addresses = records.map((record) => record.address);
  if (dnsCache.size > 500) dnsCache.clear();
  dnsCache.set(hostname, { addresses, expiresAt: Date.now() + DNS_TTL_MS });
  return addresses;
}

/**
 * Valida una URL antes de pedirla. Devuelve la URL normalizada.
 * Lanza ApiError 400 (`UPSTREAM_BLOCKED`) si el destino no es público.
 */
export async function assertPublicUrl(input: string, context = 'destino'): Promise<URL> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw ApiError.badRequest(`La URL del ${context} no es válida.`, { received: input });
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw ApiError.blocked(`Solo se admiten URLs http o https (recibido: ${url.protocol}).`);
  }
  if (url.username || url.password) {
    throw ApiError.blocked('No se admiten URLs con credenciales embebidas.');
  }
  if (url.port && !['80', '443', ''].includes(url.port)) {
    // Permitimos puertos alternativos solo si el host es público; se valida abajo.
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw ApiError.blocked(`El host «${hostname}» está bloqueado por seguridad.`);
  }

  if (config.allowPrivateTargets || hostAllowed(hostname)) {
    return url;
  }

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw ApiError.blocked('La dirección IP indicada pertenece a la red privada o reservada.');
    }
    return url;
  }

  if (!hostname.includes('.')) {
    throw ApiError.blocked(`El host «${hostname}» no es un dominio público.`);
  }

  let addresses: string[];
  try {
    addresses = await resolveHost(hostname);
  } catch {
    throw ApiError.provider(`No se pudo resolver el dominio «${hostname}».`, { hostname });
  }

  if (addresses.length === 0) {
    throw ApiError.provider(`El dominio «${hostname}» no tiene direcciones.`, { hostname });
  }
  if (addresses.some((address) => isPrivateAddress(address))) {
    throw ApiError.blocked('El dominio resuelve a una dirección privada o reservada.', { hostname });
  }
  return url;
}

export function clearDnsCache(): void {
  dnsCache.clear();
}
