import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useGameDetail } from "../hooks/useGameDetail";
import { useShareGame, type ShareStatus } from "../hooks/useShareGame";
import {
  findTeamByRawCode,
  formatGameDate,
  formatGameTime,
  parseInningData,
  type Game,
  type InningScore,
} from "../lib/games";
import { isTeamCode, findTeam, type Team } from "../lib/teams";

/**
 * F006: 경기 결과 상세 화면.
 *
 * 플로우:
 *   1. Home에서 finished 경기 탭 → /game/:id
 *   2. useGameDetail로 단일 경기 fetch
 *   3. 스코어보드 + 이닝 테이블 + 경기 시간 렌더
 *   4. 응원팀 승리 시 상단에 축하 배너
 *   5. "홈으로" CTA로 /home 복귀 (NavigationBar 백버튼은 F009)
 *
 * 심사 규칙(NEVER/ALWAYS):
 *   - NEVER: 커스텀 헤더/백버튼 → 페이지 상단은 콘텐츠 제목만 (NavigationBar는 F009)
 *   - NEVER: alert/confirm/prompt → 에러는 인라인으로 노출
 *   - NEVER: 과도한 blinking/애니메이션 → 정적 렌더, prefers-reduced-motion에서는 fade도 off
 *   - NEVER: 탭해도 반응 없는 버튼 → 본 화면에는 탭 가능 요소 = "홈으로" 버튼 1개뿐
 *   - ALWAYS: UI 기능 완결성 → 로딩/에러/데이터 없음 모두 실제 의미 있는 가이드
 *
 * 수평 스크롤 주의:
 *   홈 화면 수평 스크롤은 심사 금지 규칙이지만, 상세 화면의 이닝 테이블은
 *   데이터 전달을 위해 필요 시 가로 스크롤을 허용한다(좁은 폰 대응). 루트 <main>은
 *   overflow-x: hidden으로 전체 페이지 가로 스크롤 자체는 차단한다.
 *
 * 디자인 노트:
 *   - Intro/TeamSelect/Home과 동일한 인라인 + KOREAN_STACK 패턴 유지
 *   - BRAND_COLOR를 "승리/포커스" 색으로만 사용 (과도한 색 적용 금지)
 *   - GSAP/Lenis는 miniapp에 미설치 + 심사 규칙 "과도한 애니메이션 지양" 고려하여
 *     count-up 애니메이션은 생략. 카드 페이드인만 CSS @keyframes로 미세하게.
 *
 * 위임 이슈:
 *   - NavigationBar 통합 → F009 (현재는 "홈으로" 버튼으로 대체)
 *   - TDS 컴포넌트(Card/Button/Table) 교체 → F010
 *   - 서버 text 컬럼 fallback 실 케이스 검증 → F008 CORS 연동 후
 *
 * F007 공유:
 *   - 하단 CTA가 "공유하기 | 홈으로" 2열 구성
 *   - shareGame()은 토스 환경에서 getTossShareLink()로 intoss:// 딥링크를 만든 뒤
 *     Web Share API → clipboard 순으로 fallback (자사 웹사이트 링크 금지)
 *   - 공유 결과는 인라인 피드백 영역으로 노출 (alert/toast 금지)
 */

const BRAND_COLOR = "#3182F6";
const BRAND_SOFT = "#E8F1FF";
const TEXT_STRONG = "#191F28";
const TEXT_MEDIUM = "#4E5968";
const TEXT_WEAK = "#8B95A1";
const BORDER_WEAK = "#E5E8EB";
const SURFACE_ELEVATED = "#F9FAFB";
const ERROR_COLOR = "#F04452";
const SUCCESS_COLOR = "#0CAA6E";
const SUCCESS_SOFT = "#E6F9F0";

const KOREAN_STACK =
  "system-ui, -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";

const TOTAL_INNINGS = 9;

type TeamView = {
  rawCode: string;
  team: Team | null;
  displayShort: string;
  emoji: string;
};

/**
 * 서버 text 컬럼(home_team/away_team)을 표시용 객체로 변환.
 * KBO_TEAMS에 등록된 코드면 emoji/shortName 사용, 아니면 raw 문자열 fallback.
 */
