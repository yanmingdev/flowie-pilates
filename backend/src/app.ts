import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import type { Request } from 'express';
import crypto from 'node:crypto';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { auth } from './middleware/auth.js';
import { errorHandler } from './middleware/errors.js';
import routes from './routes/index.js';
import { openapi } from './openapi.js';
export const app = express();
app.disable('x-powered-by');
app.use((req, _res, next) => {
  req.request_id = crypto.randomUUID();
  next();
});
app.use(
  pinoHttp({
    genReqId: (req) => (req as Request).request_id,
    redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
    serializers: { req: (r) => ({ id: r.id, method: r.method, path: r.url?.split('?')[0] }) },
  }),
);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: env.FRONTEND_URL }));
app.use(express.json({ limit: '256kb' }));
app.use(
  '/api',
  rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: true, legacyHeaders: false }),
);
app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));
app.get('/api/openapi.json', (_req, res) => res.json(openapi));
app.use('/api/v1', auth, routes);
app.use((_req, res) =>
  res.status(404).json({ error: { code: 'NOT_FOUND', message: '找不到資源。' } }),
);
app.use(errorHandler);
