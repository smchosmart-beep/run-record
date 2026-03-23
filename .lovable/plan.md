

## 전체 기록 일괄 삭제 버튼 추가

### 개요
기록관리 탭의 "날짜별 기록 확인" 카드 헤더에 "전체 삭제" 버튼을 추가하여, 모든 날짜의 기록 세션을 한번에 삭제할 수 있도록 합니다.

### 수정 파일: `src/components/RecordDateManager.tsx`

**1. 전체 삭제 함수 추가**
- 모든 `availableDates`를 순회하며 `deleteRecordSession` 호출
- 모든 학생의 records를 빈 배열로 초기화
- `refreshClassrooms` 호출하여 UI 동기화
- 삭제 중 로딩 상태 관리

**2. UI 변경**
- "날짜별 기록 확인" 헤더 옆에 빨간색 "전체 삭제" 버튼 추가
- `AlertDialog`로 확인 다이얼로그 표시 (총 기록 수, 날짜 수 안내)
- 삭제 후 selectedDate를 오늘로 초기화

