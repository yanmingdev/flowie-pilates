import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { resourceController } from '../controllers/resources.js';
import { resources, uuid } from '../validators/resources.js';
import { rpc, rpcSingle } from '../repositories/database.js';
import { scheduleArgs, sessionInput, updateArgs } from '../services/business.js';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
const router = Router();
const asyncRoute =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next as NextFunction);
  };
router.get(
  '/studios',
  asyncRoute(async (req, res) => {
    const { data, error } = await req.db
      .from('studios')
      .select('id,name,slug,description,logo_url,is_active')
      .order('name');
    if (error) throw error;
    res.json({ data });
  }),
);
router.post(
  '/studios',
  requireAuth,
  asyncRoute(async (req, res) => {
    const v = z
      .object({
        name: z.string().min(1).max(200),
        slug: z
          .string()
          .regex(/^[a-z0-9-]+$/)
          .max(100),
        description: z.string().max(2000).nullable().optional(),
        is_active: z.boolean().optional(),
      })
      .strict()
      .parse(req.body);
    const { data, error } = await req.db.from('studios').insert(v).select().single();
    if (error) throw error;
    res.status(201).json({ data });
  }),
);
router.patch(
  '/studios/:id',
  requireAuth,
  asyncRoute(async (req, res) => {
    const v = z
      .object({
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).nullable().optional(),
        is_active: z.boolean().optional(),
        logo_url: z.string().url().nullable().optional(),
      })
      .strict()
      .parse(req.body);
    const { data, error } = await req.db
      .from('studios')
      .update(v)
      .eq('id', uuid.parse(req.params.id))
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw Object.assign(new Error('FORBIDDEN_OR_NOT_FOUND'), { status: 404 });
    res.json({ data });
  }),
);
router.post(
  '/studios/:id/admins',
  requireAuth,
  asyncRoute(async (req, res) => {
    const v = z.object({ user_id: uuid, is_active: z.boolean() }).strict().parse(req.body);
    await rpc(req.db, 'set_studio_admin', {
      p_studio: uuid.parse(req.params.id),
      p_user: v.user_id,
      p_active: v.is_active,
    });
    res.json({ data: { updated: true } });
  }),
);
router.get(
  '/auth/me',
  requireAuth,
  asyncRoute(async (req, res) => {
    const [profile, memberships, platform] = await Promise.all([
      req.db.from('profiles').select('*').eq('id', req.user!.id).maybeSingle(),
      req.db
        .from('studio_memberships')
        .select('studio_id,role,is_active')
        .eq('user_id', req.user!.id),
      req.db.from('platform_admins').select('user_id').eq('user_id', req.user!.id).maybeSingle(),
    ]);
    if (profile.error || memberships.error || platform.error)
      throw profile.error || memberships.error || platform.error;
    res.json({
      data: {
        user: { id: req.user!.id, email: req.user!.email },
        profile: profile.data,
        memberships: memberships.data,
        is_super_admin: !!platform.data,
      },
    });
  }),
);
router.post(
  '/auth/join',
  requireAuth,
  asyncRoute(async (req, res) => {
    const studio_id = uuid.parse(req.body.studio_id);
    await rpc(req.db, 'join_studio', { p_studio: studio_id });
    res.json({ data: { joined: true } });
  }),
);
router.patch(
  '/auth/profile',
  requireAuth,
  asyncRoute(async (req, res) => {
    const fields = z
      .object({
        full_name: z.string().min(1).max(200),
        phone: z.string().max(40).nullable().optional(),
        birthday: z.string().date().nullable().optional(),
      })
      .strict()
      .parse(req.body);
    const { data, error } = await req.db
      .from('profiles')
      .update(fields)
      .eq('id', req.user!.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ data });
  }),
);
for (const name of Object.keys(resources) as Array<keyof typeof resources>) {
  const c = resourceController(name);
  router.get(`/${name}`, c.list);
  router.post(`/${name}`, requireAuth, c.create);
  router.patch(`/${name}/:id`, requireAuth, c.update);
}
for (const name of ['teacher-branches', 'teacher-courses', 'package-courses'] as const) {
  router.delete(
    `/${name}/:id`,
    requireAuth,
    asyncRoute(async (req, res) => {
      const studio_id = uuid.parse(req.query.studio_id);
      const { data, error } = await req.db
        .from(resources[name].table)
        .delete()
        .eq('studio_id', studio_id)
        .eq('id', uuid.parse(req.params.id))
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw Object.assign(new Error('FORBIDDEN_OR_NOT_FOUND'), { status: 404 });
      res.json({ data });
    }),
  );
}
router.get(
  '/teachers/public',
  asyncRoute(async (req, res) => {
    const studio_id = uuid.parse(req.query.studio_id);
    const data = await rpc(req.db, 'public_teacher_catalog', { p_studio: studio_id });
    res.json({ data });
  }),
);
router.get(
  '/favorites',
  requireAuth,
  asyncRoute(async (req, res) => {
    const studio_id = uuid.parse(req.query.studio_id);
    const data = await rpc(req.db, 'favorite_courses', { p_studio: studio_id });
    res.json({ data });
  }),
);
router.post(
  '/favorites',
  requireAuth,
  asyncRoute(async (req, res) => {
    const v = z
      .object({ studio_id: uuid, course_id: uuid, is_favorite: z.boolean() })
      .strict()
      .parse(req.body);
    const data = await rpc(req.db, 'set_course_favorite', {
      p_studio: v.studio_id,
      p_course: v.course_id,
      p_favorite: v.is_favorite,
    });
    res.json({ data: { is_favorite: data } });
  }),
);
router.get(
  '/sessions',
  asyncRoute(async (req, res) => {
    const q = z
      .object({
        studio_id: uuid,
        from: z.string().datetime({ offset: true }),
        to: z.string().datetime({ offset: true }),
      })
      .parse(req.query);
    const data = await rpc(req.db, 'session_catalog', {
      p_studio: q.studio_id,
      p_from: q.from,
      p_to: q.to,
    });
    res.json({ data });
  }),
);
router.get(
  '/sessions/manage',
  requireAuth,
  asyncRoute(async (req, res) => {
    const q = z
      .object({
        studio_id: uuid,
        from: z.string().datetime({ offset: true }),
        to: z.string().datetime({ offset: true }),
      })
      .parse(req.query);
    const { data, error } = await req.db
      .from('class_sessions')
      .select(
        '*,courses(name),rooms(name),branches(name),teachers:teachers!class_sessions_studio_id_teacher_id_fkey(name)',
      )
      .eq('studio_id', q.studio_id)
      .gte('starts_at', q.from)
      .lt('starts_at', q.to)
      .order('starts_at')
      .limit(1000);
    if (error) throw error;
    res.json({ data });
  }),
);
router.post(
  '/sessions',
  requireAuth,
  asyncRoute(async (req, res) => {
    const input = sessionInput.parse(req.body);
    const data = await rpc(req.db, 'schedule_class_sessions_with_deadline', scheduleArgs(input));
    res.status(201).json({ data });
  }),
);
router.patch(
  '/sessions/:id',
  requireAuth,
  asyncRoute(async (req, res) => {
    const data = await rpcSingle(
      req.db,
      'update_class_session_with_deadline',
      updateArgs(uuid.parse(req.params.id), sessionInput.parse(req.body)),
    );
    res.json({ data });
  }),
);
router.patch(
  '/sessions/:id/future',
  requireAuth,
  asyncRoute(async (req, res) => {
    const data = await rpc(
      req.db,
      'update_future_sessions_with_deadline',
      updateArgs(uuid.parse(req.params.id), sessionInput.parse(req.body)),
    );
    res.json({ data });
  }),
);
router.post(
  '/sessions/:id/cancel-future',
  requireAuth,
  asyncRoute(async (req, res) => {
    const data = await rpc(req.db, 'cancel_future_sessions', {
      p_session: uuid.parse(req.params.id),
    });
    res.json({ data });
  }),
);
router.post(
  '/sessions/:id/cancel',
  requireAuth,
  asyncRoute(async (req, res) => {
    const data = await rpcSingle(req.db, 'cancel_class_session', {
      p_session: uuid.parse(req.params.id),
    });
    res.json({ data });
  }),
);
router.get(
  '/sessions/:id/students',
  requireAuth,
  asyncRoute(async (req, res) => {
    const data = await rpc(req.db, 'session_students', { p_session: uuid.parse(req.params.id) });
    res.json({ data });
  }),
);
router.get(
  '/bookings',
  requireAuth,
  asyncRoute(async (req, res) => {
    const studio_id = uuid.parse(req.query.studio_id);
    const data = await rpc(req.db, 'list_bookings', {
      p_studio: studio_id,
      p_student: req.query.scope === 'mine' ? req.user!.id : null,
    });
    res.json({ data });
  }),
);
router.post(
  '/bookings',
  requireAuth,
  asyncRoute(async (req, res) => {
    const v = z
      .object({ session_id: uuid, idempotency_key: z.string().min(8).max(120) })
      .strict()
      .parse(req.body);
    const data = await rpcSingle(req.db, 'book_class_session', {
      p_session: v.session_id,
      p_key: v.idempotency_key,
    });
    res.status(201).json({ data });
  }),
);
router.post(
  '/bookings/:id/cancel',
  requireAuth,
  asyncRoute(async (req, res) => {
    const data = await rpcSingle(req.db, 'cancel_class_booking', {
      p_booking: uuid.parse(req.params.id),
    });
    res.json({ data });
  }),
);
router.post(
  '/attendance',
  requireAuth,
  asyncRoute(async (req, res) => {
    const v = z
      .object({ booking_id: uuid, status: z.enum(['present', 'absent', 'unconfirmed']) })
      .strict()
      .parse(req.body);
    const data = await rpcSingle(req.db, 'mark_attendance', {
      p_booking: v.booking_id,
      p_status: v.status,
    });
    res.json({ data });
  }),
);
router.get(
  '/student-packages',
  requireAuth,
  asyncRoute(async (req, res) => {
    const studio = uuid.parse(req.query.studio_id);
    let query = req.db
      .from('student_packages')
      .select('*,course_packages(name)')
      .eq('studio_id', studio);
    if (req.query.scope === 'mine') query = query.eq('student_id', req.user!.id);
    const { data, error } = await query.order('expires_at');
    if (error) throw error;
    res.json({ data });
  }),
);
router.post(
  '/student-packages',
  requireAuth,
  asyncRoute(async (req, res) => {
    const v = z
      .object({
        studio_id: uuid,
        student_id: uuid,
        package_id: uuid,
        idempotency_key: z.string().min(8).max(120),
        starts_at: z.string().datetime({ offset: true }).optional(),
      })
      .strict()
      .parse(req.body);
    const data = await rpcSingle(req.db, 'issue_student_package', {
      p_studio: v.studio_id,
      p_student: v.student_id,
      p_package: v.package_id,
      p_key: v.idempotency_key,
      ...(v.starts_at ? { p_starts: v.starts_at } : {}),
    });
    res.status(201).json({ data });
  }),
);
router.post(
  '/student-packages/:id/adjust',
  requireAuth,
  asyncRoute(async (req, res) => {
    const v = z
      .object({
        delta: z
          .number()
          .int()
          .refine((x) => x !== 0),
        note: z.string().min(1).max(500),
        idempotency_key: z.string().min(8).max(120),
      })
      .strict()
      .parse(req.body);
    const data = await rpcSingle(req.db, 'adjust_student_credits', {
      p_student_package: uuid.parse(req.params.id),
      p_delta: v.delta,
      p_note: v.note,
      p_key: v.idempotency_key,
    });
    res.json({ data });
  }),
);
router.get(
  '/credit-ledger',
  requireAuth,
  asyncRoute(async (req, res) => {
    const studio = uuid.parse(req.query.studio_id);
    let query = req.db.from('credit_ledger').select('*').eq('studio_id', studio);
    if (req.query.scope === 'mine') query = query.eq('student_id', req.user!.id);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    res.json({ data });
  }),
);
router.get(
  '/students',
  requireAuth,
  asyncRoute(async (req, res) => {
    const q = z
      .object({
        studio_id: uuid,
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        q: z.string().max(100).optional(),
      })
      .parse(req.query);
    const args = {
      p_studio: q.studio_id,
      p_limit: q.limit,
      p_offset: (q.page - 1) * q.limit,
      p_search: q.q || null,
    };
    const data = (await rpc(req.db, 'list_students', args)) as any[];
    let total = data[0]?.total_count ?? 0;
    if (!data.length && q.page > 1) {
      const first = (await rpc(req.db, 'list_students', {
        ...args,
        p_limit: 1,
        p_offset: 0,
      })) as any[];
      total = first[0]?.total_count ?? 0;
    }
    res.json({ data, meta: { page: q.page, limit: q.limit, total: Number(total) } });
  }),
);
router.post(
  '/students',
  requireAuth,
  asyncRoute(async (req, res) => {
    const v = z.object({ studio_id: uuid, student_id: uuid }).strict().parse(req.body);
    await rpc(req.db, 'enroll_student', { p_studio: v.studio_id, p_student: v.student_id });
    res.status(201).json({ data: { enrolled: true } });
  }),
);
router.get(
  '/students/:id/history',
  requireAuth,
  asyncRoute(async (req, res) => {
    const studio_id = uuid.parse(req.query.studio_id);
    const student_id = uuid.parse(req.params.id);
    const [bookings, ledger, packages] = await Promise.all([
      rpc(req.db, 'list_bookings', { p_studio: studio_id, p_student: student_id }),
      req.db
        .from('credit_ledger')
        .select('*')
        .eq('studio_id', studio_id)
        .eq('student_id', student_id)
        .order('created_at', { ascending: false })
        .limit(200),
      req.db
        .from('student_packages')
        .select('*,course_packages(name)')
        .eq('studio_id', studio_id)
        .eq('student_id', student_id)
        .order('expires_at'),
    ]);
    if (ledger.error || packages.error) throw ledger.error || packages.error;
    res.json({ data: { bookings, ledger: ledger.data, packages: packages.data } });
  }),
);
router.patch(
  '/students/:id/status',
  requireAuth,
  asyncRoute(async (req, res) => {
    const v = z.object({ studio_id: uuid, is_active: z.boolean() }).strict().parse(req.body);
    await rpc(req.db, 'set_student_active', {
      p_studio: v.studio_id,
      p_user: uuid.parse(req.params.id),
      p_active: v.is_active,
    });
    res.json({ data: { updated: true } });
  }),
);
router.patch(
  '/students/:id/profile',
  requireAuth,
  asyncRoute(async (req, res) => {
    const v = z
      .object({
        studio_id: uuid,
        full_name: z.string().min(1).max(200),
        phone: z.string().max(40).nullable(),
        birthday: z.string().date().nullable(),
        notes: z.string().max(2000).nullable().optional(),
      })
      .strict()
      .parse(req.body);
    await rpc(req.db, 'update_student_profile', {
      p_studio: v.studio_id,
      p_user: uuid.parse(req.params.id),
      p_name: v.full_name,
      p_phone: v.phone,
      p_birthday: v.birthday,
      p_notes: v.notes ?? null,
    });
    res.json({ data: { updated: true } });
  }),
);
router.get(
  '/teaching-records',
  requireAuth,
  asyncRoute(async (req, res) => {
    const q = z
      .object({
        studio_id: uuid,
        from: z.string().datetime({ offset: true }),
        to: z.string().datetime({ offset: true }),
      })
      .parse(req.query);
    const data = await rpc(req.db, 'teaching_records', {
      p_studio: q.studio_id,
      p_from: q.from,
      p_to: q.to,
    });
    res.json({ data });
  }),
);
router.get(
  '/reports/metrics',
  requireAuth,
  asyncRoute(async (req, res) => {
    const q = z
      .object({
        studio_id: uuid,
        from: z.string().datetime({ offset: true }),
        to: z.string().datetime({ offset: true }),
        branch_id: uuid.optional(),
        status: z.enum(['scheduled', 'cancelled', 'completed']).optional(),
      })
      .parse(req.query);
    const data = await rpcSingle(req.db, 'business_metrics', {
      p_studio: q.studio_id,
      p_from: q.from,
      p_to: q.to,
      p_branch: q.branch_id ?? null,
      p_status: q.status ?? null,
    });
    res.json({ data });
  }),
);
router.get(
  '/reports',
  requireAuth,
  asyncRoute(async (req, res) => {
    const q = z
      .object({
        studio_id: uuid,
        from: z.string().datetime({ offset: true }),
        to: z.string().datetime({ offset: true }),
        branch_id: uuid.optional(),
        status: z.enum(['scheduled', 'cancelled', 'completed']).optional(),
      })
      .parse(req.query);
    const data = await rpc(req.db, 'admin_report', {
      p_studio: q.studio_id,
      p_from: q.from,
      p_to: q.to,
      p_branch: q.branch_id ?? null,
      p_status: q.status ?? null,
    });
    res.json({ data: Array.isArray(data) ? data[0] : data });
  }),
);
export default router;
