

## Supabase 1000행 제한 대비 — students 조회 페이지네이션 추가

### 현재 상태

| 조회 대상 | 1000행 대비 | 상태 |
|-----------|-------------|------|
| classrooms | 학급 1000개 초과 가능성 극히 낮음 | 불필요 |
| students | 현재 120명, 대비 없음 | **수정 필요** |
| records | `fetchAllRecords()`에 청크+페이지네이션 구현됨 | 완료 |

### 수정 내용

**`src/utils/supabaseApi.ts` — students 조회에 페이지네이션 추가**

`fetchAllRecords`와 동일한 패턴으로 `fetchAllStudents(classroomIds)` 헬퍼 함수 추가:
- `classroomIds`를 청크(200개씩)로 분할
- 각 청크 내에서 `.range()`로 1000행씩 페이지네이션
- 결과를 합산하여 반환

`getClassrooms()` 내 기존 students 단일 조회(150-160줄)를 `fetchAllStudents()` 호출로 교체.

### 영향 범위
- 읽기 전용 변경, 데이터 변경 없음
- 현재 120명이므로 동작 차이 없음, 향후 확장 시 안전

