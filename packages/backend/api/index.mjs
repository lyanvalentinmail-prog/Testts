/**
 * Punto de entrada del servicio `backend` en Vercel.
 *
 * Vercel resuelve el `entrypoint` **antes** de ejecutar el build, así que el
 * archivo debe existir en el repositorio. El build (`npm run build`) genera
 * `dist/vercel.js`, el handler de Express ya empaquetado con esbuild; aquí solo
 * se reexporta para que el builder de Vercel lo encuentre y lo empaquete.
 *
 * En Render y en local no se usa este archivo: `dist/server.js` escucha en un
 * puerto normal.
 */
export { default } from '../dist/vercel.js';
