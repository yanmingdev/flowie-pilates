import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../shared/middleware/auth.js';
import { asyncRoute, unavailable } from '../../shared/http/async-handler.js';
import * as controller from './scheduling.controller.js';
const router = Router();
router.get('/sessions', asyncRoute(controller.catalog));
router.get('/sessions/manage', requireAuth, asyncRoute(controller.manage));
router.post('/sessions', requireAdmin, asyncRoute(controller.create));
router.patch('/sessions/:id', requireAdmin, asyncRoute(controller.update));
router.patch('/sessions/:id/future', requireAdmin, unavailable);
router.post('/sessions/:id/cancel-future', requireAdmin, unavailable);
router.post('/sessions/:id/cancel', requireAdmin, asyncRoute(controller.cancel));
router.get('/sessions/:id/students', requireAuth, asyncRoute(controller.students));
router.get('/teaching-records', requireAuth, asyncRoute(controller.teaching));

export default router;
