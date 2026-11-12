import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from './app';

/**
 * Serverless entry point (Vercel Node function).
 *
 * The same Express app that `server.ts` runs locally, without the two
 * long-lived pieces a function cannot host: the inventory WebSocket feed and
 * the expiration watcher's setInterval. The frontend already treats the
 * socket as optional (it falls back to polling/refresh), so every REST
 * endpoint behaves exactly as it does locally.
 *
 * Bundled by scripts/build-vercel.mjs into .vercel/output/functions/api.func.
 */
const app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
