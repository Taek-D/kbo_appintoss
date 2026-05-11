# PRD-014: 응원팀 시즌 위젯 (누적 전적 + D-Day)

> **상태:** Draft
> **버전:** v1.0
> **작성일:** 2026-05-11
> **타깃 마일스톤:** F014
> **선행 의존:** F013 권장 (병행 가능)

## 1. 배경 & 문제 정의

### 1.1 현재 상태
- 홈 화면은 **오늘 경기 리스트**가 전부.
- KBO는 월요일 휴식 + 우천 취소가 잦아 **빈 화면이 주 1~2일** 발생.
- 빈 상태에 "오늘은 경기가 없어요" 텍스트만 노출 → 즉시 이탈, 다음 방문까지 간격 ↑.

### 1.2 가설
> 응원팀 **시즌 누적 전적과 다음 경기 D-Day**를 홈 상단에 항상 보여주면, 경기 없는 날 재방문이 늘고 1주 활성 일수가 증가한다.

### 1.3 우선순위 근거
- **임팩트:** 빈 상태 페이지 = 가장 큰 이탈 경로 직접 해결.
- **실현 가능성:** 추가 데이터 수집 0 (`kbo_games` 테이블에 시즌 전체 누적). 1쿼리로 끝.
- **차별화:** 단순 알리미 → "내 팀 데일리 대시보드"로 격상.

---

## 2. 사용자 스토리

| 페르소나 | 스토리 |
|---|---|
| **순위 매니아 (P0)** | "오늘 경기 없어도 들어와서 우리 팀 순위 확인하고 싶어요." |
| **D-Day 카운터 (P0)** | "월요일 쉬는 날에도 화요일 경기까지 몇 시간 남았는지 보고 싶어요." |
| **우천 취소 사용자 (P1)** | "비 와서 취소됐는데, 다음 경기로 자연스럽게 시선이 이동했으면." |

---

## 3. 범위

### 3.1 In-Scope (F014)
1. 응원팀 시즌 누적 전적 (승/패/무) + 순위 + 승률 API
2. 응원팀 다음 경기 (가장 가까운 `scheduled`)
3. 응원팀 어제 결과 (가장 최근 `finished`)
4. 홈 상단 시즌 위젯 카드 UI
5. 응원팀 컬러 강조 (점/숫자/배지 한정)
6. 빈 상태 페이지에 위젯 + 어제 결과 + 카운트다운

### 3.2 Out-of-Scope
- 전체 KBO 순위표 10팀 표시 (F015 후보)
- 시즌 그래프/차트
- 연승/연패 표시

---

## 4. UX 사양

### 4.1 홈 상단 위젯 (경기 있는 날)
```
┌─────────────────────────────────────┐
│ 🐯 KIA 오늘 경기는요                │
├─────────────────────────────────────┤
│ ╭───── 시즌 위젯 카드 ─────╮       │
│ │ KIA 타이거즈   3위        │       │
│ │ 45승 38패 1무  승률 .542  │       │
│ │ ─────────────────────────│       │
│ │ 다음 경기                 │       │
│ │ 내일 18:30 vs 두산 (홈)  │       │
│ ╰───────────────────────────╯       │
│                                     │
│ — 오늘 경기 리스트 —                │
└─────────────────────────────────────┘
```

### 4.2 빈 상태 (오늘 경기 없음)
```
┌─────────────────────────────────────┐
│ 🐯 KIA 오늘은 쉬는 날                │
├─────────────────────────────────────┤
│ ╭───── 시즌 위젯 ─────────╮         │
│ │ ...동일...               │         │
│ ╰─────────────────────────╯         │
│                                     │
│ 어제 결과                           │
│ ╭───────────────────────────╮       │
│ │ KIA 7 : 3 두산  (승)     │ ← 탭  │
│ ╰───────────────────────────╯       │
│                                     │
│ 다음 경기까지                       │
│        17시간 32분                  │
└─────────────────────────────────────┘
```

### 4.3 디자인 토큰
- 응원팀 컬러는 **순위 숫자**, **승수 숫자**, **D-Day 카운트**에만 적용 (전체 배경 ❌)
- TDS 라이트 테마 안에서 작동
- 카드 배경: `SURFACE_ELEVATED`

