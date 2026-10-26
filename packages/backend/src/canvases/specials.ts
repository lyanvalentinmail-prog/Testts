/**
 * Canvas con composición a medida.
 *
 * Estos lienzos llevan elementos calculados (porcentajes, avatares, burbujas de
 * chat) que no se pueden describir solo con zonas, así que se dibujan aquí
 * usando la plantilla original como fondo.
 */
import type { CanvasDef, ParamValue } from '@velora/shared';
import type { TemplateAsset } from '../lib/assets.js';
import { cleanText, escapeXml, fitFontSize, initials, prng, wrapText } from '../lib/text.js';

export interface SpecialContext {
  canvas: CanvasDef;
  values: Record<string, ParamValue>;
  images: Record<string, string>;
  template: TemplateAsset;
  warnings: string[];
}

type SpecialRenderer = (context: SpecialContext) => Promise<string> | string;

const FONT = 'DejaVu Sans, Verdana, sans-serif';
const MONO = 'DejaVu Sans Mono, Consolas, monospace';

function doc(context: SpecialContext, body: string, extraDefs = ''): string {
  const { canvas, values } = context;
  const width = Math.round(Number(values.width ?? canvas.width));
  const height = Math.round(Number(values.height ?? canvas.height));
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
  <defs>
    <filter id="invertFilter"><feColorMatrix type="matrix" values="-1 0 0 0 1 0 -1 0 0 1 0 0 -1 0 1 0 0 0 1 0"/></filter>
    <linearGradient id="rainbow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e40303"/><stop offset="0.2" stop-color="#ff8c00"/>
      <stop offset="0.4" stop-color="#ffed00"/><stop offset="0.6" stop-color="#008026"/>
      <stop offset="0.8" stop-color="#004dff"/><stop offset="1" stop-color="#750787"/>
    </linearGradient>
    ${extraDefs}
  </defs>
  ${body}
</svg>`;
}

function background(context: SpecialContext): string {
  const { canvas, template } = context;
  return `<image href="${template.dataUri}" width="${canvas.width}" height="${canvas.height}" preserveAspectRatio="none"/>`;
}

function avatarCircle(options: {
  dataUri: string;
  cx: number;
  cy: number;
  r: number;
  id: string;
  ring?: string;
}): string {
  const { dataUri, cx, cy, r, id, ring = '#ffffff' } = options;
  return `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
  <circle cx="${cx}" cy="${cy}" r="${r + 3}" fill="${ring}" opacity="0.9"/>
  <image href="${dataUri}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`;
}

/** Corazón vectorial centrado en (cx, cy). */
function heart(cx: number, cy: number, size: number, color: string): string {
  const s = size / 100;
  return `<g transform="translate(${cx - 50 * s} ${cy - 44 * s}) scale(${s})">
    <path d="M50 88 C18 66 0 48 0 28 C0 10 14 0 28 0 C39 0 47 6 50 14 C53 6 61 0 72 0 C86 0 100 10 100 28 C100 48 82 66 50 88 Z" fill="${color}"/>
  </g>`;
}

function percentage(context: SpecialContext, seed: string): number {
  const forced = context.values.percent;
  if (forced !== undefined && forced !== '' && Number.isFinite(Number(forced))) {
    return Math.min(100, Math.max(0, Math.round(Number(forced))));
  }
  return Math.round(prng(seed)() * 100);
}

/* ------------------------------ Ship/Friendship ------------------------------ */

