-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Create classrooms table
CREATE TABLE public.classrooms (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school TEXT NOT NULL,
  grade INTEGER NOT NULL,
  class_name TEXT NOT NULL,
  max_record_slots INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Create students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  UNIQUE (classroom_id, number)
);

-- Create records table
CREATE TABLE public.records (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  time_ms INTEGER NULL, -- milliseconds, null for empty
  is_dnf BOOLEAN NOT NULL DEFAULT FALSE,
  slot_index INTEGER NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  UNIQUE (student_id, slot_index)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create RLS policies for classrooms
CREATE POLICY "Users can view their own classrooms"
  ON public.classrooms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own classrooms"
  ON public.classrooms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own classrooms"
  ON public.classrooms FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own classrooms"
  ON public.classrooms FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for students
CREATE POLICY "Users can view students in their classrooms"
  ON public.students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms 
      WHERE classrooms.id = students.classroom_id 
      AND classrooms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create students in their classrooms"
  ON public.students FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classrooms 
      WHERE classrooms.id = students.classroom_id 
      AND classrooms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update students in their classrooms"
  ON public.students FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms 
      WHERE classrooms.id = students.classroom_id 
      AND classrooms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete students in their classrooms"
  ON public.students FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms 
      WHERE classrooms.id = students.classroom_id 
      AND classrooms.user_id = auth.uid()
    )
  );

-- Create RLS policies for records
CREATE POLICY "Users can view records of students in their classrooms"
  ON public.records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students 
      JOIN public.classrooms ON students.classroom_id = classrooms.id
      WHERE students.id = records.student_id 
      AND classrooms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create records for students in their classrooms"
  ON public.records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students 
      JOIN public.classrooms ON students.classroom_id = classrooms.id
      WHERE students.id = records.student_id 
      AND classrooms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update records of students in their classrooms"
  ON public.records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.students 
      JOIN public.classrooms ON students.classroom_id = classrooms.id
      WHERE students.id = records.student_id 
      AND classrooms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete records of students in their classrooms"
  ON public.records FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.students 
      JOIN public.classrooms ON students.classroom_id = classrooms.id
      WHERE students.id = records.student_id 
      AND classrooms.user_id = auth.uid()
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classrooms_updated_at
  BEFORE UPDATE ON public.classrooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email, 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();