import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTodayGames } from "../hooks/useTodayGames";
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
  ERROR_COLOR,
  LIVE_COLOR,
  LIVE_BG,
  KOREAN_STACK,
} from "../lib/design-tokens";

/**
 * F005: 메인 경기 리스트 화면.
 *
 * 플로우:
 *   1. Intro/TeamSelect에서 login + team 선택 완료 후 /home으로 이동
 *   2. useTodayGames()가 /api/games/today 호출
 *   3. 응원팀 참여 경기와 나머지 경기를 섹션 분리로 렌더
 *   4. 종료된 경기(finished)만 탭 가능 — /game/:id 네비게이션
 *
 * 심사 규칙(NEVER/ALWAYS):
 *   - NEVER: 커스텀 헤더/백버튼 → NavigationBar는 F009에서 통합
 *   - NEVER: 수평 스크롤 허용 → 모든 섹션 세로 스택
 *   - NEVER: alert/confirm/prompt → 에러는 인라인으로 노출
 *   - NEVER: 과도한 blinking/애니메이션 → playing 상태 점 1개만 부드러운 pulse
 *   - NEVER: 탭해도 반응 없는 버튼 → finished 아닌 경기는 onClick 미연결
 *   - ALWAYS: 경기 없는 날에도 의미 있는 가이드 메시지
 *
 * 디자인 노트:
 *   - Intro.tsx/TeamSelect.tsx와 동일한 인라인 + KOREAN_STACK 패턴 유지
 *   - 전역 디자인 토큰 교체는 F010(TDS)에서 수행
 *
 * F005 범위 밖(위임 이슈):
 *   - 경기 상세 본 구현 → F006 (현재는 placeholder 라우트만)
 *   - 응원팀 변경 진입점 → F010 또는 별도 UX 패스
 *   - 알림 on/off 토글 → F011
 */

/** 팀 코드 → 표시명. 미등록 코드는 raw 반환. */
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
      className="flex w-full flex-col gap-3 rounded-2xl px-4 py-4 text-left transition-colors active:bg-[#F2F4F6] disabled:active:bg-transparent"
      style={{
        background: "#FFFFFF",
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
              className="h-1.5 w-1.5 rounded-full animate-[pulse_2s_ease-in-out_infinite]"
              style={{ background: LIVE_COLOR }}
            />
            경기 중
          </span>
        ) : game.status === "cancelled" ? (
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: "#F2F4F6", color: TEXT_WEAK }}
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

  const { myTeamGames, otherGames } = useMemo(() => {
    const mine: Game[] = [];
    const others: Game[] = [];
    for (const game of games) {
      if (isMyTeamGame(game, myTeamCode)) {
        mine.push(game);
      } else {
        others.push(game);
      }
    }
    return { myTeamGames: mine, otherGames: others };
  }, [games, myTeamCode]);

  const handleNavigateDetail = (gameId: string) => {
    navigate(`/game/${gameId}`);
  };

  return (
    <main
      className="flex min-h-dvh flex-col px-5 pt-10 pb-8"
      style={{ background: "#FFFFFF", color: TEXT_STRONG, fontFamily: KOREAN_STACK }}
    >
      {/* 상단: 응원팀 배지 (커스텀 헤더 아님 — 본문 콘텐츠) */}
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
            <span style={{ color: TEXT_STRONG }}> 오늘 경기는요</span>
          </h1>
        ) : (
          <h1 className="text-[22px] font-bold leading-tight tracking-tight">
            오늘의 경기 목록
          </h1>
        )}
      </section>

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
              className="w-full rounded-xl px-5 py-3 text-[14px] font-semibold text-white"
              style={{ background: BRAND_COLOR }}
              aria-label="경기 목록 다시 불러오기"
            >
              다시 시도
            </button>
          </div>
        ) : games.length === 0 ? (
          <div
            className="flex flex-col items-center gap-3 rounded-2xl px-5 py-12"
            style={{ background: SURFACE_ELEVATED }}
          >
            <span className="text-[40px] leading-none" aria-hidden="true">
              ⚾
            </span>
            <p className="text-[15px] font-semibold" style={{ color: TEXT_STRONG }}>
              오늘은 경기가 없어요
            </p>
            <p className="text-[13px]" style={{ color: TEXT_WEAK }}>
              경기가 있는 날 알림을 보내드릴게요.
            </p>
          </div>
        ) : (
          <>
            {myTeamGames.length > 0 && (
              <div className="flex flex-col gap-3">
                <h2
                  className="text-[13px] font-semibold"
                  style={{ color: BRAND_COLOR }}
                >
                  내 팀 경기
                </h2>
                <div className="flex flex-col gap-3">
                  {myTeamGames.map((game) => (
                    <GameRow
                      key={game.id}
                      game={game}
                      myTeamCode={myTeamCode}
                      onNavigate={handleNavigateDetail}
                    />
                  ))}
                </div>
              </div>
            )}

            {otherGames.length > 0 && (
              <div className="flex flex-col gap-3">
                <h2
                  className="text-[13px] font-semibold"
                  style={{ color: TEXT_WEAK }}
                >
                  {myTeamGames.length > 0 ? "다른 경기" : "오늘의 경기"}
                </h2>
                <div className="flex flex-col gap-3">
                  {otherGames.map((game) => (
                    <GameRow
                      key={game.id}
                      game={game}
                      myTeamCode={myTeamCode}
                      onNavigate={handleNavigateDetail}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* 하단 안내 — 종료된 경기만 결과 화면으로 이동 가능 */}
      {!isLoading && error === null && games.length > 0 && (
        <p
          className="pt-6 text-center text-[12px]"
          style={{ color: TEXT_WEAK }}
        >
          경기가 끝난 후 탭하면 결과를 볼 수 있어요.
        </p>
      )}
    </main>
  );
}
