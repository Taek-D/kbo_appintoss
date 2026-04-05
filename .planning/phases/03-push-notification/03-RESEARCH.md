# Phase 3: Push Notification — Research

## Research Summary

- **mTLS 인증서는 Vercel 서버리스에서 base64 환경변수로 로드** — `TOSS_MTLS_CERT`, `TOSS_MTLS_KEY`가 이미 `.env.example`에 정의됨. Node.js `https.Agent`의 `cert`/`key` 옵션에 Buffer.from(base64, 'base64')로 전달
- **BullMQ 불필요, for-of + setTimeout 패턴** — CONTEXT.md D-04 확정. API Route 내 순차 실행으로 100ms 간격 보장. Vercel Hobby 10초 타임아웃 내 ~80명 처리
- **poll/route.ts lines 47-55가 정확한 통합 지점** — transitions 순회 → 팀별 구독자 조회 → Push 발송 → is_notified_finish/cancel 플래그 업데이트
- **push_logs 테이블 스키마 이미 존재** — user_id, game_id, status, error_message, sent_at. 추가 마이그레이션 불필요
- **TDD 필수 구간** — PushProvider(mTLS, rate limit, 에러 케이스), NotificationService(구독자 조회, 발송 오케스트레이션, push_logs 기록)

## 1. mTLS 인증서 관리 (Vercel Serverless)

### Findings

- Vercel 서버리스 함수는 파일시스템 접근이 제한적 — `/tmp`에 쓸 수 있으나 콜드 스타트마다 재생성 필요
- 권장 패턴: 인증서를 base64로 인코딩하여 환경변수에 저장, 런타임에 디코딩
- `.env.example`에 `TOSS_MTLS_CERT`, `TOSS_MTLS_KEY`가 이미 정의되어 있음 (base64 encoded)
- Node.js `https.Agent`는 `cert`와 `key` 옵션에 Buffer 또는 string을 받음
- PFX(PKCS12) 대신 PEM(cert+key) 분리 방식이 환경변수 관리에 더 적합

### 구현 패턴

```typescript
import https from 'node:https'

function createMtlsAgent(): https.Agent {
  const cert = process.env.TOSS_MTLS_CERT
  const key = process.env.TOSS_MTLS_KEY
  
  if (!cert || !key) {
    throw new Error('mTLS 인증서 환경변수가 설정되지 않았습니다')
  }
  
  return new https.Agent({
    cert: Buffer.from(cert, 'base64'),
    key: Buffer.from(key, 'base64'),
  })
}
```

### Risks

- **인증서 만료**: 런타임에 만료된 인증서로 요청 시 TLS handshake 실패 — 명확한 에러 메시지 필요
- **환경변수 누락**: cert 또는 key 중 하나만 있으면 불완전한 mTLS — 시작 시 둘 다 검증
- **인증서 크기**: base64 인코딩 시 Vercel 환경변수 크기 제한(4KB) 내에 들어야 함 — 일반적인 인증서는 충분

## 2. 토스 Push API 인터페이스

### Findings

- 토스 Push API는 mTLS 인증 후 HTTP POST로 메시지 발송
- Rate Limit: 요청 간 최소 100ms 간격 필수 (CONTEXT.md D-04)
- 429 응답 시 1초 대기 후 재시도 (CONTEXT.md D-08)
- 메시지 템플릿은 Phase 1에서 검수 신청 (INFRA-02)

### 요청/응답 타입 설계

```typescript
type TossPushRequest = {
  userKey: string        // toss_user_key (users 테이블)
  templateId: string     // 검수 승인된 템플릿 ID
  templateArgs: Record<string, string>  // 템플릿 변수 (팀 이름 등)
  deepLink?: string      // /game/{gameId} (D-09)
}

type TossPushResponse = {
  success: boolean
  errorCode?: string     // 429, 401, 500 등
  errorMessage?: string
}
```

### 메시지 템플릿 (D-01, D-02)

- 경기 종료: "경기가 끝났어요! 탭해서 확인해보세요" (스코어 미포함, D-02)
- 경기 취소: "경기가 취소되었어요"
- 친근한 구어체 (D-01), 토스 가이드라인 준수

### Risks

- **템플릿 미검수**: INFRA-02가 아직 Pending — 검수 완료 전까지 실제 발송 불가. 개발 시 mock으로 대체
- **API 엔드포인트 변경**: 토스 Push API URL은 환경변수로 관리하여 변경 용이하게

## 3. 순차 발송 큐 패턴 (for-of + delay)

### Findings

- CONTEXT.md D-04: BullMQ/Redis 불필요, API Route 내 for-of 루프로 순차 실행
- D-05: Vercel Hobby 10초 타임아웃 → 100ms × 80명 = 8초, ~80명 상한
- 100ms delay는 `await new Promise(r => setTimeout(r, 100))` 패턴

### 구현 패턴

