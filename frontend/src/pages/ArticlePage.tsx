import { Helmet } from "react-helmet-async"
import { useQuery } from "@tanstack/react-query"
import { useParams, Link } from "react-router-dom"
import { getArticle, getArticles } from "../utils/api"

const TYPE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  prediction: { label: "PREDICTION", bg: "#0c1a4b", color: "#93c5fd" },
  best_bet:   { label: "BEST BET",   bg: "#14532d", color: "#86efac" },
  prop:       { label: "PROP BET",   bg: "#4a1d1d", color: "#fca5a5" },
}

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: article, isLoading } = useQuery({
    queryKey: ["article", slug],
    queryFn: () => getArticle(slug!),
    enabled: !!slug,
  })
  const { data: allArticles } = useQuery({
    queryKey: ["articles"],
    queryFn: () => getArticles(),
  })

  if (isLoading) return <p style={{ color: "#6b7280" }}>Loading...</p>
  if (!article) return <p style={{ color: "#f87171" }}>Article not found.</p>

  const opponent = article.home_team === "New York Knicks" ? article.away_team : article.home_team
  const formattedDate = new Date(article.game_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  const description = `Knicks vs ${opponent} prediction, odds, and best bet for ${formattedDate}. Expert analysis, injury report, and picks from KnicksHub.`
  const badge = TYPE_CONFIG[article.article_type] ?? { label: article.article_type?.toUpperCase() ?? "PREVIEW", bg: "#1f2937", color: "#9ca3af" }

  // Related articles: same game date, different slug
  const related = (allArticles ?? []).filter(
    (a: any) => a.game_date === article.game_date && a.slug !== slug
  )

  const renderContent = (content: string) =>
    content.split("\n").map((line, i) => {
      if (line.startsWith("## ")) return <h2 key={i} style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1.5rem", letterSpacing: "0.1em", color: "#F58426", margin: "1.5rem 0 0.75rem" }}>{line.replace("## ", "")}</h2>
      if (line.startsWith("# ")) return <h1 key={i} style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "2rem", letterSpacing: "0.1em", color: "#F58426", margin: "1.5rem 0 0.75rem" }}>{line.replace("# ", "")}</h1>
      if (line.trim() === "") return <br key={i} />
      return <p key={i} style={{ color: "#d1d5db", lineHeight: 1.75, margin: "0 0 0.75rem", fontSize: "0.95rem" }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
    })

  return (
    <div style={{ maxWidth: "780px" }}>
      <Helmet>
        <title>{article.title} | KnicksHub</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="article" />
        <link rel="canonical" href={`https://knickshub.vercel.app/predictions/${slug}`} />
      </Helmet>

      <Link to="/predictions" style={{ color: "#6b7280", fontSize: "0.8rem", textDecoration: "none", display: "block", marginBottom: "1rem" }}>← Back to Predictions</Link>

      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "2.5rem", letterSpacing: "0.1em", color: "#F58426", lineHeight: 1.2 }}>{article.title}</h1>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "0.75rem" }}>
          <span style={{ background: badge.bg, color: badge.color, padding: "0.2rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700 }}>{badge.label}</span>
          <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>{new Date(article.game_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
        </div>
      </div>

      <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "2rem", marginBottom: "1.5rem" }}>
        {renderContent(article.content)}
      </div>

      {/* Related Articles — internal linking for SEO */}
      {related.length > 0 && (
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1rem", letterSpacing: "0.1em", color: "#F58426", margin: "0 0 0.75rem" }}>MORE FOR THIS GAME</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {related.map((a: any) => {
              const rb = TYPE_CONFIG[a.article_type] ?? { label: a.article_type?.toUpperCase(), bg: "#1f2937", color: "#9ca3af" }
              return (
                <Link key={a.slug} to={`/predictions/${a.slug}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ background: rb.bg, color: rb.color, padding: "0.15rem 0.6rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 }}>{rb.label}</span>
                  <span style={{ color: "#d1d5db", fontSize: "0.875rem" }}>{a.title}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* DraftKings CTA */}
      <div style={{ background: "#0c1a4b", border: "1px solid #1d4ed8", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p style={{ color: "#f9fafb", fontWeight: 700, margin: "0 0 0.25rem" }}>Ready to bet on the Knicks?</p>
          <p style={{ color: "#93c5fd", fontSize: "0.8rem", margin: 0 }}>Get a welcome bonus at DraftKings Sportsbook</p>
        </div>
        <a href="https://www.draftkings.com" target="_blank" rel="noopener noreferrer" style={{ background: "#F58426", color: "#000", padding: "0.6rem 1.25rem", borderRadius: "0.5rem", fontWeight: 700, fontSize: "0.875rem", textDecoration: "none" }}>
          Bet at DraftKings →
        </a>
      </div>

      <p style={{ color: "#374151", fontSize: "0.7rem", textAlign: "center" }}>
        Predictions are for entertainment purposes only. Must be 21+ and located in a state where sports betting is legal. Please bet responsibly.
      </p>
    </div>
  )
}
