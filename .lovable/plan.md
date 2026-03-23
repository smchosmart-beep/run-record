

## 키오스크 학급 선택 화면 추가

### 현재 흐름
```text
키오스크 모드 선택 (/kiosk)
  ├── 속도측정 → /kiosk/speed (모든 학급 학생 혼합)
  └── 출석체크 → /kiosk/attendance (모든 학급 학생 혼합)
```

### 변경 후 흐름
```text
키오스크 모드 선택 (/kiosk)
  ├── 속도측정 → /kiosk/speed/select → 학급 선택 카드 → /kiosk/speed?classId=xxx
  └── 출석체크 → /kiosk/attendance/select → 학급 선택 카드 → /kiosk/attendance?classId=xxx
```

### 수정 내용

**1. 새 컴포넌트: `src/pages/KioskClassSelect.tsx`**
- URL 파라미터로 모드(`speed` 또는 `attendance`)를 받음
- 라우트: `/kiosk/:mode/select`
- 사용자의 학급 목록을 카드 형태로 표시 (학교, 학년, 반)
- 학급 카드 클릭 시 `/kiosk/speed?classId=xxx` 또는 `/kiosk/attendance?classId=xxx`로 이동
- 학급이 없으면 안내 메시지 표시
- 기존 키오스크 UI 스타일 유지 (워터마크, 헤더)

**2. 라우팅 수정: `src/App.tsx`**
- `/kiosk/:mode/select` 라우트 추가 → `KioskClassSelect` 컴포넌트

**3. 네비게이션 수정: `src/pages/KioskModeSelect.tsx`**
- "속도측정" 카드 클릭: `/kiosk/speed` → `/kiosk/speed/select`
- "출석체크" 카드 클릭: `/kiosk/attendance` → `/kiosk/attendance/select`

**4. KioskMode, KioskAttendance 수정**
- URL 쿼리 파라미터 `classId`를 읽어 해당 학급 학생만 필터
- `KioskAddStudentModal`에 `classroomId` prop 전달하여 해당 학급 학생만 표시
- 헤더에 선택된 학급명 표시
- 뒤로가기 버튼이 학급 선택 화면(`/kiosk/speed/select` 또는 `/kiosk/attendance/select`)으로 이동

**5. KioskAddStudentModal 수정**
- 선택적 `classroomId` prop 추가
- `classroomId`가 전달되면 학급 선택 단계를 건너뛰고 바로 해당 학급 학생 목록 표시

