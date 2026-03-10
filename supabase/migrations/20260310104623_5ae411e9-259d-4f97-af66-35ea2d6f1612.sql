
-- Populate demand_space from category on inv_family_codes
UPDATE inv_family_codes
SET demand_space = category
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND demand_space IS NULL
  AND category IS NOT NULL;
