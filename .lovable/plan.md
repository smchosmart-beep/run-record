

## 검토 결과: 안전하게 적용 가능 (단, 주의사항 있음)

### 1. 기능 오작동 위험: 없음

| 변경 항목 | 영향 분석 |
|-----------|-----------|
| Supabase 대시보드: Refresh Token Reuse Interval 증가 | 클라이언트 코드 변경 없음. 기존 로직 그대로 동작 |
| JWT Expiry 연장 | 클라이언트 코드 변경 없음. `autoRefreshToken: true` 이미 설정되어 있어 자동 갱신 |
| 클라이언트 `detectSessionInUrl: true` 추가 | 기본값과 동일하므로 동작 변화 없음 |
| `onAuthStateChange`에 `TOKEN_REFRESHED` 처리 | 기존 로직에 추가만 하므로 부작용 없음 |

### 2. 서버 비용 영향: 무시할 수준

| 항목 | 분석 |
|------|------|
| JWT Expiry 연장 (1시간→24시간) | refresh token 갱신 빈도가 **줄어듦** → API 호출 감소 → 오히려 비용 절감 |
| Refresh Token Reuse Interval 증가 | 토큰 저장 row 수 약간 증가하나, auth 테이블은 Supabase 무료 범위 |
| 중복 로그인 허용 | 기기당 세션 1개씩 유지 — 현재와 동일한 수준의 DB/API 사용 |

**결론: 서버비 과다 부과 없음.** Supabase Free/Pro 플랜 모두 auth 요청에 별도 과금 없음.

### 3. 보안 관련 주의사항

- JWT Expiry를 **7일(604800초)** 로 설정하면, 탈취된 토큰이 7일간 유효. **교육용 앱이므로 24시간(86400초)** 을 권장
- Refresh Token Reuse Interval을 너무 높게 설정하면 폐기된 토큰 재사용 가능 → **10초** 정도면 중복 로그인 허용에 충분 (Supabase 공식 권장)

### 4. 최종 권장 설정값

| 설정 | 권장값 | 이유 |
|------|--------|------|
| JWT Expiry | 86400 (24시간) | 보안과 편의성 균형 |
| Refresh Token Reuse Interval | 10 (초) | 중복 기기에서 동시 갱신 시 충돌 방지용. 기본값 10초면 충분 |

### 5. 코드 변경 범위

- `src/integrations/supabase/client.ts`: `detectSessionInUrl: true` 1줄 추가
- `src/contexts/AppContext.tsx`: `TOKEN_REFRESHED` 이벤트 로깅 + refresh 실패 시 안내 토스트 추가

두 파일 모두 소규모 변경이며, 기존 기능에 영향 없음.

### 중요: Supabase 대시보드 설정은 수동 작업

코드 배포와 별개로 **Supabase 대시보드 > Auth > Settings**에서 직접 변경해야 합니다.