### 4.4 인터랙션
- 카드 전체 탭: 무동작 또는 시즌 페이지(F015+)
- 어제 결과 카드 탭: `/game/:id` 상세로 이동
- 카운트다운: **1분마다 갱신** (과도한 애니메이션 ❌)

---

## 5. 데이터 모델

### 5.1 DB 변경
**없음.** `kbo_games` 테이블만으로 모두 계산 가능.

### 5.2 핵심 쿼리
```sql
WITH season_games AS (
  SELECT * FROM public.kbo_games
   WHERE status = 'finished'
     AND game_date BETWEEN $startDate AND $endDate
     AND (home_team = $teamCode OR away_team = $teamCode)
)
SELECT
  COUNT(*) FILTER (
    WHERE (home_team = $teamCode AND home_score > away_score)
       OR (away_team = $teamCode AND away_score > home_score)
  ) AS wins,
  COUNT(*) FILTER (
    WHERE (home_team = $teamCode AND home_score < away_score)
       OR (away_team = $teamCode AND away_score < home_score)
  ) AS losses,
  COUNT(*) FILTER (WHERE home_score = away_score) AS draws
  FROM season_games;
```

### 5.3 시즌 설정
환경변수 또는 코드 상수로 관리:
```ts
const SEASON = { year: 2026, startDate: '2026-03-23', endDate: '2026-10-31' }
```

---

## 6. API 사양

### 6.1 GET `/api/teams/:teamCode/widget`
```ts
{
  "season": {
    "year": 2026,
    "wins": 45, "losses": 38, "draws": 1,
    "winRate": 0.542,
    "rank": 3,
    "gamesBehind": 2.5
  },
  "nextGame": {
    "id": "uuid",
    "game_date": "2026-05-12",
    "home_team": "KI", "away_team": "OB",
    "started_at": "2026-05-12T18:30:00+09:00",
    "isHome": true,
    "msUntilStart": 63120000
  } | null,
  "lastGame": {
    "id": "uuid",
    "game_date": "2026-05-10",
    "home_team": "KI", "away_team": "OB",
    "home_score": 7, "away_score": 3,
    "myTeamWon": true
  } | null
}
```

### 6.2 캐싱
- 서버: 5분 TTL in-memory
- 클라이언트: React Query `staleTime: 5 * 60 * 1000`

---

## 7. 클라이언트 변경

### 7.1 신규 훅 `useTeamWidget.ts`
### 7.2 신규 컴포넌트 `TeamSeasonWidget.tsx`
### 7.3 Home.tsx 통합 (응원팀 미선택 fallback 포함)

---

## 8. 측정 지표

| 지표 | 목표 (4주 후) |
|---|---|
| 1주 활성 일수 (WAU 평균) | **+1일** |
| 빈 상태 30초 체류율 | **+25%** |
| 어제 결과 클릭률 | **5%** |
| 평균 세션 길이 | **+15s** |

---

## 9. 에지 케이스

| 케이스 | 처리 |
|---|---|
| 시즌 전반 (3월) | "시즌 시작! 0승 0패" |
| 시즌 종료 후 (11월) | "시즌 종료, 내년 봄에 만나요" |
| 1위 자기 자신 | `gamesBehind = 0` |
| `lastGame` 무승부 | "(무)" |
| `nextGame.started_at` null | "시간 미정", 카운트다운 "곧" |
| API 실패 | 인라인 에러 + 다시 시도 |

---

## 10. 구현 단계

| 단계 | 작업 | 추정 |
|---|---|---|
| 1 | `services/season-stats.ts` + 단위 테스트 | 2h |
| 2 | `services/team-rank.ts` + 단위 테스트 | 2h |
| 3 | `/api/teams/[teamCode]/widget` 라우트 + Zod | 2h |
| 4 | 서버 in-memory 캐시 5분 TTL | 1h |
| 5 | `useTeamWidget.ts` + `TeamSeasonWidget.tsx` | 3h |
| 6 | `LastGameCard` + `CountdownToNextGame` | 2h |
| 7 | Home.tsx 통합 + fallback | 1.5h |
| 8 | harness-validate | 0.5h |

**총 추정:** 14h (2일)
