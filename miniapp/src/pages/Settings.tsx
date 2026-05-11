import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "../hooks/useAuth";
import { findTeam, isTeamCode } from "../lib/teams";
import {
  BRAND_COLOR,
  BRAND_SOFT,
  TEXT_STRONG,
  TEXT_MEDIUM,
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
 *   2. 알림    — F013: 종료/취소 2개 토글 + 마스터 스위치
 *
 * 심사 규칙(CLAUDE.md NEVER/ALWAYS):
 *   - NEVER: 자체 상단 헤더/백버튼/햄버거 — 본문 콘텐츠 라벨만 사용
 *   - NEVER: alert/confirm/prompt — 모든 에러는 인라인(role="alert")
 *   - NEVER: 외부 링크/앱 설치 유도 — 0건
 *   - ALWAYS: 데이터 즉시 반영 — Optimistic Update로 토글 즉시 반영, 실패 시 롤백
 *
 * F013 알림 그룹 상태 매트릭스:
 *   응원팀 미선택        → 알림 카드 전체 disabled
 *   subscribed=false     → 마스터 OFF, 토글들은 표시되되 disabled + "알림 켜기" CTA
 *   subscribed=true      → 두 토글 활성, 하단 "모든 알림 끄기" 텍스트 버튼
 *   둘 다 OFF + 마스터 ON → 안내 메시지 (서버는 받아들이되 발송 0건이 되는 상태)
 */
export default function Settings() {
  const navigate = useNavigate();
  const {
    user,
    toggleSubscription,
    isTogglingSubscription,
    toggleSubscriptionError,
    updateNotificationPrefs,
    isUpdatingPrefs,
    updatePrefsError,
  } = useAuth();

  const myTeam = useMemo(() => {
    if (user?.team_code === undefined || user?.team_code === null) return null;
    if (!isTeamCode(user.team_code)) return null;
    return findTeam(user.team_code);
  }, [user?.team_code]);

  const hasTeam = myTeam !== null;
  const subscribed = user?.subscribed ?? false;
  const notifyFinish = user?.notify_finish ?? true;
  const notifyCancel = user?.notify_cancel ?? true;

  const masterOn = hasTeam && subscribed;
  const bothOff = masterOn && !notifyFinish && !notifyCancel;

  const handleMasterToggle = (checked: boolean) => {
    void toggleSubscription(checked).catch(() => {
      // 인라인 에러로 처리 (alert 금지)
    });
  };

  const handlePrefToggle = (field: "notify_finish" | "notify_cancel") => (
    checked: boolean,
  ) => {
    void updateNotificationPrefs({ [field]: checked }).catch(() => {
      // 인라인 에러로 처리 (낙관적 업데이트가 자동 롤백)
    });
  };

  const errorMessage = toggleSubscriptionError ?? updatePrefsError;

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
        className="mb-5 flex items-center justify-between rounded-2xl px-4 py-4"
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

      {/* (2) 알림 섹션 헤더 */}
      <section className="mb-2 flex items-center justify-between px-1">
        <p
          className="text-[12px] font-medium uppercase tracking-wide"
          style={{ color: TEXT_WEAK }}
        >
          알림
        </p>
        <p
          className="text-[11px] font-semibold"
          style={{
            color: !hasTeam
              ? TEXT_WEAK
              : masterOn
                ? LIVE_COLOR
                : TEXT_WEAK,
          }}
        >
          {!hasTeam ? "응원팀 선택 필요" : masterOn ? "받는 중" : "꺼짐"}
        </p>
      </section>

      {/* (2-a) 경기 종료 토글 카드 */}
      <NotificationToggleCard
        icon="🏁"
        title="경기 종료"
        description={
          !hasTeam
            ? "응원팀을 먼저 선택해 주세요"
            : !subscribed
              ? "마스터 알림이 꺼져 있어요"
              : notifyFinish
                ? "결과를 바로 알려드려요"
                : "결과 알림이 꺼져 있어요"
        }
        checked={hasTeam && subscribed && notifyFinish}
        disabled={!hasTeam || !subscribed || isUpdatingPrefs}
        accentOn={hasTeam && subscribed && notifyFinish}
        ariaLabel="경기 종료 알림 토글"
        onCheckedChange={handlePrefToggle("notify_finish")}
      />

      {/* (2-b) 경기 취소 토글 카드 */}
      <NotificationToggleCard
        icon="🌧️"
        title="경기 취소"
        description={
          !hasTeam
            ? "응원팀을 먼저 선택해 주세요"
            : !subscribed
              ? "마스터 알림이 꺼져 있어요"
              : notifyCancel
                ? "우천/사정으로 취소되면"
                : "취소 알림이 꺼져 있어요"
        }
        checked={hasTeam && subscribed && notifyCancel}
        disabled={!hasTeam || !subscribed || isUpdatingPrefs}
        accentOn={hasTeam && subscribed && notifyCancel}
        ariaLabel="경기 취소 알림 토글"
        onCheckedChange={handlePrefToggle("notify_cancel")}
      />

      {/* 둘 다 OFF 상태 안내 */}
      {bothOff && (
        <p
          className="mt-2 text-center text-[12px]"
          style={{ color: TEXT_MEDIUM }}
        >
          모든 알림이 꺼져 있어요. 끝난 경기는 홈에서 확인할 수 있어요.
        </p>
      )}

      {/* 마스터 스위치 — 텍스트 버튼 */}
      {hasTeam && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => handleMasterToggle(!subscribed)}
            disabled={isTogglingSubscription}
            className="rounded-xl px-4 py-2 text-[13px] font-semibold transition-transform active:scale-[0.98] disabled:opacity-60"
            style={{
              background: subscribed ? "transparent" : BRAND_SOFT,
              color: subscribed ? TEXT_WEAK : BRAND_COLOR,
              border: subscribed ? `1px solid ${BORDER_WEAK}` : "none",
            }}
            aria-label={subscribed ? "모든 알림 끄기" : "모든 알림 켜기"}
          >
            {subscribed ? "모든 알림 끄기" : "모든 알림 켜기"}
          </button>
        </div>
      )}

      {/* 에러 인라인 */}
      {errorMessage !== null && (
        <p
          role="alert"
          className="mt-3 text-center text-[13px]"
          style={{ color: ERROR_COLOR }}
        >
          {errorMessage}
        </p>
      )}
    </main>
  );
}

/**
 * F013: 알림 종류별 토글 카드.
 * 응원팀 미선택 또는 마스터 OFF 시 disabled + opacity 0.6.
 */
type NotificationToggleCardProps = {
  icon: string;
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  accentOn: boolean;
  ariaLabel: string;
  onCheckedChange: (checked: boolean) => void;
};

function NotificationToggleCard({
  icon,
  title,
  description,
  checked,
  disabled,
  accentOn,
  ariaLabel,
  onCheckedChange,
}: NotificationToggleCardProps) {
  return (
    <section
      className="mb-2 flex items-center justify-between rounded-2xl px-4 py-3"
      style={{
        background: SURFACE_ELEVATED,
        border: `1px solid ${BORDER_WEAK}`,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full text-[18px]"
          style={{ background: accentOn ? LIVE_BG : grey100 }}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p
            className="text-[14px] font-semibold"
            style={{ color: TEXT_STRONG }}
          >
            {title}
          </p>
          <p
            className="text-[12px]"
            style={{ color: accentOn ? LIVE_COLOR : TEXT_WEAK }}
          >
            {description}
          </p>
        </div>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-label={ariaLabel}
      />
    </section>
  );
}
