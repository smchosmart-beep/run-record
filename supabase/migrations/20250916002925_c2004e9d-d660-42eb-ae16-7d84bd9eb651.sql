-- Add record_date column to records table for date-based record management
ALTER TABLE public.records 
ADD COLUMN record_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Add index for efficient date-based queries
CREATE INDEX idx_records_date_student ON public.records(student_id, record_date);

-- Add index for date and slot combination lookups
CREATE INDEX idx_records_date_slot ON public.records(record_date, slot_index);