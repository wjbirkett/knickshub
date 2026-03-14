import { Helmet } from "react-helmet-async"
import { useQuery } from "@tanstack/react-query"
import { useParams, Link } from "react-router-dom"
import { useState } from "react"
import { getArticle, getArticles } from "../utils/api"

const TYPE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  prediction: { label: "PREDICTION", bg: "#0c1a4b", color: "#93c5fd" },
  best_bet:   { label: "BEST BET",   bg: "#14532d", color: "#86efac" },
  prop:       { label: "PROP BET",   bg: "#4a1d1d", color: "#fca5a5" },
}

function KeyPicksBox({ picks, articleType }: { picks: any; articleType: string }) {
  if (!picks) return null
  const isProp = articleType === "prop"

  if (isProp) {
    const leanColor = picks.lean === "OVER" ? "#4ade80" : "#f87171"
    const leanBg   = picks.lean === "OVER" ? "#14532d" : "#7f1d1d"
    const confColor = picks.confidence === "High" ? "#4ade80" : picks.confidence === "Medium" ? "#fbbf24" : "#f87171"
    return (
      <div style={{ background: "#0d1117", border: "1px solid #374151", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1.5rem" }}>
        <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1rem", letterSpacing: "0.1em", color: "#F58426", margin: "0 0 1rem" }}>🎯 KEY PICK</p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <PickCard label={`${picks.player} ${picks.prop_type}`} value={picks.pick} leanBg={leanBg} leanColor={leanColor} lean={picks.lean} />
          <div style={{ background: "#111827", borderRadius: "0.5rem", padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            <span style={{ color: "#6b7280", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Confidence</span>
            <span style={{ color: confColor, fontSize: "1rem", fontWeight: 700 }}>{picks.confidence}</span>
          </div>
        </div>
      </div>
    )
  }

  const totalLeanColor  = picks.total_lean === "OVER" ? "#4ade80" : "#f87171"
  const totalLeanBg     = picks.total_lean === "OVER" ? "#14532d" : "#7f1d1d"
  const spreadLeanColor = picks.spread_lean === "COVER" ? "#4ade80" : "#f87171"
  const spreadLeanBg    = picks.spread_lean === "COVER" ? "#14532d" : "#7f1d1d"
  const mlLeanColor     = picks.moneyline_lean === "WIN" ? "#4ade80" : "#f87171"
  const mlLeanBg        = picks.moneyline_lean === "WIN" ? "#14532d" : "#7f1d1d"
  const confColor       = picks.confidence === "High" ? "#4ade80" : picks.confidence === "Medium" ? "#fbbf24" : "#f87171"

  return (
    <div style={{ background: "#0d1117", border: "1px solid #374151", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1.5rem" }}>
      <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1rem", letterSpacing: "0.1em", color: "#F58426", margin: "0 0 1rem" }}>🎯 KEY PICKS AT A GLANCE</p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <PickCard label="Spread" value={picks.spread_pick} leanBg={spreadLeanBg} leanColor={spreadLeanColor} lean={picks.spread_lean} />
        <PickCard label="Moneyline" value={picks.moneyline_pick} leanBg={mlLeanBg} leanColor={mlLeanColor} lean={picks.moneyline_lean} />
        <PickCard label="Total" value={picks.total_pick} leanBg={totalLeanBg} leanColor={totalLeanColor} lean={picks.total_lean} />
        <div style={{ background: "#111827", borderRadius: "0.5rem", padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          <span style={{ color: "#6b7280", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Confidence</span>
          <span style={{ color: confColor, fontSize: "1rem", fontWeight: 700 }}>{picks.confidence}</span>
        </div>
      </div>
    </div>
  )
}

function PickCard({ label, value, lean, leanBg, leanColor }: { label: string; value: string; lean: string; leanBg: string; leanColor: string }) {
  return (
    <div style={{ background: "#111827", borderRadius: "0.5rem", padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.2rem", minWidth: "120px" }}>
      <span style={{ color: "#6b7280", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <span style={{ color: "#f9fafb", fontSize: "0.9rem", fontWeight: 700 }}>{value}</span>
      <span style={{ background: leanBg, color: leanColor, fontSize: "0.6rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: "999px", display: "inline-block", width: "fit-content" }}>{lean}</span>
    </div>
  )
}

function ShareButtons({ title, slug }: { title: string; slug: string }) {
  const [copied, setCopied] = useState(false)
  const url = `https://knickshub.vercel.app/predictions/${slug}`

  const tweetText = encodeURIComponent(`${title}\n\n${url}\n\n#Knicks #NBA #KnicksTape`)
  const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>Share:</span>
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          background: "#0d1117", border: "1px solid #1f2937",
          color: "#f9fafb", padding: "0.35rem 0.75rem",
          borderRadius: "0.4rem", fontSize: "0.75rem", fontWeight: 600,
          textDecoration: "none", transition: "border-color 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "#006BB6")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "#1f2937")}
      >
        𝕏 Post
      </a>
      <button
        onClick={handleCopy}
        style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          background: "#0d1117", border: "1px solid #1f2937",
          color: copied ? "#4ade80" : "#f9fafb",
          padding: "0.35rem 0.75rem", borderRadius: "0.4rem",
          fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        {copied ? "✓ Copied!" : "🔗 Copy Link"}
      </button>
    </div>
  )
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <span style={{ background: badge.bg, color: badge.color, padding: "0.2rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700 }}>{badge.label}</span>
            <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>{new Date(article.game_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
          </div>
          <ShareButtons title={article.title} slug={slug!} />
        </div>
      </div>

      {/* Key Picks Box */}
      <KeyPicksBox picks={article.key_picks} articleType={article.article_type} />

      <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "2rem", marginBottom: "1.5rem" }}>
        {renderContent(article.content)}
      </div>

      {/* Related Articles */}
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
