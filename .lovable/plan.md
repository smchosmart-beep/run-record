

## 출석체크 기록 분리 계획

### 문제
현재 출석체크가 `records` 테이블에 `time_ms=0`으로 저장되어, 속도 통계(PB, 평균, 유효기록수)에 0초 기록이 포함됨.

### 해결 방안: `is_attendance` 컬럼 추가

`records` 테이블에 `is_attendance` boolean 컬럼을 추가하고, 속도 통계 계산 시 이 컬럼으로 필터링.

#### 1. DB 마이그레이션
- `records` 테이블에 `is_attendance boolean NOT NULL DEFAULT false` 컬럼 추가

#### 2. `src/pages/KioskAttendance.tsx`
- 출석 저장 시 `is_attendance: true` 플래그 전달

#### 3. `src/utils/supabaseApi.ts`
- `saveMultiClassRecords` 함수에서 `is_attendance` 필드 지원

#### 4. `src/utils/calculations.ts`
- `calculatePersonalBest`, `calculateAverage`, `calculateStudentStats` 등 속도 관련 함수에서 `is_attendance === true`인 기록 제외
- `calculateParticipationDays`는 출석 기록도 포함 (참여일수에는 반영)

#### 5. `src/contexts/AppContext.tsx` (또는 데이터 로딩 부분)
- Record 타입에 `isAttendance` 필드 추가

### 결과
- 출석체크 → 참여일수(누적 횟수) ✅ 올라감
- 출석체크 → PB/평균/랭킹 ❌ 영향 없음
- 기존 records 테이블 재활용으로 별도 테이블 불필요

