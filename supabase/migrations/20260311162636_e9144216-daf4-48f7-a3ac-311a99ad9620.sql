-- GUARDRAIL: Prevent cross-tenant data contamination
-- Validates acquisition_source matches tenant's configured channels

CREATE OR REPLACE FUNCTION public.fn_get_tenant_allowed_channels(p_tenant_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(DISTINCT channel),
    ARRAY[]::text[]
  )
  FROM bigquery_tenant_sources
  WHERE tenant_id = p_tenant_id
    AND is_enabled = true;
$$;

CREATE OR REPLACE FUNCTION public.trg_validate_tenant_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_provisioned boolean;
  v_allowed_channels text[];
  v_slug text;
BEGIN
  IF NEW.acquisition_source IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT schema_provisioned, slug 
  INTO v_is_provisioned, v_slug
  FROM tenants 
  WHERE id = NEW.tenant_id;

  IF v_is_provisioned IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  v_allowed_channels := fn_get_tenant_allowed_channels(NEW.tenant_id);
  
  IF array_length(v_allowed_channels, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT (NEW.acquisition_source = ANY(v_allowed_channels)) THEN
    RAISE EXCEPTION '[GUARDRAIL] Cross-tenant contamination blocked: tenant "%" (%) does not allow source "%". Allowed: %',
      v_slug, NEW.tenant_id, NEW.acquisition_source, v_allowed_channels;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply to public schema tables
DROP TRIGGER IF EXISTS trg_guard_customer_source ON cdp_customers;
CREATE TRIGGER trg_guard_customer_source
  BEFORE INSERT OR UPDATE ON cdp_customers
  FOR EACH ROW EXECUTE FUNCTION trg_validate_tenant_source();

DROP TRIGGER IF EXISTS trg_guard_order_source ON cdp_orders;
CREATE TRIGGER trg_guard_order_source
  BEFORE INSERT OR UPDATE ON cdp_orders
  FOR EACH ROW EXECUTE FUNCTION trg_validate_tenant_source();

DROP TRIGGER IF EXISTS trg_guard_product_source ON products;
CREATE TRIGGER trg_guard_product_source
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION trg_validate_tenant_source();