```typescript
async function sendToSubscribers(
  subscribers: Array<{ toss_user_key: string; userId: string }>,
  templateId: string,
  templateArgs: Record<string, string>,
  gameId: string,
  deepLink: string,
): Promise<void> {
  for (const subscriber of subscribers) {
    const result = await pushProvider.send({
      userKey: subscriber.toss_user_key,
      templateId,
      templateArgs,
      deepLink,
    })
    
    // push_logs 기록 (D-07)
    await logPushResult(subscriber.userId, gameId, result)
    
    // Rate Limit 준수 (100ms 간격)
    await delay(100)
  }
}
```

### 429 Rate Limit 재시도 (D-08)

```typescript
// 429 응답 시 1초 대기 후 해당 유저부터 재시도
if (result.errorCode === '429') {
  await delay(1000)
  // 현재 유저에 대해 1회 재시도
  const retryResult = await pushProvider.send(request)
  await logPushResult(subscriber.userId, gameId, retryResult)
}
```

### Risks

- **타임아웃 위험**: 구독자 수가 80명을 초과하면 10초 타임아웃 발생 가능 — MVP에서는 경고 로그로 대응, Pro 전환 시 확장
- **429 재시도 + 타임아웃**: 429 재시도(1초 대기)가 누적되면 타임아웃 가능성 증가 — 남은 시간 체크 로직 고려

## 4. 동시 경기 종료 처리 (Promise.allSettled)

### Findings

- CONTEXT.md D-06: `Promise.allSettled`로 경기별 발송을 병렬 실행
- 각 경기 내부는 순차 발송 (for-of + 100ms delay)
- 경기 간에는 서로 블로킹하지 않음

### 구현 패턴

```typescript
// transitions에서 알림 대상 필터링 (D-03: finished, cancelled만)
const notifiable = transitions.filter(
  t => t.toStatus === 'finished' || t.toStatus === 'cancelled'
)

// 경기별 병렬 발송
const results = await Promise.allSettled(
  notifiable.map(transition => 
    sendNotificationsForGame(transition)
  )
)
```

### poll/route.ts 통합

- `syncGames()` 이후 transitions를 필터링하여 Push 발송
- 발송 완료 후 `is_notified_finish` 또는 `is_notified_cancel` 플래그 업데이트
- D-03: `is_notified_start`는 Phase 3에서 사용하지 않음 (시작 알림 제외)

### Risks

- **Vercel 타임아웃 공유**: 동시 2경기 × 80명 = 160건이면 16초 → 타임아웃 초과. 현실적으로 한 팀 구독자만 대상이므로 낮은 위험
- **is_notified 플래그 경합**: Promise.allSettled 내 동일 경기에 대한 동시 업데이트는 없으므로 안전

## 5. push_logs 기록 전략

### Findings

- push_logs 테이블 스키마 (이미 존재):
  - `id`: bigint (auto-generated identity)
  - `user_id`: uuid (FK → users.id)
  - `game_id`: uuid (FK → games.id)
  - `status`: text — 'sent' | 'failed' | 'rate_limited'
  - `error_message`: text (nullable)
  - `sent_at`: timestamptz (default now())
- `idx_push_logs_game_id` 인덱스 존재

### 구현 패턴

```typescript
type PushLogStatus = 'sent' | 'failed' | 'rate_limited'

async function logPushResult(
  userId: string,
  gameId: string,
  result: TossPushResponse,
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  
  await supabase.from('push_logs').insert({
    user_id: userId,
    game_id: gameId,
    status: result.success ? 'sent' : 'failed',
    error_message: result.errorMessage ?? null,
  })
}
```

### Risks

- **DB 쓰기 실패**: push_logs insert 실패 시 발송 자체는 성공한 것이므로, 에러 로그만 남기고 진행
- **대량 insert 성능**: 80건 개별 insert vs batch insert — MVP에서는 개별 insert로 충분

## 6. 모듈 구조 및 기존 패턴

### 기존 모듈 패턴 (auth 모듈 참조)

```
src/backend/modules/push/
├── __tests__/
│   ├── push-provider.test.ts
│   └── notification-service.test.ts
├── push-provider.ts       # 토스 Push API 통신 (mTLS)
├── notification-service.ts # 구독자 조회, 발송 오케스트레이션, push_logs 기록
└── index.ts               # public API export
```

### 모듈 분리 원칙 (CLAUDE.md)

- PushProvider: 토스 Push API 통신만 담당 (mTLS, HTTP 요청)
- NotificationService: 비즈니스 로직 (구독자 조회, 발송 순서, 로깅)
- index.ts: `sendGameEndNotifications()` 같은 public API만 export

### 타입 정의 위치

- `src/types/push.ts` — TossPushRequest, TossPushResponse, PushLogStatus 등 모듈 간 공유 타입

### 기존 패턴 참고

- `createServerSupabaseClient()` — 서버 사이드 Supabase 클라이언트 (cookies 기반)
- **주의**: poll/route.ts는 QStash webhook이므로 cookies가 없음 → Service Role Key 사용 필요
- `logger` — 구조화된 로깅 (pino)
- Zod + 문자열 리터럴 유니온 (enum 금지)

## 7. poll/route.ts 서버 클라이언트 이슈

### 발견

