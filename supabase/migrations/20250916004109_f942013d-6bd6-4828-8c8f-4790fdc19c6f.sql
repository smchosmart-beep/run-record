-- Adjust unique constraint to include record_date so the same student/slot can have records on different dates

-- 1) Drop existing unique index/constraint if present
DO $$
BEGIN
  -- Try to drop a constraint (if it exists as a constraint)
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'records' AND c.conname = 'records_student_id_slot_index_key'
  ) THEN
    ALTER TABLE public.records DROP CONSTRAINT records_student_id_slot_index_key;
  END IF;

  -- Try to drop an index (if it exists as an index)
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'records_student_id_slot_index_key'
  ) THEN
    DROP INDEX IF EXISTS public.records_student_id_slot_index_key;
  END IF;
END $$;

-- 2) Create new unique index including record_date
CREATE UNIQUE INDEX IF NOT EXISTS records_student_id_slot_index_record_date_key
ON public.records (student_id, slot_index, record_date);
