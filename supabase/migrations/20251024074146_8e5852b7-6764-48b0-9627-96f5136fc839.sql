-- 1. 문제가 되는 정책들 삭제
DROP POLICY IF EXISTS "Recorders can view their assigned classroom" ON public.classrooms;
DROP POLICY IF EXISTS "Users can view their own roles and assigned classrooms" ON public.user_roles;

-- 2. 교사 확인 함수 생성 (SECURITY DEFINER로 RLS 우회)
CREATE OR REPLACE FUNCTION public.is_classroom_owner(_user_id uuid, _classroom_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classrooms
    WHERE id = _classroom_id
      AND user_id = _user_id
  )
$$;

-- 3. classrooms 테이블 정책 재생성 (SECURITY DEFINER 함수 사용)
CREATE POLICY "Recorders can view their assigned classroom"
ON public.classrooms
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  can_record_for_classroom(auth.uid(), id)
);

-- 4. user_roles 테이블 정책 재생성 (SECURITY DEFINER 함수 사용)
CREATE POLICY "Users can view their own roles and assigned classrooms"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  is_classroom_owner(auth.uid(), classroom_id)
);