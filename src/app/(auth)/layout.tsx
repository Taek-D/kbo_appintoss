/**
 * Auth 라우트 그룹 레이아웃
 * 로그인 페이지 등 인증 전 화면에 사용
 */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <>{children}</>
}