function toTeamView(rawCode: string): TeamView {
  const team = findTeamByRawCode(rawCode);
  if (team !== null) {
    return { rawCode, team, displayShort: team.shortName, emoji: team.emoji };
  }
  return { rawCode, team: null, displayShort: rawCode, emoji: "⚾" };
}

export default function GameDetail() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const gameId = params.id ?? "";

  const { user } = useAuth();
  const myTeamCode = user?.team_code ?? null;

  const { game, isLoading, error, refetch } = useGameDetail(gameId);

  if (gameId === "") {
    return (
      <EmptyState
        title="경기 정보를 찾을 수 없어요"
        message="잘못된 경로로 접근한 것 같아요. 홈 화면에서 다시 선택해 주세요."
        onHome={() => navigate("/home")}
      />
    );
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (error !== null) {
    return (
      <ErrorState
        message={error}
        onRetry={refetch}
        onHome={() => navigate("/home")}
      />
    );
  }

  if (game === null) {
    return (
      <EmptyState
        title="경기 정보를 불러오지 못했어요"
        message="잠시 후 다시 시도해 주세요."
        onHome={() => navigate("/home")}
      />
    );
  }

  return (
    <GameDetailView
      game={game}
      myTeamCode={myTeamCode}
      onHome={() => navigate("/home")}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// 본 화면
// ─────────────────────────────────────────────────────────────

type GameDetailViewProps = {
  game: Game;
  myTeamCode: string | null;
  onHome: () => void;
};

function GameDetailView({ game, myTeamCode, onHome }: GameDetailViewProps) {
  const away = useMemo(() => toTeamView(game.away_team), [game.away_team]);
  const home = useMemo(() => toTeamView(game.home_team), [game.home_team]);

  const { status: shareStatus, share } = useShareGame();
  const isSharing = shareStatus.phase === "sharing";

  const homeWin = game.home_score > game.away_score;
  const awayWin = game.away_score > game.home_score;
  const isDraw = !homeWin && !awayWin;

  const isMyTeamGame =
    myTeamCode !== null &&
    isTeamCode(myTeamCode) &&
    (game.home_team === myTeamCode || game.away_team === myTeamCode);

  const isMyTeamWin =
    isMyTeamGame &&
    ((game.home_team === myTeamCode && homeWin) ||
      (game.away_team === myTeamCode && awayWin));

  const isMyTeamLose =
    isMyTeamGame &&
    !isDraw &&
    !isMyTeamWin;

  const innings = useMemo(
    () => parseInningData(game.inning_data),
    [game.inning_data],
  );

  const myTeamLabel = useMemo<string | null>(() => {
    if (myTeamCode === null || !isTeamCode(myTeamCode)) return null;
    return findTeam(myTeamCode).shortName;
  }, [myTeamCode]);

  // 심사: "finished가 아닌 경기는 상세 탭 불가"로 이미 Home에서 차단.
  // 그래도 방어적으로 라벨을 분기해둔다.
  const statusLabel =
    game.status === "finished"
      ? "경기 종료"
      : game.status === "cancelled"
        ? "경기 취소"
        : game.status === "playing"
          ? "경기 중"
          : "경기 예정";

  return (
    <main
      style={{
        minHeight: "100dvh",
        width: "100%",
        background: SURFACE_ELEVATED,
        color: TEXT_STRONG,
        fontFamily: KOREAN_STACK,
        overflowX: "hidden",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
      }}
    >
      <PageStyles />

      <section
        style={{
          padding: "24px 20px 12px 20px",
          animation: "kbo-fade-in 0.24s ease-out both",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.2,
            color: TEXT_WEAK,
          }}
        >
          {statusLabel}
        </p>
        <h1
          style={{
            margin: "4px 0 0 0",
            fontSize: 20,
            fontWeight: 700,
            lineHeight: 1.3,
            color: TEXT_STRONG,
          }}
        >
          {formatGameDate(game.game_date)}
        </h1>
      </section>

      {isMyTeamGame && (
        <section
          style={{
            margin: "0 20px 12px 20px",
            padding: "12px 16px",
            borderRadius: 14,
            background: isMyTeamWin
              ? SUCCESS_SOFT
              : isMyTeamLose
                ? "#FFEFEF"
                : BRAND_SOFT,
            color: isMyTeamWin
              ? SUCCESS_COLOR
              : isMyTeamLose
                ? ERROR_COLOR
                : BRAND_COLOR,
            fontSize: 14,
            fontWeight: 600,
            textAlign: "center",
            animation: "kbo-fade-in 0.28s ease-out both",
          }}
          role="status"
          aria-live="polite"
        >
          {isMyTeamWin
            ? `${myTeamLabel ?? "응원팀"} 승리! 오늘도 고생하셨어요`
            : isMyTeamLose
              ? `${myTeamLabel ?? "응원팀"} 아쉬운 한 경기였어요`
              : `${myTeamLabel ?? "응원팀"} 무승부로 마무리됐어요`}
        </section>
      )}

      <ScoreBoardCard
        away={away}
        home={home}
        awayScore={game.away_score}
        homeScore={game.home_score}
        awayWin={awayWin}
        homeWin={homeWin}
        myTeamCode={myTeamCode}
      />

      <InningTableCard innings={innings} away={away} home={home} />

      <TimingCard
        startedAt={game.started_at}
        finishedAt={game.finished_at}
      />

      <ShareFeedback status={shareStatus} />

      <div
        style={{
          padding: "20px 20px 0 20px",
          display: "flex",
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={() => {
            void share(game);
          }}
          disabled={isSharing}
          aria-label="경기 결과 공유하기"
          style={{
            flex: 1,
            padding: "16px 20px",
            borderRadius: 16,
            border: `1px solid ${BORDER_WEAK}`,
            background: "#FFFFFF",
            color: isSharing ? TEXT_WEAK : BRAND_COLOR,
            fontFamily: KOREAN_STACK,
            fontSize: 15,
            fontWeight: 700,
            cursor: isSharing ? "default" : "pointer",
            opacity: isSharing ? 0.7 : 1,
            transition: "opacity 120ms ease-out",
          }}
        >
          {isSharing ? "공유 중..." : "공유하기"}
        </button>
        <button
          type="button"
          onClick={onHome}
          aria-label="홈으로 이동"
          style={{
            flex: 1,
            padding: "16px 20px",
            borderRadius: 16,
            border: "none",
            background: BRAND_COLOR,
            color: "#FFFFFF",
            fontFamily: KOREAN_STACK,
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            transition: "opacity 120ms ease-out",
          }}
          onPointerDown={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.85";
          }}
          onPointerUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
          }}
          onPointerLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
          }}
        >
          홈으로
        </button>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// 공유 피드백 (F007)
// ─────────────────────────────────────────────────────────────

type ShareFeedbackProps = {
  status: ShareStatus;
};

/**
 * 공유 결과를 하단 CTA 위에 인라인으로 노출.
 * - done.shared / done.cancelled: 별도 노출 없음
 *     (OS 공유창이 완료/취소 피드백을 자체적으로 제공)
 * - done.copied: 링크 복사 안내
 * - done.unsupported: 공유를 지원하지 않는 환경 안내
 * - error: 실패 메시지
 *
 * alert/confirm 금지 규칙 준수 — 인라인 role="status"로만 표시.
 */
function ShareFeedback({ status }: ShareFeedbackProps) {
  const message = resolveShareMessage(status);
  if (message === null) return null;

  const isError = status.phase === "error";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        margin: "12px 20px 0 20px",
        padding: "12px 16px",
        borderRadius: 12,
        background: isError ? "#FFEFEF" : BRAND_SOFT,
        color: isError ? ERROR_COLOR : BRAND_COLOR,
        fontSize: 13,
        fontWeight: 600,
        textAlign: "center",
      }}
    >
      {message}
    </div>
  );
}

