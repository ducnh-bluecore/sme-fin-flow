
-- Trigger: prevent active_tenant_id from being changed to a tenant the user has no membership in
CREATE OR REPLACE FUNCTION guard_active_tenant_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip if active_tenant_id is not changing or is being set to NULL
  IF NEW.active_tenant_id IS NULL OR NEW.active_tenant_id = OLD.active_tenant_id THEN
    RETURN NEW;
  END IF;

  -- Verify user has active membership in the target tenant
  IF NOT EXISTS (
    SELECT 1 FROM tenant_users
    WHERE user_id = NEW.id
      AND tenant_id = NEW.active_tenant_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Cannot switch to tenant % — no active membership found for user %', 
      NEW.active_tenant_id, NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_active_tenant ON profiles;
CREATE TRIGGER trg_guard_active_tenant
  BEFORE UPDATE OF active_tenant_id ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION guard_active_tenant_change();
