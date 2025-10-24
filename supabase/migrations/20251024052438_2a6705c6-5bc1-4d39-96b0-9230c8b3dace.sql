-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('teacher', 'recorder');

-- Create user_roles table to store user role assignments
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role, classroom_id)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create security definer function to check if user can record for a classroom
CREATE OR REPLACE FUNCTION public.can_record_for_classroom(_user_id UUID, _classroom_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'recorder'
      AND classroom_id = _classroom_id
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Teachers can view all user roles for their classrooms"
ON public.user_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE classrooms.id = user_roles.classroom_id
    AND classrooms.user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Teachers can create user roles for their classrooms"
ON public.user_roles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE classrooms.id = user_roles.classroom_id
    AND classrooms.user_id = auth.uid()
  )
);

CREATE POLICY "Teachers can delete user roles for their classrooms"
ON public.user_roles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE classrooms.id = user_roles.classroom_id
    AND classrooms.user_id = auth.uid()
  )
);

-- Update RLS policies for records table to allow recorders to insert
CREATE POLICY "Recorders can insert records for assigned classroom"
ON public.records
FOR INSERT
WITH CHECK (
  public.can_record_for_classroom(auth.uid(), (
    SELECT classroom_id FROM public.students WHERE id = student_id
  ))
);

-- Update RLS policies for students table to allow recorders to view
CREATE POLICY "Recorders can view students in assigned classroom"
ON public.students
FOR SELECT
USING (
  public.can_record_for_classroom(auth.uid(), classroom_id)
);

-- Add policy for recorders to view record_sessions
CREATE POLICY "Recorders can view sessions for assigned classroom"
ON public.record_sessions
FOR SELECT
USING (
  public.can_record_for_classroom(auth.uid(), classroom_id)
);

-- Add policy for recorders to view records
CREATE POLICY "Recorders can view records for assigned classroom"
ON public.records
FOR SELECT
USING (
  public.can_record_for_classroom(auth.uid(), (
    SELECT classroom_id FROM public.students WHERE id = student_id
  ))
);