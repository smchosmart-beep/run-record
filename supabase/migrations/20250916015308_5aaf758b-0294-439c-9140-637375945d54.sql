-- Create record_sessions table to persist session data
CREATE TABLE public.record_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id uuid NOT NULL,
  session_date date NOT NULL,
  slots_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(classroom_id, session_date)
);

-- Enable Row Level Security
ALTER TABLE public.record_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view sessions for their classrooms" 
ON public.record_sessions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM classrooms 
  WHERE classrooms.id = record_sessions.classroom_id 
  AND classrooms.user_id = auth.uid()
));

CREATE POLICY "Users can create sessions for their classrooms" 
ON public.record_sessions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM classrooms 
  WHERE classrooms.id = record_sessions.classroom_id 
  AND classrooms.user_id = auth.uid()
));

CREATE POLICY "Users can update sessions for their classrooms" 
ON public.record_sessions 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM classrooms 
  WHERE classrooms.id = record_sessions.classroom_id 
  AND classrooms.user_id = auth.uid()
));

CREATE POLICY "Users can delete sessions for their classrooms" 
ON public.record_sessions 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM classrooms 
  WHERE classrooms.id = record_sessions.classroom_id 
  AND classrooms.user_id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_record_sessions_updated_at
BEFORE UPDATE ON public.record_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();