import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import http from 'http';
import { env } from './config/env';
import { connectMongo } from './config/db';
import { attachWebSocket } from './websocket/hub';
import assignmentRoutes from './routes/assignment.routes';
import profileRoutes from './routes/profile.routes';

async function main() {
  await connectMongo();

  const app = express();

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        const allowed = env.corsOrigin.split(',').map((s) => s.trim());
        if (allowed.includes('*') || allowed.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });

  app.use('/api/assignments', assignmentRoutes);
  app.use('/api/profile', profileRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
  });

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error('[error]', err);
    if (err?.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'File too large (max 10MB)' });
      return;
    }
    res
      .status(err?.status ?? 500)
      .json({ error: err?.message ?? 'Internal server error' });
  };
  app.use(errorHandler);

  const server = http.createServer(app);
  attachWebSocket(server);

  server.listen(env.port, () => {
    console.log(`[api] listening on http://localhost:${env.port}`);
    console.log(`[api] websocket on ws://localhost:${env.port}${env.wsPath}`);
  });
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
