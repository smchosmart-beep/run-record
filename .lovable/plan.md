

## 누적 횟수 순위에 출석 기록 표시 안 되는 문제 수정

### 원인
`calculateClassRankings` 함수(66번째 줄)에서 모든 순위 유형의 학생 후보를 `getBestTimeForRanking() !== null`로 필터링함. 출석만 한 학생은 속도 기록이 없어 이 필터에서 제외되어, 누적 횟수 순위에도 나타나지 않음.

### 수정: `src/utils/calculations.ts`

`byRecordCount` 계산 시 별도의 학생 목록 사용:

- 기존 `eligibleStudents`는 속도 기록이 있는 학생만 포함 (PB/평균 순위용, 변경 없음)
- **새로운** `allEligibleStudents`를 만들어 `isHidden`이 아닌 모든 학생에서 `validRecordsCount > 0`인 학생을 포함
- `byRecordCount`는 이 새 목록에서 계산

이렇게 하면 출석만 한 학생도 누적 횟수 순위에 표시됨.

