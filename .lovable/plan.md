

## 검토 결과: 안전하게 적용 가능

### 현재 상태 확인

| 학급 | 학생 수 | 기록 수 |
|------|---------|---------|
| 죽   | 30      | 41      |
| 송   | 30      | 167     |
| 난   | 30      | 108     |
| 매   | 30      | 53      |
| **합계** | **120** | **369** |

현재 **125회 이상 순차 요청** → 최적화 후 **3회 배치 요청**으로 감소.

### 검토 항목별 결과

**1. 기능 오작동: 없음**
- 3단계 배치 조회(classrooms → students → records)는 기존과 동일한 데이터를 반환
- 메모리에서 student_id 기반 그룹핑만 추가 → 변환 로직은 기존 `convertDb*` 함수 그대로 사용

**2. Supabase 1000행 제한: 현재 안전, 대비 필요**
- 전체 기록 369개 → 1000행 이하로 안전
- 단, 학생 120명이 각 10회 이상 기록하면 1200+ → 제한에 걸림
- **대응**: records 조회 시 classroom_id별 학생 그룹으로 나누어 조회하거나, `.range()` 페이지네이션 적용

**3. 인증 중복 호출: 부작용 있음 (수정 필요)**
- 현재 `useEffect([user, session])`에서 `refreshClassrooms` 호출
- `onAuthStateChange`에서 `user`와 `session`을 동시에 설정하지만, React 배치 처리로 보통 1회만 호출됨
- 그러나 `getSession()`과 `onAuthStateChange`가 겹치면 2회 호출 가능
- **대응**: `user.id` 기반 ref를 사용해 이미 로딩 중이면 스킵하는 guard 추가

**4. 서버비: 감소**
- 125회 → 3회 (97% 감소)

**5. 데이터 정합성: 안전**
- 읽기 전용 최적화이므로 데이터 변경 없음

### 구현 내용 (계획 확정)

**1. `src/utils/supabaseApi.ts` — `getClassrooms()` 리팩토링**
- 1단계: `classrooms` 전체 조회 (1회)
- 2단계: `students` 전체 조회 WHERE `classroom_id IN [...]` (1회)
- 3단계: `records` 전체 조회 WHERE `student_id IN [...]` (1회, 1000행 초과 시 청크 분할)
- 메모리에서 `Map<student_id, Record[]>`, `Map<classroom_id, Student[]>` 구성
- 기존 `convertDb*` 변환 함수 그대로 사용

**2. `src/contexts/AppContext.tsx` — 중복 호출 방지**
- `refreshClassrooms`에 `loadingRef` 추가하여 이미 실행 중이면 스킵
- `useEffect` 의존성을 `user?.id`로 변경하여 불필요한 재실행 방지

### 수정하지 않는 것
- 기존 개별 학생/기록 CRUD 함수들 (create, update, delete) — 이미 정상 동작
- RPC 함수들 (batch_save_attendance, batch_save_speed_records) — 관련 없음

