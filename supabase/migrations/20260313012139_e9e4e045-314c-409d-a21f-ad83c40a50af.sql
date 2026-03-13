
-- Update phone column from phone_extracted for valid Vietnamese phone numbers
UPDATE tenant_icondenim.cdp_customers
SET phone = phone_extracted
WHERE phone IS NULL 
  AND phone_extracted IS NOT NULL 
  AND phone_extracted != ''
  AND phone_extracted ~ '^0[0-9]{9,10}$';
