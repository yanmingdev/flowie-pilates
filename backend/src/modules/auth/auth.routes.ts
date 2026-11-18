import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.js';
import { asyncRoute, unavailable } from '../../shared/http/async-handler.js';
import * as controller from './auth.controller.js';
const router = Router();
router.get('/auth/me', requireAuth, asyncRoute(controller.me));
router.patch('/auth/profile', requireAuth, asyncRoute(controller.updateProfile));
router.post('/auth/join', requireAuth, unavailable);

export default router;
