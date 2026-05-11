import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTodayGames } from "../hooks/useTodayGames";
import { useTeamWidget } from "../hooks/useTeamWidget";
import { BannerAd } from "../components/BannerAd";
import { TeamSeasonWidget } from "../components/TeamSeasonWidget";
import { LastGameCard } from "../components/LastGameCard";
import { CountdownToNextGame } from "../components/CountdownToNextGame";
import { AD_GROUP_IDS } from "../lib/ad-config";
import {
  findTeamByRawCode,
  formatGameTime,
  isGameDetailAvailable,
  isMyTeamGame,
  type Game,
} from "../lib/games";
import { findTeam, isTeamCode } from "../lib/teams";
import {
  BRAND_COLOR,
  TEXT_STRONG,
  TEXT_MEDIUM,
  TEXT_WEAK,
  BORDER_WEAK,
  SURFACE_ELEVATED,
  SURFACE,
  ERROR_COLOR,
  LIVE_COLOR,
  LIVE_BG,
  grey100,
  KOREAN_STACK,
} from "../lib/design-tokens";

/**
 * F005: 메인 경기 리스트 화면.
 * F014: 응원팀 시즌 위젯 + 빈 상태 페이지 보강.
 *
 * 플로우:
 *   1. Intro/TeamSelect에서 login + team 선택 완료 후 /home으로 이동
 *   2. 응원팀 선택 시 → TeamSeasonWidget (시즌 누적 전적 + 다음 경기) 상단 노출
 *   3. useTodayGames()가 /api/games/today 호출
 *   4. 오늘 경기 없으면 → LastGameCard + CountdownToNextGame fallback (PRD-014 §4.2)
 *
 * 심사 규칙(NEVER/ALWAYS):
 *   - NEVER: 커스텀 헤더/백버튼 → NavigationBar는 F009에서 통합
 *   - NEVER: 수평 스크롤 허용 → 모든 섹션 세로 스택
 *   - NEVER: alert/confirm/prompt → 에러는 인라인으로 노출
 *   - NEVER: 과도한 blinking/애니메이션 → playing 상태 점 1개만 부드러운 pulse
 *   - NEVER: 탭해도 반응 없는 버튼 → finished 아닌 경기는 onClick 미연결
 *   - ALWAYS: 경기 없는 날에도 의미 있는 가이드 메시지 (위젯 + 카운트다운)
 */

function displayTeamName(raw: string): string {
  const team = findTeamByRawCode(raw);
  return team?.shortName ?? raw;
}

type GameRowProps = {
  game: Game;
  myTeamCode: string | null;
  onNavigate: (gameId: string) => void;
};

