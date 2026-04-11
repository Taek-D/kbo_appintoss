import { isTossApp } from "./environment";

/**
 * appLogin() 결과 타입.
 * @see https://developers-apps-in-toss.toss.im/bedrock/reference/framework/로그인/appLogin.html
 */
export interface TossAuthResult {
  authorizationCode: string;
  referrer: "DEFAULT" | "SANDBOX";
}

/**
 * 앱인토스 로그인 SDK 래퍼 (F003).
 *
 * - 토스 환경: 실제 appLogin() 호출. isSupported() 체크 필수.
 * - 웹 환경: 개발/디버깅용 mock authCode 반환 (0.8s 지연으로 실제 UX 시뮬레이션).
 *
 * CLAUDE.md NEVER 규칙:
 * - NEVER call appLogin() on app start (반드시 Intro의 사용자 액션 후에만 호출)
 * - NEVER expose Toss OAuth tokens to client (authCode만 서버로 전달)
 */
export async function requestTossAppLogin(): Promise<TossAuthResult> {
  if (!(await isTossApp())) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      authorizationCode: `mock-auth-code-${Date.now()}`,
      referrer: "DEFAULT",
    };
  }

  const mod = (await import("@apps-in-toss/web-framework")) as unknown as {
    appLogin?: {
      (): Promise<TossAuthResult>;
      isSupported?: () => boolean;
    };
  };

  if (!mod.appLogin || mod.appLogin.isSupported?.() !== true) {
    throw new Error("appLogin SDK를 사용할 수 없는 환경입니다");
  }

  return mod.appLogin();
}

/**
 * unlink(연동 해제) 콜백 등록.
 *
 * 토스 정책: 사용자가 앱 연동을 해제하면 미니앱은 해당 유저를 logout 처리해야 한다.
 *
 * TODO(F003-followup): SDK의 정확한 unlink 이벤트 API를 확정한 뒤 활성화한다.
 *   공식 문서: https://developers-apps-in-toss.toss.im/bedrock/reference/framework/로그인/appLogin.html
 *   후보 API:
 *     - appLogin.onUnlink?.(handler)
 *     - 별도 이벤트 채널 (예: onAppLoginUnlink)
 *   확정되면 isTossApp() 분기 추가 후 실제 SDK 이벤트 리스너 등록.
 *
 * 현재 구현: 웹/개발 환경 no-op. 호출 측은 이 구조를 이미 사용하고 있으므로
 * 후속 세션에서 내부 로직만 교체하면 된다.
 *
 * @returns cleanup 함수 (React useEffect 반환값으로 사용)
 */
export function registerUnlinkHandler(handler: () => void): () => void {
  // 미래 확장을 위해 handler 참조 유지 (lint unused 회피)
  void handler;
  return () => {
    // cleanup: 리스너 제거 자리
  };
}
