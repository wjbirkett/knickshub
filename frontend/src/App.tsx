import { BrowserRouter, Routes, Route } from "react-router-dom"
import Sidebar from "./components/Sidebar"
import Dashboard from "./pages/Dashboard"
import NewsPage from "./pages/NewsPage"
import InjuriesPage from "./pages/InjuriesPage"
import BettingPage from "./pages/BettingPage"
import SchedulePage from "./pages/SchedulePage"
import StatsPage from "./pages/StatsPage"
import TweetsPage from "./pages/TweetsPage"
import PredictionsPage from "./pages/PredictionsPage"
import ArticlePage from "./pages/ArticlePage"

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-knicks-dark text-white" style={{fontFamily: "DM Sans, sans-serif"}}>
        <Sidebar />
        <main style={{marginLeft:"16rem",padding:"1.5rem",flex:1}}>
          <Routes>
            <Route path="/"         element={<Dashboard />} />
            <Route path="/news"     element={<NewsPage />} />
            <Route path="/injuries" element={<InjuriesPage />} />
            <Route path="/betting"  element={<BettingPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/stats"    element={<StatsPage />} />
            <Route path="/tweets"   element={<TweetsPage />} />
<Route path="/predictions" element={<PredictionsPage />} />
<Route path="/predictions/:slug" element={<ArticlePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
