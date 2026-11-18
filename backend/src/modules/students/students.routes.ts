import { Router } from 'express';
import { requireAdmin } from '../../shared/middleware/auth.js';
import { asyncRoute, unavailable } from '../../shared/http/async-handler.js';
import * as controller from './students.controller.js';
const router = Router();
router.get('/students', requireAdmin, asyncRoute(controller.list));
router.post('/students', requireAdmin, unavailable);
router.get('/students/:id/history', requireAdmin, asyncRoute(controller.history));
router.patch('/students/:id/status', requireAdmin, asyncRoute(controller.status));
router.patch('/students/:id/profile', requireAdmin, unavailable);

export default router;
