import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { authRouter } from './routes/auth.js';
import { projectRouter } from './routes/projects.js';
import { activityRouter } from './routes/activities.js';
import { dependencyRouter } from './routes/dependencies.js';
import { shareRouter, publicShareRouter } from './routes/share.js';
import { snapshotRouter } from './routes/snapshots.js';
import { transferRouter } from './routes/transfer.js';
import { requireAuth } from './auth.js';
import { errorHandler } from './http.js';
import { env } from './env.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'img-src': ["'self'", 'data:', 'blob:'],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, now: new Date().toISOString() }));

  app.use('/api/auth', authRouter);
  app.use('/api/shared', publicShareRouter);
  app.use('/api/projects', requireAuth, projectRouter);
  app.use('/api', requireAuth, activityRouter);
  app.use('/api', requireAuth, dependencyRouter);
  app.use('/api/projects', requireAuth, shareRouter);
  app.use('/api/projects', requireAuth, snapshotRouter);
  app.use('/api/projects', requireAuth, transferRouter);

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendDist = path.resolve(currentDir, '../../frontend/dist');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist, { index: false, maxAge: '1h' }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  app.use((_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada', code: 'NOT_FOUND' });
  });

  app.use(errorHandler);
  return app;
}
