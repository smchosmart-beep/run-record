

## 모바일에서 버튼 아이콘만 표시 + 한 줄 배치

### 수정: `src/pages/Dashboard.tsx` (141-158줄)

버튼 4개를 모바일(`sm` 미만)에서는 아이콘만, `sm` 이상에서는 텍스트 포함으로 변경:

- 버튼 컨테이너: `flex flex-wrap gap-2` → `flex gap-2`
- 각 버튼에서 텍스트를 `<span className="hidden sm:inline">` 으로 감싸기
- `mr-2`를 `sm:mr-2`로 변경 (모바일에서 아이콘만일 때 여백 제거)
- 고정 너비(`w-28`) 제거하고 모바일에서는 자동 크기

```tsx
<div className="flex gap-2">
  <Button onClick={...} variant="outline" className="shadow-md" size="icon" /* sm에서는 일반 */>
    <Monitor className="h-4 w-4 sm:mr-2" />
    <span className="hidden sm:inline">키오스크</span>
  </Button>
  // 나머지 동일 패턴
</div>
```

이렇게 하면 384px 뷰포트에서 4개 버튼이 아이콘만으로 한 줄에 깔끔하게 배치됨.

