import { Router } from 'express';
import { requireAdmin } from '../../shared/middleware/auth.js';
import { asyncRoute, unavailable } from '../../shared/http/async-handler.js';
import { resources } from './catalog.schemas.js';
import { resourceController } from './catalog.controller.js';
const router = Router();
for (const name of Object.keys(resources)) {
  const c = resourceController(name);
  router.get('/' + name, asyncRoute(c.list));
  router.post('/' + name, requireAdmin, asyncRoute(c.create));
  router.patch('/' + name + '/:id', requireAdmin, asyncRoute(c.update));
}
for (const name of [
  'teacher-branches',
  'teacher-courses',
  'package-courses',
  'room-availability',
  'teacher-availability',
  'teacher-time-off',
  'banners',
  'booking-settings',
])
  router.all('/' + name, unavailable);
export default router;
