import { useQuery } from "@tanstack/react-query"
import { getNews, getInjuries, getBirthdays, getSchedule, getStandings, getArticles, getResults } from "../utils/api"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"

const ARTICLE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  prediction: { bg: "#0c1a4b", color: "#93c5fd", label: "PREDICTION" },
  best_bet:   { bg: "#14532d", color: "#86efac", label: "BEST BET" },
  prop:       { bg: "#4a1d1d", color: "#fca5a5", label: "PROP BET" },
  history:    { bg: "#2e1a4b", color: "#d8b4fe", label: "HISTORY" },
}

export default function Dashboard() {
  const { data: news }      = useQuery({ queryKey: ["news"],      queryFn: () => getNews(undefined) })
  const { data: injuries }  = useQuery({ queryKey: ["injuries"],  queryFn: getInjuries })
  const { data: birthdays } = useQuery({ queryKey: ["birthdays"], queryFn: getBirthdays })
  const { data: games }     = useQuery({ queryKey: ["schedule"],  queryFn: getSchedule })
  const { data: standings } = useQuery({ queryKey: ["standings"], queryFn: getStandings })
  const { data: articles }  = useQuery({ queryKey: ["articles"],  queryFn: () => getArticles(6) })

  const today = new Date().toISOString().slice(0, 10)
  const nextGame = (games ?? []).find((g: any) => g.game_date >= today && g.status !== "Final")
  const lastGame = (games ?? []).filter((g: any) => g.status === "Final").slice(-1)[0]
  const knicks   = (standings ?? []).find((t: any) => t.team_name.includes("Knicks"))

  const knicksWon = (g: any) =>
    (g.home_team.includes("Knicks") && g.home_score > g.away_score) ||
    (g.away_team.includes("Knicks") && g.away_score > g.home_score)

  const finishedGames = (games ?? []).filter((g: any) => g.status === "Final").slice().reverse()
  let streak = "—"
  if (finishedGames.length > 0) {
    const first = knicksWon(finishedGames[0])
    let count = 0
    for (const g of finishedGames) { if (knicksWon(g) === first) count++; else break }
    streak = `${first ? "W" : "L"}${count}`
  }

  const { data: resultsData } = useQuery({ queryKey: ["results"], queryFn: getResults })
  const predictions = resultsData?.predictions ?? []
  const propResults = resultsData?.props ?? []
  const uniquePreds = predictions.filter((p, i, arr) => arr.findIndex((x) => x.game_date === p.game_date) === i)
  const spreadHits = uniquePreds.filter((p: any) => p.spread_result === "HIT").length
  const spreadTotal = uniquePreds.filter((p: any) => p.spread_result).length
  const totalHits = uniquePreds.filter((p: any) => p.total_result === "HIT").length
  const totalTotal = uniquePreds.filter((p: any) => p.total_result).length
  const propHits = propResults.filter((p: any) => p.result === "HIT").length
  const propTotal = propResults.length
  const todayArticles = (articles ?? []).filter((a: any) => a.game_date === today)
  const todayBestBet = todayArticles.find((a: any) => a.article_type === "best_bet")
  const todayPrediction = todayArticles.find((a: any) => a.article_type === "prediction")
  const todayHub = todayPrediction ? (() => { const opp = todayPrediction.home_team?.includes("Knicks") ? todayPrediction.away_team : todayPrediction.home_team; const s = opp?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") ?? "unknown"; return "knicks-vs-" + s + "-" + today })() : null
  const recentArticles = (articles ?? []).slice(0, 3)
  const sectionTitle = recentArticles.length > 0 && recentArticles[0]?.article_type === "history"
    ? "THIS DAY IN KNICKS HISTORY"
    : "LATEST PREDICTIONS"

  return (
    <div style={{ maxWidth: "1200px" }}>
      <style>{`
        .db-header { margin-bottom: 1.5rem; }
        .db-title  { font-family: "Bebas Neue, sans-serif"; font-size: 3rem; letter-spacing: 0.15em; color: #F58426; margin: 0; padding-left: 0; }
        .db-record { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; }
        .db-games  { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
        .db-main   { display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem; align-items: start; }
        @media (max-width: 767px) {
          .db-title  { padding-left: 3rem; font-size: 2.2rem; }
          .db-record { grid-template-columns: repeat(3, 1fr); }
          .db-games  { grid-template-columns: 1fr; }
          .db-main   { grid-template-columns: 1fr; }
        }
      `}</style>

      {(todayBestBet || spreadTotal > 0) && (
        <div style={{ background: "linear-gradient(135deg, #0d1117 0%, #1a0a00 100%)", border: "1px solid #F58426", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "0.9rem", letterSpacing: "0.15em", color: "#F58426", margin: "0 0 0.4rem" }}>FIRE AI BEST BET TONIGHT</p>
              {todayBestBet ? (
                <>
                  <p style={{ color: "#f9fafb", fontWeight: 700, fontSize: "1rem", margin: "0 0 0.5rem", lineHeight: 1.4 }}>{todayBestBet.title}</p>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {todayHub && <a href={"/game/" + todayHub} style={{ fontSize: "0.75rem", fontWeight: 700, color: "#F58426", border: "1px solid #F58426", borderRadius: "999px", padding: "0.2rem 0.6rem", textDecoration: "none" }}>View Game Hub</a>}
                    <a href={"/predictions/" + todayBestBet.slug} style={{ fontSize: "0.75rem", fontWeight: 700, color: "#9ca3af", border: "1px solid #374151", borderRadius: "999px", padding: "0.2rem 0.6rem", textDecoration: "none" }}>Full Analysis</a>
                  </div>
                </>
              ) : (
                <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: 0 }}>AI picks drop 45 min before tip-off</p>
              )}
            </div>
            {spreadTotal > 0 && (
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                {[
                  { label: "ATS", hits: spreadHits, total: spreadTotal },
                  { label: "O/U", hits: totalHits, total: totalTotal },
                  { label: "Props", hits: propHits, total: propTotal },
                ].map(r => {
                  const pct = r.total > 0 ? Math.round((r.hits / r.total) * 100) : 0
                  const color = pct >= 60 ? "#4ade80" : pct >= 50 ? "#fbbf24" : "#f87171"
                  return (
                    <div key={r.label} style={{ textAlign: "center", minWidth: "52px" }}>
                      <p style={{ color: "#6b7280", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.2rem" }}>{r.label}</p>
                      <p style={{ color, fontSize: "1rem", fontWeight: 700, margin: 0 }}>{r.hits}-{r.total - r.hits}</p>
                      <p style={{ color, fontSize: "0.65rem", margin: 0 }}>{pct}%</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="db-header">
        <h1 className="db-title" style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "3rem", letterSpacing: "0.15em", color: "#F58426", margin: 0 }}>
          DASHBOARD
        </h1>
        <p style={{ color: "#6b7280", margin: "0.25rem 0 0", fontSize: "0.875rem" }}>Everything Knicks, all in one place.</p>
      </div>

      {knicks && (
        <div className="db-record">
          {[
            { label: "Record",     value: `${knicks.wins}-${knicks.losses}` },
            { label: "Win %",      value: (knicks.win_pct * 100).toFixed(1) + "%" },
            { label: "East Rank",  value: `#${knicks.conference_rank}` },
            { label: "Games Back", value: knicks.games_back === 0 ? "—" : knicks.games_back.toFixed(1) },
            { label: "Streak",     value: streak },
          ].map(s => (
            <div key={s.label} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.5rem", padding: "0.75rem", textAlign: "center" }}>
              <p style={{ color: "#6b7280", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>{s.label}</p>
              <p style={{ color: "#f9fafb", fontSize: "1.1rem", fontWeight: 700, margin: "0.2rem 0 0" }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="db-games">
        {nextGame && (
          <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem" }}>
            <p style={{ color: "#F58426", fontFamily: "Bebas Neue, sans-serif", fontSize: "1rem", letterSpacing: "0.1em", margin: "0 0 0.75rem" }}>NEXT GAME</p>
            <p style={{ color: "#f9fafb", fontWeight: 700, fontSize: "1rem", margin: "0 0 0.2rem" }}>
              <span style={{ color: nextGame.away_team.includes("Knicks") ? "#F58426" : "#e5e7eb" }}>{nextGame.away_team}</span>
              <span style={{ color: "#4b5563", margin: "0 0.4rem" }}>@</span>
              <span style={{ color: nextGame.home_team.includes("Knicks") ? "#F58426" : "#e5e7eb" }}>{nextGame.home_team}</span>
            </p>
            <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: "0 0 0.75rem" }}>
              {new Date(nextGame.game_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <Countdown gameDate={nextGame.game_date} />
          </div>
        )}
        {lastGame && (
          <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem" }}>
            <p style={{ color: "#F58426", fontFamily: "Bebas Neue, sans-serif", fontSize: "1rem", letterSpacing: "0.1em", margin: "0 0 0.75rem" }}>LAST RESULT</p>
            <p style={{ color: "#f9fafb", fontWeight: 700, fontSize: "1rem", margin: "0 0 0.2rem" }}>
              <span style={{ color: lastGame.away_team.includes("Knicks") ? "#F58426" : "#e5e7eb" }}>{lastGame.away_team}</span>
              <span style={{ color: "#4b5563", margin: "0 0.4rem" }}>@</span>
              <span style={{ color: lastGame.home_team.includes("Knicks") ? "#F58426" : "#e5e7eb" }}>{lastGame.home_team}</span>
            </p>
            <p style={{ color: "#f9fafb", fontSize: "1.5rem", fontWeight: 700, margin: "0.25rem 0" }}>
              {lastGame.away_score} – {lastGame.home_score}
            </p>
            {(() => {
              const kWon = (lastGame.home_team.includes("Knicks") && lastGame.home_score > lastGame.away_score) ||
                           (lastGame.away_team.includes("Knicks") && lastGame.away_score > lastGame.home_score)
              return (
                <span style={{ display: "inline-block", padding: "0.2rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, background: kWon ? "#14532d" : "#7f1d1d", color: kWon ? "#4ade80" : "#f87171" }}>
                  {kWon ? "WIN" : "LOSS"}
                </span>
              )
            })()}
          </div>
        )}
      </div>

      <div className="db-main">
        <div style={{ minWidth: 0 }}>

          {recentArticles.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1.4rem", letterSpacing: "0.1em", color: "#F58426", margin: 0 }}>
                  {sectionTitle}
                </h2>
                <Link to="/predictions" style={{ color: "#6b7280", fontSize: "0.75rem", textDecoration: "none" }}>View all →</Link>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {recentArticles.map((a: any) => {
                  const badge = ARTICLE_BADGE[a.article_type] ?? ARTICLE_BADGE.prediction
                  return (
                    <Link key={a.slug} to={`/predictions/${a.slug}`} style={{ textDecoration: "none" }}>
                      <div
                        style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1rem", display: "flex", alignItems: "flex-start", gap: "0.75rem", transition: "border-color 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = "#006BB6")}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "#1f2937")}
                      >
                        <span style={{ display: "inline-block", background: badge.bg, color: badge.color, flexShrink: 0, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", padding: "0.2rem 0.6rem", borderRadius: "999px", marginTop: "0.1rem" }}>
                          {badge.label}
                        </span>
                        <div>
                          <p style={{ color: "#f9fafb", fontWeight: 600, fontSize: "0.875rem", margin: "0 0 0.25rem", lineHeight: 1.4 }}>{a.title}</p>
                          <p style={{ color: "#4b5563", fontSize: "0.72rem", margin: 0 }}>
                            {new Date(a.game_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1.4rem", letterSpacing: "0.1em", color: "#F58426", margin: 0 }}>LATEST NEWS</h2>
              <Link to="/news" style={{ color: "#6b7280", fontSize: "0.75rem", textDecoration: "none" }}>View all →</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {(news ?? []).slice(0, 8).map((a: any) => <NewsCard key={a.id} article={a} />)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1.2rem", letterSpacing: "0.1em", color: "#F58426", margin: 0 }}>INJURY REPORT</h2>
              <Link to="/injuries" style={{ color: "#6b7280", fontSize: "0.75rem", textDecoration: "none" }}>View all →</Link>
            </div>
            {(injuries ?? []).length === 0 && <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: 0 }}>No injuries reported</p>}
            {(injuries ?? []).map((inj: any) => (
              <div key={inj.player_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid #1f2937" }}>
                <div>
                  <p style={{ color: "#f9fafb", fontSize: "0.875rem", fontWeight: 600, margin: 0 }}>{inj.player_name}</p>
                  <p style={{ color: "#6b7280", fontSize: "0.75rem", margin: "0.1rem 0 0" }}>{inj.reason}</p>
                </div>
                <StatusBadge status={inj.status} />
              </div>
            ))}
          </div>

          {(birthdays ?? []).length > 0 && (
            <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem" }}>
              <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1.2rem", letterSpacing: "0.1em", color: "#F58426", margin: "0 0 0.75rem" }}>🎂 BIRTHDAYS</h2>
              {(birthdays ?? []).slice(0, 5).map((b: any) => (
                <div key={b.player_name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid #1f2937" }}>
                  <p style={{ color: "#f9fafb", fontSize: "0.875rem", margin: 0 }}>{b.player_name}</p>
                  <p style={{ color: "#6b7280", fontSize: "0.75rem", margin: 0 }}>
                    {new Date(b.birth_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} · turns {b.age}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem" }}>
            <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1.2rem", letterSpacing: "0.1em", color: "#F58426", margin: "0 0 0.75rem" }}>QUICK LINKS</h2>
            {[
              { label: "nba.com/knicks",   url: "https://www.nba.com/team/1610612752/knicks" },
              { label: "NY Post Knicks",   url: "https://nypost.com/sports/knicks/" },
              { label: "ESPN Knicks",      url: "https://www.espn.com/nba/team/_/name/ny/new-york-knicks" },
              { label: "Knicks Twitter/X", url: "https://twitter.com/nyknicks" },
              { label: "MSG Networks",     url: "https://www.msgsports.com/knicks/" },
            ].map(l => (
              <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", color: "#006BB6", fontSize: "0.85rem", padding: "0.35rem 0", textDecoration: "none", borderBottom: "1px solid #1f2937" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#F58426")}
                onMouseLeave={e => (e.currentTarget.style.color = "#006BB6")}
              >{l.label}</a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function NewsCard({ article }: { article: any }) {
  const sourceColors: Record<string, string> = { espn: "#FF6B35", nypost: "#E4002B", knicks: "#006BB6", nba: "#006BB6", bleacher: "#F5A623" }
  const sourceLabels: Record<string, string> = { espn: "ESPN", nypost: "NY Post", knicks: "Knicks.com", nba: "NBA.com", bleacher: "BR" }
  const color = sourceColors[article.source] ?? "#6b7280"
  const timeAgo = (iso: string) => {
    if (!iso) return ""
    const diff = (Date.now() - new Date(iso).getTime()) / 1000
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
  return (
    <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
      <div style={{ display: "flex", gap: "0.75rem", padding: "0.9rem 0", borderBottom: "1px solid #1f2937" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#0d1117")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        {article.image_url && (
          <img src={article.image_url} alt="" style={{ width: "80px", height: "56px", objectFit: "cover", borderRadius: "0.375rem", flexShrink: 0 }}
            onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: "#f9fafb", fontWeight: 600, fontSize: "0.875rem", margin: "0 0 0.35rem", lineHeight: 1.4 }}>{article.title}</p>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.72rem" }}>
            <span style={{ color, fontWeight: 700 }}>{sourceLabels[article.source] ?? article.source.toUpperCase()}</span>
            <span style={{ color: "#374151" }}>·</span>
            <span style={{ color: "#4b5563" }}>{timeAgo(article.published_at)}</span>
          </div>
        </div>
      </div>
    </a>
  )
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase() ?? ""
  let bg = "#1f2937", color = "#9ca3af"
  if (s.includes("out"))               { bg = "#7f1d1d"; color = "#f87171" }
  else if (s.includes("day"))          { bg = "#78350f"; color = "#fbbf24" }
  else if (s.includes("questionable")) { bg = "#1e3a5f"; color = "#93c5fd" }
  return (
    <span style={{ background: bg, color, padding: "0.15rem 0.6rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap" }}>
      {status}
    </span>
  )
}

function Countdown({ gameDate }: { gameDate: string }) {
  const target = new Date(gameDate + "T19:30:00").getTime()
  const [diff, setDiff] = useState(target - Date.now())
  useEffect(() => {
    const t = setInterval(() => setDiff(target - Date.now()), 1000)
    return () => clearInterval(t)
  }, [target])
  if (diff <= 0) return <span style={{ color: "#4ade80", fontWeight: 700, fontSize: "0.875rem" }}>GAME TIME 🏀</span>
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  const d = Math.floor(h / 24)
  return (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      {d > 0 && <MiniBlock v={d} l="D" />}
      <MiniBlock v={d > 0 ? h % 24 : h} l="H" />
      <MiniBlock v={m} l="M" />
      <MiniBlock v={s} l="S" />
    </div>
  )
}

function MiniBlock({ v, l }: { v: number; l: string }) {
  return (
    <div style={{ background: "#0d0d0d", borderRadius: "0.375rem", padding: "0.4rem 0.6rem", textAlign: "center", minWidth: "42px" }}>
      <p style={{ color: "#F58426", fontSize: "1.1rem", fontWeight: 700, margin: 0, fontVariantNumeric: "tabular-nums" }}>{String(v).padStart(2, "0")}</p>
      <p style={{ color: "#4b5563", fontSize: "0.55rem", margin: 0 }}>{l}</p>
    </div>
  )
}