const renderShip: SpecialRenderer = (context) => {
  const { canvas, values, images, warnings } = context;
  const W = canvas.width;
  const H = canvas.height;
  const isFriendship = canvas.slug === 'friendship';
  const name1 = cleanText(values.username ?? 'Ana', 24) || 'Ana';
  const name2 = cleanText(values.username2 ?? 'Luis', 24) || 'Luis';
  const pct = percentage(context, `ship:${name1.toLowerCase()}:${name2.toLowerCase()}`);
  const r = H * 0.235;
  const y = H * 0.44;
  const x1 = W * 0.16;
  const x2 = W * 0.84;

  const avatar1 = images.image ?? images.defaultImage1;
  const avatar2 = images.image2 ?? images.defaultImage2;
  if (!avatar1) warnings.push('No se recibió avatar 1: se usó el avatar por defecto.');
  if (!avatar2) warnings.push('No se recibió avatar 2: se usó el avatar por defecto.');

  const title = isFriendship ? '~ Medidor de amistad ~' : '~ Medidor de compatibilidad ~';
  const accent = isFriendship ? '#8dff6a' : '#ff5c8a';

  const body = `${background(context)}
  <text x="${W / 2}" y="${H * 0.115}" text-anchor="middle" font-family="${MONO}" font-size="${H * 0.062}" font-weight="700" fill="${accent}">${escapeXml(title)}</text>
  <rect x="${W * 0.30}" y="${H * 0.24}" width="${W * 0.40}" height="${H * 0.55}" rx="${H * 0.04}" fill="#23272a" opacity="0.96"/>
  ${isFriendship ? `<text x="${W / 2}" y="${H * 0.36}" text-anchor="middle" font-size="${H * 0.11}" fill="#8dff6a">★</text>` : heart(W / 2, H * 0.34, H * 0.16, '#ff5c8a')}
  <text x="${W / 2}" y="${H * 0.56}" text-anchor="middle" font-family="${MONO}" font-size="${H * 0.115}" font-weight="700" fill="#8dff6a">${pct}%</text>
  <text x="${W / 2}" y="${H * 0.69}" text-anchor="middle" font-family="${MONO}" font-size="${H * 0.045}" fill="#c9d1d9">${
    isFriendship ? 'mejores amigos' : 'compatibilidad'
  }</text>
  ${
    avatar1
      ? avatarCircle({ dataUri: avatar1, cx: x1, cy: y, r, id: 'av1' })
      : `<circle cx="${x1}" cy="${y}" r="${r}" fill="#2f3542"/><text x="${x1}" y="${y + r * 0.3}" text-anchor="middle" font-family="${FONT}" font-size="${r * 0.9}" font-weight="700" fill="#ffffff">${escapeXml(initials(name1))}</text>`
  }
  ${
    avatar2
      ? avatarCircle({ dataUri: avatar2, cx: x2, cy: y, r, id: 'av2', ring: '#8dff6a' })
      : `<circle cx="${x2}" cy="${y}" r="${r}" fill="#2f3542"/><text x="${x2}" y="${y + r * 0.3}" text-anchor="middle" font-family="${FONT}" font-size="${r * 0.9}" font-weight="700" fill="#ffffff">${escapeXml(initials(name2))}</text>`
  }
  <rect x="${W * 0.04}" y="${H * 0.82}" width="${W * 0.24}" height="${H * 0.14}" rx="${H * 0.03}" fill="rgba(0,0,0,0.72)"/>
  <rect x="${W * 0.72}" y="${H * 0.82}" width="${W * 0.24}" height="${H * 0.14}" rx="${H * 0.03}" fill="rgba(0,0,0,0.72)"/>
  <text x="${x1}" y="${H * 0.91}" text-anchor="middle" font-family="${MONO}" font-size="${H * 0.045}" fill="#ffffff">${escapeXml(name1)}</text>
  <text x="${x2}" y="${H * 0.91}" text-anchor="middle" font-family="${MONO}" font-size="${H * 0.045}" fill="#8dff6a">${escapeXml(name2)}</text>`;

  return doc(context, body);
};

/* --------------------------------- Gay card -------------------------------- */

const renderGayCard: SpecialRenderer = (context) => {
  const { canvas, values } = context;
  const W = canvas.width;
  const H = canvas.height;
  const name = cleanText(values.text ?? 'Velora', 28) || 'Velora';
  const pct = percentage(context, `gaycard:${name.toLowerCase()}`);
  const bg = String(values.background ?? '#1c1c1c');
  const cx = W / 2;
  const cy = H * 0.44;
  const r = W * 0.205;

  const body = `${background(context)}
  <circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="#ffffff" opacity="0.16"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff" opacity="0.94"/>
  <text x="${cx}" y="${cy + H * 0.055}" text-anchor="middle" font-family="${MONO}" font-size="${H * 0.15}" font-weight="700" fill="#1b1b1b">${pct}%</text>
  <rect x="${W * 0.22}" y="${H * 0.655}" width="${W * 0.56}" height="${H * 0.085}" rx="${H * 0.02}" fill="${escapeXml(bg)}"/>
  <text x="${cx}" y="${H * 0.718}" text-anchor="middle" font-family="${MONO}" font-size="${H * 0.052}" font-weight="700" fill="#ffffff">~${escapeXml(name)}~</text>
  <rect x="${W * 0.235}" y="${H * 0.775}" width="${W * 0.53}" height="${H * 0.135}" rx="${H * 0.068}" fill="#fff9f6" stroke="#111111" stroke-width="${H * 0.008}"/>
  <text x="${cx}" y="${H * 0.866}" text-anchor="middle" font-family="${MONO}" font-size="${H * 0.075}" font-weight="700" fill="#ff3d6e">~ ${pct}% ~</text>`;

  return doc(context, body);
};

