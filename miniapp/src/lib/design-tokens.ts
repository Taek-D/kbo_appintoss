/**
 * TDS (Toss Design System) 디자인 토큰 — 중앙 관리
 *
 * 모든 페이지에서 이 파일의 토큰만 import하여 사용한다.
 * 파일별 인라인 상수(BRAND_COLOR, TEXT_STRONG 등) 선언을 제거하고
 * 이 모듈로 통합한다.
 *
 * 값은 TDS 2.0 공식 토큰과 정렬:
 * @see .claude/skills/appintoss-tds-mobile/references/colors.md
 * @see .claude/skills/appintoss-tds-mobile/references/typography.md
 */

// ─── Colors ────────────────────────────────────────────────────
// TDS grey scale
export const grey50 = "#F9FAFB";
export const grey100 = "#F3F4F6";
export const grey200 = "#E5E7EB";
export const grey300 = "#D1D5DB";
export const grey400 = "#9CA3AF";
export const grey500 = "#6B7280";
export const grey600 = "#4B5563";
export const grey700 = "#374151";
export const grey800 = "#1F2937";
export const grey900 = "#191F28";

// TDS blue (Brand Primary)
export const blue50 = "#E8F3FF";
export const blue500 = "#3182F6";
export const blue600 = "#2573E8";
export const blue700 = "#1D5FD4";

// TDS red (Error/Critical)
export const red50 = "#FFEEEE";
export const red500 = "#FF3333";

// TDS green (Success/Live)
export const green50 = "#F0FAF6";
export const green500 = "#0CAA6E";
export const green600 = "#07956B";

// ─── Semantic Aliases (페이지에서 의미 기반으로 사용) ───────────
export const BRAND_COLOR = blue500;
export const BRAND_SOFT = blue50;

export const TEXT_STRONG = grey900;
export const TEXT_MEDIUM = grey600;
export const TEXT_WEAK = grey400;

export const SURFACE = "#FFFFFF";
export const SURFACE_ELEVATED = grey50;

export const LIVE_COLOR = green500;
export const LIVE_BG = green50;

export const BORDER_WEAK = grey200;

export const ERROR_COLOR = "#F04452"; // 프로젝트 전용 에러 컬러 (TDS red500 #FF3333과 근사)
export const ERROR_SOFT = red50;

export const SUCCESS_COLOR = green500;
export const SUCCESS_SOFT = green50;

// ─── Typography ────────────────────────────────────────────────
export const TDS_FONT_STACK =
  '"Toss Product Sans", "Tossface", "SF Pro KR", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", Roboto, "Noto Sans KR", "Noto Sans", sans-serif';

/** 기존 페이지 호환 alias */
export const KOREAN_STACK = TDS_FONT_STACK;

/**
 * TDS Typography Scale (px)
 * T1=30 T2=26 T3=22 T4=20 T5=17 T6=15(body) T7=13(caption)
 * Line height = fontSize × 1.5
 */
export const TYPO = {
  t1: { fontSize: 30, lineHeight: "40px" },
  t2: { fontSize: 26, lineHeight: "35px" },
  t3: { fontSize: 22, lineHeight: "31px" },
  t4: { fontSize: 20, lineHeight: "29px" },
  t5: { fontSize: 17, lineHeight: "25.5px" },
  t6: { fontSize: 15, lineHeight: "22.5px" },
  t7: { fontSize: 13, lineHeight: "19.5px" },
} as const;
