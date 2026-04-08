

## 속도측정 일괄 저장 RPC 최적화 — 검토 결과

### 검토 항목

**1. 기능 오작동 위험: 없음**
- `batch_save_attendance` RPC가 이미 동일 패턴으로 정상 동작 중
- 속도측정은 `time_ms`만 가변이고 나머지 로직(세션 upsert, 빈 슬롯 계산, 기록 삽입)은 동일
- `is_attendance=false`, `is_dnf=false` 고정값 사용 → 기존 `saveMultiClassRecords`와 동일한 결과

**2. 데이터 정합성: 안전**
- 단일 트랜잭션 내에서 처리 → 중간 실패 시 전체 롤백
- 기존 순차 방식은 중간 실패 시 일부만 저장되는 문제가 있었으나 RPC는 이를 해결
- 슬롯 계산이 트랜잭션 내에서 이뤄지므로 동시성 문제 없음

**3. 보안: 안전**
- `auth.uid()` 기반 소유권 검증 포함 (출석체크 RPC와 동일 패턴)
- `SECURITY DEFINER`이지만 내부에서 권한 체크 수행

**4. 서버비: 감소**
- 학생 20명 기준: 60~80회 → 1회 호출로 감소

**5. 주의사항: 없음**
- 두 배열(`_student_ids`, `_time_ms_values`)의 길이 불일치 시 에러 발생하도록 검증 코드 포함하면 더 안전
- `handleSaveAllRecords`에서 `saveMultiClassRecords` → `saveSpeedRecordsBatch`로 교체만 하면 됨

### 구현 내용

**1. DB 마이그레이션: `batch_save_speed_records` RPC 함수**
- 입력: `_student_ids UUID[]`, `_time_ms_values INT[]`, `_classroom_id UUID`, `_record_date TEXT`
- 배열 길이 불일치 검증 추가
- 나머지 로직은 `batch_save_attendance`와 동일 (세션 upsert → 빈 슬롯 계산 → 기록 삽입)
- `is_attendance=false`, `time_ms=_time_ms_values[i]`

**2. `src/utils/supabaseApi.ts` 수정**
- `saveSpeedRecordsBatch(records: {studentId, timeMs}[], classroomId)` 함수 추가
- `supabase.rpc('batch_save_speed_records', {...})` 호출

**3. `src/pages/KioskMode.tsx` 수정**
- `handleSaveAllRecords`에서 저장 대상을 `classroomId`별로 그룹핑
- 각 학급별 `saveSpeedRecordsBatch` 호출 (`Promise.all`로 병렬)
- 개별 저장 `handleSaveRecord`도 동일 RPC 사용 (1명짜리 배열)

