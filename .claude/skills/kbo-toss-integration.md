---
name: kbo-toss-integration
description: 토스 Push API, mTLS 인증, 메시지 검수, Rate Limit 가이드. Use when working with Toss Push API, mTLS, push messages, or rate limiting.
---

# Toss Integration Skill

## 토스 Push API 핵심

### mTLS 인증
- 인증서는 앱인토스 콘솔에서 발급
- 유효기간: 390일 — 만료 전 갱신 필수
- 환경변수로 관리: `TOSS_CERT`, `TOSS_KEY`, `TOSS_CA`
- 인증서 로드 시 만료일 로깅 필수

### Rate Limit
- **발송 간격: 최소 100ms**
- 순차 발송 큐 사용 (BullMQ concurrency: 1 또는 p-limit)
- Promise.all 직접 사용 금지 → Rate Limit 위반
- Promise.allSettled는 경기 단위에서만 사용 (유저 단위 X)

### 메시지 스타일 가이드
- 문장형 작성 (토스 가이드라인)
- 특수문자 자제 (!, ?, 이모지 최소화)
- 기능성 푸시 — 별도 마케팅 동의 불필요
- 검수 소요: 영업일 2-3일

### 메시지 템플릿 예시

```
[팀명] 경기가 끝났습니다
[팀명] [점수] vs [상대팀] [점수]
결과를 확인해보세요
```

## 검수 프로세스

1. 앱인토스 콘솔 → 스마트 메시지 → 템플릿 등록
2. 문구 확정 후 검수 요청 (영업일 2-3일)
3. 검수 통과 후 발송 가능
4. **개발 Day 1에 신청 필수** — 임계 경로

## 발송 큐 구현 패턴

```typescript
// 경기별 독립 처리 (Promise.allSettled)
const results = await Promise.allSettled(
  finishedGames.map(game => sendGameNotifications(game))
);

// 유저별 순차 발송 (100ms 간격)
async function sendGameNotifications(game: Game) {
  const subscribers = await getSubscribers(game.teamCode);
  for (const user of subscribers) {
    await sendPush(user.userKey, buildMessage(game));
    await delay(100); // Rate Limit 준수
  }
}
```

## push_logs 스키마

```sql
create table push_logs (
  id bigint primary key generated always as identity,
  game_id text not null,
  user_key text not null,
  status text not null, -- 'sent' | 'failed'
  error_code text,
  sent_at timestamptz default now()
);
```
