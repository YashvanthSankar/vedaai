import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { env } from '../config/env';
import { createRedis } from '../config/redis';
import type { JobStatus, GeneratedPaper } from '../types/assignment';

type ServerEvent =
  | { type: 'status'; jobId: string; status: JobStatus; progress?: number; message?: string }
  | { type: 'completed'; jobId: string; result: GeneratedPaper }
  | { type: 'failed'; jobId: string; error: string };

type ClientMessage = { type: 'subscribe'; jobId: string };

const subscriptions = new Map<string, Set<WebSocket>>();

function subscribe(jobId: string, socket: WebSocket) {
  if (!subscriptions.has(jobId)) subscriptions.set(jobId, new Set());
  subscriptions.get(jobId)!.add(socket);
}

function unsubscribeAll(socket: WebSocket) {
  for (const set of subscriptions.values()) {
    set.delete(socket);
  }
}

function broadcast(event: ServerEvent) {
  const sockets = subscriptions.get(event.jobId);
  if (!sockets) return;
  const data = JSON.stringify(event);
  for (const sock of sockets) {
    if (sock.readyState === WebSocket.OPEN) sock.send(data);
  }
}

const EVENT_CHANNEL = 'paper-events';

export function attachWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: env.wsPath });

  wss.on('connection', (socket) => {
    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as ClientMessage;
        if (msg.type === 'subscribe' && typeof msg.jobId === 'string') {
          subscribe(msg.jobId, socket);
          socket.send(
            JSON.stringify({ type: 'subscribed', jobId: msg.jobId })
          );
        }
      } catch {
        // ignore malformed
      }
    });
    socket.on('close', () => unsubscribeAll(socket));
    socket.on('error', () => unsubscribeAll(socket));
  });

  const sub = createRedis();
  sub.subscribe(EVENT_CHANNEL).catch((err) =>
    console.error('[ws] redis subscribe failed', err)
  );
  sub.on('message', (_channel, payload) => {
    try {
      broadcast(JSON.parse(payload) as ServerEvent);
    } catch (err) {
      console.error('[ws] bad payload', err);
    }
  });

  console.log(`[ws] mounted at ${env.wsPath}`);
}

const pub = createRedis();

export async function publishEvent(event: ServerEvent) {
  await pub.publish(EVENT_CHANNEL, JSON.stringify(event));
}
