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

function isOriginAllowed(origin: string | null): origin is string {
  return origin !== null && ALLOWED_ORIGINS.has(origin)
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin')

  // Preflight (CORS OPTIONS): 실제 핸들러를 거치지 않고 바로 응답
  if (request.method === 'OPTIONS') {
    if (!isOriginAllowed(origin)) {
      return new NextResponse(null, { status: 403 })
    }
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': ALLOWED_METHODS,
        'Access-Control-Allow-Headers': ALLOWED_HEADERS,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      },
    })
  }

  // 일반 요청: 라우트 핸들러 실행 + 응답에 CORS 헤더 덧붙이기
  const response = NextResponse.next()

  if (isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.append('Vary', 'Origin')
  }

  return response
}

export const config = {
  // /api/* 만 대상 — 정적 자산/페이지는 제외
  matcher: '/api/:path*',
}
