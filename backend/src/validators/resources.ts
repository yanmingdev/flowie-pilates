import { z } from 'zod';
const id = z.string().uuid();
const opt = z.string().max(2000).nullable().optional();
const flag = z.boolean().optional();
const text = z.string().trim().min(1).max(200);
const positive = z.number().int().positive();
export const resources = {
  branches: {
    table: 'branches',
    search: 'name',
    schema: z.object({
      name: text,
      address: opt,
      phone: opt,
      email: opt,
      opening_hours: opt,
      description: opt,
      timezone: opt,
      is_active: flag,
    }),
  },
  rooms: {
    table: 'rooms',
    search: 'name',
    schema: z.object({
      branch_id: id,
      name: text,
      capacity: positive,
      description: opt,
      facilities: opt,
      is_active: flag,
    }),
  },
  'room-availability': {
    table: 'room_availability',
    search: undefined,
    schema: z.object({
      room_id: id,
      weekday: z.number().int().min(0).max(6),
      start_time: text,
      end_time: text,
      is_active: flag,
    }),
  },
  teachers: {
    table: 'teachers',
    search: 'name',
    schema: z.object({
      profile_id: id.nullable().optional(),
      name: text,
      email: opt,
      phone: opt,
      photo_url: opt,
      specialty: opt,
      bio: opt,
      is_active: flag,
    }),
  },
  'course-categories': {
    table: 'course_categories',
    search: 'name',
    schema: z.object({ name: text, sort_order: z.number().int().optional(), is_active: flag }),
  },
  courses: {
    table: 'courses',
    search: 'name',
    schema: z.object({
      name: text,
      category_id: id.nullable().optional(),
      description: opt,
      image_url: opt,
      duration_minutes: positive,
      difficulty: text,
      default_capacity: positive,
      credit_cost: positive,
      is_active: flag,
    }),
  },
  'teacher-branches': {
    table: 'teacher_branches',
    search: undefined,
    schema: z.object({ teacher_id: id, branch_id: id }),
  },
  'teacher-courses': {
    table: 'teacher_courses',
    search: undefined,
    schema: z.object({ teacher_id: id, course_id: id }),
  },
  'teacher-availability': {
    table: 'teacher_availability',
    search: undefined,
    schema: z.object({
      teacher_id: id,
      branch_id: id.nullable().optional(),
      weekday: z.number().int().min(0).max(6),
      start_time: text,
      end_time: text,
      is_active: flag,
    }),
  },
  'teacher-time-off': {
    table: 'teacher_time_off',
    search: undefined,
    schema: z.object({
      teacher_id: id,
      starts_at: text,
      ends_at: text,
      reason: opt,
      is_active: flag,
    }),
  },
  packages: {
    table: 'course_packages',
    search: 'name',
    schema: z.object({
      name: text,
      total_credits: positive,
      validity_days: positive,
      price: z.number().min(0).nullable().optional(),
      notes: opt,
      applies_to_all: flag,
      is_active: flag,
    }),
  },
  'package-courses': {
    table: 'package_courses',
    search: undefined,
    schema: z.object({ package_id: id, course_id: id }),
  },
  banners: {
    table: 'banners',
    search: 'title',
    schema: z.object({
      title: text,
      subtitle: opt,
      image_url: opt,
      link_url: opt,
      sort_order: z.number().int().optional(),
      is_active: flag,
    }),
  },
  'homepage-sections': {
    table: 'homepage_sections',
    search: undefined,
    schema: z.object({
      section_type: z.enum(['hero', 'courses', 'teachers', 'announcements', 'quick_booking']),
      title: opt,
      subtitle: opt,
      image_url: opt,
      link_url: opt,
      sort_order: z.number().int().optional(),
      is_active: flag,
    }),
  },
  announcements: {
    table: 'announcements',
    search: 'title',
    schema: z.object({ title: text, content: text, starts_at: opt, ends_at: opt, is_active: flag }),
  },
  'site-settings': {
    table: 'site_settings',
    search: undefined,
    schema: z.object({
      brand_tagline: text.optional(),
      headline: text,
      subheadline: text,
      contact_email: opt,
      contact_phone: opt,
      address: opt,
    }),
  },
  'booking-settings': {
    table: 'booking_settings',
    search: undefined,
    schema: z.object({ cancellation_hours: z.number().int().min(0).max(720) }),
  },
} as const;
export const uuid = id;
