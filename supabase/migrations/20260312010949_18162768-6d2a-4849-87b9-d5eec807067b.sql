-- Re-create the function (may have been rolled back)
CREATE OR REPLACE FUNCTION public.trg_validate_tenant_source_by_channel()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_provisioned boolean;
  v_allowed_channels text[];
  v_slug text;
BEGIN
  IF NEW.channel IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT schema_provisioned, slug INTO v_is_provisioned, v_slug FROM tenants WHERE id = NEW.tenant_id;
  IF v_is_provisioned IS NOT TRUE THEN RETURN NEW; END IF;
  v_allowed_channels := fn_get_tenant_allowed_channels(NEW.tenant_id);
  IF array_length(v_allowed_channels, 1) IS NULL THEN RETURN NEW; END IF;
  IF NOT (NEW.channel = ANY(v_allowed_channels)) THEN
    RAISE EXCEPTION '[GUARDRAIL] Cross-tenant contamination blocked: tenant "%" (%) does not allow channel "%". Allowed: %',
      v_slug, NEW.tenant_id, NEW.channel, v_allowed_channels;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix products triggers
DROP TRIGGER IF EXISTS trg_guard_product_source ON tenant_icondenim.products;
CREATE TRIGGER trg_guard_product_source
  BEFORE INSERT OR UPDATE ON tenant_icondenim.products
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_tenant_source_by_channel();

DROP TRIGGER IF EXISTS trg_guard_product_source ON public.products;
CREATE TRIGGER trg_guard_product_source
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_tenant_source_by_channel();

-- Fix cdp_orders triggers (drop existing first)
DROP TRIGGER IF EXISTS trg_guard_customer_source ON tenant_icondenim.cdp_orders;
DROP TRIGGER IF EXISTS trg_guard_order_source ON tenant_icondenim.cdp_orders;
CREATE TRIGGER trg_guard_order_source
  BEFORE INSERT OR UPDATE ON tenant_icondenim.cdp_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_tenant_source_by_channel();

DROP TRIGGER IF EXISTS trg_guard_customer_source ON public.cdp_orders;
DROP TRIGGER IF EXISTS trg_guard_order_source ON public.cdp_orders;
CREATE TRIGGER trg_guard_order_source
  BEFORE INSERT OR UPDATE ON public.cdp_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_tenant_source_by_channel();