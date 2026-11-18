import { Router } from 'express';

import { asyncRoute } from '../../shared/http/async-handler.js';
import * as controller from './public-content.controller.js';
const router = Router();
router.get('/studios', asyncRoute(controller.studios));
router.get('/teachers/public', asyncRoute(controller.teachers));
router.get('/knowledge-articles', asyncRoute(controller.knowledge));

export default router;
