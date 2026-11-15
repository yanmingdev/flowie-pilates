import type { Request, Response, NextFunction } from 'express';
import type { User, SupabaseClient } from '@supabase/supabase-js';
import { supabaseFor } from '../config/supabase.js';
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      db: SupabaseClient;
      user?: User;
      token?: string;
      request_id: string;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */
export async function auth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header('authorization');
    if (header && !header.startsWith('Bearer '))
      return next(Object.assign(new Error('INVALID_AUTHORIZATION'), { status: 401 }));
    const token = header?.slice(7).trim();
    req.db = supabaseFor(token);
    if (token) {
      const { data, error } = await req.db.auth.getUser(token);
      if (error || !data.user)
        return next(Object.assign(new Error('UNAUTHENTICATED'), { status: 401 }));
      req.user = data.user;
      req.token = token;
    }
    next();
  } catch (error) {
    next(error);
  }
}
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(Object.assign(new Error('UNAUTHENTICATED'), { status: 401 }));
  next();
}
