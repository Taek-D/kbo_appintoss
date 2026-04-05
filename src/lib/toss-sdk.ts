/**
 * 토스 미니앱 SDK 래퍼
 * - 토스 WebView 내에서만 동작하는 appLogin()을 안전하게 호출
 * - 개발 환경에서는 mock 응답 반환
 */

type AppLoginResult = {
  authorizationCode: string
  referrer: string
}

/**
 * 토스 앱 로그인 호출
 * 프로덕션: window.__TOSS_APP__ 글로벌 SDK 사용
 * 개발 환경: mock authCode 반환
 */
export async function callAppLogin(): Promise<AppLoginResult> {
  if (process.env.NODE_ENV === 'development') {
    // 개발 환경: mock authCode (토스 WebView 외부에서 테스트 불가)
    return {
      authorizationCode: 'dev-mock-auth-code',
      referrer: 'sandbox',
    }
  }

  // 프로덕션: 토스 WebView 글로벌 SDK
  const tossApp = (
    window as unknown as {
      TossApp?: {
        appLogin: () => Promise<AppLoginResult>
      }
    }
  ).TossApp

  if (!tossApp) {
    throw new Error('토스 앱에서만 이용할 수 있습니다')
  }

  return tossApp.appLogin()
}
