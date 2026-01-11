-- Add resolution_notes column to tasks table for storing results/comments
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

-- Add a comment for documentation
COMMENT ON COLUMN public.tasks.resolution_notes IS 'Notes about task completion or progress updates';