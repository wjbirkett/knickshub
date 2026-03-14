import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { getArticles } from "../utils/api"
import { TYPE_CONFIG } from "./ArticlePage"

function opponentFromArticle(a: any): string | null {
  if (a.article_type === "history") return null
  if (a.home_team?.includes("Knicks") || a.home_team?.includes("New York")) return a.away_team
  return a.home_team
}

function slugToOpponent(slug: string): string {
  return slug.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
}

export default function MatchupArchivePage() {
  const { opponent } = useParams<{ opponent: string }>()
  const opponentName = slugToOpponent(opponent ?? "")

  const { data: allArticles, isLoading } = useQuery({
    queryKey: ["articles", 100],
    queryFn: () => getArticles(100),
  })

  const matchupArticles = (allArticles ?? []).filter((a: any) => {
    const opp = opponentFromArticle(a)
    if (!opp) return false
    return opp.toLowerCase() === opponentName.toLowerCase()
  })

  const byDate: Record<string, any[]> = {}
  for (const a of matchupArticles) {
    if (!byDate[a.game_date]) byDate[a.game_date] = []
    byDate[a.game_date].push(a)
  }
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))
  const totalGames = sortedDates.length

  if (isLoading) return <p style={{ color: "#6b7280", padding: "1rem" }}>Loading matchup...</p>
  if (!allArticles) return <p style={{ color: "#f87171", padding: "1rem" }}>Could not load articles.</p>

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "1rem" }}>
      <Link to="/predictions" style={{ color: "#6b7280", fontSize: "0.8rem", textDecoration: "none", display: "block", marginBottom: "1rem" }}>
        ← Back to Predictions
      </Link>

      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 0.25rem" }}>
          Matchup Archive
        </p>
        <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "2.75rem", letterSpacing: "0.15em", color: "#F58426", margin: "0 0 0.25rem" }}>
          KNICKS VS {opponentName.toUpperCase()}
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: 0 }}>
          {totalGames} game{totalGames !== 1 ? "s" : ""} covered · {matchupArticles.length} article{matchupArticles.length !== 1 ? "s" : ""}
        </p>
      </div>

      {sortedDates.length === 0 && (
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "#6b7280", margin: 0 }}>No articles found for this matchup yet.</p>
          <p style={{ color: "#4b5563", fontSize: "0.75rem", margin: "0.5rem 0 0" }}>Matched against: "{opponentName}"</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {sortedDates.map(gameDate => {
          const articles = byDate[gameDate]
          const dateLabel = new Date(gameDate + "T12:00:00").toLocaleDateString("en-US", {
            weekday: "long", month: "long", day: "numeric", year: "numeric"
          })
          return (
            <div key={gameDate} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", overflow: "hidden" }}>
              <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid #1f2937", background: "#0d1117" }}>
                <p style={{ color: "#F58426", fontFamily: "Bebas Neue, sans-serif", fontSize: "0.9rem", letterSpacing: "0.1em", margin: 0 }}>
                  {dateLabel}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {articles.map((a: any) => {
                  const badge = TYPE_CONFIG[a.article_type] ?? { label: "ARTICLE", bg: "#1f2937", color: "#9ca3af" }
                  return (
                    <Link key={a.slug} to={`/predictions/${a.slug}`} style={{ textDecoration: "none" }}>
                      <div
                        style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.875rem 1.25rem", borderBottom: "1px solid #1f2937", transition: "background 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#0d1117")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <span style={{ background: badge.bg, color: badge.color, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", padding: "0.2rem 0.6rem", borderRadius: "999px", flexShrink: 0, marginTop: "0.15rem" }}>
                          {badge.label}
                        </span>
                        <p style={{ color: "#f9fafb", fontWeight: 600, fontSize: "0.875rem", margin: 0, lineHeight: 1.4 }}>
                          {a.title}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}