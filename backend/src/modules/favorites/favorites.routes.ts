import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.js';
import { asyncRoute } from '../../shared/http/async-handler.js';
import * as controller from './favorites.controller.js';
const router = Router();
router.get('/favorites', requireAuth, asyncRoute(controller.list));
router.post('/favorites', requireAuth, asyncRoute(controller.save));
export default router;