/* ----------------------------------- IQC ----------------------------------- */

const renderIqc: SpecialRenderer = (context) => {
  const { canvas, values, images } = context;
  const W = canvas.width;
  const H = canvas.height;
  const message = cleanText(values.text ?? '', 220);
  const time = cleanText(values.time ?? '', 14);
  const quoted = cleanText(values.username ?? '', 24);
  const bubbleColor = String(values.background ?? '#005c4b');
  const textColor = String(values.color ?? '#e9edef');

  const bubble = { x: W * 0.025, y: H * 0.505, w: W * 0.855, h: H * 0.085 };
  const fitted = fitFontSize({
    text: message,
    width: bubble.w - 24,
    height: bubble.h - 18,
    fontSize: H * 0.024,
    minFontSize: 10,
  });
  const lines = fitted.lines;

  const body = `${background(context)}
  ${
    quoted
      ? `<text x="${W * 0.075}" y="${H * 0.472}" font-family="${FONT}" font-size="${H * 0.019}" font-weight="600" fill="#f15c6d">${escapeXml(quoted)}</text>`
      : ''
  }
  <rect x="${bubble.x}" y="${bubble.y}" width="${bubble.w}" height="${bubble.h}" rx="${H * 0.012}" fill="${escapeXml(bubbleColor)}"/>
  ${
    images.image
      ? `<image href="${images.image}" x="${bubble.x + 8}" y="${bubble.y + 8}" width="${bubble.h - 16}" height="${bubble.h - 16}" preserveAspectRatio="xMidYMid slice" clip-path="url(#iqcClip)"/>`
      : ''
  }
  ${lines
    .map(
      (line, index) =>
        `<text x="${bubble.x + 14}" y="${bubble.y + 14 + fitted.fontSize * 0.9 + index * fitted.fontSize * 1.2}" font-family="${FONT}" font-size="${fitted.fontSize.toFixed(1)}" fill="${escapeXml(textColor)}">${escapeXml(line)}</text>`
    )
    .join('')}
  ${
    time
      ? `<text x="${bubble.x + bubble.w - 12}" y="${bubble.y + bubble.h - 10}" text-anchor="end" font-family="${FONT}" font-size="${H * 0.014}" fill="rgba(233,237,239,0.75)">${escapeXml(time)}</text>`
      : ''
  }`;

  return doc(context, body, `<clipPath id="iqcClip"><rect x="${bubble.x + 8}" y="${bubble.y + 8}" width="${bubble.h - 16}" height="${bubble.h - 16}" rx="6"/></clipPath>`);
};

/* -------------------------------- TikTok ---------------------------------- */

