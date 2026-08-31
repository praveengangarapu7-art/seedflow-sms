import { createServer } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { startExpirationWatcher } from './modules/storage/expirationWatcher';
import { initWebSocketServer } from './ws/server';

const app = createApp();
const httpServer = createServer(app);
initWebSocketServer(httpServer);
startExpirationWatcher();

httpServer.listen(env.port, () => {
  console.log(`[seedflow-server] listening on http://localhost:${env.port} (${env.nodeEnv})`);
  console.log(`[seedflow-server] inventory websocket feed at ws://localhost:${env.port}/ws?token=<accessToken>`);
});
