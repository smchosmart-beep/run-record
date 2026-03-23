

## 누적 횟수 순위에 출석 기록 포함

### 문제
`calculateStudentStats`에서 `validRecordsCount` 계산 시 `isAttendance` 기록을 제외하고 있어, 출석체크해도 누적 횟수 순위가 오르지 않음.

### 수정 파일: `src/utils/calculations.ts`

#### `calculateStudentStats` 함수 (38-52줄)
- `validRecordsCount` 계산을 속도 기록만이 아니라 **전체 기록**(출석 포함)에서 `time !== null && !isDNF`인 것으로 변경
- PB, 평균은 기존대로 속도 기록만 사용 (변경 없음)

```typescript
// 변경 전
const validRecordsCount = speedRecords.filter(
  record => record.time !== null && !record.isDNF
).length;

// 변경 후
const validRecordsCount = student.records.filter(
  record => record.time !== null && !record.isDNF
).length;
```

이렇게 하면 출석 기록(`time=0, isDNF=false, isAttendance=true`)도 누적 횟수에 포함되어 순위가 올라감.

