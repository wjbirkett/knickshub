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

  const wins = finished.filter(knicksWon).length
  const losses = finished.length - wins

  const homeGames = finished.filter(isHome)
  const awayGames = finished.filter((g: any) => !isHome(g))
  const homeWins = homeGames.filter(knicksWon).length
  const awayWins = awayGames.filter(knicksWon).length

  const totals = finished
    .map((g: any) => (g.home_score ?? 0) + (g.away_score ?? 0))
    .filter((t: number) => t > 0)

  const avgTotal = totals.length
    ? (totals.reduce((a: number, b: number) => a + b, 0) / totals.length).toFixed(1)
    : "N/A"

  const over220 = totals.filter((t: number) => t >= 220).length
  const under220 = totals.filter((t: number) => t < 220).length

  const margins = finished.map((g: any) => knicksScore(g) - oppScore(g))

  const avgMargin = margins.length
    ? (margins.reduce((a: number, b: number) => a + b, 0) / margins.length).toFixed(1)
    : "N/A"

  const avgKnicksScore = finished.length
    ? (finished.reduce((a: number, g: any) => a + knicksScore(g), 0) / finished.length).toFixed(1)
    : "N/A"

  const avgOppScore = finished.length
    ? (finished.reduce((a: number, g: any) => a + oppScore(g), 0) / finished.length).toFixed(1)
    : "N/A"

  const last10 = finished.slice(-10).reverse()
  const last10Wins = last10.filter(knicksWon).length

  const reversed = [...finished].reverse()
  let streakType = reversed.length > 0 ? knicksWon(reversed[0]) : null
  let streakCount = 0

  for (const g of reversed) {
    if (knicksWon(g) === streakType) streakCount++
    else break
  }

  const streak = streakType !== null ? `${streakType ? "W" : "L"}${streakCount}` : "—"

  const statCard = (label: string, value: string | number, sub?: string, highlight?: boolean) => (
    <div
      key={label}
      style={{
        background: "#111827",
        border: `1px solid ${highlight ? "#F58426" : "#1f2937"}`,
        borderRadius: "0.75rem",
        padding: "1.25rem",
        textAlign: "center"
      }}
    >
      <p style={{ color: "#6b7280", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.4rem" }}>
        {label}
      </p>
      <p style={{ color: highlight ? "#F58426" : "#f9fafb", fontSize: "1.6rem", fontWeight: 700, margin: 0, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </p>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {statCard("Season Record", `${wins}-${losses}`, "W-L", true)}
            {statCard("Current Streak", streak, undefined, streak.startsWith("W"))}
            {statCard("Last 10", `${last10Wins}-${10 - last10Wins}`, "W-L last 10")}
            {statCard("Avg Total", avgTotal, "combined pts/game")}
            {statCard("Avg Margin", Number(avgMargin) > 0 ? `+${avgMargin}` : String(avgMargin), "pts per game")}
          </div>
        </>
      )}
    </div>
  )
}