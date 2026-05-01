import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "../hooks/useAuth";
import { findTeam, isTeamCode } from "../lib/teams";
import {
  BRAND_COLOR,
  BRAND_SOFT,
  TEXT_STRONG,
  TEXT_WEAK,
  SURFACE,
  SURFACE_ELEVATED,
  BORDER_WEAK,
  ERROR_COLOR,
  LIVE_COLOR,
  LIVE_BG,
  grey100,
  KOREAN_STACK,
} from "../lib/design-tokens";

/**
 * 설정 페이지 — NavigationBar accessory button(icon-setting-mono)에서 진입.
 *
 * 섹션:
 *   1. 응원팀  — 현재 팀 표시 + 변경/선택 버튼 → /team-select 재사용
 *   2. 알림    — Home에서 이전한 토글; 응원팀 미선택 시 안내 + disabled
 *
 * 심사 규칙(CLAUDE.md NEVER/ALWAYS):
 *   - NEVER: 자체 상단 헤더/백버튼/햄버거 — 본문 콘텐츠 라벨만 사용
 *   - NEVER: alert/confirm/prompt — 모든 에러는 인라인(role="alert")
 *   - NEVER: 외부 링크/앱 설치 유도 — 0건
 *   - ALWAYS: 데이터 즉시 반영 — useAuth가 React Query 캐시를 동기 갱신
 *
 * 진입점: App.tsx의 useSettingsAccessory가 ⚙ 클릭 시 navigate("/settings").
 */
export default function Settings() {
  const navigate = useNavigate();
  const {
    user,
    toggleSubscription,
    isTogglingSubscription,
    toggleSubscriptionError,
  } = useAuth();

  const myTeam = useMemo(() => {
    if (user?.team_code === undefined || user?.team_code === null) return null;
    if (!isTeamCode(user.team_code)) return null;
    return findTeam(user.team_code);
  }, [user?.team_code]);

  const hasTeam = myTeam !== null;
  const subscribed = user?.subscribed ?? false;

  const handleToggle = (checked: boolean) => {
    void toggleSubscription(checked).catch(() => {
      // 에러는 toggleSubscriptionError로 노출 (alert 금지 규칙)
    });
  };

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
      {/* 본문 타이틀 (자체 헤더 아님) */}
      <section className="flex flex-col gap-1 pb-6">
        <p
          className="text-[12px] font-medium uppercase tracking-wide"
          style={{ color: TEXT_WEAK }}
        >
          설정
        </p>
        <h1 className="text-[22px] font-bold leading-tight tracking-tight">
          내 알리미
        </h1>
      </section>

      {/* (1) 응원팀 카드 */}
      <section
        className="mb-3 flex items-center justify-between rounded-2xl px-4 py-4"
        style={{
          background: SURFACE_ELEVATED,
          border: `1px solid ${BORDER_WEAK}`,
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-[22px]"
            style={{
              background: hasTeam ? `${myTeam.color}1A` : grey100,
            }}
            aria-hidden="true"
          >
            {hasTeam ? myTeam.emoji : "⚾"}
          </span>
          <div className="min-w-0">
            <p className="text-[12px]" style={{ color: TEXT_WEAK }}>
              응원팀
            </p>
            <p
              className="truncate text-[15px] font-semibold"
              style={{ color: TEXT_STRONG }}
            >
              {hasTeam ? myTeam.name : "선택 안 함"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/team-select")}
          className="ml-3 shrink-0 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-transform active:scale-[0.98]"
          style={{ background: BRAND_SOFT, color: BRAND_COLOR }}
          aria-label={hasTeam ? "응원팀 변경" : "응원팀 선택"}
        >
          {hasTeam ? "변경" : "선택"}
        </button>
      </section>

      {/* (2) 알림 토글 카드 */}
      <section
        className="flex items-center justify-between rounded-2xl px-4 py-3"
        style={{
          background: SURFACE_ELEVATED,
          border: `1px solid ${BORDER_WEAK}`,
          opacity: hasTeam ? 1 : 0.6,
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-[18px]"
            style={{ background: hasTeam && subscribed ? LIVE_BG : grey100 }}
            aria-hidden="true"
          >
            {hasTeam && subscribed ? "🔔" : "🔕"}
          </span>
          <div className="min-w-0">
            <p
              className="text-[14px] font-semibold"
              style={{ color: TEXT_STRONG }}
            >
              경기 종료 알림
            </p>
            <p
              className="text-[12px]"
              style={{
                color: !hasTeam
                  ? TEXT_WEAK
                  : subscribed
                    ? LIVE_COLOR
                    : TEXT_WEAK,
              }}
            >
              {!hasTeam
                ? "응원팀을 먼저 선택해 주세요"
                : subscribed
                  ? "알림을 받고 있어요"
                  : "알림이 꺼져 있어요"}
            </p>
          </div>
        </div>
        <Switch
          checked={hasTeam && subscribed}
          disabled={!hasTeam || isTogglingSubscription}
          onCheckedChange={handleToggle}
          aria-label="경기 종료 알림 토글"
        />
      </section>

      {toggleSubscriptionError !== null && (
        <p
          role="alert"
          className="mt-3 text-center text-[13px]"
          style={{ color: ERROR_COLOR }}
        >
          {toggleSubscriptionError}
        </p>
      )}

      {hasTeam && !subscribed && (
        <p
          className="mt-3 text-center text-[12px]"
          style={{ color: TEXT_WEAK }}
        >
          알림을 끄면 경기 종료 소식을 놓칠 수 있어요
        </p>
      )}
    </main>
  );
}
