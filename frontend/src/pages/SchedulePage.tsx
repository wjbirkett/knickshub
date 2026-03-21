import { useQuery } from "@tanstack/react-query"
import { Helmet } from "react-helmet-async"
import { getSchedule } from "../utils/api"

const S = {
  bg: "#131313", surface: "#1c1b1b", surfaceHigh: "#2a2a2a",
  border: "rgba(255,255,255,0.08)", orange: "#F58426", peach: "#ffb786",
  green: "#4ae176", greenBg: "#06bb55", red: "#ffb4ab", redBg: "#93000a",
  text: "#e5e2e1", textMuted: "#ddc1b1",
}

export default function SchedulePage() {
  const { data: schedule, isLoading } = useQuery({ queryKey: ["schedule"], queryFn: getSchedule })

  const games = (schedule as any[]) ?? []
  const past = games.filter((g: any) => g.status === "Final" || g.home_score).reverse()
  const upcoming = games.filter((g: any) => !g.home_score && g.status !== "Final")

  const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  const opp = (g: any) => g.home_team?.includes("Knicks") ? g.away_team : g.home_team
  const isHome = (g: any) => g.home_team?.includes("Knicks")
  const kScore = (g: any) => g.home_team?.includes("Knicks") ? g.home_score : g.away_score
  const oScore = (g: any) => g.home_team?.includes("Knicks") ? g.away_score : g.home_score

  return (
    <div className="main-content" style={{ background: S.bg, minHeight: "100vh" }}>
      <Helmet>
        <title>Knicks Schedule 2025-26 | KnicksHub</title>
        <meta name="description" content="New York Knicks 2025-26 season schedule, results, and upcoming games." />
      </Helmet>

      <div style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: "2rem 2.5rem" }}>
        <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.5rem)", textTransform: "uppercase", letterSpacing: "-0.03em", color: S.text, margin: "0 0 0.5rem", fontStyle: "italic" }}>
          2025-26 <span style={{ color: S.peach }}>Schedule</span>
        </h1>
        <p style={{ color: S.textMuted, fontSize: "0.875rem", margin: 0 }}>New York Knicks season results & upcoming games</p>
      </div>

      <div style={{ padding: "2rem 2.5rem", maxWidth: "900px" }}>
        {isLoading ? <p style={{ color: S.textMuted }}>Loading...</p> : (
          <>
            {/* Upcoming */}
            {upcoming.length > 0 && (
              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.125rem", textTransform: "uppercase", letterSpacing: "0.05em", color: S.peach, marginBottom: "1rem" }}>Upcoming Games</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {upcoming.slice(0, 10).map((g: any, i: number) => (
                    <div key={i} style={{ background: S.surface, padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <span style={{ fontSize: "0.625rem", color: S.textMuted, fontFamily: "Inter, sans-serif", minWidth: "70px" }}>{fmt(g.game_date)}</span>
                        <span style={{ fontSize: "0.5625rem", color: S.textMuted, fontWeight: 700, textTransform: "uppercase", background: S.surfaceHigh, padding: "0.1rem 0.375rem" }}>{isHome(g) ? "HOME" : "AWAY"}</span>
                        <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.9375rem", textTransform: "uppercase", color: S.text }}>vs {opp(g)}</span>
                      </div>
                      <span style={{ fontSize: "0.625rem", color: S.textMuted, fontFamily: "Inter, sans-serif" }}>{g.arena || ""}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Past results */}
            {past.length > 0 && (
              <section>
                <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.125rem", textTransform: "uppercase", letterSpacing: "0.05em", color: S.textMuted, marginBottom: "1rem" }}>Results</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {past.slice(0, 30).map((g: any, i: number) => {
                    const win = kScore(g) > oScore(g)
                    return (
                      <div key={i} style={{ background: S.surface, padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", borderLeft: `3px solid ${win ? S.green : S.red}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1 }}>
                          <span style={{ fontSize: "0.625rem", color: S.textMuted, fontFamily: "Inter, sans-serif", minWidth: "70px" }}>{fmt(g.game_date)}</span>
                          <span style={{ fontSize: "0.5625rem", color: S.textMuted, fontWeight: 700, textTransform: "uppercase", background: S.surfaceHigh, padding: "0.1rem 0.375rem" }}>{isHome(g) ? "HOME" : "AWAY"}</span>
                          <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.9375rem", textTransform: "uppercase", color: S.text }}>vs {opp(g)}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1rem", color: S.text }}>{kScore(g)} - {oScore(g)}</span>
                          <span style={{ background: win ? S.greenBg : S.redBg, color: win ? "#00431a" : "#ffdad6", padding: "0.2rem 0.5rem", fontSize: "0.5625rem", fontWeight: 900, textTransform: "uppercase", fontFamily: "Space Grotesk, sans-serif", minWidth: "28px", textAlign: "center" }}>{win ? "W" : "L"}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
