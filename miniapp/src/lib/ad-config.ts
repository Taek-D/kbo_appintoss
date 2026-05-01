/**
 * F012: 광고 설정 상수.
 *
 * 개발 환경에서는 테스트 AD Group ID를 사용하고,
 * 운영 환경(production build)에서는 앱인토스 콘솔에서 발급받은 실제 ID를 사용한다.
 */

export const AD_GROUP_IDS = {
  BANNER: import.meta.env.DEV
    ? "ait-ad-test-banner-id"
    : "ait.v2.live.2cd5923dde384ef9",
  INTERSTITIAL: import.meta.env.DEV
    ? "ait-ad-test-interstitial-id"
    : "ait.v2.live.b0df474e0594482e",
} as const;

export const AD_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE_MS: 1000,
  LOAD_TIMEOUT_MS: 15_000,
} as const;

export function getBackoffDelay(attempt: number): number {
  return AD_CONFIG.RETRY_DELAY_BASE_MS * 2 ** attempt;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
