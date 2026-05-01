import { TDSMobileAITProvider } from "@toss/tds-mobile-ait";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Intro from "./pages/Intro";
import Home from "./pages/Home";
import GameDetail from "./pages/GameDetail";
import NotFound from "./pages/NotFound";
import TeamSelect from "./pages/TeamSelect";
import Settings from "./pages/Settings";
import { useSettingsAccessory } from "./hooks/useSettingsAccessory";

const queryClient = new QueryClient();

/**
 * NavigationBar 우상단 accessory button(설정 ⚙) 등록 + 클릭 → /settings 라우팅.
 * BrowserRouter 자식이어야 useNavigate가 동작하므로 별도 컴포넌트로 분리.
 * 모든 라우트에서 동일하게 살아 있다.
 */
function NavBarRouter() {
  useSettingsAccessory();
  return null;
}

const App = () => (
  <TDSMobileAITProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <NavBarRouter />
        <Routes>
          {/* 인트로/랜딩 — 앱 시작 직후 로그인 금지 규칙 때문에 루트는 반드시 Intro */}
          <Route path="/" element={<Intro />} />
          <Route path="/team-select" element={<TeamSelect />} />
          {/* F005: 메인 경기 리스트 화면 (Index 템플릿 → Home으로 교체) */}
          <Route path="/home" element={<Home />} />
          {/* 설정 페이지 — NavBar ⚙ 진입점, 응원팀 변경 + 알림 토글 */}
          <Route path="/settings" element={<Settings />} />
          {/* F005: 경기 상세 라우트 placeholder — F006에서 본 구현 예정 */}
          <Route path="/game/:id" element={<GameDetail />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </TDSMobileAITProvider>
);

export default App;
