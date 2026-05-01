import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isTossApp } from "../lib/environment";

/**
 * NavigationBar 우상단 accessory button(설정 ⚙)을 등록하고
 * 클릭 시 /settings 라우트로 이동시키는 훅.
 *
 * 심사 규칙(CLAUDE.md):
 *  - NEVER: colored navigation accessory icon → 모노톤 `icon-setting-mono`만 사용
 *  - NEVER: >1 accessory button → id="settings" 1개만 등록
 *  - ALWAYS: dynamic import + isSupported 가드 (web 환경에서는 noop)
 *
 * 사용:
 *   App 루트(BrowserRouter 자식)에서 1회 호출. 페이지 전환과 무관하게
 *   살아 있어야 하므로 NavBarRouter 같은 빈 컴포넌트로 감싸 둔다.
 *
 * 근거 패턴:
 *   apps-in-toss-examples-robin/with-navigation-bar/src/hooks/useNavigationBar.ts
 */
const ACCESSORY_ID = "settings";

export function useSettingsAccessory(): void {
  const navigate = useNavigate();

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        if (!(await isTossApp())) return;

        const mod = (await import("@apps-in-toss/web-framework")) as unknown as {
          partner?: {
            addAccessoryButton: (b: {
              id: string;
              title: string;
              icon: { name: string };
            }) => void;
          };
          tdsEvent?: {
            addEventListener: (
              ev: string,
              handler: { onEvent: (data: { id: string }) => void },
            ) => () => void;
          };
        };

        if (cancelled) return;

        // 모노톤 아이콘 강제 — 컬러 아이콘은 심사 반려 사유
        mod.partner?.addAccessoryButton({
          id: ACCESSORY_ID,
          title: "설정",
          icon: { name: "icon-setting-mono" },
        });

        const detach = mod.tdsEvent?.addEventListener(
          "navigationAccessoryEvent",
          {
            onEvent: ({ id }) => {
              if (id === ACCESSORY_ID) navigate("/settings");
            },
          },
        );

        if (typeof detach === "function" && !cancelled) {
          cleanup = detach;
        }
      } catch {
        // SDK 미지원 / native 미주입 — 조용히 무시
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [navigate]);
}
