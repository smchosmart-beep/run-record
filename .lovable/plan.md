

## 버튼 4개 균등 배치

### 수정: `src/pages/Dashboard.tsx` (141줄)

컨테이너 `div`에 모바일에서 균등 배치되도록 변경:

```tsx
<div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-end">
```

- `w-full sm:w-auto`: 모바일에서 전체 너비 사용, sm 이상에서는 자동
- `justify-between sm:justify-end`: 모바일에서 균등 배치, sm 이상에서는 오른쪽 정렬

