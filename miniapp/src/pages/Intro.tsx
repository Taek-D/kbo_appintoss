import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/**
 * F002: 인트로/랜딩 화면.
 * F003: handleStart에서 실제 토스 로그인 플로우 실행.
 *
 * 심사 규칙(NEVER): appLogin()을 앱 시작 직후 호출하면 반려된다.
 * 반드시 이 화면이 먼저 보이고, 사용자가 "시작하기"를 눌러야 로그인으로 진입한다.
 *
 * 디자인 노트:
 * - 템플릿의 게이밍 다크 톤 대신 비게임 라이트 톤으로 오버라이드.
 *   글로벌 CSS 토큰(index.css)은 F010에서 TDS 규격으로 재정의 예정이므로 여기서는 인라인.
 * - 브랜드 컬러는 granite.config.ts와 동일하게 #3182F6 (토스 블루).
 * - 로고는 원형 심볼 + 이모지로 대체 — 실제 브랜드 로고는 출시 전 교체.
 *
 * TODO(F009): 첫 화면 뒤로가기 = 앱 종료 검증 (NavigationBar 통합 시).
 */

const BRAND_COLOR = "#3182F6";
const TEXT_STRONG = "#191F28";
const TEXT_MEDIUM = "#4E5968";
const TEXT_WEAK = "#8B95A1";
const ERROR_COLOR = "#F04452";

const KOREAN_STACK =
  "system-ui, -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";

export default function Intro() {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();

  const handleStart = async () => {
    try {
      const user = await login();
      // F004: 신규 사용자(team_code 미설정) → 응원팀 선택, 기존 사용자 → 홈
      if (user.team_code === null) {
        navigate("/team-select");
      } else {
        navigate("/home");
      }
    } catch {
      // 에러 메시지는 useAuth.error로 노출됨 — 아래 error 영역에서 렌더.
    }
  };

  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-between px-6 pt-20 pb-10"
      style={{ background: "#FFFFFF", color: TEXT_STRONG }}
    >
      {/* 브랜드 영역 */}
      <section className="flex flex-1 flex-col items-center justify-center gap-7 text-center">
        <div
          className="flex h-28 w-28 items-center justify-center rounded-full shadow-lg"
          style={{ background: BRAND_COLOR, boxShadow: `0 12px 32px ${BRAND_COLOR}33` }}
          role="img"
          aria-label="KBO 야구 알리미 로고"
        >
          <span className="text-5xl leading-none" aria-hidden="true">
            ⚾
          </span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <h1
            className="text-[28px] font-bold leading-tight tracking-tight"
            style={{ fontFamily: KOREAN_STACK }}
          >
            KBO 야구 알리미
          </h1>
          <p
            className="max-w-[280px] text-[15px] leading-relaxed"
            style={{ color: TEXT_MEDIUM, fontFamily: KOREAN_STACK }}
          >
            응원팀 경기가 끝나면
            <br />
            즉시 알려드릴게요.
          </p>
        </div>
      </section>

      {/* 하단 CTA */}
      <div className="flex w-full flex-col items-stretch gap-3">
        {error !== null && (
          <p
            role="alert"
            className="text-center text-[13px]"
            style={{ color: ERROR_COLOR, fontFamily: KOREAN_STACK }}
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleStart}
          disabled={isLoading}
          className="w-full rounded-2xl px-6 py-4 text-[16px] font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-60"
          style={{ background: BRAND_COLOR, fontFamily: KOREAN_STACK }}
          aria-label="KBO 야구 알리미 시작하기"
        >
          {isLoading ? "로그인 중..." : "시작하기"}
        </button>
        <p
          className="text-center text-[12px]"
          style={{ color: TEXT_WEAK, fontFamily: KOREAN_STACK }}
        >
          시작 버튼을 누르면 토스 계정으로 연결돼요.
        </p>
      </div>
    </main>
  );
}
