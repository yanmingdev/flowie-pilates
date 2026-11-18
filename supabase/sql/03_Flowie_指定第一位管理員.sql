
-- Flowie：指定第一位管理員
-- 需先在 Supabase Authentication → Users 建立帳號

BEGIN;

DO $$
DECLARE
  admin_user_id uuid := 'REPLACE_WITH_EXISTING_ADMIN_AUTH_UID'::uuid;
BEGIN
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION '請先填入要指定為管理員的 Auth User UID';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = admin_user_id
  ) THEN
    RAISE EXCEPTION '此 UID 不存在於 Supabase Auth';
  END IF;

  INSERT INTO public.profiles(id)
  VALUES (admin_user_id)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.profiles
  SET is_admin = true,
      is_active = true
  WHERE id = admin_user_id;
END $$;

COMMIT;

--檢查用
SELECT
    p.id,
    u.email,
    p.display_name,
    p.is_admin,
    p.is_active
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.id = 'REPLACE_WITH_EXISTING_ADMIN_AUTH_UID'::uuid;