- 현재 `createServerSupabaseClient()`는 `cookies()`를 사용하여 세션 기반 클라이언트 생성
- **poll/route.ts는 QStash webhook** — 브라우저 세션이 없으므로 cookies 접근 불가
- game-repository.ts에서 이미 `createServerSupabaseClient()`를 사용 중이므로, Next.js API Route에서 cookies()가 호출 가능할 수 있음 (빈 cookie store 반환)
- 그러나 Push 발송 시 구독자 조회(`users` 테이블)에는 **모든 유저 데이터 접근**이 필요 → `SUPABASE_SERVICE_ROLE_KEY` 사용이 안전

### 권장

- Push 모듈 내에서 `createServiceRoleClient()` 헬퍼 사용
- 또는 기존 `createServerSupabaseClient()` 동작 확인 후 결정 (Phase 2에서 이미 poll/route.ts에서 사용 중이므로 동작할 가능성 높음)

## 8. TDD 전략

### 필수 테스트 대상 (CLAUDE.md)

1. **PushProvider**
   - mTLS 인증서 로딩 성공/실패
   - 인증서 환경변수 누락 시 명시적 에러
   - Push API 호출 성공 (200)
   - Rate Limit 초과 (429) → 에러 응답 반환
   - 네트워크 에러 핸들링
   - 인증서 만료 시 에러

2. **NotificationService**
   - 구독자 조회 (team_code + subscribed=true)
   - 100ms 간격 순차 발송 검증
   - 429 응답 시 1초 대기 후 재시도
   - 발송 실패 시 push_logs 기록 후 스킵 (D-07)
   - 발송 성공 시 push_logs 'sent' 기록
   - is_notified_finish/cancel 플래그 업데이트
   - Promise.allSettled로 동시 경기 처리

3. **poll/route.ts 통합**
   - transitions → Push 발송 연결
   - 알림 대상 필터링 (finished, cancelled만)

### Mock 전략

- PushProvider: `https.Agent`와 fetch/axios를 mock하여 API 통신 테스트
- NotificationService: PushProvider를 의존성 주입으로 mock
- Supabase: vitest mock으로 쿼리 결과 시뮬레이션

## 9. 구독자 조회 쿼리

### 패턴

```sql
SELECT id, toss_user_key 
FROM users 
WHERE team_code = $1 
  AND subscribed = true
```

- `$1`: 경기의 home_team 또는 away_team
- 한 경기에 대해 홈팀 구독자 + 원정팀 구독자 모두 조회 필요
- 또는 homeTeam/awayTeam 각각 조회하여 합산

### 주의사항

- `team_code`는 users 테이블에 text로 저장됨
- CrawlerGame의 `homeTeam`/`awayTeam`과 users의 `team_code` 값이 동일한 형식인지 확인 필요
- Phase 1 온보딩에서 저장하는 팀 코드와 kbo-game 패키지의 팀 이름 매핑 확인

## 10. 딥링크 URL 설계 (D-09)

### 패턴

- 알림 클릭 시 `/game/{gameId}` 경로로 이동
- `gameId`는 DB games 테이블의 uuid (`transition.gameId`)
- Phase 3 시점에는 해당 페이지 미구현 → 메인 화면 fallback
- Phase 4에서 페이지 구현 시 자동 연결

### 구현

```typescript
const deepLink = `/game/${transition.gameId}`
```

## Validation Architecture

### 검증 차원

1. **단위 테스트**: PushProvider, NotificationService 각각의 함수 단위 테스트
2. **통합 테스트**: poll/route.ts에서 transitions → 알림 발송 전체 흐름
3. **Rate Limit 검증**: 발송 간격이 실제로 100ms 이상인지 타이밍 테스트
4. **에러 핸들링 검증**: 429, 네트워크 에러, 인증서 오류 각각에 대한 행동 검증
5. **push_logs 검증**: 성공/실패 기록이 정확한지 DB 상태 확인
6. **is_notified 플래그 검증**: 발송 후 플래그가 올바르게 업데이트되는지

### 테스트 명령어

```bash
pnpm test --run src/backend/modules/push/
```

## Dependencies & Prerequisites

1. **Phase 2 완료** ✅ — syncGames(), StateTransition 타입, poll/route.ts 존재
2. **push_logs 테이블** ✅ — 20260404000000_init_schema.sql에 이미 정의
3. **is_notified_finish/cancel 플래그** ✅ — 20260405000000_game_notified_flags.sql에 이미 정의
4. **TOSS_MTLS_CERT/KEY 환경변수** — .env.example에 정의됨, 실제 값은 배포 시 설정
5. **토스 Push 메시지 템플릿 검수** — INFRA-02 Pending. 개발은 mock으로 진행 가능

## Open Questions

1. **Supabase 클라이언트 방식**: poll/route.ts(QStash webhook)에서 `createServerSupabaseClient()`가 정상 동작하는지, Service Role Client가 필요한지 확인 필요. Phase 2에서 이미 사용 중이므로 동작할 가능성 높음
2. **팀 코드 매핑**: users.team_code와 CrawlerGame.homeTeam/awayTeam의 값 형식이 동일한지 확인 필요

---

## RESEARCH COMPLETE

*Phase: 03-push-notification*
*Researched: 2026-04-05*
