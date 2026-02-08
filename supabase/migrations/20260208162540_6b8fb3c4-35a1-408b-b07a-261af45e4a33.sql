
-- Function to merge duplicate customers across sources based on email matching
-- Finds customers with same email but different canonical_keys (phone vs email)
-- Merges them into a single master record (preferring the one with phone)
CREATE OR REPLACE FUNCTION public.merge_duplicate_customers(p_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_merged integer := 0;
  v_group record;
  v_master_id uuid;
  v_duplicate_ids uuid[];
BEGIN
  -- Find email groups with multiple records (different canonical_keys)
  FOR v_group IN
    SELECT lower(trim(email)) AS norm_email,
           array_agg(id ORDER BY 
             -- Prefer record with phone (kiotviet) as master
             CASE WHEN phone IS NOT NULL AND phone != '' THEN 0 ELSE 1 END,
             created_at ASC
           ) AS ids
    FROM cdp_customers
    WHERE tenant_id = p_tenant_id
      AND email IS NOT NULL 
      AND trim(email) != ''
    GROUP BY lower(trim(email))
    HAVING count(*) > 1
  LOOP
    -- First element is master (has phone, or earliest)
    v_master_id := v_group.ids[1];
    v_duplicate_ids := v_group.ids[2:];

    -- Merge external_ids from duplicates into master
    UPDATE cdp_customers
    SET external_ids = (
          SELECT jsonb_agg(DISTINCT elem)
          FROM (
            SELECT jsonb_array_elements(external_ids) AS elem
            FROM cdp_customers
            WHERE id = ANY(v_group.ids)
              AND tenant_id = p_tenant_id
          ) sub
        ),
        -- Fill phone/email if master is missing
        phone = COALESCE(
          (SELECT c.phone FROM cdp_customers c WHERE c.id = v_master_id AND c.tenant_id = p_tenant_id),
          (SELECT c.phone FROM cdp_customers c WHERE c.id = ANY(v_duplicate_ids) AND c.tenant_id = p_tenant_id AND c.phone IS NOT NULL LIMIT 1)
        ),
        email = COALESCE(
          (SELECT c.email FROM cdp_customers c WHERE c.id = v_master_id AND c.tenant_id = p_tenant_id),
          (SELECT c.email FROM cdp_customers c WHERE c.id = ANY(v_duplicate_ids) AND c.tenant_id = p_tenant_id AND c.email IS NOT NULL LIMIT 1)
        ),
        -- Keep earliest created_at
        created_at = LEAST(
          (SELECT MIN(c.created_at) FROM cdp_customers c WHERE c.id = ANY(v_group.ids) AND c.tenant_id = p_tenant_id)
        ),
        -- Sum lifetime values
        lifetime_value = (
          SELECT COALESCE(SUM(c.lifetime_value), 0) FROM cdp_customers c WHERE c.id = ANY(v_group.ids) AND c.tenant_id = p_tenant_id
        ),
        loyalty_points = (
          SELECT COALESCE(SUM(c.loyalty_points), 0) FROM cdp_customers c WHERE c.id = ANY(v_group.ids) AND c.tenant_id = p_tenant_id
        )
    WHERE id = v_master_id AND tenant_id = p_tenant_id;

    -- Re-point orders from duplicates to master
    UPDATE cdp_orders
    SET customer_id = v_master_id
    WHERE customer_id = ANY(v_duplicate_ids)
      AND tenant_id = p_tenant_id;

    -- Delete duplicate records
    DELETE FROM cdp_customers
    WHERE id = ANY(v_duplicate_ids)
      AND tenant_id = p_tenant_id;

    v_merged := v_merged + array_length(v_duplicate_ids, 1);
  END LOOP;

  RETURN v_merged;
END;
$$;
