import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import { HelmetProvider } from "react-helmet-async"
import Sidebar from "./components/Sidebar"
import Dashboard from "./pages/Dashboard"
import NewsPage from "./pages/NewsPage"
import InjuriesPage from "./pages/InjuriesPage"
import BettingPage from "./pages/BettingPage"
import SchedulePage from "./pages/SchedulePage"
import StatsPage from "./pages/StatsPage"
import BettingTrendsPage from "./pages/BettingRecordPage"
import PredictionsPage from "./pages/PredictionsPage"
import ArticlePage from "./pages/ArticlePage"
import MatchupArchivePage from "./pages/MatchupArchivePage"
import AboutPage from "./pages/AboutPage"
import TermsPage from "./pages/TermsPage"
import PrivacyPage from "./pages/PrivacyPage"
import GameHubPage from "./pages/GameHubPage"
import PlayerPropsPage from "./pages/PlayerPropsPage"

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <style>{`
          .knicks-main {
            margin-left: 16rem;
            padding: 1.5rem;
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
                <Route path="/"                        element={<Dashboard />} />
                <Route path="/news"                    element={<NewsPage />} />
                <Route path="/injuries"                element={<InjuriesPage />} />
                <Route path="/betting"                 element={<BettingPage />} />
                <Route path="/schedule"                element={<SchedulePage />} />
                <Route path="/stats"                   element={<StatsPage />} />
                <Route path="/knicks-betting-record"                  element={<BettingTrendsPage />} />
                <Route path="/predictions"             element={<PredictionsPage />} />
                <Route path="/predictions/:slug"       element={<ArticlePage />} />
                <Route path="/game/:gameSlug"              element={<GameHubPage />} />
                <Route path="/matchup/:opponent"       element={<MatchupArchivePage />} />
                <Route path="/props"                   element={<PlayerPropsPage />} />
                <Route path="/about"                   element={<AboutPage />} />
                <Route path="/terms"                   element={<TermsPage />} />
                <Route path="/privacy"                 element={<PrivacyPage />} />
              </Routes>
            </div>

            <footer style={{ borderTop: "1px solid #1f2937", marginTop: "3rem", padding: "1.5rem 0" }}>
              <div style={{ maxWidth: "1200px" }}>
                <div style={{ background: "#0d1117", border: "1px solid #374151", borderRadius: "0.5rem", padding: "0.75rem 1rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "1rem" }}>🎰</span>
                  <p style={{ color: "#6b7280", fontSize: "0.75rem", margin: 0, lineHeight: 1.5 }}>
                    <strong style={{ color: "#fbbf24" }}>Gamble Responsibly.</strong>{" "}
                    Sports betting is for entertainment only. Never bet more than you can afford to lose.
                    If you need help: <a href="tel:18005224700" style={{ color: "#F58426", fontWeight: 700 }}>1-800-522-4700</a> (National Problem Gambling Helpline) or{" "}
                    <a href="tel:18887897777" style={{ color: "#F58426", fontWeight: 700 }}>1-888-789-7777</a> (Connecticut). Must be 21+.
                  </p>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                  <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                    <span style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1.1rem", letterSpacing: "0.15em", color: "#F58426" }}>KNICKS</span>
                    <span style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1.1rem", letterSpacing: "0.15em", color: "#006BB6" }}>HUB</span>
                    <span style={{ color: "#374151", fontSize: "0.75rem", marginLeft: "0.5rem" }}>© 2026</span>
                  </div>
                  <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
                    {[
                      { label: "About", to: "/about" },
                      { label: "Terms", to: "/terms" },
                      { label: "Privacy", to: "/privacy" },
                    ].map(({ label, to }) => (
                      <Link key={to} to={to} style={{ color: "#4b5563", fontSize: "0.75rem", textDecoration: "none" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#F58426")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#4b5563")}
                      >{label}</Link>
                    ))}
                    <span style={{ color: "#374151", fontSize: "0.75rem" }}>Not affiliated with the NBA or New York Knicks.</span>
                    <span style={{ color: "#374151", fontSize: "0.75rem" }}>Created by <a href="https://websitesbywillie.com" target="_blank" rel="noopener noreferrer" style={{ color: "#F58426", textDecoration: "none", fontWeight: 600 }}>websitesbywillie.com</a></span>
                  </div>
                </div>
              </div>
            </footer>
          </main>
        </div>
      </BrowserRouter>
    </HelmetProvider>
  )
}