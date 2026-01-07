-- Ensure new users are automatically provisioned into Demo Company
-- 1) Attach trigger on auth.users (standard pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'on_auth_user_created'
      AND n.nspname = 'auth'
      AND c.relname = 'users'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- 2) Backfill: if some existing profiles have no active tenant, set Demo Company
UPDATE public.profiles
SET active_tenant_id = '11111111-1111-1111-1111-111111111111'::uuid
WHERE active_tenant_id IS NULL;

-- 3) Backfill membership into Demo Company for users who already have profiles
INSERT INTO public.tenant_users (tenant_id, user_id, role, joined_at)
SELECT '11111111-1111-1111-1111-111111111111'::uuid, p.id, 'member', now()
FROM public.profiles p
LEFT JOIN public.tenant_users tu
  ON tu.tenant_id = '11111111-1111-1111-1111-111111111111'::uuid
 AND tu.user_id = p.id
WHERE tu.user_id IS NULL;