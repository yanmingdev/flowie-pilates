import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.js';
import { asyncRoute } from '../../shared/http/async-handler.js';
import * as controller from './bookings.controller.js';
const router = Router();
router.get('/bookings', requireAuth, asyncRoute(controller.list));
router.post('/bookings', requireAuth, asyncRoute(controller.create));
router.post('/bookings/:id/cancel', requireAuth, asyncRoute(controller.cancel));
router.post('/attendance', requireAuth, asyncRoute(controller.attendance));
router.patch('/bookings/:id/teacher-feedback', requireAuth, asyncRoute(controller.feedback));

export default router;
