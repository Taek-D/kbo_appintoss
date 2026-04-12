import { useNavigate, useParams } from "react-router-dom";

/**
 * F005 범위: 라우트 placeholder.
 * F006에서 kbo_game의 summary 컴포넌트(GSAP/Lenis)를 포팅하여 본 구현한다.
 *
 * 현재는 Home.tsx에서 종료 경기 탭 시 404 없이 착지할 페이지만 제공.
 * "UI 기능 완결성" 규칙을 위해 로딩 상태와 뒤로 이동 대체 동선을 표시한다.
 * (커스텀 백버튼은 금지 — 첫 화면으로 이동하는 "홈으로" 링크만 제공)
 */

const BRAND_COLOR = "#3182F6";
const TEXT_STRONG = "#191F28";
const TEXT_MEDIUM = "#4E5968";
const TEXT_WEAK = "#8B95A1";

const KOREAN_STACK =
  "system-ui, -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";

export default function GameDetail() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const gameId = params.id ?? "";

  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 py-10"
      style={{ background: "#FFFFFF", color: TEXT_STRONG, fontFamily: KOREAN_STACK }}
    >
      <span className="text-[44px] leading-none" aria-hidden="true">
        ⚾
      </span>

      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-[20px] font-bold leading-tight">
          경기 상세 화면
        </h1>
        <p
          className="max-w-[260px] text-[14px] leading-relaxed"
          style={{ color: TEXT_MEDIUM }}
        >
          하이라이트와 스코어보드를
          <br />
          곧 보여드릴게요.
        </p>
        {gameId !== "" && (
          <p className="pt-2 text-[11px]" style={{ color: TEXT_WEAK }}>
            game id: {gameId}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          navigate("/home");
        }}
        className="w-full max-w-[280px] rounded-2xl px-6 py-4 text-[15px] font-semibold text-white transition-opacity active:opacity-80"
        style={{ background: BRAND_COLOR }}
        aria-label="홈으로 이동"
      >
        홈으로
      </button>
    </main>
  );
}
