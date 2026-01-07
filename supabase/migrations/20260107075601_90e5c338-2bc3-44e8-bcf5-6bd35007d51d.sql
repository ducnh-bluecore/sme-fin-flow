-- Ensure existing users have a profile + membership in Demo tenant
DO $$
DECLARE
  demo_tenant_id uuid := '11111111-1111-1111-1111-111111111111';
BEGIN
  -- Create missing profiles
  INSERT INTO public.profiles (id, full_name, active_tenant_id)
  SELECT
    u.id,
    COALESCE(u.raw_user_meta_data ->> 'full_name', u.email, 'User') AS full_name,
    demo_tenant_id
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL;

  -- Backfill active tenant for existing profiles
  UPDATE public.profiles
  SET active_tenant_id = demo_tenant_id
  WHERE active_tenant_id IS NULL;

  -- Ensure membership in Demo tenant
  INSERT INTO public.tenant_users (tenant_id, user_id, role, joined_at)
  SELECT
    demo_tenant_id,
    u.id,
    'member',
    now()
  FROM auth.users u
  LEFT JOIN public.tenant_users tu
    ON tu.tenant_id = demo_tenant_id AND tu.user_id = u.id
  WHERE tu.user_id IS NULL
  ON CONFLICT (tenant_id, user_id) DO NOTHING;
END $$;