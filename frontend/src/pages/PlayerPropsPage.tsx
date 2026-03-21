import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { getArticles, getResults } from "../utils/api"

const KNICKS_PROP_PLAYERS = [
  "Jalen Brunson",
  "Karl-Anthony Towns",
  "Mikal Bridges",
  "OG Anunoby",
  "Josh Hart",
  "Miles McBride",
  "Mitchell Robinson",
  "Jordan Clarkson",
  "Jeremy Sochan",
]

const PROP_TYPE_LABELS: Record<string, string> = {
  points: "PTS",
  rebounds: "REB",
  assists: "AST",
  threes: "3PM",
  steals: "STL",
  blocks: "BLK",
  pts_reb_ast: "PRA",
}

export default function PlayerPropsPage() {
  const [selectedPlayer, setSelectedPlayer] = useState("ALL")

  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles", 200],
    queryFn: () => getArticles(200),
  })

  const { data: resultsData } = useQuery({
    queryKey: ["results"],
    queryFn: getResults,
  })

  const propResults: any[] = resultsData?.props ?? []

  const propArticles = (articles ?? []).filter(
    (a: any) => a.article_type === "prop" &&
    (selectedPlayer === "ALL" || a.player === selectedPlayer)
  ).sort((a: any, b: any) =>
    new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
  )

  // Build per-player stats
  const playerStats = KNICKS_PROP_PLAYERS.map(player => {
    const results = propResults.filter(r => r.player === player)
    const hits = results.filter(r => r.result === "HIT").length
    const total = results.length
    const pct = total > 0 ? Math.round(hits / total * 100) : null
    return { player, hits, total, pct }
  }).filter(p => p.total > 0)

  const formatDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })

  const getResultForArticle = (slug: string) => {
    const r = propResults.find(r => r.slug === slug)
    return r ?? null
  }

  return (
    <div style={{ maxWidth: "900px" }}>
      <Helmet>
        <title>Knicks Player Props — AI Picks & Analysis | KnicksHub</title>
        <meta name="description" content="New York Knicks player prop predictions for Jalen Brunson, Karl-Anthony Towns, OG Anunoby and more. Daily AI-powered prop picks with historical results." />
        <link rel="canonical" href="https://knickshub.vercel.app/props" />
      </Helmet>

      <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "2.5rem", letterSpacing: "0.1em", color: "#F58426", margin: "0 0 0.25rem" }}>
        Knicks Player Props
      </h1>
      <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 1.5rem" }}>
        AI-powered prop picks for every Knicks game — tracked and graded after the final buzzer.
      </p>

      {/* Player hit rate cards */}
      {playerStats.length > 0 && (
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          {playerStats.map(({ player, hits, total, pct }) => {
            const color = pct! >= 65 ? "#4ade80" : pct! >= 50 ? "#fbbf24" : "#f87171"
            const bg = pct! >= 65 ? "#14532d22" : pct! >= 50 ? "#451a0322" : "#450a0a22"
            const firstName = player.split(" ")[0]
            return (
              <button
                key={player}
                onClick={() => setSelectedPlayer(selectedPlayer === player ? "ALL" : player)}
                style={{
                  background: selectedPlayer === player ? bg : "#0d1117",
                  border: `1px solid ${selectedPlayer === player ? color : "#374151"}`,
                  borderRadius: "0.5rem", padding: "0.5rem 0.75rem",
                  cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.1rem"
                }}
              >
                <span style={{ color: "#f9fafb", fontSize: "0.75rem", fontWeight: 700 }}>{firstName}</span>
                <span style={{ color, fontSize: "0.85rem", fontWeight: 800 }}>{hits}-{total-hits}</span>
                <span style={{ color: "#6b7280", fontSize: "0.6rem" }}>{pct}%</span>
              </button>
            )
          })}
          {selectedPlayer !== "ALL" && (
            <button onClick={() => setSelectedPlayer("ALL")} style={{
              background: "#111827", border: "1px solid #374151", borderRadius: "0.5rem",
              padding: "0.5rem 0.75rem", cursor: "pointer", color: "#6b7280", fontSize: "0.75rem"
            }}>Clear ×</button>
          )}
        </div>
      )}

      {/* Articles list */}
      {isLoading ? (
        <p style={{ color: "#6b7280" }}>Loading...</p>
      ) : propArticles.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No prop articles yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {propArticles.map((a: any) => {
            const result = getResultForArticle(a.slug)
            const propLabel = PROP_TYPE_LABELS[a.prop_type] ?? a.prop_type?.toUpperCase() ?? "PROP"
            const picks = a.key_picks
            const line = picks?.pick ?? ""
            const lean = picks?.lean ?? ""
            const conf = picks?.confidence ?? ""
            const confColor = conf === "High" ? "#4ade80" : conf === "Medium" ? "#fbbf24" : "#9ca3af"

            return (
              <Link
                key={a.slug}
                to={`/predictions/${a.slug}`}
                style={{ textDecoration: "none" }}
              >
                <div style={{
                  background: "#0d1117", border: "1px solid #1f2937",
                  borderRadius: "0.75rem", padding: "1rem 1.25rem",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  gap: "1rem", flexWrap: "wrap",
                  transition: "border-color 0.15s"
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#F58426")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#1f2937")}
                >
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.35rem", flexWrap: "wrap" }}>
                      <span style={{ background: "#4a1d1d", color: "#fca5a5", padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.65rem", fontWeight: 700 }}>
                        {propLabel}
                      </span>
                      {a.player && (
                        <span style={{ color: "#F58426", fontSize: "0.75rem", fontWeight: 700 }}>{a.player}</span>
                      )}
                      <span style={{ color: "#6b7280", fontSize: "0.7rem" }}>{formatDate(a.game_date)}</span>
                    </div>
                    <p style={{ color: "#f9fafb", fontSize: "0.875rem", fontWeight: 600, margin: 0, lineHeight: 1.4 }}>{a.title}</p>
                  </div>

                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexShrink: 0 }}>
                    {line && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ color: lean === "OVER" ? "#4ade80" : "#f87171", fontSize: "0.75rem", fontWeight: 700 }}>{lean}</div>
                        <div style={{ color: "#9ca3af", fontSize: "0.65rem" }}>{line}</div>
                      </div>
                    )}
                    {conf && (
                      <div style={{ color: confColor, fontSize: "0.65rem", fontWeight: 700, textAlign: "center" }}>
                        {conf.toUpperCase()}<br />CONF
                      </div>
                    )}
                    {result ? (
                      <div style={{
                        background: result.result === "HIT" ? "#14532d" : "#450a0a",
                        color: result.result === "HIT" ? "#4ade80" : "#f87171",
                        padding: "0.25rem 0.6rem", borderRadius: "999px",
                        fontSize: "0.7rem", fontWeight: 800, minWidth: "48px", textAlign: "center"
                      }}>
                        {result.result === "HIT" ? "✓ HIT" : "✗ MISS"}
                      </div>
                    ) : (
                      <div style={{
                        background: "#1f2937", color: "#6b7280",
                        padding: "0.25rem 0.6rem", borderRadius: "999px",
                        fontSize: "0.7rem", fontWeight: 700, minWidth: "48px", textAlign: "center"
                      }}>PENDING</div>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
