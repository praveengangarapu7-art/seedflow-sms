import type { Server as HttpServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { verifyAccessToken } from '../auth/jwt';

interface ConnectedClient {
  socket: WebSocket;
  userId: string;
  email: string;
  role: string;
}

const clients = new Set<ConnectedClient>();

/**
 * Browsers can't set custom headers on the WebSocket handshake, so the
 * access token travels as a query param (?token=...) instead of an
 * Authorization header. Same JWT, same verifyAccessToken as the REST API.
 */
export function initWebSocketServer(httpServer: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (socket, request) => {
    const url = new URL(request.url ?? '', 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      socket.close(4401, 'Missing token');
      return;
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      socket.close(4401, 'Invalid or expired token');
      return;
    }

    const client: ConnectedClient = { socket, userId: payload.sub, email: payload.email, role: payload.role };
    clients.add(client);
    console.log(`[ws] connected: ${client.email} (${client.role}); total=${clients.size}`);

    socket.send(
      JSON.stringify({
        event: 'CONNECTED',
        payload: { message: 'Connected to SeedSphere inventory feed', connectedClients: clients.size },
        at: new Date().toISOString(),
      }),
    );

    socket.on('close', () => {
      clients.delete(client);
      console.log(`[ws] disconnected: ${client.email}; total=${clients.size}`);
    });

    socket.on('error', () => {
      clients.delete(client);
    });
  });

  return wss;
}

export function broadcast(event: string, payload: unknown): void {
  const message = JSON.stringify({ event, payload, at: new Date().toISOString() });
  for (const client of clients) {
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(message);
    }
  }
}

export function connectedClientCount(): number {
  return clients.size;
}
