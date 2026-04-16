/**
 * F012: 배너 광고 컴포넌트.
 *
 * 토스 앱: TossAds.attachBanner()로 실제 광고 렌더.
 * 웹 환경: mock 배너 표시 (개발 확인용).
 * 언마운트 시 destroy() 호출 필수.
 *
 * 사용법:
 *   <BannerAd adGroupId={AD_GROUP_IDS.BANNER} />
 */

import { useEffect, useRef, useState } from "react";
import { useBannerAd } from "../hooks/useBannerAd";
import { isTossApp } from "../lib/environment";
import { BORDER_WEAK, TEXT_WEAK, grey100, KOREAN_STACK } from "../lib/design-tokens";

type BannerAdProps = {
  adGroupId: string;
};

export function BannerAd({ adGroupId }: BannerAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isInitialized, attachBanner } = useBannerAd();
  const [isToss, setIsToss] = useState<boolean | null>(null);

  useEffect(() => {
    void isTossApp().then(setIsToss);
  }, []);

  useEffect(() => {
    if (!containerRef.current || isToss === null) return;

    if (!isToss) return; // 웹에서는 mock만 표시 (아래 JSX)

    if (!isInitialized) return;

    const result = attachBanner(adGroupId, containerRef.current);
    return () => {
      result?.destroy();
    };
  }, [isInitialized, isToss, adGroupId, attachBanner]);

  if (isToss === null) return null;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: 96,
        overflow: "hidden",
        borderRadius: 12,
      }}
    >
      {!isToss && (
        <div
          style={{
            width: "100%",
            height: 96,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: grey100,
            border: `1px dashed ${BORDER_WEAK}`,
            borderRadius: 12,
            fontFamily: KOREAN_STACK,
          }}
        >
          <p style={{ fontSize: 12, color: TEXT_WEAK }}>
            광고 영역 (토스 앱에서 표시)
          </p>
        </div>
      )}
    </div>
  );
}
