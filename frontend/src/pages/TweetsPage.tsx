import { useQuery } from "@tanstack/react-query"
import { getSchedule } from "../utils/api"

export default function TweetsPage() {
  const { data: games, isLoading } = useQuery({ queryKey: ["schedule"], queryFn: getSchedule })

  const finished = (games ?? []).filter((g: any) => g.status === "Final")

  const knicksWon = (g: any) =>
    (g.home_team.includes("Knicks") && g.home_score > g.away_score) ||
    (g.away_team.includes("Knicks") && g.away_score > g.home_score)

  const knicksScore = (g: any) =>
    g.home_team.includes("Knicks") ? g.home_score : g.away_score

  const oppScore = (g: any) =>
    g.home_team.includes("Knicks") ? g.away_score : g.home_score

  const isHome = (g: any) => g.home_team.includes("Knicks")

  // ATS calculation (using spread from key_picks isn't available here, so we track W/L margin)
  const wins = finished.filter(knicksWon).length
  const losses = finished.length - wins

  // Home / Away splits
  const homeGames = finished.filter(isHome)
  const awayGames = finished.filter((g: any) => !isHome(g))
  const homeWins = homeGames.filter(knicksWon).length
  const awayWins = awayGames.filter(knicksWon).length

  // Over/Under trends (using actual combined scores)
  // We'll define "high scoring" as 220+ combined points as a proxy
  const totals = finished.map((g: any) => (g.home_score ?? 0) + (g.away_score ?? 0)).filter(t => t > 0)
  const avgTotal = totals.length ? (totals.reduce((a: number, b: number) => a + b, 0) / totals.length).toFixed(1) : "N/A"
  const over220 = totals.filter((t: number) => t >= 220).length
  const under220 = totals.filter((t: number) => t < 220).length

  // Margin stats
  const margins = finished.map((g: any) => knicksScore(g) - oppScore(g))
  const avgMargin = margins.length ? (margins.reduce((a: number, b: number) => a + b, 0) / margins.length).toFixed(1) : "N/A"
  const avgKnicksScore = finished.length
    ? (finished.reduce((a: number, g: any) => a + knicksScore(g), 0) / finished.length).toFixed(1)
    : "N/A"
  const avgOppScore = finished.length
    ? (finished.reduce((a: number, g: any) => a + oppScore(g), 0) / finished.length).toFixed(1)
    : "N/A"

  // Last 10 games form
  const last10 = finished.slice(-10).reverse()
  const last10Wins = last10.filter(knicksWon).length

  // Winning/losing streaks
  const reversed = [...finished].reverse()
  let streakType = reversed.length > 0 ? knicksWon(reversed[0]) : null
  let streakCount = 0
  for (const g of reversed) {
    if (knicksWon(g) === streakType) streakCount++
    else break
  }
  const streak = streakType !== null ? `${streakType ? "W" : "L"}${streakCount}` : "—"

  const statCard = (label: string, value: string | number, sub?: string, highlight?: boolean) => (
    <div key={label} style={{
      background: "#111827", border: `1px solid ${highlight ? "#F58426" : "#1f2937"}`,
      borderRadius: "0.75rem", padding: "1.25rem", textAlign: "center"
    }}>
      <p style={{ color: "#6b7280", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.4rem" }}>{label}</p>
      <p style={{ color: highlight ? "#F58426" : "#f9fafb", fontSize: "1.6rem", fontWeight: 700, margin: 0, fontVariantNumeric: "tabular-nums" }}>{value}</p>
      {sub && <p style={{ color: "#4b5563", fontSize: "0.7rem", margin: "0.25rem 0 0" }}>{sub}</p>}
    </div>
  )

  return (
    <div style={{ maxWidth: "900px" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "3rem", letterSpacing: "0.15em", color: "#F58426", margin: 0 }}>
          KNICKS BETTING TRENDS
        </h1>
        <p style={{ color: "#6b7280", margin: "0.25rem 0 0", fontSize: "0.875rem" }}>
          Season stats and trends to inform your bets. Based on {finished.length} games played.
        </p>
      </div>

      {isLoading && <p style={{ color: "#6b7280" }}>Loading trends...</p>}

      {!isLoading && (
        <>
          {/* Key stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {statCard("Season Record", `${wins}-${losses}`, "W-L", true)}
            {statCard("Current Streak", streak, undefined, streak.startsWith("W"))}
            {statCard("Last 10", `${last10Wins}-${10 - last10Wins}`, "W-L last 10")}
            {statCard("Avg Total", avgTotal, "combined pts/game")}
            {statCard("Avg Margin", Number(avgMargin) > 0 ? `+${avgMargin}` : String(avgMargin), "pts per game")}
          </div>

          {/* Home / Away splits */}
          <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1.25rem" }}>
            <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1.2rem", letterSpacing: "0.1em", color: "#F58426", margin: "0 0 1rem" }}>
              HOME / AWAY SPLITS
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {[
                { label: "Home", wins: homeWins, total: homeGames.length },
                { label: "Away", wins: awayWins, total: awayGames.length },
              ].map(({ label, wins: w, total }) => (
                <div key={label} style={{ background: "#0d1117", borderRadius: "0.5rem", padding: "1rem", textAlign: "center" }}>
                  <p style={{ color: "#6b7280", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.4rem" }}>{label}</p>
                  <p style={{ color: "#f9fafb", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 0.25rem" }}>{w}-{total - w}</p>
                  <p style={{ color: "#4b5563", fontSize: "0.7rem", margin: 0 }}>
                    {total > 0 ? ((w / total) * 100).toFixed(0) : 0}% win rate
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Scoring trends */}
          <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1.25rem" }}>
            <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1.2rem", letterSpacing: "0.1em", color: "#F58426", margin: "0 0 1rem" }}>
              SCORING TRENDS
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
              {[
                { label: "Knicks PPG", value: avgKnicksScore },
                { label: "Opp PPG", value: avgOppScore },
                { label: "Games 220+", value: `${over220}`, sub: `${finished.length > 0 ? ((over220 / finished.length) * 100).toFixed(0) : 0}% of games` },
                { label: "Games U220", value: `${under220}`, sub: `${finished.length > 0 ? ((under220 / finished.length) * 100).toFixed(0) : 0}% of games` },
              ].map(({ label, value, sub }) => (
                <div key={label} style={{ background: "#0d1117", borderRadius: "0.5rem", padding: "1rem", textAlign: "center" }}>
                  <p style={{ color: "#6b7280", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.35rem" }}>{label}</p>
                  <p style={{ color: "#f9fafb", fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>{value}</p>
                  {sub && <p style={{ color: "#4b5563", fontSize: "0.65rem", margin: "0.2rem 0 0" }}>{sub}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Last 10 game log */}
          <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem" }}>
            <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1.2rem", letterSpacing: "0.1em", color: "#F58426", margin: "0 0 1rem" }}>
              LAST 10 RESULTS
            </h2>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {last10.map((g: any, i: number) => {
                const won = knicksWon(g)
                const ks = knicksScore(g)
                const os = oppScore(g)
                const opp = g.home_team.includes("Knicks") ? g.away_team : g.home_team
                const home = isHome(g)
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0", borderBottom: "1px solid #1f2937", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ background: won ? "#14532d" : "#7f1d1d", color: won ? "#4ade80" : "#f87171", padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, minWidth: "28px", textAlign: "center" }}>
                        {won ? "W" : "L"}
                      </span>
                      <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>
                        {home ? "vs" : "@"} <span style={{ color: "#f9fafb", fontWeight: 600 }}>{opp}</span>
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ color: "#f9fafb", fontWeight: 700, fontSize: "0.875rem", fontVariantNumeric: "tabular-nums" }}>
                        {ks} – {os}
                      </span>
                      <span style={{ color: "#4b5563", fontSize: "0.72rem" }}>
                        {new Date(g.game_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <p style={{ color: "#374151", fontSize: "0.7rem", textAlign: "center", marginTop: "1rem" }}>
            Stats calculated from ESPN schedule data. Updated after every game.
          </p>
        </>
      )}
    </div>
  )
}
