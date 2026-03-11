
-- ============================================================
-- ADMIN SETUP: Reconfigure user roles
-- ============================================================

-- New admin user ID
-- ducnh@blucore.vn = f4e2fb5b-dbcd-4d72-9286-2b57bc1189f2
-- ducnh1211v1@gmail.com = eb8c68fd-aea7-4bbc-9a74-6e2360d002fe

-- 1. Create profile for new admin user
INSERT INTO public.profiles (id, full_name, onboarding_status, active_tenant_id)
VALUES (
  'f4e2fb5b-dbcd-4d72-9286-2b57bc1189f2',
  'Duc NH - Blucore Admin',
  'completed',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  onboarding_status = EXCLUDED.onboarding_status;

-- 2. Grant super admin role to ducnh@blucore.vn
INSERT INTO public.user_roles (user_id, role)
VALUES ('f4e2fb5b-dbcd-4d72-9286-2b57bc1189f2', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Add ducnh@blucore.vn as admin to ALL tenants
INSERT INTO public.tenant_users (user_id, tenant_id, role)
VALUES
  ('f4e2fb5b-dbcd-4d72-9286-2b57bc1189f2', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'admin'),
  ('f4e2fb5b-dbcd-4d72-9286-2b57bc1189f2', '364a23ad-66f5-44d6-8da9-74c7ff333dcc', 'admin'),
  ('f4e2fb5b-dbcd-4d72-9286-2b57bc1189f2', '9577c1f0-bfb2-443e-9b62-262fe2a1d589', 'admin')
ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = 'admin';

-- 4. Remove super admin role from ducnh1211v1@gmail.com
DELETE FROM public.user_roles 
WHERE user_id = 'eb8c68fd-aea7-4bbc-9a74-6e2360d002fe' AND role = 'admin';

-- 5. Remove ducnh1211v1 from Icon Denim
DELETE FROM public.tenant_users 
WHERE user_id = 'eb8c68fd-aea7-4bbc-9a74-6e2360d002fe' 
  AND tenant_id = '364a23ad-66f5-44d6-8da9-74c7ff333dcc';

-- 6. Change ducnh1211v1 role in OLV from admin to member
UPDATE public.tenant_users 
SET role = 'member'
WHERE user_id = 'eb8c68fd-aea7-4bbc-9a74-6e2360d002fe' 
  AND tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
