## 목표
기록 관리 탭에서 현재 학급의 모든 기록을 **엑셀 파일 한 개**로 다운로드. 파일 안에 **날짜별로 시트** 생성.

## 안전성 검토 요약
- **DB 호출 0건** — 이미 로드된 `currentClassroom.students` 데이터만 사용. 서버비 추가 없음.
- **기존 기능 영향 없음** — 읽기 전용, state 변경 없음.
- **보안 무영향** — 본인 학급 메모리 데이터만 export.

## 작업
1. `xlsx` 라이브러리 추가.
2. `src/components/RecordDateManager.tsx` 상단 "전체 삭제" 버튼 옆에 **"엑셀 다운로드"** 버튼 추가.
   - `availableDates.length === 0`이면 비활성화.
3. 다운로드 핸들러:
   - **동적 import** (`const XLSX = await import('xlsx')`)로 초기 번들 영향 최소화.
   - 핸들러 진입 시 `currentClassroom` 스냅샷을 잡아 학급 전환에도 안전.
   - `availableDates`를 오래된 날짜 → 최신 날짜 순으로 정렬.
   - 날짜별 워크시트 생성. 시트명: `MM-DD` (엑셀 금지문자 제거, 31자 제한 대응).
   - 컬럼: `번호 | 이름 | 1회차 | 2회차 | ... | N회차 | 최고기록`
     - 회차 수 = 해당 날짜의 `maxSlots`.
     - 셀: DNF→"DNF", 인증(`isAttendance`)→"인증", 기록 있음→`formatTime(ms)`, 없음→빈칸.
     - 최고기록: 학급 `rankingType`(빠른순/느린순)에 따라 유효 기록의 min/max.
   - 숨김 학생(`isHidden`) 제외, 학생 번호순 정렬.
   - 파일명: `{학교}_{학년}-{반}_기록_{YYYYMMDD}.xlsx` (금지문자 sanitize).
4. 시간 포맷은 기존 `src/utils/time.ts`의 `formatTime` 재사용.
5. 성공/실패 toast 알림.

## 기술 메모
- 전부 클라이언트 사이드 (`xlsx.utils.aoa_to_sheet` + `xlsx.writeFile`). 백엔드 변경 없음.
- 동적 import로 약 430KB 라이브러리가 다운로드 클릭 시점에만 로드됨.