const renderTiktok: SpecialRenderer = (context) => {
  const { canvas, values, images } = context;
  const W = canvas.width;
  const H = canvas.height;
  const username = cleanText(values.username ?? '@velora', 30);
  const bio = cleanText(values.text ?? '', 160);
  const panel = String(values.background ?? 'rgba(0,0,0,0.55)');
  const color = String(values.color ?? '#ffffff');

  const avatarSize = W * 0.18;
  const avatarX = W * 0.055;
  const avatarY = H * 0.075;
  const textX = avatarX + avatarSize + W * 0.045;

  const bioLines = wrapText(bio, W * 0.62, H * 0.018, 2);

  const body = `${background(context)}
  <rect x="${W * 0.03}" y="${H * 0.055}" width="${W * 0.94}" height="${H * 0.165}" rx="${H * 0.018}" fill="${escapeXml(panel)}"/>
  <clipPath id="tkAvatar"><circle cx="${avatarX + avatarSize / 2}" cy="${avatarY + avatarSize / 2}" r="${avatarSize / 2}"/></clipPath>
  <circle cx="${avatarX + avatarSize / 2}" cy="${avatarY + avatarSize / 2}" r="${avatarSize / 2 + 2}" fill="#ffffff" opacity="0.85"/>
  ${
    images.image
      ? `<image href="${images.image}" x="${avatarX}" y="${avatarY}" width="${avatarSize}" height="${avatarSize}" preserveAspectRatio="xMidYMid slice" clip-path="url(#tkAvatar)"/>`
      : `<circle cx="${avatarX + avatarSize / 2}" cy="${avatarY + avatarSize / 2}" r="${avatarSize / 2}" fill="#3b3b3b"/><text x="${avatarX + avatarSize / 2}" y="${avatarY + avatarSize * 0.68}" text-anchor="middle" font-family="${FONT}" font-size="${avatarSize * 0.42}" font-weight="700" fill="#ffffff">${escapeXml(initials(username.replace('@', '')))}</text>`
  }
  <text x="${textX}" y="${H * 0.115}" font-family="${FONT}" font-size="${H * 0.026}" font-weight="700" fill="${escapeXml(color)}">${escapeXml(username)}</text>
  ${bioLines
    .map(
      (line, index) =>
        `<text x="${textX}" y="${H * 0.148 + index * H * 0.024}" font-family="${FONT}" font-size="${H * 0.018}" fill="${escapeXml(color)}" opacity="0.88">${escapeXml(line)}</text>`
    )
    .join('')}
  <text x="${W * 0.06}" y="${H * 0.245}" font-family="${FONT}" font-size="${H * 0.015}" fill="#8dff6a">Velora API · canvas generado</text>`;

  return doc(context, body);
};

/* --------------------------------- Banner --------------------------------- */

const renderBanner: SpecialRenderer = (context) => {
  const { canvas, values, images } = context;
  const W = canvas.width;
  const H = canvas.height;
  const title = cleanText(values.title ?? 'Velora API', 40);
  const subtitle = cleanText(values.subtitle ?? '', 70);
  const overlay = String(values.background ?? 'rgba(6,9,18,0.62)');
  const color = String(values.color ?? '#ffffff');

  const logoSize = W * 0.20;
  const logoX = W * 0.055;
  const logoY = H * 0.5 - logoSize / 2;
  const textX = images.image ? W * 0.30 : W * 0.07;
  const titleFitted = fitFontSize({ text: title, width: W * 0.64, height: H * 0.26, fontSize: H * 0.14, minFontSize: 18 });
  const subtitleLines = wrapText(subtitle, W * 0.64, H * 0.058, 2);

  const body = `${background(context)}
  <rect width="${W}" height="${H}" fill="${escapeXml(overlay)}"/>
  ${
    images.image
      ? `<clipPath id="bannerLogo"><rect x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" rx="${logoSize * 0.22}"/></clipPath>
         <image href="${images.image}" x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid slice" clip-path="url(#bannerLogo)"/>`
      : ''
  }
  <rect x="${textX}" y="${H * 0.27}" width="${W * 0.012}" height="${H * 0.30}" rx="${W * 0.006}" fill="#7c3aed"/>
  ${titleFitted.lines
    .map(
      (line, index) =>
        `<text x="${textX + W * 0.035}" y="${H * 0.36 + index * titleFitted.fontSize * 1.12}" font-family="${FONT}" font-size="${titleFitted.fontSize.toFixed(1)}" font-weight="700" fill="${escapeXml(color)}">${escapeXml(line)}</text>`
    )
    .join('')}
  ${subtitleLines
    .map(
      (line, index) =>
        `<text x="${textX + W * 0.035}" y="${H * 0.70 + index * H * 0.075}" font-family="${FONT}" font-size="${H * 0.058}" fill="${escapeXml(color)}" opacity="0.82">${escapeXml(line)}</text>`
    )
    .join('')}
  <text x="${W - W * 0.04}" y="${H - H * 0.055}" text-anchor="end" font-family="${MONO}" font-size="${H * 0.038}" fill="#8dff6a" opacity="0.85">velora api</text>`;

  return doc(context, body);
};

const SPECIALS: Record<string, SpecialRenderer> = {
  ship: renderShip,
  friendship: renderShip,
  gaycard: renderGayCard,
  iqc: renderIqc,
  cuentatiktok: renderTiktok,
  banner: renderBanner,
};

export function resolveSpecial(slug: string): SpecialRenderer | null {
  return SPECIALS[slug] ?? null;
}
