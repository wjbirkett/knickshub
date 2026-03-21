import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { getArticles, getResults } from "../utils/api"
import { Helmet } from "react-helmet-async"
import { TYPE_CONFIG } from "./ArticlePage"

const S = {
  bg: "#131313", surface: "#1c1b1b", surfaceHigh: "#2a2a2a",
  border: "rgba(255,255,255,0.08)", orange: "#F58426", peach: "#ffb786",
  green: "#4ae176", greenBg: "#06bb55", red: "#ffb4ab", redBg: "#93000a",
  text: "#e5e2e1", textMuted: "#ddc1b1",
}

export default function MatchupArchivePage() {
  const { opponent } = useParams<{ opponent: string }>()
  const { data: articles } = useQuery({ queryKey: ["articles", 100], queryFn: () => getArticles(100) })
  const { data: resultsData } = useQuery({ queryKey: ["results"], queryFn: getResults })

  const oppName = opponent?.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") ?? ""
  const matchupArticles = (articles as any[])?.filter((a: any) => {
    const opp = a.home_team?.includes("Knicks") ? a.away_team : a.home_team
    return opp?.toLowerCase().replace(/\s+/g, "-") === opponent
  }) ?? []

  const predictions = (resultsData as any)?.predictions ?? []
  const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  const gameHubSlug = (a: any) => {
    const opp = (a.home_team?.includes("Knicks") ? a.away_team : a.home_team)?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    return `knicks-vs-${opp}-${a.game_date}`
  }

  return (
    <div className="main-content" style={{ background: S.bg, minHeight: "100vh" }}>
      <Helmet>
        <title>Knicks vs {oppName} Archive | KnicksHub</title>
        <meta name="description" content={`All KnicksHub predictions and results for Knicks vs ${oppName}`} />
      </Helmet>

      <div style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: "2rem 2.5rem" }}>
        <Link to="/predictions" style={{ fontSize: "0.6875rem", fontWeight: 700, color: S.textMuted, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.75rem", fontFamily: "Space Grotesk, sans-serif" }}>
          ← Back to Predictions
        </Link>
        <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.5rem)", textTransform: "uppercase", letterSpacing: "-0.03em", color: S.text, margin: "0 0 0.25rem", fontStyle: "italic" }}>
          Knicks vs <span style={{ color: S.peach }}>{oppName}</span>
        </h1>
        <p style={{ color: S.textMuted, fontSize: "0.875rem", margin: 0 }}>{matchupArticles.length} articles · Full prediction archive</p>
      </div>

      <div style={{ padding: "2rem 2.5rem", maxWidth: "1000px" }}>
        {matchupArticles.length === 0 ? (
          <p style={{ color: S.textMuted }}>No articles found for this matchup yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {matchupArticles.map((a: any) => {
              const badge = TYPE_CONFIG[a.article_type] ?? TYPE_CONFIG.prediction
              const result = predictions.find((r: any) => r.game_date === a.game_date)
              return (
                <div key={a.slug} style={{ background: S.surface, padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <span style={{ background: badge.bg, color: badge.color, padding: "0.2rem 0.5rem", fontSize: "0.5625rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "Space Grotesk, sans-serif", flexShrink: 0 }}>{badge.label}</span>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <Link to={`/predictions/${a.slug}`} style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.9375rem", textTransform: "uppercase", color: S.text, textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.color = S.peach)}
                      onMouseLeave={e => (e.currentTarget.style.color = S.text)}
                    >{a.title.replace(/\s*\([\d-]+\)\s*$/, "")}</Link>
                    <span style={{ display: "block", fontSize: "0.625rem", color: S.textMuted, marginTop: "0.2rem", fontFamily: "Inter, sans-serif" }}>{fmt(a.game_date)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
                    {result?.spread_result && (
                      <span style={{ background: result.spread_result === "HIT" ? S.greenBg : S.redBg, color: result.spread_result === "HIT" ? "#00431a" : "#ffdad6", padding: "0.2rem 0.5rem", fontSize: "0.5625rem", fontWeight: 900, textTransform: "uppercase", fontFamily: "Space Grotesk, sans-serif" }}>
                        {result.spread_result}
                      </span>
                    )}
                    <Link to={`/game/${gameHubSlug(a)}`} style={{ fontSize: "0.625rem", fontWeight: 700, color: S.orange, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "Space Grotesk, sans-serif" }}>Game Hub →</Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
