-- Add city column to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS city text;

-- Add district column to customers table  
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS district text;

-- Add ward column to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS ward text;

-- Drop available_quantity if it's a generated column and recreate as normal column
DO $$
BEGIN
  -- Check if the column exists and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'external_products' 
    AND column_name = 'available_quantity'
  ) THEN
    ALTER TABLE public.external_products DROP COLUMN available_quantity;
  END IF;
END $$;

-- Add available_quantity as normal column
ALTER TABLE public.external_products 
ADD COLUMN IF NOT EXISTS available_quantity numeric DEFAULT 0;