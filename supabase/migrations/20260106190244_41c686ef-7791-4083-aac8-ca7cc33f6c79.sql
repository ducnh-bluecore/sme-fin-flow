-- Update handle_new_user to assign Demo Company as default tenant
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demo_tenant_id uuid := '11111111-1111-1111-1111-111111111111';
  user_count INTEGER;
  assigned_role app_role;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  
  IF user_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'viewer';
  END IF;
  
  -- Create profile with Demo Company as active tenant
  INSERT INTO public.profiles (id, full_name, active_tenant_id)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', demo_tenant_id);
  
  -- Add user as member of Demo Company tenant
  INSERT INTO public.tenant_users (tenant_id, user_id, role, joined_at)
  VALUES (demo_tenant_id, NEW.id, 'member', now())
  ON CONFLICT (tenant_id, user_id) DO NOTHING;
  
  -- Assign app role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);
  
  RETURN NEW;
END;
$$;