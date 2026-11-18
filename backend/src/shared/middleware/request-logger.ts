import { pinoHttp } from 'pino-http';
import type { Request } from 'express';
/** 建立只記錄必要 HTTP 資訊的 logger，遮蔽憑證、Cookie 與 Set-Cookie。 */
export function createRequestLogger() {
  return pinoHttp({
    genReqId: /** 使用 middleware 建立的追蹤 ID 串聯請求與錯誤。 */ (req) =>
      (req as Request).request_id,
    redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
    serializers: {
      req: /** 不記錄 query string 或 request body，避免個資進入一般日誌。 */ (r) => ({
        id: r.id,
        method: r.method,
        path: r.url?.split('?')[0],
      }),
    },
  });
}