function resolveShareMessage(status: ShareStatus): string | null {
  if (status.phase === "idle" || status.phase === "sharing") return null;
  if (status.phase === "error") return status.message;

  switch (status.outcome.type) {
    case "shared":
    case "cancelled":
      return null;
    case "copied":
      return "공유 링크를 복사했어요";
    case "unsupported":
      return "이 환경에서는 공유를 지원하지 않아요";
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────
// 스코어보드 카드
// ─────────────────────────────────────────────────────────────

type ScoreBoardCardProps = {
  away: TeamView;
  home: TeamView;
  awayScore: number;
  homeScore: number;
  awayWin: boolean;
  homeWin: boolean;
  myTeamCode: string | null;
};

function ScoreBoardCard({
  away,
  home,
  awayScore,
  homeScore,
  awayWin,
  homeWin,
  myTeamCode,
}: ScoreBoardCardProps) {
  const scoreLabel = `${away.displayShort} ${awayScore} 대 ${homeScore} ${home.displayShort}`;

  const isAwayMy = myTeamCode !== null && away.rawCode === myTeamCode;
  const isHomeMy = myTeamCode !== null && home.rawCode === myTeamCode;

  return (
    <section
      aria-label={scoreLabel}
      style={{
        margin: "4px 20px 12px 20px",
        padding: "24px 20px",
        background: "#FFFFFF",
        borderRadius: 18,
        border: `1px solid ${BORDER_WEAK}`,
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        gap: 12,
        animation: "kbo-fade-in 0.32s ease-out both",
      }}
    >
      <TeamPillar
        view={away}
        isWin={awayWin}
        isMy={isAwayMy}
        alignment="left"
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 4px",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <ScoreNumber value={awayScore} highlight={awayWin} dim={homeWin} />
        <span
          style={{
            fontSize: 22,
            fontWeight: 300,
            color: TEXT_WEAK,
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          :
        </span>
        <ScoreNumber value={homeScore} highlight={homeWin} dim={awayWin} />
      </div>

      <TeamPillar
        view={home}
        isWin={homeWin}
        isMy={isHomeMy}
        alignment="right"
      />
    </section>
  );
}

type TeamPillarProps = {
  view: TeamView;
  isWin: boolean;
  isMy: boolean;
  alignment: "left" | "right";
};

function TeamPillar({ view, isWin, isMy, alignment }: TeamPillarProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: alignment === "left" ? "flex-start" : "flex-end",
        gap: 8,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: SURFACE_ELEVATED,
          border: `1px solid ${BORDER_WEAK}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          lineHeight: 1,
        }}
      >
        {view.emoji}
      </div>
      <span
        style={{
          fontSize: 13,
          fontWeight: isWin ? 700 : 500,
          color: isWin ? TEXT_STRONG : TEXT_MEDIUM,
        }}
      >
        {view.displayShort}
      </span>
      {isMy && (
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 999,
            background: BRAND_SOFT,
            color: BRAND_COLOR,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.2,
          }}
        >
          내 팀
        </span>
      )}
    </div>
  );
}

type ScoreNumberProps = {
  value: number;
  highlight: boolean;
  dim: boolean;
};

function ScoreNumber({ value, highlight, dim }: ScoreNumberProps) {
  return (
    <span
      style={{
        fontSize: 44,
        fontWeight: 800,
        lineHeight: 1,
        color: highlight ? BRAND_COLOR : dim ? TEXT_WEAK : TEXT_STRONG,
        minWidth: 28,
        textAlign: "center",
      }}
    >
      {value}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// 이닝 테이블 카드
// ─────────────────────────────────────────────────────────────

type InningTableCardProps = {
  innings: InningScore[];
  away: TeamView;
  home: TeamView;
};

function InningTableCard({ innings, away, home }: InningTableCardProps) {
  const inningMap = useMemo(() => {
    const m = new Map<number, InningScore>();
    for (const s of innings) m.set(s.inning, s);
    return m;
  }, [innings]);

  const awayTotal = useMemo(
    () => innings.reduce((sum, s) => sum + s.away, 0),
    [innings],
  );
  const homeTotal = useMemo(
    () => innings.reduce((sum, s) => sum + s.home, 0),
    [innings],
  );

  if (innings.length === 0) {
    return (
      <section
        style={{
          margin: "0 20px 12px 20px",
          padding: "20px",
          background: "#FFFFFF",
          borderRadius: 16,
          border: `1px solid ${BORDER_WEAK}`,
          textAlign: "center",
          color: TEXT_WEAK,
          fontSize: 13,
          animation: "kbo-fade-in 0.34s ease-out both",
        }}
      >
        이닝별 기록이 아직 정리되지 않았어요
      </section>
    );
  }

  return (
    <section
      style={{
        margin: "0 20px 12px 20px",
        background: "#FFFFFF",
        borderRadius: 16,
        border: `1px solid ${BORDER_WEAK}`,
        overflow: "hidden",
        animation: "kbo-fade-in 0.34s ease-out both",
      }}
      aria-label="이닝별 스코어"
    >
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table
          style={{
            width: "100%",
            minWidth: 360,
            borderCollapse: "collapse",
            fontFamily: KOREAN_STACK,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <thead>
            <tr style={{ background: SURFACE_ELEVATED }}>
              <th
                scope="col"
                style={{
                  padding: "10px 12px",
                  textAlign: "left",
                  fontSize: 11,
                  fontWeight: 600,
                  color: TEXT_WEAK,
                }}
              >
                팀
              </th>
              {Array.from({ length: TOTAL_INNINGS }, (_, i) => (
                <th
                  key={i + 1}
                  scope="col"
                  style={{
                    padding: "10px 6px",
                    textAlign: "center",
                    fontSize: 11,
                    fontWeight: 600,
                    color: TEXT_WEAK,
                  }}
                >
                  {i + 1}
                </th>
              ))}
              <th
                scope="col"
                style={{
                  padding: "10px 12px",
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: TEXT_STRONG,
                }}
              >
                R
              </th>
            </tr>
          </thead>
          <tbody>
            <InningRow
              label={away.displayShort}
              inningMap={inningMap}
              side="away"
              total={awayTotal}
            />
            <InningRow
              label={home.displayShort}
              inningMap={inningMap}
              side="home"
              total={homeTotal}
            />
          </tbody>
        </table>
      </div>
    </section>
  );
}

type InningRowProps = {
  label: string;
  inningMap: Map<number, InningScore>;
  side: "home" | "away";
  total: number;
};

function InningRow({ label, inningMap, side, total }: InningRowProps) {
  return (
    <tr style={{ borderTop: `1px solid ${BORDER_WEAK}` }}>
      <td
        style={{
          padding: "10px 12px",
          fontSize: 12,
          fontWeight: 600,
          color: TEXT_STRONG,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </td>
      {Array.from({ length: TOTAL_INNINGS }, (_, i) => {
        const score = inningMap.get(i + 1);
        const value = score === undefined ? null : side === "home" ? score.home : score.away;
        return (
          <td
            key={i + 1}
            style={{
              padding: "10px 6px",
              textAlign: "center",
              fontSize: 13,
              color: value === null ? TEXT_WEAK : TEXT_STRONG,
            }}
          >
            {value === null ? "-" : value}
          </td>
        );
      })}
      <td
        style={{
          padding: "10px 12px",
          textAlign: "center",
          fontSize: 14,
          fontWeight: 700,
          color: TEXT_STRONG,
        }}
      >
        {total}
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────
// 경기 시간 카드
// ─────────────────────────────────────────────────────────────

type TimingCardProps = {
  startedAt: string | null;
  finishedAt: string | null;
};

function TimingCard({ startedAt, finishedAt }: TimingCardProps) {
  if (startedAt === null && finishedAt === null) return null;

  return (
    <section
      style={{
        margin: "0 20px 12px 20px",
        padding: "16px 20px",
        background: "#FFFFFF",
        borderRadius: 16,
        border: `1px solid ${BORDER_WEAK}`,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        animation: "kbo-fade-in 0.36s ease-out both",
      }}
      aria-label="경기 시간"
    >
      <TimingRow label="경기 시작" value={formatGameTime(startedAt)} />
      <TimingRow label="경기 종료" value={formatGameTime(finishedAt)} />
    </section>
  );
}

function TimingRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: 13, color: TEXT_WEAK }}>{label}</span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: TEXT_STRONG,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 상태 화면 (로딩 / 에러 / 없음)
// ─────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: SURFACE_ELEVATED,
        color: TEXT_STRONG,
        fontFamily: KOREAN_STACK,
        padding: "24px 20px",
      }}
    >
      <PageStyles />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
        aria-live="polite"
        aria-busy="true"
        aria-label="경기 정보를 불러오는 중"
      >
        <div style={skeletonStyle(28, 160)} />
        <div style={{ height: 8 }} />
        <div style={skeletonCardStyle(148)} />
        <div style={skeletonCardStyle(220)} />
        <div style={skeletonCardStyle(88)} />
      </div>
    </main>
  );
}

function skeletonStyle(height: number, width: number): React.CSSProperties {
  return {
    height,
    width,
    borderRadius: 8,
    background: "#EDF1F5",
    animation: "kbo-skeleton 1.4s ease-in-out infinite",
  };
}

function skeletonCardStyle(height: number): React.CSSProperties {
  return {
    height,
    width: "100%",
    borderRadius: 16,
    background: "#EDF1F5",
    animation: "kbo-skeleton 1.4s ease-in-out infinite",
  };
}

type ErrorStateProps = {
  message: string;
  onRetry: () => void;
  onHome: () => void;
};

function ErrorState({ message, onRetry, onHome }: ErrorStateProps) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: SURFACE_ELEVATED,
        color: TEXT_STRONG,
        fontFamily: KOREAN_STACK,
        padding: "24px 20px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <PageStyles />

      <section
        role="alert"
        style={{
          marginTop: 32,
          padding: "24px 20px",
          background: "#FFFFFF",
          borderRadius: 16,
          border: `1px solid ${BORDER_WEAK}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: 36 }} aria-hidden="true">
          ⚠️
        </span>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
          경기 정보를 불러오지 못했어요
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: TEXT_MEDIUM,
            wordBreak: "keep-all",
          }}
        >
          {message}
        </p>

        <div
          style={{
            display: "flex",
            gap: 8,
            width: "100%",
            paddingTop: 8,
          }}
        >
          <button
            type="button"
            onClick={onHome}
            style={{
              flex: 1,
              padding: "14px 16px",
              borderRadius: 12,
              border: `1px solid ${BORDER_WEAK}`,
              background: "#FFFFFF",
              color: TEXT_STRONG,
              fontFamily: KOREAN_STACK,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            홈으로
          </button>
          <button
            type="button"
            onClick={onRetry}
            style={{
              flex: 1,
              padding: "14px 16px",
              borderRadius: 12,
              border: "none",
              background: BRAND_COLOR,
              color: "#FFFFFF",
              fontFamily: KOREAN_STACK,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </div>
      </section>
    </main>
  );
}

type EmptyStateProps = {
  title: string;
  message: string;
  onHome: () => void;
};

function EmptyState({ title, message, onHome }: EmptyStateProps) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: SURFACE_ELEVATED,
        color: TEXT_STRONG,
        fontFamily: KOREAN_STACK,
        padding: "24px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        textAlign: "center",
      }}
    >
      <PageStyles />

      <span style={{ fontSize: 44 }} aria-hidden="true">
        ⚾
      </span>
      <div>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h1>
        <p
          style={{
            margin: "6px 0 0 0",
            fontSize: 13,
            color: TEXT_MEDIUM,
            wordBreak: "keep-all",
          }}
        >
          {message}
        </p>
      </div>
      <button
        type="button"
        onClick={onHome}
        style={{
          padding: "14px 32px",
          borderRadius: 14,
          border: "none",
          background: BRAND_COLOR,
          color: "#FFFFFF",
          fontFamily: KOREAN_STACK,
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        홈으로
      </button>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// 페이지 레벨 스타일 (CSS 키프레임)
// ─────────────────────────────────────────────────────────────

/**
 * 진입 애니메이션 + 스켈레톤 펄스.
 * prefers-reduced-motion: reduce 시 모든 애니메이션을 비활성화하여
 * 접근성 + 심사 규칙("과도한 blinking/애니메이션 지양") 모두 만족.
 */
function PageStyles() {
  return (
    <style>{`
      @keyframes kbo-fade-in {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes kbo-skeleton {
        0%, 100% { opacity: 1; }
        50%      { opacity: 0.55; }
      }
      @media (prefers-reduced-motion: reduce) {
        [style*="kbo-fade-in"],
        [style*="kbo-skeleton"] {
          animation: none !important;
        }
      }
    `}</style>
  );
}
