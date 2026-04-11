import { useNavigate } from "react-router-dom";

/**
 * F002: 인트로/랜딩 화면 (harness-init 스켈레톤).
 *
 * 심사 규칙: appLogin()을 앱 시작 직후 호출하면 반려된다.
 * 반드시 이 화면이 먼저 보이고, 사용자가 "시작하기"를 눌러야 로그인으로 진입한다.
 *
 * TODO(F003): handleStart에서 동적 import로 appLogin 호출 및 JWT 교환.
 */
export default function Intro() {
  const navigate = useNavigate();

  const handleStart = () => {
    // TODO(F003): const { appLogin } = await import('@apps-in-toss/web-framework');
    //             if (appLogin.isSupported()) { ... } else { /* mock */ }
    navigate("/home");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-6 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">KBO 야구 알리미</h1>
        <p className="mt-3 text-base text-muted-foreground">
          응원팀 경기가 끝나면 즉시 알려드립니다.
        </p>
      </div>
      <button
        type="button"
        onClick={handleStart}
        className="rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        시작하기
      </button>
    </main>
  );
}
