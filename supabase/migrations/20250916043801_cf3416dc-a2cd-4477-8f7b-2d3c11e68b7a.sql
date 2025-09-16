-- Add ranking_type column to classrooms table
ALTER TABLE public.classrooms 
ADD COLUMN ranking_type text DEFAULT 'fastest';

-- Add constraint to ensure valid ranking types
ALTER TABLE public.classrooms 
ADD CONSTRAINT valid_ranking_type 
CHECK (ranking_type IN ('fastest', 'slowest'));