/**
 * F012: 전면 광고 훅.
 *
 * loadFullScreenAd() → loaded → showFullScreenAd() → dismissed 순서.
 * SDK는 dynamic import만 사용. 웹 환경에서는 mock.
 * 지수 백오프 재시도 (1s, 2s, 4s / 최대 3회).
 *
 * @see apps-in-toss-examples-robin/with-interstitial-ad/
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { isTossApp } from "../lib/environment";
import { AD_CONFIG, AD_GROUP_IDS, delay, getBackoffDelay } from "../lib/ad-config";

type LoadFn = {
  (p: {
    options: { adGroupId: string };
    onEvent: (e: { type: "loaded" }) => void;
    onError: (e: unknown) => void;
  }): () => void;
  isSupported: () => boolean;
};

type ShowEvent =
  | { type: "requested" }
  | { type: "show" }
  | { type: "impression" }
  | { type: "clicked" }
  | { type: "dismissed" }
  | { type: "failedToShow" };

type ShowFn = {
  (p: {
    options: { adGroupId: string };
    onEvent: (e: ShowEvent) => void;
    onError: (e: unknown) => void;
  }): () => void;
  isSupported: () => boolean;
};

let _loadFn: LoadFn | null = null;
let _showFn: ShowFn | null = null;

export type InterstitialCallbacks = {
  onCompleted?: () => void;
  onError?: (error: Error) => void;
};

export function useInterstitialAd(adGroupId?: string) {
  const groupId = adGroupId ?? AD_GROUP_IDS.INTERSTITIAL;
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const loadCleanupRef = useRef<(() => void) | undefined>(undefined);
  const showCleanupRef = useRef<(() => void) | undefined>(undefined);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const callbacksRef = useRef<InterstitialCallbacks>({});

  const checkSupport = useCallback(async (): Promise<boolean> => {
    const isToss = await isTossApp();
    if (!isToss) return false;
    try {
      if (!_loadFn || !_showFn) {
        const sdk = await import("@apps-in-toss/web-framework");
        _loadFn = (sdk as unknown as { loadFullScreenAd: LoadFn }).loadFullScreenAd;
        _showFn = (sdk as unknown as { showFullScreenAd: ShowFn }).showFullScreenAd;
      }
      return !!_loadFn && !!_showFn && _loadFn.isSupported() && _showFn.isSupported();
    } catch {
      return false;
    }
  }, []);

  const loadAd = useCallback(
    async (retryAttempt = 0) => {
      setLoading(true);
      setIsReady(false);
      const supported = await checkSupport();

      if (!supported) {
        if (import.meta.env.DEV) {
          await delay(800);
          setLoading(false);
          setIsReady(true);
          return;
        }
        setLoading(false);
        return;
      }

      loadCleanupRef.current?.();
      clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        setLoading(false);
      }, AD_CONFIG.LOAD_TIMEOUT_MS);

      const cleanup = _loadFn!({
        options: { adGroupId: groupId },
        onEvent: (event) => {
          if (event.type === "loaded") {
            clearTimeout(timeoutRef.current);
            setLoading(false);
            setIsReady(true);
          }
        },
        onError: async (error) => {
          clearTimeout(timeoutRef.current);
          if (retryAttempt < AD_CONFIG.MAX_RETRIES - 1) {
            await delay(getBackoffDelay(retryAttempt));
            loadAd(retryAttempt + 1);
          } else {
            setLoading(false);
            callbacksRef.current.onError?.(new Error(String(error)));
          }
        },
      });
      loadCleanupRef.current = cleanup;
    },
    [checkSupport, groupId],
  );

  useEffect(() => {
    void loadAd();
    return () => {
      loadCleanupRef.current?.();
      showCleanupRef.current?.();
      clearTimeout(timeoutRef.current);
    };
  }, [loadAd]);

  const showAd = useCallback(
    async (callbacks: InterstitialCallbacks): Promise<boolean> => {
      if (loading || !isReady) return false;

      callbacksRef.current = callbacks;
      const supported = await checkSupport();

      if (!supported) {
        if (import.meta.env.DEV) {
          setIsReady(false);
          setTimeout(() => {
            callbacksRef.current.onCompleted?.();
            void loadAd();
          }, 1500);
          return true;
        }
        return false;
      }

      setIsReady(false);
      const cleanup = _showFn!({
        options: { adGroupId: groupId },
        onEvent: (event) => {
          switch (event.type) {
            case "dismissed":
              callbacksRef.current.onCompleted?.();
              void loadAd();
              break;
            case "failedToShow":
              callbacksRef.current.onError?.(new Error("광고 표시 실패"));
              void loadAd();
              break;
          }
        },
        onError: (error) => {
          callbacksRef.current.onError?.(new Error(String(error)));
          void loadAd();
        },
      });
      showCleanupRef.current = cleanup;
      return true;
    },
    [loading, isReady, checkSupport, groupId, loadAd],
  );

  return { loading, isReady, showAd };
}
