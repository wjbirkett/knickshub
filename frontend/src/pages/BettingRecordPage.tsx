import { useQuery } from "@tanstack/react-query"
import { getSchedule, getResults } from "../utils/api"

export default function TweetsPage() {
  const { data: games, isLoading } = useQuery({ queryKey: ["schedule"], queryFn: getSchedule })
  const { data: resultsData } = useQuery({ queryKey: ["results"], queryFn: getResults })
  const predictions = resultsData?.predictions ?? []
  const props = resultsData?.props ?? []
  const finished = (games ?? []).filter((g: any) => g.status === "Final")
  const knicksWon = (g: any) => (g.home_team.includes("Knicks") && g.home_score > g.away_score) || (g.away_team.includes("Knicks") && g.away_score > g.home_score)
  const knicksScore = (g: any) => g.home_team.includes("Knicks") ? g.home_score : g.away_score
  const oppScore = (g: any) => g.home_team.includes("Knicks") ? g.away_score : g.home_score
  const isHome = (g: any) => g.home_team.includes("Knicks")
  const wins = finished.filter(knicksWon).length
  const losses = finished.length - wins
  const totals = finished.map((g: any) => (g.home_score ?? 0) + (g.away_score ?? 0)).filter((t: number) => t > 0)
  const avgTotal = totals.length ? (totals.reduce((a: number, b: number) => a + b, 0) / totals.length).toFixed(1) : "N/A"
  const margins = finished.map((g: any) => knicksScore(g) - oppScore(g))
  const avgMargin = margins.length ? (margins.reduce((a: number, b: number) => a + b, 0) / margins.length).toFixed(1) : "N/A"
  const last10 = finished.slice(-10).reverse()
  const last10Wins = last10.filter(knicksWon).length
  const reversed = [...finished].reverse()
  let streakType = reversed.length > 0 ? knicksWon(reversed[0]) : null
  let streakCount = 0
  for (const g of reversed) { if (knicksWon(g) === streakType) streakCount++; else break }
  const streak = streakType !== null ? `${streakType ? "W" : "L"}${streakCount}` : "\u2014"
  const uniquePreds = predictions.filter((p: any, i: number, arr: any[]) => p.slug.includes("-prediction-") && arr.findIndex((x: any) => x.slug === p.slug) === i)
  const spreadHits = uniquePreds.filter((p: any) => p.spread_result === "HIT").length
  const spreadTotal = uniquePreds.filter((p: any) => p.spread_result).length
  const totalHits = uniquePreds.filter((p: any) => p.total_result === "HIT").length
  const totalTotal = uniquePreds.filter((p: any) => p.total_result).length
  const mlHits = uniquePreds.filter((p: any) => p.moneyline_result === "HIT").length
  const mlTotal = uniquePreds.filter((p: any) => p.moneyline_result).length
  const uniqueProps = props.filter((p: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.slug === p.slug) === i)
  const propHits = uniqueProps.filter((p: any) => p.result === "HIT").length
  const propTotal = uniqueProps.length
  const statCard = (label: string, value: string | number, sub?: string, highlight?: boolean) => (
    <div key={label} style={{ background: "#111827", border: `1px solid ${highlight ? "#F58426" : "#1f2937"}`, borderRadius: "0.75rem", padding: "1.25rem", textAlign: "center" }}>
      <p style={{ color: "#6b7280", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.4rem" }}>{label}</p>
      <p style={{ color: highlight ? "#F58426" : "#f9fafb", fontSize: "1.6rem", fontWeight: 700, margin: 0 }}>{value}</p>
      {sub && <p style={{ color: "#4b5563", fontSize: "0.7rem", margin: "0.25rem 0 0" }}>{sub}</p>}
    </div>
  )
  const pickCard = (label: string, hits: number, total: number) => {
    const pct = total > 0 ? Math.round((hits / total) * 100) : 0
    const color = pct >= 60 ? "#4ade80" : pct >= 50 ? "#fbbf24" : "#f87171"
    return (
      <div key={label} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem", textAlign: "center" }}>
        <p style={{ color: "#6b7280", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.4rem" }}>{label}</p>
        <p style={{ color, fontSize: "1.6rem", fontWeight: 700, margin: 0 }}>{hits}-{total - hits}</p>
        <p style={{ color, fontSize: "0.75rem", margin: "0.25rem 0 0", fontWeight: 600 }}>{pct}%</p>
      </div>
    )
  }
  return (
    <div style={{ maxWidth: "900px" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "3rem", letterSpacing: "0.15em", color: "#F58426", margin: 0 }}>KNICKS BETTING TRENDS</h1>
        <p style={{ color: "#6b7280", margin: "0.25rem 0 0", fontSize: "0.875rem" }}>Season stats and trends. Based on {finished.length} games played.</p>
      </div>
      {isLoading && <p style={{ color: "#6b7280" }}>Loading trends...</p>}
      {isLoading === false && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {statCard("Season Record", `${wins}-${losses}`, "W-L", true)}
            {statCard("Current Streak", streak, undefined, streak.startsWith("W"))}
            {statCard("Last 10", `${last10Wins}-${10 - last10Wins}`, "W-L last 10")}
            {statCard("Avg Total", avgTotal, "combined pts/game")}
            {statCard("Avg Margin", Number(avgMargin) > 0 ? `+${avgMargin}` : String(avgMargin), "pts per game")}
          </div>
          {uniquePreds.length > 0 && (
            <>
              <div style={{ marginBottom: "1rem" }}>
                <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1.5rem", letterSpacing: "0.1em", color: "#F58426", margin: "0 0 0.25rem" }}>KNICKSHUB PICKS RECORD</h2>
                <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: 0 }}>Tracked since March 2026. {uniquePreds.length} games graded.</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
                {pickCard("Against The Spread", spreadHits, spreadTotal)}
                {pickCard("Over/Under", totalHits, totalTotal)}
                {pickCard("Moneyline", mlHits, mlTotal)}
                {propTotal > 0 && pickCard("Player Props", propHits, propTotal)}
              </div>
              <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1.5rem" }}>
                <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1rem", letterSpacing: "0.1em", color: "#F58426", margin: "0 0 1rem" }}>RECENT PICKS RESULTS</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {uniquePreds.slice(0, 10).map((p: any) => {
                    const gameProps = uniqueProps.filter((pr: any) => pr.game_date === p.game_date)
                    return (
                      <div key={p.id} style={{ padding: "0.6rem 0", borderBottom: "1px solid #1f2937" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                          <div>
                            <span style={{ color: "#f9fafb", fontSize: "0.875rem", fontWeight: 600 }}>vs {p.opponent}</span>
                            <span style={{ color: "#6b7280", fontSize: "0.75rem", marginLeft: "0.5rem" }}>{p.game_date}</span>
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.5rem", borderRadius: "999px", background: p.spread_result === "HIT" ? "#14532d" : "#7f1d1d", color: p.spread_result === "HIT" ? "#4ade80" : "#f87171" }}>ATS {p.spread_result}</span>
                            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.5rem", borderRadius: "999px", background: p.total_result === "HIT" ? "#14532d" : "#7f1d1d", color: p.total_result === "HIT" ? "#4ade80" : "#f87171" }}>O/U {p.total_result}</span>
                            <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>{p.knicks_score}-{p.opp_score}</span>
                          </div>
                        </div>
                        {gameProps.length > 0 && (
                          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                            {gameProps.map((pr: any) => (
                              <span key={pr.slug} style={{ fontSize: "0.65rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "999px", background: pr.result === "HIT" ? "#14532d" : "#7f1d1d", color: pr.result === "HIT" ? "#4ade80" : "#f87171" }}>
                                {pr.player.split(" ").pop()} {pr.prop_type} {pr.lean} {pr.line} ({pr.actual_value}) {pr.result}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}