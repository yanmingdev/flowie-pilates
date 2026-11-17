import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { resourceController } from '../controllers/resources.js';
import { resources, uuid } from '../validators/resources.js';
import { rpc, rpcSingle } from '../repositories/database.js';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
const router = Router();
const asyncRoute = (fn: (req: Request, res: Response) => Promise<void>): RequestHandler => (req, res, next) => { fn(req, res).catch(next as NextFunction); };
const dateRange = z.object({ from: z.string().datetime({ offset: true }), to: z.string().datetime({ offset: true }) });
const key = z.string().min(8).max(120);
const idempotent = z.object({ idempotency_key: key });
const unavailable: RequestHandler = (_req, _res, next) => next(Object.assign(new Error('FEATURE_UNAVAILABLE_V1'), { status: 501 }));

// Compatibility identifier is an API view-model label only, never a database foreign key.
router.get('/studios', asyncRoute(async (req, res) => {
  const { data, error } = await req.db.from('site_settings').select('brand_name,brand_tagline,logo_url').eq('id', 1).maybeSingle();
  if (error) throw error;
  res.json({ data: data ? [{ id: 'flowie', slug: 'flowie', name: data.brand_name, description: data.brand_tagline, logo_url: data.logo_url }] : [] });
}));
router.get('/auth/me', requireAuth, asyncRoute(async (req, res) => {
  const [profile, teacher] = await Promise.all([
    req.db.from('profiles').select('id,display_name,is_admin,is_active').eq('id', req.user!.id).maybeSingle(),
    req.db.from('teachers').select('id,is_active').eq('id', req.user!.id).maybeSingle(),
  ]);
  if (profile.error || teacher.error) throw profile.error || teacher.error;
  if (!profile.data) throw Object.assign(new Error('PROFILE_NOT_FOUND'), { status: 404 });
  res.json({ data: { user: { id: req.user!.id, email: req.user!.email ?? '' }, profile: profile.data, is_teacher: !!teacher.data?.is_active && profile.data.is_active } });
}));
router.patch('/auth/profile', requireAuth, asyncRoute(async (req, res) => {
  const fields = z.object({ display_name: z.string().trim().min(1).max(200) }).strict().parse(req.body);
  const { data, error } = await req.db.from('profiles').update(fields).eq('id', req.user!.id).select('id,display_name,is_admin,is_active').single();
  if (error) throw error;
  res.json({ data });
}));
router.post('/auth/join', requireAuth, unavailable);
router.get('/teachers/public', asyncRoute(async (req, res) => {
  const data = await rpc(req.db, 'flowie_public_teachers', {}) as Array<{ teacher_id: string; display_name: string; photo_url: string | null }>;
  res.json({ data: data.map((t) => ({ id: t.teacher_id, name: t.display_name, photo_url: t.photo_url })) });
}));
router.get('/knowledge-articles', asyncRoute(async (req, res) => {
  const { data, error } = await req.db.from('knowledge_articles').select('id,title,body_area,summary,image_url,sort_order').eq('is_active', true).order('sort_order', { ascending: true });
  if (error) throw error;
  res.json({ data: data ?? [] });
}));
router.get('/favorites', requireAuth, asyncRoute(async (req, res) => {
  const { data, error } = await req.db.from('course_favorites').select('course_id,created_at,courses(id,name,image_url,description,difficulty,default_duration_minutes,credit_cost,is_active)').eq('student_id', req.user!.id).order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []).map((f: any) => f.courses && ({ id: f.course_id, course_id: f.course_id, course_name: f.courses.name, ...f.courses, created_at: f.created_at })).filter(Boolean);
  res.json({ data: rows });
}));
router.post('/favorites', requireAuth, asyncRoute(async (req, res) => {
  const { course_id, is_favorite } = z.object({ course_id: uuid, is_favorite: z.boolean(), studio_id: z.string().optional() }).strict().parse(req.body);
  if (is_favorite) {
    const result = await req.db.from('course_favorites').insert({ student_id: req.user!.id, course_id });
    if (result.error && result.error.code !== '23505') throw result.error;
  } else {
    const result = await req.db.from('course_favorites').delete().eq('student_id', req.user!.id).eq('course_id', course_id);
    if (result.error) throw result.error;
  }
  res.json({ data: { is_favorite } });
}));
router.get('/sessions', asyncRoute(async (req, res) => {
  const q = dateRange.parse(req.query);
  const data = await rpc(req.db, 'flowie_v1_session_catalog', { p_from: q.from, p_to: q.to });
  res.json({ data });
}));
router.get('/sessions/manage', requireAuth, asyncRoute(async (req, res) => {
  const q = dateRange.parse(req.query);
  const profile = await req.db.from('profiles').select('is_admin,is_active').eq('id', req.user!.id).maybeSingle();
  if (profile.error) throw profile.error;
  if (!profile.data?.is_active) throw Object.assign(new Error('FORBIDDEN'), { status: 403 });
  const teacher = await req.db.from('teachers').select('is_active').eq('id', req.user!.id).maybeSingle();
  if (teacher.error) throw teacher.error;
  if (!profile.data.is_admin && !teacher.data?.is_active) throw Object.assign(new Error('FORBIDDEN'), { status: 403 });
  let request = req.db.from('class_sessions').select('*,courses(name),rooms(name,branch_id,branches(name))').gte('starts_at', q.from).lt('starts_at', q.to).order('starts_at').limit(1000);
  if (!profile.data.is_admin) request = request.eq('teacher_id', req.user!.id);
  const { data, error } = await request;
  if (error) throw error;
  const publicTeachers = await rpc(req.db, 'flowie_public_teachers', {}) as any[];
  const names = new Map(publicTeachers.map(t => [t.teacher_id, t.display_name]));
  if (profile.data.is_admin && data?.length) {
    const profiles = await req.db.from('profiles').select('id,display_name').in('id', [...new Set(data.map((s: any) => s.teacher_id))]);
    if (profiles.error) throw profiles.error;
    for (const p of profiles.data ?? []) names.set(p.id,p.display_name);
  }
  res.json({ data: (data ?? []).map((s: any) => ({ ...s, branch_id: s.rooms?.branch_id, branches: s.rooms?.branches, teachers: { name: names.get(s.teacher_id) ?? null }, cancellation_deadline: s.cancellation_deadline_override_at })) });
}));
const schedule = z.object({
  studio_id: z.string().optional(), branch_id: uuid.optional(), room_id: uuid, course_id: uuid, teacher_id: uuid,
  starts_at: z.string().datetime({ offset: true }), ends_at: z.string().datetime({ offset: true }), capacity: z.number().int().positive(),
  booking_opens_at: z.string().datetime({ offset: true }).nullable(), booking_closes_at: z.string().datetime({ offset: true }).nullable().optional(),
  cancellation_deadline: z.string().datetime({ offset: true }).nullable(), until_date: z.string().date().nullable().optional(),
}).strict();
function scheduleParams(v: z.infer<typeof schedule>, session: string | null) {
  return { p_session: session, p_room: v.room_id, p_course: v.course_id, p_teacher: v.teacher_id, p_starts: v.starts_at, p_ends: v.ends_at, p_capacity: v.capacity, p_opens: v.booking_opens_at, p_closes: v.booking_closes_at ?? null, p_deadline: v.cancellation_deadline, p_until: v.until_date ?? null };
}
router.post('/sessions', requireAdmin, asyncRoute(async (req,res) => { res.status(201).json({ data: await rpc(req.db,'flowie_v1_schedule',scheduleParams(schedule.parse(req.body),null)) }); }));
router.patch('/sessions/:id', requireAdmin, asyncRoute(async (req,res) => { res.json({ data: await rpc(req.db,'flowie_v1_schedule',scheduleParams(schedule.parse(req.body),uuid.parse(req.params.id))) }); }));
router.patch('/sessions/:id/future', requireAdmin, unavailable);
router.post('/sessions/:id/cancel-future', requireAdmin, unavailable);
router.post('/sessions/:id/cancel', requireAdmin, asyncRoute(async (req,res) => { res.json({ data: await rpcSingle(req.db,'flowie_v1_cancel_session',{p_session:uuid.parse(req.params.id)}) }); }));
router.get('/sessions/:id/students', requireAuth, asyncRoute(async (req,res) => { res.json({ data: await rpc(req.db,'flowie_v1_session_students',{p_session:uuid.parse(req.params.id)}) }); }));
router.get('/bookings', requireAuth, asyncRoute(async (req,res) => { res.json({ data: await rpc(req.db,'flowie_v1_bookings',{p_student:req.query.scope === 'mine' ? req.user!.id : null}) }); }));
router.post('/bookings', requireAuth, asyncRoute(async (req,res) => { const v=idempotent.extend({session_id:uuid}).strict().parse(req.body); res.status(201).json({ data: await rpcSingle(req.db,'flowie_v1_book',{p_session:v.session_id,p_key:v.idempotency_key}) }); }));
router.post('/bookings/:id/cancel', requireAuth, asyncRoute(async (req,res) => { res.json({ data: await rpcSingle(req.db,'flowie_v1_cancel_booking',{p_booking:uuid.parse(req.params.id)}) }); }));
router.post('/attendance', requireAuth, asyncRoute(async (req,res) => { const v=z.object({booking_id:uuid,status:z.enum(['present','absent','unconfirmed'])}).strict().parse(req.body); res.json({ data: await rpcSingle(req.db,'flowie_v1_mark_attendance',{p_booking:v.booking_id,p_status:v.status}) }); }));
async function packagesFor(req: Request, student?: string) {
  return rpc(req.db,'flowie_v1_packages',{p_student:student ?? null});
}
async function ledgerFor(req: Request, student?: string) {
  let request=req.db.from('credit_ledger').select('*,student_packages!inner(student_id)').order('created_at',{ascending:false}).limit(200);
  if(student) request=request.eq('student_packages.student_id',student);
  const {data,error}=await request;
  if(error) throw error;
  return data ?? [];
}
router.patch('/bookings/:id/teacher-feedback', requireAuth, asyncRoute(async (req, res) => {
  const feedback = z.object({ feedback: z.string().trim().min(1).max(2000) }).strict().parse(req.body);
  res.json({ data: await rpcSingle(req.db, 'flowie_v1_set_teacher_feedback', { p_booking: uuid.parse(req.params.id), p_feedback: feedback.feedback }) });
}));
router.get('/student-packages', requireAuth, asyncRoute(async(req,res)=>{ res.json({data:await packagesFor(req,req.query.scope==='mine'?req.user!.id:undefined)}); }));
router.get('/credit-ledger', requireAuth, asyncRoute(async(req,res)=>{ res.json({data:await ledgerFor(req,req.query.scope==='mine'?req.user!.id:undefined)}); }));
router.post('/student-packages', requireAdmin, asyncRoute(async(req,res)=>{
  const v=idempotent.extend({studio_id:z.string().optional(),student_id:uuid,package_id:uuid,starts_at:z.string().datetime({offset:true}).optional()}).strict().parse(req.body);
  res.status(201).json({data:await rpcSingle(req.db,'flowie_v1_issue_package',{p_student:v.student_id,p_package:v.package_id,p_key:v.idempotency_key,p_starts:v.starts_at??null})});
}));
router.post('/student-packages/:id/adjust', requireAdmin, asyncRoute(async(req,res)=>{
  const v=idempotent.extend({delta:z.number().int().refine(x=>x!==0),note:z.string().trim().min(1).max(500)}).strict().parse(req.body);
  res.json({data:await rpcSingle(req.db,'flowie_v1_adjust_credits',{p_package:uuid.parse(req.params.id),p_delta:v.delta,p_note:v.note,p_key:v.idempotency_key})});
}));
router.get('/students', requireAdmin, asyncRoute(async(req,res)=>{
  const q=z.object({page:z.coerce.number().int().min(1).default(1),limit:z.coerce.number().int().min(1).max(100).default(20),q:z.string().max(100).optional()}).parse(req.query);
  let request=req.db.from('profiles').select('id,display_name,is_active',{count:'exact'}).eq('is_admin',false).order('created_at',{ascending:false}).range((q.page-1)*q.limit,q.page*q.limit-1);
  if(q.q) request=request.ilike('display_name','%' + q.q.replace(/[%_\\]/g, '\\$&') + '%');
  const {data,count,error}=await request;if(error)throw error;
  res.json({data:(data??[]).map((p:any)=>({student_id:p.id,display_name:p.display_name,is_active:p.is_active})),meta:{page:q.page,limit:q.limit,total:count??0}});
}));
router.post('/students',requireAdmin,unavailable);
router.get('/students/:id/history',requireAdmin,asyncRoute(async(req,res)=>{
  const student=uuid.parse(req.params.id);
  const [bookings,ledger,packages]=await Promise.all([rpc(req.db,'flowie_v1_bookings',{p_student:student}),ledgerFor(req,student),packagesFor(req,student)]);
  res.json({data:{bookings,ledger,packages}});
}));
router.patch('/students/:id/status',requireAdmin,asyncRoute(async(req,res)=>{
  const v=z.object({studio_id:z.string().optional(),is_active:z.boolean()}).strict().parse(req.body);
  await rpc(req.db,'flowie_v1_set_student_active',{p_student:uuid.parse(req.params.id),p_active:v.is_active});
  res.json({data:{updated:true}});
}));
router.patch('/students/:id/profile',requireAdmin,unavailable);
router.get('/teaching-records',requireAuth,asyncRoute(async(req,res)=>{
  const q=dateRange.parse(req.query);
  res.json({data:await rpc(req.db,'flowie_v1_teaching_records',{p_from:q.from,p_to:q.to})});
}));
const reportQuery=dateRange.extend({branch_id:uuid.optional(),status:z.enum(['scheduled','cancelled','completed']).optional()});
const report: RequestHandler=asyncRoute(async(req,res)=>{
  const q=reportQuery.parse(req.query);
  res.json({data:await rpc(req.db,'flowie_v1_report',{p_from:q.from,p_to:q.to,p_branch:q.branch_id??null,p_status:q.status??null})});
});
router.get('/reports/metrics',requireAdmin,report);
router.get('/reports',requireAdmin,report);
for (const name of Object.keys(resources)) {
  const controller=resourceController(name);
  router.get('/'+name,controller.list);
  router.post('/'+name,requireAdmin,controller.create);
  router.patch('/'+name+'/:id',requireAdmin,controller.update);
}
for(const name of ['teacher-branches','teacher-courses','package-courses','room-availability','teacher-availability','teacher-time-off','banners','booking-settings']){
  router.all('/'+name,unavailable);
}
export default router;
