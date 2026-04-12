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
 * 콘솔에 콜백 URL 등록 필수 (referrer: UNLINK, WITHDRAWAL_TERMS, WITHDRAWAL_TOSS).
 *
 * 토스 앱 환경에서는 SDK의 unlink 이벤트를 감지하여 handler(로그아웃)를 실행한다.
 * 웹/개발 환경에서는 no-op.
 *
 * @returns cleanup 함수 (React useEffect 반환값으로 사용)
 */
export function registerUnlinkHandler(handler: () => void): () => void {
  let cancelled = false;

  void (async () => {
    let isToss = false;
    try {
      isToss = await isTossApp();
    } catch {
      return;
    }
    if (!isToss || cancelled) return;

    try {
      const mod = (await import("@apps-in-toss/web-framework")) as unknown as {
        appLogin?: {
          onUnlink?: (cb: () => void) => () => void;
        };
      };
      const onUnlink = mod.appLogin?.onUnlink;
      if (typeof onUnlink === "function") {
        const detach = onUnlink(handler);
        if (typeof detach === "function" && !cancelled) {
          cleanupRef = detach;
        }
      }
    } catch {
      // SDK unlink API 미지원 환경 — 무시
    }
  })();

  let cleanupRef: (() => void) | null = null;

  return () => {
    cancelled = true;
    cleanupRef?.();
  };
}
