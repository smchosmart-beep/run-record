

## 학급별 세션 분리 저장

### 문제
현재 `sessionStorage` 키가 `kiosk_attendance_students`, `kiosk_speed_students`로 고정되어 있어서 모든 학급이 같은 키를 공유함. 학급을 바꾸면 이전 학급 데이터가 덮어씌워짐.

### 해결

**`src/pages/KioskAttendance.tsx` 수정:**
- sessionStorage 키를 `kiosk_attendance_students_${classId}`로 변경
- 초기 로드와 저장 모두 classId 기반 키 사용

**`src/pages/KioskMode.tsx` 수정:**
- sessionStorage 키를 `kiosk_speed_students_${classId}`로 변경
- 동일 패턴 적용

### 변경 코드 패턴

```tsx
// Before
sessionStorage.getItem('kiosk_attendance_students')
sessionStorage.setItem('kiosk_attendance_students', ...)

// After
sessionStorage.getItem(`kiosk_attendance_students_${classId}`)
sessionStorage.setItem(`kiosk_attendance_students_${classId}`, ...)
```

이렇게 하면:
- A학급 선택 → 학생 추가 → B학급으로 이동 → B학급 학생 추가 → 다시 A학급 돌아가면 A학급 학생이 그대로 유지됨
- 태블릿 1대로 4개 학급이 각각 독립적으로 세션 유지