function GameRow({ game, myTeamCode, onNavigate }: GameRowProps) {
  const awayName = displayTeamName(game.away_team);
  const homeName = displayTeamName(game.home_team);
  const isMine = isMyTeamGame(game, myTeamCode);
  const clickable = isGameDetailAvailable(game);

  const homeWin = game.home_score > game.away_score;
  const awayWin = game.away_score > game.home_score;

  const statusLabel = (() => {
    if (game.status === "scheduled") return formatGameTime(game.started_at);
    if (game.status === "cancelled") return "취소";
    if (game.status === "playing") return "경기 중";
    return "종료";
  })();

  const ariaLabel = (() => {
    if (game.status === "scheduled") {
      return `${awayName} 대 ${homeName}, ${statusLabel} 예정`;
    }
    if (game.status === "cancelled") {
      return `${awayName} 대 ${homeName}, 취소됨`;
    }
    return `${awayName} ${game.away_score} 대 ${game.home_score} ${homeName}, ${statusLabel}`;
  })();

  const handleClick = () => {
    if (!clickable) return;
    onNavigate(game.id);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!clickable}
      aria-label={ariaLabel}
      className="flex w-full flex-col gap-3 rounded-2xl px-4 py-4 text-left transition-colors active:bg-secondary disabled:active:bg-transparent"
      style={{
        background: SURFACE,
        border: `1.5px solid ${isMine ? BRAND_COLOR : BORDER_WEAK}`,
        boxShadow: isMine ? `0 6px 16px ${BRAND_COLOR}1A` : "none",
        fontFamily: KOREAN_STACK,
        cursor: clickable ? "pointer" : "default",
      }}
    >
      {/* 상단 상태 영역 */}
      <div className="flex items-center justify-between">
        {game.status === "playing" ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: LIVE_BG, color: LIVE_COLOR }}
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full animate-[pulse_2s_ease-in-out_infinite] motion-reduce:animate-none"
              style={{ background: LIVE_COLOR }}
            />
            경기 중
          </span>
        ) : game.status === "cancelled" ? (
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: grey100, color: TEXT_WEAK }}
          >
            취소
          </span>
        ) : game.status === "finished" ? (
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: SURFACE_ELEVATED, color: TEXT_MEDIUM }}
          >
            경기 종료
          </span>
        ) : (
          <span
            className="text-[12px] font-medium"
            style={{ color: TEXT_WEAK }}
          >
            {statusLabel}
          </span>
        )}

        {isMine && (
          <span
            className="text-[11px] font-semibold"
            style={{ color: BRAND_COLOR }}
          >
            내 팀
          </span>
        )}
      </div>

      {/* 팀 + 스코어 */}
      <div className="flex items-center justify-between gap-3">
        <span
          className="flex-1 truncate text-[15px] font-semibold"
          style={{
            color: awayWin ? TEXT_STRONG : TEXT_MEDIUM,
          }}
        >
          {awayName}
        </span>

        <div className="flex items-center gap-2 px-2">
          {game.status === "scheduled" ? (
            <span
              className="text-[14px] font-medium"
              style={{ color: TEXT_WEAK }}
            >
              {statusLabel}
            </span>
          ) : game.status === "cancelled" ? (
            <span className="text-[14px]" style={{ color: TEXT_WEAK }}>
              —
            </span>
          ) : (
            <>
              <span
                className="text-[20px] font-bold tabular-nums"
                style={{
                  color: awayWin ? BRAND_COLOR : homeWin ? TEXT_WEAK : TEXT_STRONG,
                }}
              >
                {game.away_score}
              </span>
              <span className="text-[16px]" style={{ color: TEXT_WEAK }}>
                :
              </span>
              <span
                className="text-[20px] font-bold tabular-nums"
                style={{
                  color: homeWin ? BRAND_COLOR : awayWin ? TEXT_WEAK : TEXT_STRONG,
                }}
              >
                {game.home_score}
              </span>
            </>
          )}
        </div>

        <span
          className="flex-1 truncate text-right text-[15px] font-semibold"
          style={{
            color: homeWin ? TEXT_STRONG : TEXT_MEDIUM,
          }}
        >
          {homeName}
        </span>
      </div>
    </button>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div
        aria-hidden="true"
        className="h-[92px] rounded-2xl"
        style={{ background: SURFACE_ELEVATED }}
      />
      <div
        aria-hidden="true"
        className="h-[92px] rounded-2xl"
        style={{ background: SURFACE_ELEVATED }}
      />
      <div
        aria-hidden="true"
        className="h-[92px] rounded-2xl"
        style={{ background: SURFACE_ELEVATED }}
      />
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { games, isLoading, error, refetch } = useTodayGames();

  const myTeamCode = user?.team_code ?? null;

  const myTeam = useMemo(() => {
    if (myTeamCode === null) return null;
    if (!isTeamCode(myTeamCode)) return null;
    return findTeam(myTeamCode);
  }, [myTeamCode]);

  const { widget } = useTeamWidget(myTeamCode);

  const handleNavigateDetail = (gameId: string) => {
    navigate(`/game/${gameId}`);
  };

  const hasTodayGames = !isLoading && error === null && games.length > 0;
  const isEmptyToday = !isLoading && error === null && games.length === 0;

  return (
    <main
      className="flex min-h-dvh flex-col px-5 pt-10"
      style={{
        background: SURFACE,
        color: TEXT_STRONG,
        fontFamily: KOREAN_STACK,
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)",
      }}
    >
      {/* 상단: 응원팀 배지 */}
      <section className="flex flex-col gap-1 pb-6">
        <p
          className="text-[12px] font-medium uppercase tracking-wide"
          style={{ color: TEXT_WEAK }}
        >
          오늘의 KBO
        </p>
        {myTeam !== null ? (
          <h1 className="text-[22px] font-bold leading-tight tracking-tight">
            <span style={{ color: myTeam.color }}>{myTeam.shortName}</span>
            <span style={{ color: TEXT_STRONG }}>
              {isEmptyToday ? " 오늘은 쉬는 날" : " 오늘 경기는요"}
            </span>
          </h1>
        ) : (
          <h1 className="text-[22px] font-bold leading-tight tracking-tight">
            오늘의 경기 목록
          </h1>
        )}
      </section>

      {/* F014: 응원팀 시즌 위젯 — 응원팀 선택 + widget 데이터가 있을 때만 */}
      {myTeam !== null && widget !== null && (
        <section className="pb-6">
          <TeamSeasonWidget widget={widget} myTeam={myTeam} />
        </section>
      )}

      {/* 본문: 로딩 / 에러 / 빈 상태 / 경기 목록 */}
      <section className="flex flex-1 flex-col gap-6">
        {isLoading ? (
          <Skeleton />
        ) : error !== null ? (
          <div
            className="flex flex-col items-stretch gap-3 rounded-2xl px-5 py-6"
            style={{ background: SURFACE_ELEVATED }}
          >
            <p
              role="alert"
              className="text-center text-[14px]"
              style={{ color: ERROR_COLOR }}
            >
              {error}
            </p>
            <button
              type="button"
              onClick={refetch}
              className="w-full rounded-xl px-5 py-3 text-[14px] font-semibold text-white transition-transform active:scale-[0.98]"
              style={{ background: BRAND_COLOR }}
              aria-label="경기 목록 다시 불러오기"
            >
              다시 시도
            </button>
          </div>
        ) : isEmptyToday ? (
          // F014: 응원팀이 있으면 LastGameCard + Countdown, 없으면 단순 메시지
          myTeam !== null && widget !== null ? (
            <div className="flex flex-col gap-4">
              {widget.lastGame !== null && (
                <div className="flex flex-col gap-2">
                  <span
                    className="text-[12px] font-medium"
                    style={{ color: TEXT_WEAK }}
                  >
                    어제 결과
                  </span>
                  <LastGameCard
                    lastGame={widget.lastGame}
                    myTeam={myTeam}
                    onNavigate={handleNavigateDetail}
                  />
                </div>
              )}
              {widget.nextGame !== null && (
                <CountdownToNextGame
                  nextGame={widget.nextGame}
                  myTeam={myTeam}
                />
              )}
              {widget.lastGame === null && widget.nextGame === null && (
                <div
                  className="flex flex-col items-center gap-3 rounded-2xl px-5 py-12"
                  style={{ background: SURFACE_ELEVATED }}
                >
                  <span className="text-[40px] leading-none" aria-hidden="true">
                    ⚾
                  </span>
                  <p
                    className="text-[15px] font-semibold"
                    style={{ color: TEXT_STRONG }}
                  >
                    오늘은 경기가 없어요
                  </p>
                  <p
                    className="text-[13px]"
                    style={{ color: TEXT_WEAK }}
                  >
                    경기가 있는 날 알림을 보내드릴게요.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div
              className="flex flex-col items-center gap-3 rounded-2xl px-5 py-12"
              style={{ background: SURFACE_ELEVATED }}
            >
              <span className="text-[40px] leading-none" aria-hidden="true">
                ⚾
              </span>
              <p
                className="text-[15px] font-semibold"
                style={{ color: TEXT_STRONG }}
              >
                오늘은 경기가 없어요
              </p>
              <p className="text-[13px]" style={{ color: TEXT_WEAK }}>
                경기가 있는 날 알림을 보내드릴게요.
              </p>
            </div>
          )
        ) : (
          // 통합 리스트: 시간 순 그대로(서버 정렬 사용)
          <div className="flex flex-col gap-3">
            {games.map((game) => (
              <GameRow
                key={game.id}
                game={game}
                myTeamCode={myTeamCode}
                onNavigate={handleNavigateDetail}
              />
            ))}
          </div>
        )}
      </section>

      {/* 하단 안내 — 종료된 경기만 결과 화면으로 이동 가능 */}
      {hasTodayGames && (
        <p
          className="pt-6 text-center text-[12px]"
          style={{ color: TEXT_WEAK }}
        >
          경기가 끝난 후 탭하면 결과를 볼 수 있어요.
        </p>
      )}

      {/* F012: 하단 배너 광고 */}
      <div className="pt-6">
        <BannerAd adGroupId={AD_GROUP_IDS.BANNER} />
      </div>
    </main>
  );
}
