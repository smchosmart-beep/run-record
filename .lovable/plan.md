

## 검토 결과: 대부분 안전하나 주의 필요한 부분 2곳

### 수정 1: 키오스크 `refreshClassrooms()` 제거 — ⚠️ 주의 필요

**문제 없음**: 키오스크는 독립 UI이므로 저장 후 전체 데이터를 다시 불러올 필요 없음.

**단, 주의점**: `refreshClassrooms()`가 `useCallback` 의존성 배열에 포함되어 있음 (`KioskAttendance.tsx` 104줄, `KioskMode.tsx` 72줄). 제거 시 의존성 배열에서도 함께 제거해야 함. 빠뜨리면 lint 경고만 발생하고 동작에는 문제없음.

**결론: 안전**

---

### 수정 2: `createClassroom()` 전체 재조회 제거 — ✅ 안전

이미 insert한 학급/학생/기록 데이터를 직접 조합하여 반환하면 됨. `getClassrooms()`를 호출할 필요 없음. 새 학급에는 방금 만든 학생만 있으므로 데이터 누락 위험 없음.

**결론: 안전**

---

### 수정 3: `handleDeleteAllSessions()` 병렬화 — ⚠️ 주의 필요

`for...await` → `Promise.all`로 변경하는 것은 일반적으로 안전하나, **동시에 너무 많은 날짜(예: 50개 이상)를 삭제하면 Supabase 연결 풀 한도에 도달할 수 있음**. 하지만 현실적으로 날짜가 50개를 넘는 경우는 드물므로 문제없음.

**안전장치**: 날짜가 많을 경우를 대비해 10개씩 청크로 나눠 병렬 실행하면 더 안전함. 하지만 현재 규모에서는 단순 `Promise.all`로도 충분.

**결론: 안전 (현실적 규모에서)**

---

### 수정 4: `updateClassroom()`에서 불필요한 `updateStudentRecords` 생략 — ⚠️ 가장 주의 필요

**현재 상황 분석**:
- `StudentList.tsx`에서 이름 변경, 숨김 토글, 학생 추가/삭제 시 `updateClassroom({ students: updatedStudents })`를 호출
- 이때 `students` 배열에 각 학생의 `records`가 포함되어 있어 `updateStudentRecords()`가 매번 호출됨
- `EditClassModal.tsx`는 `...classroom`을 통째로 전달하므로 students와 records까지 포함됨

**위험 포인트**: 단순히 "records가 변경되지 않았으면 건너뛰기"를 구현할 때, **어떤 기준으로 "변경 여부"를 판단할지**가 핵심:
- 호출부에서 records를 항상 포함하고 있으므로, records 필드가 있다 = 변경됨이라고 판단하면 안 됨
- 실제로 records 내용이 변경되었는지 비교(diff)해야 하는데, 이는 구현 복잡도가 높음

**더 안전한 접근**: `updateClassroom`에 `skipRecordUpdate: boolean` 같은 명시적 플래그를 추가하고, 실제로 기록을 수정하는 호출부(`RecordSession.tsx`, `RecordInput.tsx`)에서만 `false`로 설정. 나머지(이름 변경, 숨김 토글 등)에서는 `true`로 설정.

**결론: 구현 방식에 따라 위험할 수 있음 → 명시적 플래그 방식 권장**

---

### 수정 5: `saveMultiClassRecords()` batch RPC 활용 — ✅ 안전

이미 `batch_save_speed_records`와 `batch_save_attendance` RPC가 존재하고, 키오스크에서 잘 동작 중. 학급별로 그룹핑 후 기존 RPC를 호출하면 됨. 기존 RPC가 슬롯 관리까지 처리하므로 로직 누락 없음.

**결론: 안전**

---

### 종합 판단

| 수정 | 위험도 | 비고 |
|------|--------|------|
| #1 키오스크 refreshClassrooms 제거 | 낮음 | 의존성 배열 정리만 주의 |
| #2 createClassroom 재조회 제거 | 낮음 | 단순 리팩터링 |
| #3 삭제 병렬화 | 낮음 | 현실적 규모에서 문제없음 |
| #4 updateStudentRecords 생략 | **중간** | 명시적 플래그 방식으로 구현해야 안전 |
| #5 saveMultiClassRecords batch | 낮음 | 기존 RPC 재활용 |

**수정 4만 구현 방식을 조정하면 전체적으로 안전하게 적용 가능합니다.** 승인하시면 수정 4는 `skipRecordUpdate` 플래그 방식으로 구현하겠습니다.

