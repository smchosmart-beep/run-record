-- Add total_activity_days column to classrooms table
ALTER TABLE public.classrooms 
ADD COLUMN total_activity_days INTEGER NOT NULL DEFAULT 0;