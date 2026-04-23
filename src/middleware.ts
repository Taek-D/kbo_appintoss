/**
 * Next.js middleware — CORS 처리 (F008).
 *
 * miniapp(Vite dev server, 별도 origin)이 /api/* 엔드포인트를 호출할 수 있도록
 * 화이트리스트 기반 CORS를 허용한다. credentials: 'include' 기반이므로
 * Access-Control-Allow-Origin에 와일드카드('*')는 사용할 수 없다 — 반드시 구체적 origin.
 *
 * 허용 origin은 환경변수 ALLOWED_ORIGINS (콤마 구분) + 개발용 기본값으로 구성한다.
 * 프로덕션에서는 Vercel 환경변수 ALLOWED_ORIGINS에 실제 miniapp 도메인을 주입한다.
 */

import { NextRequest, NextResponse } from 'next/server'

const DEV_ORIGINS = [
  'http://localhost:8080', // miniapp Vite dev — vite.config.ts의 server.port
  'http://localhost:5173', // Vite dev server 기본 포트(다른 설정 호환)
  'http://localhost:4173', // Vite preview 기본 포트
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
]

function buildAllowedOrigins(): ReadonlySet<string> {
  const fromEnv = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  return new Set<string>([...DEV_ORIGINS, ...fromEnv])
}

const ALLOWED_ORIGINS = buildAllowedOrigins()
const ALLOWED_METHODS = 'GET,POST,PUT,DELETE,OPTIONS'
const ALLOWED_HEADERS = 'Content-Type, Authorization'

/**
 * origin 허용 여부 판단.
 * - origin 헤더 자체가 없음 → same-origin 또는 non-browser
 * - origin === "null" → 토스 앱 WebView 로컬 .ait 번들
 * - 그 외 모든 origin → 허용 (Bearer 토큰으로 보호되므로 CORS 자체는 넓게 허용)
 *
 * credentials는 명시 whitelist에 있는 origin(=웹 개발 localhost)에만 true,
 * 그 외(토스 WebView, 모바일 WebView 등)는 false로 내려 쿠키 정책 간섭을 제거한다.
 */
function resolveAllowedOrigin(origin: string | null): string | null {
  if (origin === null) return null           // origin 헤더 없음 → same-origin, CORS 불필요
  if (origin === 'null') return 'null'       // 토스 WebView 로컬 번들 → Access-Control-Allow-Origin: null
  return origin                               // 그 외 echo (credentials는 화이트리스트에서만 true)
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin')
  const allowed = resolveAllowedOrigin(origin)

  // credentials=true는 명시 whitelist에 등록된 origin(=웹 개발 localhost)에만 허용한다.
  // 토스 WebView(origin:null) / 외부 모바일 WebView(echo origin) 에는 쿠키 없으므로 끈다 —
  // 이러면 WebKit의 Allow-Credentials+쿠키 간섭이 원천 차단된다.
  const useCredentials =
    allowed !== null && allowed !== 'null' && ALLOWED_ORIGINS.has(allowed)

  // Preflight (CORS OPTIONS)
  if (request.method === 'OPTIONS') {
    if (allowed === null) {
      return new NextResponse(null, { status: 403 })
    }
    const preflightHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': allowed,
      'Access-Control-Allow-Methods': ALLOWED_METHODS,
      'Access-Control-Allow-Headers': ALLOWED_HEADERS,
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    }
    if (useCredentials) {
      preflightHeaders['Access-Control-Allow-Credentials'] = 'true'
    }
    return new NextResponse(null, { status: 204, headers: preflightHeaders })
  }

  // 일반 요청: 라우트 핸들러 실행 + 응답에 CORS 헤더 덧붙이기
  const response = NextResponse.next()

  if (allowed !== null) {
    response.headers.set('Access-Control-Allow-Origin', allowed)
    if (useCredentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }
    response.headers.append('Vary', 'Origin')
  }

  return response
}

export const config = {
  // /api/* 만 대상 — 정적 자산/페이지는 제외
  matcher: '/api/:path*',
}
