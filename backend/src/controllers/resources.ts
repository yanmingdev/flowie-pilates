import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { resources, uuid } from '../validators/resources.js';
const query = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(50), q: z.string().max(100).optional() });
export function resourceController(name: string) {
  const config = resources[name];
  return {
    list: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { page, limit, q } = query.parse(req.query);
        let request = req.db.from(config.table).select('*', { count: 'exact' }).order(config.order).range((page - 1) * limit, page * limit - 1);
        if (q && config.search) request = request.ilike(config.search, `%${q.replace(/[%_\\]/g, '\\$&')}%`);
        const { data, count, error } = await request;
        if (error) throw error;
        let rows = data ?? [];
        if (name === 'teachers') {
          const teachers = await req.db.rpc('flowie_public_teachers');
          if (teachers.error) throw teachers.error;
          const names = new Map((teachers.data ?? []).map((x: any) => [x.teacher_id, x.display_name]));
          if (req.user && rows.length) {
            const profiles = await req.db.from('profiles').select('id,display_name').in('id', rows.map((x: any) => x.id));
            if (profiles.error) throw profiles.error;
            for (const profile of profiles.data ?? []) names.set(profile.id, profile.display_name);
          }
          rows = rows.map((row: any) => ({ ...row, name: names.get(row.id) ?? null }));
        }
        res.json({ data: rows, meta: { page, limit, total: count ?? 0 } });
      } catch (e) { next(e); }
    },
    create: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { studio_id: _legacy, ...body } = req.body;
        const fields = config.schema.strict().parse(body);
        const { data, error } = await req.db.from(config.table).insert(fields).select().single();
        if (error) throw error;
        res.status(201).json({ data });
      } catch (e) { next(e); }
    },
    update: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const id = config.primary === 'section_type' ? z.enum(['hero','courses','teachers','announcements','quick_booking']).parse(req.params.id) : name === 'site-settings' ? z.coerce.number().int().min(1).max(1).parse(req.params.id) : uuid.parse(req.params.id);
        const fields = config.schema.partial().strict().parse(req.body);
        if (config.primary in fields && String(fields[config.primary]) !== String(id)) throw Object.assign(new Error('INVALID_PRIMARY_KEY'), { status: 400 });
        const { data, error } = await req.db.from(config.table).update(fields).eq(config.primary, id).select().maybeSingle();
        if (error) throw error;
        if (!data) throw Object.assign(new Error('FORBIDDEN_OR_NOT_FOUND'), { status: 404 });
        res.json({ data });
      } catch (e) { next(e); }
    },
  };
}
