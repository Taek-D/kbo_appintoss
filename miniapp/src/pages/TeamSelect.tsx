import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KBO_TEAMS, type Team, type TeamCode } from "../lib/teams";
import { useAuth } from "../hooks/useAuth";
import {
  BRAND_COLOR,
  TEXT_STRONG,
  TEXT_MEDIUM,
  TEXT_WEAK,
  BORDER_WEAK,
  SURFACE_ELEVATED,
  SURFACE,
  ERROR_COLOR,
  KOREAN_STACK,
} from "../lib/design-tokens";

/**
 * F004: 응원팀 선택 화면.
 *
 * 플로우:
 *   1. 로그인 성공 후 team_code === null인 사용자가 진입
 *   2. 10구단 그리드에서 1팀 선택 (UI 즉시 반영)
 *   3. "응원팀으로 저장하기" CTA → selectTeam mutation → PUT /api/subscription
 *   4. 저장 성공 시 /home으로 이동
 *
 * 심사 규칙:
 * - NEVER: 커스텀 헤더/백버튼 (F009에서 NavigationBar 통합, 지금은 헤더 없이 컨텐츠만)
 * - NEVER: alert/confirm/prompt (에러는 화면 인라인으로 노출)
 * - NEVER: 과도한 blinking/애니메이션
 *
 * 디자인 노트:
 * - Intro.tsx와 동일한 인라인 스타일 + KOREAN_STACK 패턴 유지
 * - 전역 디자인 토큰은 F010에서 TDS로 재정의 예정
 * - 팀 로고는 이모지 + 이니셜 — 출시 전 공식 이미지 교체
 */

type TeamCardProps = {
  team: Team;
  selected: boolean;
  disabled: boolean;
  onSelect: (code: TeamCode) => void;
};

function TeamCard({ team, selected, disabled, onSelect }: TeamCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={team.name}
      disabled={disabled}
      onClick={() => {
        onSelect(team.code);
      }}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl px-3 py-5 transition-transform active:scale-[0.98] motion-reduce:transform-none disabled:opacity-60"
      style={{
        background: selected ? team.color : SURFACE_ELEVATED,
        border: `1.5px solid ${selected ? team.color : BORDER_WEAK}`,
        color: selected ? "#FFFFFF" : TEXT_STRONG,
        fontFamily: KOREAN_STACK,
        boxShadow: selected ? `0 8px 20px ${team.color}33` : "none",
      }}
    >
      <span className="text-[32px] leading-none" aria-hidden="true">
        {team.emoji}
      </span>
      <span className="text-[14px] font-semibold leading-tight">
        {team.name}
      </span>
    </button>
  );
}

export default function TeamSelect() {
  const navigate = useNavigate();
  const { selectTeam, isSelectingTeam, selectTeamError, user } = useAuth();
  const [pendingCode, setPendingCode] = useState<TeamCode | null>(() => {
    // 기존 응원팀이 있으면 초기 선택으로 노출 (변경 시나리오)
    const existing = user?.team_code;
    // team_code가 유효한 literal인지 검증 — TeamCode 타입 가드
    const match = KBO_TEAMS.find((t) => t.code === existing);
    return match?.code ?? null;
  });

  const selectedTeam = useMemo<Team | null>(() => {
    if (pendingCode === null) return null;
    return KBO_TEAMS.find((t) => t.code === pendingCode) ?? null;
  }, [pendingCode]);

  const handleSelect = (code: TeamCode) => {
    setPendingCode(code);
  };

  const handleSave = async () => {
    if (pendingCode === null) return;
    try {
      await selectTeam(pendingCode);
      navigate("/home");
    } catch {
      // 에러는 useAuth.selectTeamError로 노출 — 아래 인라인 영역에서 렌더
    }
  };

  const canSave = pendingCode !== null && !isSelectingTeam;

  return (
    <main
      className="flex min-h-dvh flex-col px-5 pt-10"
      style={{ background: SURFACE, color: TEXT_STRONG, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
    >
      {/* 타이틀 영역 — 자체 헤더가 아니라 본문 컨텐츠 (NavigationBar는 F009에서 추가) */}
      <section className="flex flex-col gap-2 pb-6">
        <h1
          className="text-[22px] font-bold leading-tight tracking-tight"
          style={{ fontFamily: KOREAN_STACK }}
        >
          어느 팀을 응원하시나요?
        </h1>
        <p
          className="text-[14px] leading-relaxed"
          style={{ color: TEXT_MEDIUM, fontFamily: KOREAN_STACK }}
        >
          선택한 팀의 경기가 끝나면 즉시 알려드릴게요.
        </p>
      </section>

      {/* 팀 그리드 — 2열 5행, 스크롤은 세로만 (수평 스크롤 금지 규칙) */}
      <section
        className="grid flex-1 grid-cols-2 gap-3 pb-6"
        role="radiogroup"
        aria-label="응원팀 선택"
      >
        {KBO_TEAMS.map((team) => (
          <TeamCard
            key={team.code}
            team={team}
            selected={pendingCode === team.code}
            disabled={isSelectingTeam}
            onSelect={handleSelect}
          />
        ))}
      </section>

      {/* 하단 CTA */}
      <div className="flex flex-col items-stretch gap-3">
        {selectTeamError !== null && (
          <p
            role="alert"
            className="text-center text-[13px]"
            style={{ color: ERROR_COLOR, fontFamily: KOREAN_STACK }}
          >
            {selectTeamError}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="w-full rounded-2xl px-6 py-4 text-[16px] font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
          style={{
            background: selectedTeam?.color ?? BRAND_COLOR,
            fontFamily: KOREAN_STACK,
          }}
          aria-label={
            selectedTeam === null
              ? "응원팀을 먼저 선택해주세요"
              : `${selectedTeam.name}을 응원팀으로 저장하기`
          }
        >
          {isSelectingTeam
            ? "저장 중\u2026"
            : selectedTeam === null
              ? "응원팀을 선택해주세요"
              : `${selectedTeam.shortName} 응원팀으로 저장하기`}
        </button>
        <p
          className="text-center text-[12px]"
          style={{ color: TEXT_WEAK, fontFamily: KOREAN_STACK }}
        >
          응원팀은 언제든지 다시 바꿀 수 있어요.
        </p>
      </div>
    </main>
  );
}
