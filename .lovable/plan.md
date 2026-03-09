

## 키오스크 모드 선택 화면 + 출석체크 키오스크 추가 계획

### 개요
1. 대시보드에서 키오스크 버튼 클릭 시 **모드 선택 페이지**(`/kiosk`)로 이동
2. 모드 선택 페이지에서 "속도측정" 또는 "출석체크" 선택
3. 기존 속도측정 키오스크는 `/kiosk/speed`로 이동
4. 새로운 출석체크 키오스크는 `/kiosk/attendance`에 생성

### 변경 파일

#### 1. `src/pages/KioskModeSelect.tsx` (신규)
- 키오스크 모드 선택 페이지
- 두 개의 큰 카드: "속도측정 키오스크" (Timer 아이콘) / "출석체크 키오스크" (CheckCircle 아이콘)
- 각각 클릭 시 `/kiosk/speed`, `/kiosk/attendance`로 이동
- Morning Run 워터마크 유지

#### 2. `src/pages/KioskMode.tsx` → 기존 코드 유지
- 라우트만 `/kiosk/speed`로 변경

#### 3. `src/pages/KioskAttendance.tsx` (신규)
- 출석체크 키오스크 페이지
- 학생 추가 모달은 기존 `KioskAddStudentModal` 재사용
- 학생 카드를 탭하면 출석 체크 (토글 방식: 출석 ↔ 미출석)
- 카드 상태: `unchecked` (회색) → `present` (초록) / `absent` (빨강)
- "일괄 저장" 버튼: 오늘 날짜 기준으로 출석 데이터 저장
- 출석 저장 방식: 출석한 학생의 record를 `time_ms = 0`, `is_dnf = false`로 저장 (기존 records 테이블 활용, 출석 = 기록 존재로 판단하는 기존 참여율 계산 로직과 호환)

#### 4. `src/App.tsx`
- 라우트 추가:
  - `/kiosk` → `KioskModeSelect`
  - `/kiosk/speed` → `KioskMode` (기존)
  - `/kiosk/attendance` → `KioskAttendance` (신규)

#### 5. `src/pages/Dashboard.tsx`
- 키오스크 버튼 동작 변경 없음 (`/kiosk`로 이동, 이제 선택 페이지가 표시됨)

### 출석 저장 로직
- 기존 `saveMultiClassRecords` 함수를 활용하여 `timeMs: 0`으로 저장
- 이렇게 하면 기존 참여율 계산(`time !== null`인 기록을 참여로 카운트)과 완벽 호환
- 결석 학생은 기록을 저장하지 않음 (기록 없음 = 미참여)

### UI 흐름
```text
대시보드 [키오스크 버튼]
    ↓
/kiosk (모드 선택)
    ├── [속도측정] → /kiosk/speed (기존 KioskMode)
    └── [출석체크] → /kiosk/attendance (새 KioskAttendance)
```

