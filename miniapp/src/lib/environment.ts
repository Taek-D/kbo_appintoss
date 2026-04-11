/**
 * 앱인토스 미니앱 런타임 환경 감지.
 *
 * CLAUDE.md의 SDK Safety Pattern을 준수:
 * - Static import 금지 (웹 환경 크래시 위험 + 심사 반려)
 * - Dynamic import + try/catch로만 SDK에 접근
 *
 * 감지 결과는 세션 동안 1회만 수행하고 캐시한다.
 */

export type AppEnvironment = "web" | "toss" | "sandbox";

let cached: AppEnvironment | null = null;
let pending: Promise<AppEnvironment> | null = null;

async function detect(): Promise<AppEnvironment> {
  try {
    const mod = (await import("@apps-in-toss/web-framework")) as unknown as {
      getOperationalEnvironment?: () => string;
    };
    const env = mod.getOperationalEnvironment?.();
    if (env === "toss" || env === "sandbox") return env;
    return "web";
  } catch {
    return "web";
  }
}

/**
 * 현재 앱 환경을 반환한다. 첫 호출 시에만 감지를 수행하고,
 * 이후 호출은 캐시된 값을 즉시 반환한다.
 */
export async function getEnvironment(): Promise<AppEnvironment> {
  if (cached !== null) return cached;
  if (!pending) {
    pending = detect().then((env) => {
      cached = env;
      return env;
    });
  }
  return pending;
}

/**
 * 토스 앱 (또는 샌드박스) 환경 여부.
 * 브라우저 웹 환경에서는 false — mock 동작을 사용해야 한다.
 */
export async function isTossApp(): Promise<boolean> {
  const env = await getEnvironment();
  return env !== "web";
}
