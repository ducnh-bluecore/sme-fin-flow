
-- Assign remaining FCs based on 5th character of fc_code
WITH mapping(char5, coll_code, cat_name) AS (VALUES 
  ('1', '01-Ao', '01-Ao'),
  ('2', '02-Quan', '02-Quan'),
  ('3', '03-Dam', '03-Dam'),
  ('4', '04-Chan Vay', '04-Chan Vay'),
  ('5', '05-Ao Dai', '05-Ao Dai'),
  ('6', '06-Coat', '06-Coat'),
  ('7', '07-Others', '07-Others'),
  ('8', '08-Shoes', '08-Shoes'),
  ('9', '09-Bag', '09-Bag')
)
UPDATE inv_family_codes fc
SET collection_id = c.id, category = m.cat_name
FROM inv_collections c
JOIN mapping m ON c.collection_code = m.coll_code AND c.tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
WHERE fc.tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND fc.collection_id IS NULL
  AND SUBSTRING(fc.fc_code, 5, 1) = m.char5;

-- Assign remaining unmatched FCs to "07-Others"
UPDATE inv_family_codes
SET collection_id = (SELECT id FROM inv_collections WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' AND collection_code = '07-Others'),
    category = '07-Others'
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND collection_id IS NULL;
