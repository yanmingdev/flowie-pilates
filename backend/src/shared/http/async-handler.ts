import { type Request, type Response, type NextFunction, type RequestHandler } from 'express';
export const asyncRoute =
  /** 將非同步控制器的拒絕結果交給 Express 錯誤 middleware，避免未處理例外。 */ (
      handler: (req: Request, res: Response) => Promise<void>,
    ): RequestHandler =>
    /** 把控制器非同步失敗傳給 next，交由統一錯誤 middleware 回應。 */ (req, res, next) => {
      handler(req, res).catch(next as NextFunction);
    };
export const unavailable: RequestHandler =
  /** 保留既有不支援端點的 501 契約，不假裝功能已實作。 */ (_req, _res, next) =>
    next(Object.assign(new Error('FEATURE_UNAVAILABLE_V1'), { status: 501 }));
