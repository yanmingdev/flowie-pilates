import { Router } from 'express';
import { requireAdmin } from '../../shared/middleware/auth.js';
import { asyncRoute } from '../../shared/http/async-handler.js';
import * as controller from './reports.controller.js';
const router = Router();
router.get('/reports/metrics', requireAdmin, asyncRoute(controller.report));
router.get('/reports', requireAdmin, asyncRoute(controller.report));
export default router;
