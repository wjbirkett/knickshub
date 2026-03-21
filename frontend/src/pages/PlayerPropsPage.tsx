import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { getArticles, getResults } from "../utils/api"

const S = {
  bg: "#131313", surface: "#1c1b1b", surfaceHigh: "#2a2a2a",
  surfaceHighest: "#353534", border: "rgba(255,255,255,0.08)",
  orange: "#F58426", peach: "#ffb786", green: "#4ae176",
  greenBg: "#06bb55", red: "#ffb4ab", redBg: "#93000a",
  text: "#e5e2e1", textMuted: "#ddc1b1",
}

const PLAYER_IMAGES: Record<string, string> = {
  "Jalen Brunson":       "/players/jalen.png",
  "Karl-Anthony Towns":  "/players/KAT.png",
  "Mikal Bridges":       "/players/mikal.png",
  "OG Anunoby":          "/players/OG.png",
  "Josh Hart":           "/players/josh.png",
  "Miles McBride":       "/players/miles.png",
  "Mitchell Robinson":   "/players/mitchell.png",
  "Jordan Clarkson":     "/players/jordan.png",
  "Jose Alvarado":       "/players/jose.png",
  "Landry Shamet":       "/players/landry.png",
  "Jeremy Sochan":       "/players/jeremy.png",
  "Tyler Kolek":         "/players/tyler.png",
  "Mohamed Diawara":     "/players/mohamed.png",
}

const PROP_LABELS: Record<string, string> = {
  points: "PTS", rebounds: "REB", assists: "AST",
  threes: "3PM", steals: "STL", blocks: "BLK", pts_reb_ast: "PRA",
}

const getPlayerImg = (name: string) => {
  if (!name) return null
  const key = Object.keys(PLAYER_IMAGES).find(k => name.toLowerCase().includes(k.toLowerCase().split(" ")[1]))
  return key ? PLAYER_IMAGES[key] : null
}

