

## 키오스크 학생 상태 유지 계획

### 문제
키오스크에서 학생 추가 후 모드 선택(`/kiosk`)으로 돌아가면, 각 페이지의 `useState`가 초기화되어 학생 카드가 사라짐.

### 해결: `sessionStorage`로 상태 유지

각 키오스크 페이지에서 학생 목록을 `sessionStorage`에 저장하고, 페이지 마운트 시 복원.

#### 1. `src/pages/KioskMode.tsx`
- `kioskStudents` 상태 변경 시 `sessionStorage.setItem('kiosk_speed_students', ...)` 저장
- 초기값을 `sessionStorage`에서 읽어 복원
- 일괄 저장 완료 후 `sessionStorage` 클리어

#### 2. `src/pages/KioskAttendance.tsx`
- `students` 상태 변경 시 `sessionStorage.setItem('kiosk_attendance_students', ...)` 저장
- 초기값을 `sessionStorage`에서 읽어 복원
- 일괄 저장 완료 후 `sessionStorage` 클리어

### 구현 방식
- `useState` 초기값에 `() => JSON.parse(sessionStorage.getItem(...)) || []` 사용
- `useEffect`로 상태 변경 시 자동 저장
- 브라우저 탭을 닫으면 자동 소멸 (sessionStorage 특성)

