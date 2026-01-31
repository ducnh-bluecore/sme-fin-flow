-- Update core module: Data Warehouse is core, not FDP
UPDATE public.platform_modules SET is_core = false WHERE code = 'fdp';
UPDATE public.platform_modules SET is_core = true WHERE code = 'data_warehouse';