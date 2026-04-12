/**
 * F007: 경기 결과 공유.
 *
 * 심사 규칙(NEVER/ALWAYS):
 *   - NEVER: 자사 웹사이트 링크로 공유 ❌ → 토스 딥링크(intoss://)만 사용
 *   - NEVER: 앱 설치 유도 문구 ❌ → 본문에 "설치/다운로드/앱" 같은 유도 표현 금지
 *   - NEVER: Static import ❌ → @apps-in-toss/web-framework는 dynamic import만
 *   - ALWAYS: 공유 결과 화면이 정상 렌더 → 실패 시 인라인 상태로 피드백
 *
 * 환경별 동작 (계단식 fallback):
 *   1) 토스 앱(또는 샌드박스):
 *      getTossShareLink('intoss://game/{id}')로 공유 URL 획득 →
 *      Web Share API 시도 → 실패 시 clipboard 복사
 *   2) 웹(미리보기 / 개발):
 *      getTossShareLink 미지원 → mock URL 생성 →
 *      Web Share API 시도 → 실패 시 clipboard 복사
 *
 * 공유 URL은 앱인토스 딥링크 스킴(intoss://game/{id})이며,
 * 자사 도메인으로 리다이렉트하지 않는다. 딥링크를 클릭한 사용자는
 * 토스 앱 안에서 다시 본 미니앱의 /game/:id 경로로 진입한다.
 */

import { isTossApp } from "./environment";
import { findTeamByRawCode, formatGameDate, type Game } from "./games";

const APP_NAME = "KBO 야구 알리미";
const DEEP_LINK_PREFIX = "intoss://";
const MOCK_BASE_URL = "https://toss.im/app/mock";

/** 공유 실행 결과. UI가 이 값으로 인라인 피드백을 분기한다. */
export type ShareOutcome =
  | { type: "shared"; via: "native" }
  | { type: "copied" }
  | { type: "cancelled" }
  | { type: "unsupported" };

export type GameSharePayload = {
  /** OS 공유창 / 미리보기에 표시되는 제목. 앱 이름은 브랜딩 통일 규칙에 맞춰 포함. */
  title: string;
  /** 본문 텍스트 — 경기 스코어 또는 상태 안내. 앱 유도 문구 금지. */
  text: string;
  /** 공유 링크의 경로 부분(선행 슬래시 포함). 예: "/game/abc-123" */
  path: string;
};

/**
 * 경기 정보를 공유 문구로 변환한다.
 *
 * 상태별 본문 템플릿:
 *   - finished : "KIA 10 : 7 한화 (4월 12일 토) · KBO 야구 알리미"
 *   - cancelled: "KIA vs 한화 경기가 취소됐어요 (4월 12일 토) · KBO 야구 알리미"
 *   - playing  : "KIA vs 한화 경기 중 (4월 12일 토) · KBO 야구 알리미"
 *   - scheduled: "KIA vs 한화 (4월 12일 토) · KBO 야구 알리미"
 *
 * 주의: "앱 설치/다운로드/혜택" 등의 유도 문구는 절대 포함하지 않는다.
 * 앱 이름은 브랜딩 통일을 위한 꼬리표로만 쓰인다.
 */
export function buildGameSharePayload(game: Game): GameSharePayload {
  const awayTeam = findTeamByRawCode(game.away_team);
  const homeTeam = findTeamByRawCode(game.home_team);
  const awayLabel = awayTeam === null ? game.away_team : awayTeam.shortName;
  const homeLabel = homeTeam === null ? game.home_team : homeTeam.shortName;
  const dateLabel = formatGameDate(game.game_date);

  let text: string;
  switch (game.status) {
    case "finished":
      text = `${awayLabel} ${game.away_score} : ${game.home_score} ${homeLabel} (${dateLabel}) · ${APP_NAME}`;
      break;
    case "cancelled":
      text = `${awayLabel} vs ${homeLabel} 경기가 취소됐어요 (${dateLabel}) · ${APP_NAME}`;
      break;
    case "playing":
      text = `${awayLabel} vs ${homeLabel} 경기 중 (${dateLabel}) · ${APP_NAME}`;
      break;
    case "scheduled":
    default:
      text = `${awayLabel} vs ${homeLabel} (${dateLabel}) · ${APP_NAME}`;
      break;
  }

  return {
    title: `경기 결과 · ${APP_NAME}`,
    text,
    path: `/game/${game.id}`,
  };
}

/**
 * 주어진 경기 정보를 공유한다. 환경에 따라 토스 딥링크 또는 mock URL을 만들고,
 * Web Share API → clipboard 순으로 시도한다.
 *
 * 에러 처리:
 *   - 사용자가 OS 공유창을 닫으면 Web Share API가 AbortError를 던진다 → "cancelled"
 *   - Web Share도 clipboard도 없으면 "unsupported"
 *   - SDK 호출 자체가 실패하면 예외 대신 mock URL로 degrade
 */
export async function shareGame(game: Game): Promise<ShareOutcome> {
  const payload = buildGameSharePayload(game);
  const shareUrl = await resolveShareUrl(payload.path);
  return executeShare(payload, shareUrl);
}

/**
 * 환경별 공유 URL 해석. 절대 예외를 던지지 않는다.
 * 토스 환경에서 getTossShareLink가 실패해도 mock URL로 graceful fallback.
 */
async function resolveShareUrl(path: string): Promise<string> {
  const mockUrl = `${MOCK_BASE_URL}${path}`;

  let isToss = false;
  try {
    isToss = await isTossApp();
  } catch {
    return mockUrl;
  }

  if (!isToss) return mockUrl;

  try {
    const mod = (await import("@apps-in-toss/web-framework")) as unknown as {
      getTossShareLink?: (url: string, ogImageUrl?: string) => Promise<string>;
    };
    const getTossShareLink = mod.getTossShareLink;
    if (typeof getTossShareLink !== "function") return mockUrl;

    const deepLink = `${DEEP_LINK_PREFIX}${path.startsWith("/") ? path.slice(1) : path}`;
    const result = await getTossShareLink(deepLink);
    if (typeof result === "string" && result.length > 0) return result;
    return mockUrl;
  } catch {
    return mockUrl;
  }
}

/**
 * Web Share API → clipboard 순서로 공유 실행.
 * 사용자 취소(AbortError)는 에러가 아니라 "cancelled"로 구분한다.
 */
async function executeShare(
  payload: GameSharePayload,
  url: string,
): Promise<ShareOutcome> {
  // 1) Web Share API
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url,
      });
      return { type: "shared", via: "native" };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { type: "cancelled" };
      }
      // permission denied 등 기타 에러는 clipboard fallback으로 진행
    }
  }

  // 2) Clipboard fallback
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard !== "undefined" &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(`${payload.text}\n${url}`);
      return { type: "copied" };
    } catch {
      // clipboard도 실패 → unsupported
    }
  }

  return { type: "unsupported" };
}
