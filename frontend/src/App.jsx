import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import NewsPage from "./pages/NewsPage";
import InjuriesPage from "./pages/InjuriesPage";
import BettingPage from "./pages/BettingPage";
import SchedulePage from "./pages/SchedulePage";
import StatsPage from "./pages/StatsPage";
import BettingTrendsPage from "./pages/BettingRecordPage";
import PredictionsPage from "./pages/PredictionsPage";
import ArticlePage from "./pages/ArticlePage";
import MatchupArchivePage from "./pages/MatchupArchivePage";
import AboutPage from "./pages/AboutPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import GameHubPage from "./pages/GameHubPage";
import PlayerPropsPage from "./pages/PlayerPropsPage";
import PlayerArchivePage from "./pages/PlayerArchivePage";
import OddsPage from "./pages/OddsPage";
export default function App() {
    return (<HelmetProvider>
      <BrowserRouter>
        <style>{`
          .knicks-main {
            margin-left: 16rem;
            padding: 0 1.5rem 0;
            padding-bottom: 0;
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
          }
          .knicks-content { flex: 1; }
          @media (max-width: 767px) {
            .knicks-main {
              margin-left: 0;
              padding: 1rem;
              padding-top: 4rem;
              padding-bottom: 0;
            }
          }
        `}</style>
        <div className="flex min-h-screen bg-knicks-dark text-white" style={{ fontFamily: "DM Sans, sans-serif", background: "#0d0d0d" }}>
          <Sidebar />
          <main className="knicks-main">
            <div className="knicks-content">
              <Routes>
                <Route path="/" element={<Dashboard />}/>
                <Route path="/news" element={<NewsPage />}/>
                <Route path="/injuries" element={<InjuriesPage />}/>
                <Route path="/betting" element={<BettingPage />}/>
                <Route path="/schedule" element={<SchedulePage />}/>
                <Route path="/stats" element={<StatsPage />}/>
                <Route path="/knicks-betting-record" element={<BettingTrendsPage />}/>
                <Route path="/predictions" element={<PredictionsPage />}/>
                <Route path="/predictions/:slug" element={<ArticlePage />}/>
                <Route path="/game/:gameSlug" element={<GameHubPage />}/>
                <Route path="/matchup/:opponent" element={<MatchupArchivePage />}/>
                <Route path="/props" element={<PlayerPropsPage />}/>
                <Route path="/props/:player" element={<PlayerArchivePage />}/>
                <Route path="/odds" element={<OddsPage />}/>
                <Route path="/about" element={<AboutPage />}/>
                <Route path="/terms" element={<TermsPage />}/>
                <Route path="/privacy" element={<PrivacyPage />}/>
              </Routes>
            </div>
          </main>
        </div>
      </BrowserRouter>
    </HelmetProvider>);
}
