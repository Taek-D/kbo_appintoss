import { useNavigate } from "react-router-dom";
import {
  BRAND_COLOR,
  TEXT_STRONG,
  TEXT_MEDIUM,
  SURFACE_ELEVATED,
  KOREAN_STACK,
} from "../lib/design-tokens";

/**
 * 404 페이지.
 *
 * 심사 규칙:
 *   - ALWAYS: 등록 스킴 URL이 404 없이 정상 동작해야 함
 *   - ALWAYS: 브랜딩 통일 (한국어 텍스트)
 *   - NEVER: console.log/console.error 금지 → 로거 사용 원칙
 */
export default function NotFound() {
  const navigate = useNavigate();

  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ background: SURFACE_ELEVATED, color: TEXT_STRONG, fontFamily: KOREAN_STACK }}
    >
      <span className="text-[48px] leading-none" aria-hidden="true">
        ⚾
      </span>
      <h1 className="text-[20px] font-bold">페이지를 찾을 수 없어요</h1>
      <p className="text-[14px]" style={{ color: TEXT_MEDIUM }}>
        잘못된 경로로 접근한 것 같아요.
      </p>
      <button
        type="button"
        onClick={() => navigate("/home")}
        className="mt-2 rounded-2xl px-8 py-3.5 text-[15px] font-semibold text-white transition-transform active:scale-[0.98]"
        style={{ background: BRAND_COLOR }}
      >
        홈으로 돌아가기
      </button>
    </main>
  );
}
