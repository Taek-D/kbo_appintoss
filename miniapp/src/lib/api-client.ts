/**
 * kbo_game Next.js 백엔드 API 호출 래퍼 (F003).
 *
 * - base URL은 VITE_API_BASE_URL 환경변수 (없으면 현재 origin — same-origin 배포 대응)
 * - credentials: "include" — httpOnly session 쿠키 자동 전달
 * - JSON 직렬화 + 표준 에러 응답 처리
 *
 * F008에서 확장 예정:
 * - 자동 재시도 / 타임아웃
 * - React Query queryClient 통합
 * - 오프라인 큐
 */

const BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function extractErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as { error: unknown }).error;
    if (typeof err === "string" && err.length > 0) return err;
  }
  return `API 오류 (HTTP ${status})`;
}

/**
 * JSON API 호출. 실패 시 ApiError를 throw한다.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  const body: unknown = text.length > 0 ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, extractErrorMessage(body, res.status));
  }

  return body as T;
}
