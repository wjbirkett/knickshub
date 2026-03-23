import { useQuery } from "@tanstack/react-query"
import { Helmet } from "react-helmet-async"
import { getStandings, getStats } from "../utils/api"

const S = {
  bg: "#131313", surface: "#1c1b1b", surfaceHigh: "#2a2a2a",
  border: "rgba(255,255,255,0.08)", orange: "#F58426", peach: "#ffb786",
  green: "#4ae176", text: "#e5e2e1", textMuted: "#ddc1b1",
}

const PLAYER_IMAGES: Record<string, string> = {
  "Jalen Brunson": "/players/jalen.png",
  "Karl-Anthony Towns": "/players/KAT.png",
  "Mikal Bridges": "/players/mikal.png",
  "OG Anunoby": "/players/OG.png",
  "Josh Hart": "/players/josh.png",
  "Miles McBride": "/players/miles.png",
  "Mitchell Robinson": "/players/mitchell.png",
  "Jordan Clarkson": "/players/jordan.png",
}

export default function StatsPage() {
  const { data: standings, isLoading } = useQuery({ queryKey: ["standings"], queryFn: getStandings })
  const { data: playerStats } = useQuery({ queryKey: ["stats"], queryFn: getStats })
  const players = (playerStats as any[])?.filter((p: any) => p.minutes_per_game >= 5) ?? []

  const teams = (standings as any[]) ?? []
  const knicks = teams.find((t: any) => (t.team_name || t.team || t.teamName || "").includes("Knicks"))
  const east = teams.filter((t: any) => t.conference === "East" || t.conference_rank || t.conferenceRank).slice(0, 15)

  return (
    <div className="main-content" style={{ background: S.bg, minHeight: "100vh" }}>
      <Helmet>
        <title>Knicks Stats & Standings | KnicksHub</title>
        <meta name="description" content="New York Knicks stats, standings, and player performance data." />
      </Helmet>

      <div style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: "2rem 2.5rem" }}>
        <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.5rem)", textTransform: "uppercase", letterSpacing: "-0.03em", color: S.text, margin: "0 0 0.5rem", fontStyle: "italic" }}>
          Stats & <span style={{ color: S.peach }}>Standings</span>
        </h1>
        <p style={{ color: S.textMuted, fontSize: "0.875rem", margin: 0 }}>2025-26 season performance</p>
      </div>

      <div style={{ padding: "2rem 2.5rem", maxWidth: "1200px" }}>
        {isLoading ? <p style={{ color: S.textMuted }}>Loading...</p> : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>

            {/* Knicks snapshot */}
            {knicks && (
              <section>
                <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.125rem", textTransform: "uppercase", letterSpacing: "0.05em", color: S.orange, marginBottom: "1rem" }}>Knicks Snapshot</h2>
                <div style={{ background: S.surface, padding: "1.5rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1rem" }}>
                    {[
                      ["W-L", `${knicks.wins}-${knicks.losses}`],
                      ["Win %", (knicks.win_pct || knicks.winPct) ? `${((knicks.win_pct || knicks.winPct) * 100).toFixed(1)}%` : "—"],
                      ["Seed", `#${knicks.conference_rank || knicks.conferenceRank || knicks.rank || "—"}`],
                      ["PPG", knicks.ppg ? knicks.ppg.toFixed(1) : "—"],
                      ["OPP PPG", (knicks.opp_ppg || knicks.oppPpg) ? (knicks.opp_ppg || knicks.oppPpg).toFixed(1) : "—"],
                      ["Streak", knicks.streak || "—"],
                    ].map(([label, val]) => (
                      <div key={label} style={{ textAlign: "center" }}>
                        <span style={{ display: "block", fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.5rem", color: S.peach }}>{val}</span>
                        <span style={{ fontSize: "0.5625rem", color: S.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Player Stats */}
            <section style={{ gridColumn: "1 / -1" }}>
              <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.125rem", textTransform: "uppercase", letterSpacing: "0.05em", color: S.orange, marginBottom: "1rem" }}>Player Stats</h2>
              <div style={{ background: S.surface, overflow: "auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 50px 50px 50px 50px 50px 50px 55px 55px", gap: 0, padding: "0.625rem 1rem", borderBottom: `1px solid ${S.border}`, minWidth: "600px" }}>
                  {["Player", "GP", "PPG", "RPG", "APG", "SPG", "BPG", "FG%", "MIN"].map(h => (
                    <span key={h} style={{ fontSize: "0.5625rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: S.textMuted, fontFamily: "Space Grotesk, sans-serif", textAlign: h !== "Player" ? "center" : "left" }}>{h}</span>
                  ))}
                </div>
                {players.map((p: any, i: number) => {
                  const img = PLAYER_IMAGES[p.player_name] || "/players/default.png"
                  return (
                    <div key={p.player_id || i} style={{ display: "grid", gridTemplateColumns: "1fr 50px 50px 50px 50px 50px 50px 55px 55px", gap: 0, padding: "0.6rem 1rem", borderBottom: i < players.length-1 ? `1px solid ${S.border}` : "none", minWidth: "600px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <img src={img} alt={p.player_name} style={{ width: "1.75rem", height: "1.75rem", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} onError={(e: any) => { e.target.style.display = "none" }} />
                        <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.8125rem", textTransform: "uppercase", color: S.text, whiteSpace: "nowrap" }}>{p.player_name}</span>
                      </div>
                      <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "0.8125rem", color: S.text, textAlign: "center" }}>{p.games_played}</span>
                      <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "0.8125rem", color: S.peach, fontWeight: 700, textAlign: "center" }}>{p.points_per_game?.toFixed(1)}</span>
                      <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "0.8125rem", color: S.text, textAlign: "center" }}>{p.rebounds_per_game?.toFixed(1)}</span>
                      <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "0.8125rem", color: S.text, textAlign: "center" }}>{p.assists_per_game?.toFixed(1)}</span>
                      <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "0.8125rem", color: S.text, textAlign: "center" }}>{p.steals_per_game?.toFixed(1)}</span>
                      <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "0.8125rem", color: S.text, textAlign: "center" }}>{p.blocks_per_game?.toFixed(1)}</span>
                      <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "0.8125rem", color: S.text, textAlign: "center" }}>{(p.field_goal_pct * 100)?.toFixed(1)}%</span>
                      <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "0.8125rem", color: S.textMuted, textAlign: "center" }}>{p.minutes_per_game?.toFixed(1)}</span>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* East Standings */}
            {east.length > 0 && (
              <section style={{ gridColumn: "1 / -1" }}>
                <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.125rem", textTransform: "uppercase", letterSpacing: "0.05em", color: S.textMuted, marginBottom: "1rem" }}>Eastern Conference</h2>
                <div style={{ background: S.surface, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2rem 1fr 60px 60px 60px", gap: 0, padding: "0.625rem 1rem", borderBottom: `1px solid ${S.border}` }}>
                    {["#", "Team", "W", "L", "PCT"].map(h => (
                      <span key={h} style={{ fontSize: "0.5625rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: S.textMuted, fontFamily: "Space Grotesk, sans-serif", textAlign: h !== "Team" ? "center" : "left" }}>{h}</span>
                    ))}
                  </div>
                  {east.map((t: any, i: number) => {
                    const isKnicks = (t.team_name || t.team || t.teamName || "").includes("Knicks")
                    return (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "2rem 1fr 60px 60px 60px", gap: 0, padding: "0.75rem 1rem", borderBottom: i < east.length-1 ? `1px solid ${S.border}` : "none", background: isKnicks ? "rgba(245,132,38,0.05)" : "transparent" }}>
                        <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "0.8125rem", color: isKnicks ? S.orange : S.textMuted }}>{i+1}</span>
                        <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.875rem", textTransform: "uppercase", color: isKnicks ? S.peach : S.text }}>{t.team_name || t.team || t.teamName}</span>
                        <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.875rem", color: S.text, textAlign: "center" }}>{t.wins}</span>
                        <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.875rem", color: S.text, textAlign: "center" }}>{t.losses}</span>
                        <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.875rem", color: S.text, textAlign: "center" }}>{(t.win_pct || t.winPct) ? ((t.win_pct || t.winPct) * 100).toFixed(0) + "%" : "—"}</span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
