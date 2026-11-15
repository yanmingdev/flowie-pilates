import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { resources, uuid } from '../validators/resources.js';
type Name = keyof typeof resources;
const query = z.object({
  studio_id: uuid,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().max(100).optional(),
});
export function resourceController(name: Name) {
  const config = resources[name];
  return {
    list: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { studio_id, page, limit, q } = query.parse(req.query);
        let reqq = req.db
          .from(config.table)
          .select('*', { count: 'exact' })
          .eq('studio_id', studio_id)
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);
        if (q && config.search)
          reqq = reqq.ilike(config.search, `%${q.replace(/[%_\\]/g, '\\$&')}%`);
        const { data, count, error } = await reqq;
        if (error) throw error;
        res.json({ data, meta: { page, limit, total: count } });
      } catch (e) {
        next(e);
      }
    },
    create: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const studio_id = uuid.parse(req.body.studio_id);
        const fields = config.schema
          .strict()
          .parse(Object.fromEntries(Object.entries(req.body).filter(([k]) => k !== 'studio_id')));
        const { data, error } = await req.db
          .from(config.table)
          .insert({ ...fields, studio_id: studio_id })
          .select()
          .single();
        if (error) throw error;
        res.status(201).json({ data });
      } catch (e) {
        next(e);
      }
    },
    update: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const id = uuid.parse(req.params.id);
        const studio_id = uuid.parse(req.query.studio_id);
        const fields = config.schema.partial().strict().parse(req.body);
        const { data, error } = await req.db
          .from(config.table)
          .update(fields)
          .eq('id', id)
          .eq('studio_id', studio_id)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (!data) throw Object.assign(new Error('FORBIDDEN_OR_NOT_FOUND'), { status: 404 });
        res.json({ data });
      } catch (e) {
        next(e);
      }
    },
  };
}