export default function PlayerPropsPage() {
  const [selectedPlayer, setSelectedPlayer] = useState("ALL")

  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles", 200],
    queryFn: () => getArticles(200),
  })
  const { data: resultsData } = useQuery({ queryKey: ["results"], queryFn: getResults })

  const propResults: any[] = (resultsData as any)?.props ?? []
  const propArticles = (articles as any[])?.filter((a: any) =>
    a.article_type === "prop" && (selectedPlayer === "ALL" || a.player === selectedPlayer)
  ).sort((a: any, b: any) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime()) ?? []

  // Per-player stats
  const players = Object.keys(PLAYER_IMAGES)
  const playerStats = players.map(player => {
    const results = propResults.filter(r => r.player === player)
    const hits = results.filter(r => r.result === "HIT").length
    const total = results.length
    return { player, hits, total, pct: total > 0 ? Math.round(hits/total*100) : null }
  }).filter(p => p.total > 0)

  const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })

  const getResult = (slug: string) => propResults.find(r => r.slug === slug)

  return (
    <div className="main-content" style={{ background: S.bg, minHeight: "100vh" }}>
      <Helmet>
        <title>Knicks Player Props — AI Picks & Analysis | KnicksHub</title>
        <meta name="description" content="New York Knicks player prop predictions for Jalen Brunson, Karl-Anthony Towns, OG Anunoby and more." />
        <link rel="canonical" href="https://knickshub.vercel.app/props" />
      </Helmet>

      {/* Header */}
      <div style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: "2rem 2.5rem" }}>
        <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.5rem)", textTransform: "uppercase", letterSpacing: "-0.03em", color: S.text, margin: "0 0 0.5rem", fontStyle: "italic" }}>
          Player <span style={{ color: S.peach }}>Props</span>
        </h1>
        <p style={{ color: S.textMuted, fontSize: "0.875rem", margin: 0 }}>AI-powered prop picks — tracked and graded after the final buzzer</p>
      </div>

      <div style={{ padding: "2rem 2.5rem", maxWidth: "1100px" }}>

        {/* Player Filter Cards */}
        {playerStats.length > 0 && (
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "2rem" }}>
            <button onClick={() => setSelectedPlayer("ALL")} style={{
              background: selectedPlayer === "ALL" ? S.orange : S.surface,
              color: selectedPlayer === "ALL" ? "#5c2b00" : S.textMuted,
              border: "none", cursor: "pointer", padding: "0.5rem 1rem",
              fontFamily: "Space Grotesk, sans-serif", fontWeight: 700,
              fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em",
            }}>All</button>
            {playerStats.map(({ player, hits, total, pct }) => {
              const img = getPlayerImg(player)
              const col = pct! >= 65 ? S.green : pct! >= 50 ? S.peach : S.red
              const isSelected = selectedPlayer === player
              return (
                <button key={player} onClick={() => setSelectedPlayer(isSelected ? "ALL" : player)} style={{
                  background: isSelected ? S.surfaceHigh : S.surface,
                  border: `1px solid ${isSelected ? col : S.border}`,
                  cursor: "pointer", padding: "0.5rem 0.75rem",
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  transition: "all 0.15s",
                }}>
                  {img && <img src={img} alt={player} style={{ width: "2rem", height: "2rem", borderRadius: "50%", objectFit: "cover" }} />}
                  <div style={{ textAlign: "left" }}>
                    <span style={{ display: "block", fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.6875rem", color: S.text, textTransform: "uppercase" }}>{player.split(" ")[1]}</span>
                    <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "0.8125rem", color: col }}>{hits}-{total-hits}</span>
                    {pct !== null && <span style={{ display: "block", fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.5625rem", color: col, opacity: 0.8 }}>{pct}%</span>}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Articles List */}
        {isLoading ? (
          <p style={{ color: S.textMuted }}>Loading...</p>
        ) : propArticles.length === 0 ? (
          <p style={{ color: S.textMuted }}>No prop articles yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {propArticles.map((a: any) => {
              const result = getResult(a.slug)
              const img = getPlayerImg(a.player)
              const propLabel = PROP_LABELS[a.prop_type] ?? a.prop_type?.toUpperCase() ?? "PROP"
              const picks = a.key_picks
              const lean = picks?.lean ?? ""
              const line = picks?.pick ?? ""
              const conf = picks?.confidence ?? ""

              return (
                <Link key={a.slug} to={`/predictions/${a.slug}`} style={{ textDecoration: "none" }}>
                  <div style={{ background: S.surface, padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = S.surfaceHigh)}
                    onMouseLeave={e => (e.currentTarget.style.background = S.surface)}
                  >
                    {/* Player image */}
                    {img ? (
                      <img src={img} alt={a.player} style={{ width: "3rem", height: "3rem", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: "3rem", height: "3rem", background: S.surfaceHigh, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span className="material-symbols-outlined" style={{ color: S.textMuted, fontSize: "1.25rem" }}>person</span>
                      </div>
                    )}

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.3rem", flexWrap: "wrap" }}>
                        <span style={{ background: S.redBg, color: "#ffdad6", padding: "0.1rem 0.4rem", fontSize: "0.5rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "Space Grotesk, sans-serif" }}>{propLabel}</span>
                        {a.player && <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.75rem", color: S.orange, textTransform: "uppercase" }}>{a.player}</span>}
                        <span style={{ fontSize: "0.625rem", color: S.textMuted }}>{fmt(a.game_date)}</span>
                      </div>
                      <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.9375rem", textTransform: "uppercase", color: S.text, margin: 0, lineHeight: 1.3 }}>
                        {a.title.replace(/\s*\([\d-]+\)\s*$/, "").slice(0, 60)}
                      </p>
                    </div>

                    {/* Pick + Result */}
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexShrink: 0 }}>
                      {line && (
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "0.75rem", color: lean === "OVER" ? S.green : S.red }}>{lean}</div>
                          <div style={{ fontSize: "0.5625rem", color: S.textMuted }}>{line}</div>
                        </div>
                      )}
                      {conf && (
                        <div style={{ fontSize: "0.5625rem", fontWeight: 900, color: conf === "High" ? S.green : S.textMuted, textTransform: "uppercase", fontFamily: "Space Grotesk, sans-serif", textAlign: "center" }}>
                          {conf}<br />CONF
                        </div>
                      )}
                      {result ? (
                        <span style={{ background: result.result === "HIT" ? S.greenBg : S.redBg, color: result.result === "HIT" ? "#00431a" : "#ffdad6", padding: "0.25rem 0.625rem", fontSize: "0.625rem", fontWeight: 900, textTransform: "uppercase", fontFamily: "Space Grotesk, sans-serif", minWidth: "48px", textAlign: "center" }}>
                          {result.result === "HIT" ? "✓ HIT" : "✗ MISS"}
                        </span>
                      ) : (
                        <span style={{ background: S.surfaceHigh, color: S.textMuted, padding: "0.25rem 0.625rem", fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", fontFamily: "Space Grotesk, sans-serif", minWidth: "48px", textAlign: "center" }}>PENDING</span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
