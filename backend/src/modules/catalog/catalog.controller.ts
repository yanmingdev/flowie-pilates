import { toServiceContext } from '../../shared/http/service-context.js';
import { type Request, type Response } from 'express';
import { z } from 'zod';
import { resources, uuid, catalogQuery } from './catalog.schemas.js';
import * as service from './catalog.service.js';

/** 依白名單資源建立 HTTP 控制器；解析輸入後只呼叫服務層。 */ export function resourceController(
  name: string,
) {
  const config = resources[name];
  return {
    list: /** 讀取清單（後台內容資源）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ async (
      req: Request,
      res: Response,
    ) => {
      const { page, limit, q } = catalogQuery.parse(req.query);
      res.json(await service.list(toServiceContext(req), name, page, limit, q));
    },

    create:
      /** 建立資料（後台內容資源）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ async (
        req: Request,
        res: Response,
      ) => {
        const { studio_id: _legacy, ...body } = req.body;
        res
          .status(201)
          .json({
            data: await service.create(
              toServiceContext(req),
              name,
              config.schema.strict().parse(body),
            ),
          });
      },

    update:
      /** 更新白名單內容欄位（後台內容資源）。負責輸入驗證與 HTTP 回應包裝，交易交由服務／RPC。 */ async (
        req: Request,
        res: Response,
      ) => {
        const id =
          config.primary === 'section_type'
            ? z
                .enum(['hero', 'courses', 'teachers', 'announcements', 'quick_booking'])
                .parse(req.params.id)
            : name === 'site-settings'
              ? z.coerce.number().int().min(1).max(1).parse(req.params.id)
              : uuid.parse(req.params.id);
        res.json({
          data: await service.update(
            toServiceContext(req),
            name,
            id,
            config.schema.partial().strict().parse(req.body),
          ),
        });
      },
  };
}
