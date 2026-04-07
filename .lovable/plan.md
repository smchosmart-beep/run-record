

## 출석체크 일괄 저장 RPC 최적화 — 최종 계획

### 검토 결과 요약
- 기능 오작동 위험: 없음
- 서버비 증가: 없음 (오히려 감소)
- 보안: RPC 내부에 소유권 검증 포함하면 안전

### 구현 내용

**1. DB 마이그레이션: `batch_save_attendance` RPC 함수**

```sql
CREATE OR REPLACE FUNCTION public.batch_save_attendance(
  _student_ids UUID[],
  _classroom_id UUID,
  _record_date TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _session record;
  _sid UUID;
  _slot INT;
  _used_slots INT[];
BEGIN
  -- 1. 소유권 검증
  _user_id := auth.uid();
  IF NOT EXISTS (
    SELECT 1 FROM classrooms
    WHERE id = _classroom_id AND user_id = _user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. 세션 확인/생성 (upsert)
  -- 3. 각 학생별 빈 슬롯 계산 + 필요시 slots_count 증가
  -- 4. records 일괄 INSERT
END;
$$;
```

- 단일 트랜잭션으로 전체 처리
- `auth.uid()` 기반 소유권 검증 포함
- `UNIQUE(classroom_id, session_date)` 제약조건 활용한 upsert

**2. `src/utils/supabaseApi.ts` 수정**
- `saveAttendanceBatch(studentIds: string[], classroomId: string)` 함수 추가
- `supabase.rpc('batch_save_attendance', {...})` 호출
- 기존 `saveMultiClassRecords`는 속도측정용으로 유지

**3. `src/pages/KioskAttendance.tsx` 수정**
- `handleSaveAll`에서 출석 학생을 학급별로 그룹핑
- 각 학급별 `saveAttendanceBatch` 호출 (`Promise.all`로 병렬 처리)
- 기존 `saveMultiClassRecords` 호출 제거 (출석용)

### 성능 효과
- Before: 학생 20명 × 4~5쿼리 = 80~100회 순차 네트워크 요청
- After: 학급 1개 = 1회 RPC 호출

