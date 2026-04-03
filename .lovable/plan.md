

## 키오스크 속도측정 - 선택 학생 동시 시작 기능 추가

### 현재 동작
- 각 학생 카드를 개별 탭하여 스톱워치 시작/정지
- 이 동작은 그대로 유지

### 추가할 기능
idle 상태인 학생 카드를 **선택(체크)**한 뒤, **"동시 시작"** 버튼으로 선택된 학생들의 스톱워치를 동시에 시작

### 수정 파일

**1. `src/pages/KioskMode.tsx`**
- `selectedIds: Set<string>` 상태 추가 (동시 시작용 선택 목록)
- `isSelectMode` 상태 추가 (선택 모드 토글)
- "선택 모드" 토글 버튼 추가 (학생 추가 / 일괄 저장 옆)
- 선택 모드일 때 "동시 시작" 버튼 표시 (idle 상태인 선택 학생 수 표시)
- 동시 시작 핸들러: 선택된 idle 학생들을 동일한 `Date.now()` 타임스탬프로 running 상태로 변경
- `KioskStudentCard`에 `isSelectMode`, `isSelected`, `onToggleSelect` props 전달

**2. `src/components/KioskStudentCard.tsx`**
- props에 `isSelectMode?`, `isSelected?`, `onToggleSelect?` 추가
- 선택 모드일 때:
  - 카드 클릭 시 기존 스톱워치 동작 대신 선택/해제 토글
  - idle 상태 카드에만 체크박스 표시
  - 선택된 카드는 파란색 테두리/배경 표시
- 선택 모드가 아닐 때: 기존 동작 그대로 유지 (개별 탭 시작)

### UI 흐름
```text
[+ 학생 추가] [▶ 동시 시작] [일괄 저장]

선택 모드 OFF: 카드 탭 → 개별 시작/정지 (기존)
선택 모드 ON:  카드 탭 → 선택/해제 → "동시 시작" 버튼 클릭 → 선택된 학생 동시 시작
```

- "동시 시작" 버튼 클릭 시 idle 카드 중 선택된 학생만 동시에 `running` 전환
- 동시 시작 후 선택 모드 자동 해제, 선택 초기화

