import { type Request, type Response, type NextFunction } from 'express';
import { type User, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseFor } from '../../infrastructure/supabase/client.js';
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

/** 解析 Bearer 憑證並向 Supabase 驗證使用者；不由前端旗標推導權限。 */ export async function auth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
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

/** 拒絕沒有登入身分的請求；資料列權限仍由 RLS／RPC 再次驗證。 */ export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (!req.user) return next(Object.assign(new Error('UNAUTHENTICATED'), { status: 401 }));
  next();
}

/** 查核有效 profile 的管理員旗標，避免僅憑登入或前端入口授權。 */ export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return next(Object.assign(new Error('UNAUTHENTICATED'), { status: 401 }));
    const { data, error } = await req.db
      .from('profiles')
      .select('is_admin,is_active')
      .eq('id', req.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data?.is_admin || !data.is_active)
      return next(Object.assign(new Error('FORBIDDEN'), { status: 403 }));
    next();
  } catch (error) {
    next(error);
  }
}
