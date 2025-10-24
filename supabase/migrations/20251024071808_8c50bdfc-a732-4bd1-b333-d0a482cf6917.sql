-- 1. user_roles 테이블의 기존 SELECT 정책 삭제 및 재생성
DROP POLICY IF EXISTS "Teachers can view all user roles for their classrooms" ON public.user_roles;

-- Recorder가 자신의 role을 조회할 수 있도록 정책 생성
CREATE POLICY "Users can view their own roles and assigned classrooms"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  -- 자기 자신의 role은 볼 수 있음
  user_id = auth.uid()
  OR
  -- 교사는 자기 학급의 모든 user_roles를 볼 수 있음
  EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE classrooms.id = user_roles.classroom_id
    AND classrooms.user_id = auth.uid()
  )
);

-- 2. classrooms 테이블에 recorder용 SELECT 정책 추가
CREATE POLICY "Recorders can view their assigned classroom"
ON public.classrooms
FOR SELECT
TO authenticated
USING (
  -- 교사는 자기 학급을 볼 수 있음 (기존 정책이 이미 있음)
  user_id = auth.uid()
  OR
  -- Recorder는 자신에게 할당된 학급을 볼 수 있음
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.classroom_id = classrooms.id
    AND user_roles.user_id = auth.uid()
    AND user_roles.role = 'recorder'
  )
);