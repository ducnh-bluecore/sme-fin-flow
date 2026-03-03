UPDATE inv_family_codes SET collection_id = CASE substr(fc_code, 5, 1)
  WHEN '1' THEN '0a15e63f-3408-4228-a559-808e92ea2d65'::uuid -- 01-Ao
  WHEN '2' THEN '48f00362-227b-4f54-95b4-b89be10cbf78'::uuid -- 02-Quan
  WHEN '3' THEN '6969b5ba-c389-431b-a0c7-358d76368a73'::uuid -- 03-Dam
  WHEN '4' THEN 'e8fa49ae-26d9-4a52-bff7-b04242deb542'::uuid -- 04-Chan Vay
  WHEN '5' THEN 'fef254bf-9517-4fbc-8cc6-9e7ba3fa5561'::uuid -- 05-Ao Dai
  WHEN '6' THEN '23e135e4-5277-4c91-a21f-3db3d4c86669'::uuid -- 06-Coat
  WHEN '7' THEN '0265d352-c2c5-4cfa-8939-e029744f91d2'::uuid -- 07-Others
  WHEN '8' THEN 'cec0d44b-9402-4efa-8893-0ad57171b088'::uuid -- 08-Shoes
  WHEN '9' THEN 'cb7ea094-d68f-4925-80ae-448195f5da07'::uuid -- 09-Bag
END
WHERE is_active = true 
  AND collection_id IS NULL 
  AND fc_code LIKE '2220%' 
  AND substr(fc_code, 5, 1) IN ('1','2','3','4','5','6','7','8','9')