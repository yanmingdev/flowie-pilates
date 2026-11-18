import { z } from 'zod';
import { uuid } from '../../shared/validation/common.schemas.js';
export { uuid };
const text = z.string().trim().min(1).max(200);
const opt = z.string().max(2000).nullable().optional();
const active = z.boolean().optional();
const positive = z.number().int().positive();
type Resource = {
  table: string;
  primary: string;
  order: string;
  search?: string;
  schema: z.AnyZodObject;
};
export const resources: Record<string, Resource> = {
  branches: {
    table: 'branches',
    primary: 'id',
    order: 'name',
    search: 'name',
    schema: z.object({ name: text, address: opt, is_active: active }),
  },
  rooms: {
    table: 'rooms',
    primary: 'id',
    order: 'name',
    search: 'name',
    schema: z.object({ branch_id: uuid, name: text, capacity: positive, is_active: active }),
  },
  teachers: {
    table: 'teachers',
    primary: 'id',
    order: 'created_at',
    schema: z.object({ id: uuid, photo_url: opt, is_active: active }),
  },
  'course-categories': {
    table: 'course_categories',
    primary: 'id',
    order: 'sort_order',
    search: 'name',
    schema: z.object({ name: text, sort_order: z.number().int().optional(), is_active: active }),
  },
  courses: {
    table: 'courses',
    primary: 'id',
    order: 'name',
    search: 'name',
    schema: z.object({
      name: text,
      category_id: uuid,
      description: opt,
      image_url: opt,
      default_duration_minutes: positive,
      difficulty: text,
      credit_cost: positive,
      is_active: active,
    }),
  },
  packages: {
    table: 'course_packages',
    primary: 'id',
    order: 'name',
    search: 'name',
    schema: z.object({
      name: text,
      total_credits: positive,
      validity_days: positive,
      is_active: active,
    }),
  },
  'homepage-sections': {
    table: 'homepage_sections',
    primary: 'section_type',
    order: 'sort_order',
    schema: z.object({
      section_type: z.enum(['hero', 'courses', 'teachers', 'announcements', 'quick_booking']),
      title: opt,
      subtitle: opt,
      image_url: opt,
      link_url: opt,
      sort_order: z.number().int().optional(),
      is_active: active,
    }),
  },
  'site-settings': {
    table: 'site_settings',
    primary: 'id',
    order: 'id',
    schema: z.object({
      brand_name: text,
      logo_url: opt,
      brand_tagline: opt,
      contact_email: opt,
      contact_phone: opt,
      cancellation_hours: z.number().int().min(0).optional(),
    }),
  },
  announcements: {
    table: 'announcements',
    primary: 'id',
    order: 'created_at',
    search: 'title',
    schema: z.object({
      title: text,
      content: z.string().trim().min(1).max(10000),
      starts_at: opt,
      ends_at: opt,
      is_active: active,
    }),
  },
};

export const catalogQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().max(100).optional(),
});
