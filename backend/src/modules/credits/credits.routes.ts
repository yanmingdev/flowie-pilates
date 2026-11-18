import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../shared/middleware/auth.js';
import { asyncRoute } from '../../shared/http/async-handler.js';
import * as controller from './credits.controller.js';
const router = Router();
router.get('/student-packages', requireAuth, asyncRoute(controller.packages));
router.get('/credit-ledger', requireAuth, asyncRoute(controller.ledger));
router.post('/student-packages', requireAdmin, asyncRoute(controller.issue));
router.post('/student-packages/:id/adjust', requireAdmin, asyncRoute(controller.adjust));

export default router;
