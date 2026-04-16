/**
 * kbo_game Next.js 백엔드 API 호출 래퍼 (F003 + F008).
 *
 * - base URL은 VITE_API_BASE_URL 환경변수 (없으면 현재 origin — same-origin 배포 대응)
 * - 토스 WebView: Authorization Bearer 토큰 기반 (쿠키 사용 불가)
 * - 웹 개발: credentials "include" 없이도 동작 (게스트 모드 fallback)
 * - JSON 직렬화 + 표준 에러 응답 처리
 * - F008: 네트워크 오류, 비-JSON 응답 방어
 */

const BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

/** 인메모리 인증 토큰 (로그인 성공 시 서버에서 발급) */
let _authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  _authToken = token;
}

export function getAuthToken(): string | null {
  return _authToken;
}

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * 네트워크/DNS 실패 등 fetch 자체가 throw한 경우.
 * status=0은 "HTTP 응답 수신 실패"의 관례적 표현.
 */
function toNetworkError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  const message =
    err instanceof Error && err.message.length > 0
      ? err.message
      : "네트워크 연결에 실패했어요";
  return new ApiError(0, message);
}

function safeParseJson(text: string): unknown {
  if (text.length === 0) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null; // 비-JSON 응답(HTML 에러 페이지 등) 방어
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
 *
 * @throws ApiError(status=0)  네트워크 실패, CORS 차단, DNS 오류 등
 * @throws ApiError(status>=400) 서버가 반환한 HTTP 에러
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (_authToken) {
    headers["Authorization"] = `Bearer ${_authToken}`;
  }
  // init.headers가 있으면 병합 (호출부에서 추가 헤더 지정 가능)
  if (init?.headers) {
    Object.assign(headers, init.headers);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers,
    });
  } catch (err) {
    throw toNetworkError(err);
  }

  const text = await res.text();
  const body = safeParseJson(text);

  if (!res.ok) {
    throw new ApiError(res.status, extractErrorMessage(body, res.status));
  }

  return body as T;
}
