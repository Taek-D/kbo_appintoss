/**
 * F012: 배너 광고 훅.
 *
 * TossAds.initialize() → TossAds.attachBanner() 순서로 호출.
 * SDK는 dynamic import만 사용 (static import 금지 — 심사 반려).
 * 웹 환경에서는 mock 모드로 동작.
 *
 * @see .claude/skills/appintoss-banner-ad/
 * @see apps-in-toss-examples-robin/with-banner-ad/
 */

import { useCallback, useEffect, useState } from "react";
import { isTossApp } from "../lib/environment";

type AttachBannerResult = { destroy: () => void } | undefined;

let _initialized = false;
let _initializing = false;
let _tossAds: {
  initialize: {
    (opts: { callbacks: { onInitialized: () => void; onInitializationFailed?: (e: unknown) => void } }): void;
    isSupported: () => boolean;
  };
  attachBanner: (
    adGroupId: string,
    element: HTMLElement,
    options?: Record<string, unknown>,
  ) => { destroy: () => void };
} | null = null;

export function useBannerAd() {
  const [isInitialized, setIsInitialized] = useState(_initialized);

  useEffect(() => {
    if (_initialized) {
      setIsInitialized(true);
      return;
    }
    if (_initializing) return;

    void (async () => {
      const isToss = await isTossApp();
      if (!isToss || _initialized || _initializing) return;

      try {
        const mod = await import("@apps-in-toss/web-framework");
        _tossAds = (mod as unknown as { TossAds: typeof _tossAds }).TossAds;
        if (!_tossAds || typeof _tossAds.initialize?.isSupported !== "function") return;
        if (!_tossAds.initialize.isSupported()) return;
      } catch {
        return;
      }

      _initializing = true;
      _tossAds!.initialize({
        callbacks: {
          onInitialized: () => {
            _initialized = true;
            _initializing = false;
            setIsInitialized(true);
          },
          onInitializationFailed: () => {
            _initializing = false;
          },
        },
      });
    })();
  }, []);

  const attachBanner = useCallback(
    (adGroupId: string, element: HTMLElement): AttachBannerResult => {
      if (!isInitialized || !_tossAds) return undefined;
      return _tossAds.attachBanner(adGroupId, element);
    },
    [isInitialized],
  );

  return { isInitialized, attachBanner };
}
