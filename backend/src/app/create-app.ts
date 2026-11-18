import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { env } from '../config/env.js';
import { auth } from '../shared/middleware/auth.js';
import { errorHandler } from '../shared/middleware/error-handler.js';
import { attachRequestId } from '../shared/middleware/request-context.js';
import { createRequestLogger } from '../shared/middleware/request-logger.js';
import routes from './router.js';
import { openapi } from '../docs/openapi.js';
export interface AppOptions {
  frontendUrl: string;
  enableRequestLogging?: boolean;
}
/** 組裝獨立 Express application，不監聽連接埠、不執行 SQL；讓伺服器與測試各自控制生命週期。
 * @param options 可信任的伺服器設定；不是 HTTP body 或前端管理員旗標。
 * @returns 已掛載安全 middleware、既有路由與統一錯誤處理的 Express app。
 */
export function createApp(options: AppOptions = { frontendUrl: env.FRONTEND_URL }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(attachRequestId);
  if (options.enableRequestLogging !== false) app.use(createRequestLogger());
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: options.frontendUrl }));
  app.use(express.json({ limit: '256kb' }));
  app.use(
    '/api',
    rateLimit({ windowMs: 60000, limit: 180, standardHeaders: true, legacyHeaders: false }),
  );
  app.get(
    '/api/v1/health',
    /** 健康檢查只確認 HTTP 服務存活，不宣稱資料庫或 Auth 已驗證。 */ (_req, res) =>
      res.json({ status: 'ok' }),
  );
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));
  app.get(
    '/api/openapi.json',
    /** 提供既有 OpenAPI 契約，不輸出環境 key。 */ (_req, res) => res.json(openapi),
  );
  app.use('/api/v1', auth, routes);
  app.use(
    /** 保持未知資源的既有 404 JSON 格式。 */ (_req, res) =>
      res.status(404).json({ error: { code: 'NOT_FOUND', message: '找不到資源。' } }),
  );
  app.use(errorHandler);
  return app;
}
