/**
 * Entrada para un despliegue serverless (Vercel / Netlify Functions).
 *
 * El servicio principal recomendado es Render (proceso Node persistente), pero
 * este handler permite montar la API como función si se necesita. Ten en cuenta
 * el límite de duración de la plataforma y que los binarios nativos
 * (`sharp`, `@resvg/resvg-js`) deben incluirse en el bundle.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from './app.js';

const app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  app(req as never, res as never);
}
