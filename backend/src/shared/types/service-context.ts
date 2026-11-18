import type { SupabaseClient, User } from '@supabase/supabase-js';
/** 服務僅依賴呼叫者憑證的 DB client 與最小身分；角色必須向 profile／RPC 查核。 */
export type ServiceContext = Readonly<{ db: SupabaseClient; user?: Pick<User, 'id' | 'email'> }>;
