
-- Populate size on inv_sku_fc_mapping by extracting size suffix from SKU
UPDATE inv_sku_fc_mapping
SET size = CASE
  WHEN sku ~ '(XXXL|3XL)$' THEN 'XXXL'
  WHEN sku ~ '(XXL|2XL)$' THEN 'XXL'
  WHEN sku ~ 'XL$' THEN 'XL'
  WHEN sku ~ 'XS$' THEN 'XS'
  WHEN sku ~ '\dS$' THEN 'S'
  WHEN sku ~ '\dM$' THEN 'M'
  WHEN sku ~ '\dL$' THEN 'L'
  WHEN sku ~ '\dF$' THEN 'F'
  ELSE 'FREE'
END
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND size IS NULL;
