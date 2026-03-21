import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Helmet } from "react-helmet-async"
import { getArticle, getArticles, getResults } from "../utils/api"
import ReactMarkdown from "react-markdown"

const S = {
  bg: "#131313", surface: "#1c1b1b", surfaceHigh: "#2a2a2a",
  surfaceHighest: "#353534", border: "rgba(255,255,255,0.08)",
  orange: "#F58426", peach: "#ffb786", green: "#4ae176",
  greenBg: "#06bb55", red: "#ffb4ab", redBg: "#93000a",
  blue: "#a0caff", blueBg: "#006bb6",
  text: "#e5e2e1", textMuted: "#ddc1b1",
}

export const TYPE_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  prediction: { bg: S.blueBg,  color: "#dbe9ff", label: "PREDICTION" },
  best_bet:   { bg: S.greenBg, color: "#00431a", label: "BEST BET" },
  prop:       { bg: S.redBg,   color: "#ffdad6", label: "PROP BET" },
  history:    { bg: "#4a1d96", color: "#d8b4fe", label: "HISTORY" },
}

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=1600https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1600&q=80q=80",
  "https://images.unsplash.com/photo-1608245449230-4ac19066d2d0?w=1600https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=1600&q=80q=80",
  "https://images.unsplash.com/photo-1608245449230-4ac19066d2d0?w=1600&q=80",
  "https://images.unsplash.com/photo-1627627256672-027a4613d028?w=1600&q=80",
]

// Decode common UTF-8 mojibake
function decodeContent(text: string): string {
  return text
    .replace(/â€"/g, "—").replace(/â€™/g, "'").replace(/â€œ/g, '"')
    .replace(/â€/g, '"').replace(/â€˜/g, "'").replace(/â€¦/g, "…")
    .replace(/Â·/g, "·").replace(/Ã©/g, "é")
}

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>()

  const { data: article, isLoading, error } = useQuery({
    queryKey: ["article", slug],
    queryFn: () => getArticle(slug!),
    enabled: !!slug,
  })

  const { data: allArticles } = useQuery({
    queryKey: ["articles", 20],
    queryFn: () => getArticles(20),
  })

  const { data: resultsData } = useQuery({
    queryKey: ["results"],
    queryFn: getResults,
  })

  if (isLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: S.textMuted }}>
      Loading...
    </div>
  )

  if (error || !article) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "1rem" }}>
      <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "2rem", color: S.text }}>Article not found.</h2>
      <Link to="/predictions" style={{ color: S.orange, textDecoration: "none", fontWeight: 700 }}>← Back to Predictions</Link>
    </div>
  )

  const badge = TYPE_CONFIG[article.article_type] ?? TYPE_CONFIG.prediction
  const picks = article.key_picks
  const heroImg = HERO_IMAGES[Math.abs(slug!.length % HERO_IMAGES.length)]
  const description = article.content?.replace(/[#*]/g, "").slice(0, 160) + "..."

  // Related articles (same game date or same type, excluding current)
  const related = (allArticles as any[])?.filter((a: any) =>
    a.slug !== slug && (a.game_date === article.game_date || a.article_type === article.article_type)
  ).slice(0, 3) ?? []

  // Find result for this article
  const predResults = (resultsData as any)?.predictions ?? []
  const propResults = (resultsData as any)?.props ?? []
  const result = [...predResults, ...propResults].find((r: any) => r.slug === slug)

  const opp = article.home_team?.includes("Knicks") ? article.away_team : article.home_team

  return (
    <div style={{ background: S.bg, minHeight: "100vh" }}>
      <Helmet>
        <title>{article.title} | KnicksHub</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="article" />
        <link rel="canonical" href={`https://knickshub.vercel.app/predictions/${slug}`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": article.title,
          "description": description,
          "publisher": { "@type": "Organization", "name": "KnicksHub", "url": "https://knickshub.vercel.app" },
          "datePublished": article.created_at,
          "mainEntityOfPage": { "@type": "WebPage", "@id": `https://knickshub.vercel.app/predictions/${slug}` }
        })}</script>
      </Helmet>

      {/* Hero Header */}
      <section style={{ position: "relative", height: "clamp(360px, 50vw, 580px)", display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <img src={heroImg} alt={article.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.5, filter: "grayscale(60%) contrast(1.1)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #131313 35%, rgba(19,19,19,0.55) 65%, rgba(19,19,19,0.2) 100%)" }} />
        </div>

        <div style={{ position: "relative", zIndex: 10, padding: "0 3rem 2.5rem", width: "100%", maxWidth: "900px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            <span style={{ background: badge.bg, color: badge.color, padding: "0.25rem 0.75rem", fontSize: "0.625rem", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "Space Grotesk, sans-serif" }}>
              {badge.label}
            </span>
            {picks?.confidence && (
              <span style={{ background: picks.confidence === "High" ? S.greenBg : S.surfaceHigh, color: picks.confidence === "High" ? "#00431a" : S.textMuted, padding: "0.25rem 0.75rem", fontSize: "0.625rem", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "Space Grotesk, sans-serif" }}>
                {picks.confidence.toUpperCase()} CONF
              </span>
            )}
            {result && (
              <span style={{ background: result.result === "HIT" || result.spread_result === "HIT" ? S.greenBg : S.redBg, color: result.result === "HIT" || result.spread_result === "HIT" ? "#00431a" : "#ffdad6", padding: "0.25rem 0.75rem", fontSize: "0.625rem", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "Space Grotesk, sans-serif" }}>
                {result.result || result.spread_result}
              </span>
            )}
          </div>

          <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "clamp(1.75rem, 5vw, 3.5rem)", letterSpacing: "-0.03em", lineHeight: 1, color: S.text, textTransform: "uppercase", margin: "0 0 1.5rem" }}>
            {article.title.replace(/\s*\([\d-]+\)\s*$/, "")}
          </h1>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.1)", color: S.text, padding: "0.5rem 1rem", fontFamily: "Space Grotesk, sans-serif", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", border: "none", cursor: "pointer", borderRadius: "0.25rem" }}
              onClick={() => navigator.share?.({ title: article.title, url: window.location.href }) || navigator.clipboard?.writeText(window.location.href)}>
              <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>share</span> Share
            </button>
            <button style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.1)", color: S.text, padding: "0.5rem 1rem", fontFamily: "Space Grotesk, sans-serif", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", border: "none", cursor: "pointer", borderRadius: "0.25rem" }}
              onClick={() => navigator.clipboard?.writeText(window.location.href)}>
              <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>link</span> Copy Link
            </button>
          </div>
        </div>
      </section>

      {/* Article Body + Sidebar */}
      <section style={{ maxWidth: "1400px", margin: "0 auto", padding: "3rem", display: "grid", gridTemplateColumns: "1fr 340px", gap: "3rem", alignItems: "start" }}>

        {/* Main Content */}
        <div>
          <style>{`
            .article-body h1 { font-family: 'Space Grotesk', sans-serif; font-weight: 900; font-size: 2rem; text-transform: uppercase; letter-spacing: -0.02em; color: ${S.peach}; margin: 2.5rem 0 1rem; line-height: 1.1; }
            .article-body h2 { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1.375rem; text-transform: uppercase; letter-spacing: -0.01em; color: ${S.peach}; margin: 2rem 0 0.75rem; }
            .article-body h3 { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1.125rem; color: ${S.text}; margin: 1.5rem 0 0.5rem; }
            .article-body p { color: ${S.textMuted}; font-size: 1.0625rem; line-height: 1.75; margin-bottom: 1.25rem; font-family: 'Inter', sans-serif; }
            .article-body strong { color: ${S.text}; font-weight: 700; }
            .article-body ul, .article-body ol { color: ${S.textMuted}; padding-left: 1.5rem; margin-bottom: 1.25rem; }
            .article-body li { margin-bottom: 0.5rem; line-height: 1.6; font-family: 'Inter', sans-serif; font-size: 1rem; }
            .article-body blockquote { border-left: 4px solid ${S.orange}; padding: 1rem 1.5rem; background: ${S.surface}; margin: 1.5rem 0; font-style: italic; color: ${S.text}; font-size: 1.125rem; font-family: 'Space Grotesk', sans-serif; font-weight: 500; }
          `}</style>
          <div className="article-body">
            <ReactMarkdown>{decodeContent(article.content || "")}</ReactMarkdown>
          </div>

          {/* Responsible Gambling */}
          <div style={{ marginTop: "3rem", padding: "1.25rem", background: S.surface, borderLeft: `4px solid ${S.orange}` }}>
            <p style={{ fontSize: "0.8125rem", color: S.textMuted, margin: 0, lineHeight: 1.6, fontFamily: "Inter, sans-serif" }}>
              <strong style={{ color: S.peach }}>Bet Responsibly.</strong> Sports betting is for entertainment only. Never bet more than you can afford to lose.
              Help: <a href="tel:18005224700" style={{ color: S.orange, fontWeight: 700 }}>1-800-522-4700</a> (National) ·{" "}
              <a href="tel:18887897777" style={{ color: S.orange, fontWeight: 700 }}>1-888-789-7777</a> (CT). Must be 21+.
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", position: "sticky", top: "1rem" }}>

          {/* Key Picks Box */}
          {picks && (picks.spread_pick || picks.pick) && (
            <div style={{ background: S.surfaceHigh, padding: "1.5rem", boxShadow: "0 24px 48px rgba(0,0,0,0.4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "-0.01em", color: S.text, margin: 0 }}>Key Picks</h3>
                <span className="material-symbols-outlined" style={{ color: S.orange, fontSize: "1.25rem" }}>verified</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {picks.spread_pick && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.875rem 1rem", background: S.surfaceHighest }}>
                    <div>
                      <p style={{ fontSize: "0.5625rem", color: S.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 0.25rem", fontFamily: "Space Grotesk, sans-serif" }}>Spread</p>
                      <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, color: S.text, margin: 0 }}>{picks.spread_pick}</p>
                    </div>
                    <span style={{ fontSize: "0.625rem", fontWeight: 900, color: picks.spread_lean === "COVER" ? S.green : S.red, textTransform: "uppercase", fontFamily: "Space Grotesk, sans-serif" }}>{picks.spread_lean}</span>
                  </div>
                )}
                {picks.total_pick && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.875rem 1rem", background: S.surfaceHighest }}>
                    <div>
                      <p style={{ fontSize: "0.5625rem", color: S.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 0.25rem", fontFamily: "Space Grotesk, sans-serif" }}>Total</p>
                      <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, color: S.text, margin: 0 }}>{picks.total_pick}</p>
                    </div>
                    <span style={{ fontSize: "0.625rem", fontWeight: 900, color: picks.total_lean === "OVER" ? S.green : S.red, textTransform: "uppercase", fontFamily: "Space Grotesk, sans-serif" }}>{picks.total_lean}</span>
                  </div>
                )}
                {picks.moneyline_pick && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.875rem 1rem", background: S.surfaceHighest, border: `2px solid rgba(245,132,38,0.2)` }}>
                    <div>
                      <p style={{ fontSize: "0.5625rem", color: S.orange, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 0.25rem", fontFamily: "Space Grotesk, sans-serif" }}>Best Bet (ML)</p>
                      <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, color: S.text, margin: 0 }}>{picks.moneyline_pick}</p>
                    </div>
                    <span style={{ fontSize: "0.625rem", fontWeight: 900, color: picks.moneyline_lean === "WIN" ? S.green : S.red, textTransform: "uppercase", fontFamily: "Space Grotesk, sans-serif" }}>{picks.moneyline_lean}</span>
                  </div>
                )}
                {picks.pick && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.875rem 1rem", background: S.surfaceHighest, border: `2px solid rgba(245,132,38,0.2)` }}>
                    <div>
                      <p style={{ fontSize: "0.5625rem", color: S.orange, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 0.25rem", fontFamily: "Space Grotesk, sans-serif" }}>Best Prop Bet</p>
                      <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, color: S.text, margin: 0 }}>{picks.pick}</p>
                    </div>
                    <span style={{ fontSize: "0.625rem", fontWeight: 900, color: picks.lean === "OVER" ? S.green : S.red, textTransform: "uppercase", fontFamily: "Space Grotesk, sans-serif" }}>{picks.lean}</span>
                  </div>
                )}
              </div>
              <a href="https://www.draftkings.com" target="_blank" rel="noopener noreferrer" style={{
                display: "block", width: "100%", marginTop: "1rem", padding: "0.875rem",
                background: "linear-gradient(135deg, #F58426, #ffb786)", color: "#5c2b00",
                fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, textTransform: "uppercase",
                letterSpacing: "0.15em", fontSize: "0.8125rem", textAlign: "center",
                textDecoration: "none", fontStyle: "italic", boxSizing: "border-box"
              }}>Tail This Pick</a>
            </div>
          )}

          {/* Related Articles */}
          {related.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.15em", color: S.textMuted, margin: 0 }}>More For This Game</h3>
              {related.map((a: any) => {
                const b = TYPE_CONFIG[a.article_type] ?? TYPE_CONFIG.prediction
                return (
                  <Link key={a.slug} to={`/predictions/${a.slug}`} style={{ display: "flex", gap: "0.75rem", alignItems: "center", textDecoration: "none", padding: "0.5rem", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = S.surfaceHigh)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ width: "3.5rem", height: "3.5rem", background: S.surfaceHigh, flexShrink: 0, overflow: "hidden" }}>
                      <img src={HERO_IMAGES[related.indexOf(a) % HERO_IMAGES.length]} alt={a.title} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(80%)" }} />
                    </div>
                    <div>
                      <span style={{ display: "inline-block", background: b.bg, color: b.color, padding: "0.1rem 0.375rem", fontSize: "0.5rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.25rem", fontFamily: "Space Grotesk, sans-serif" }}>{b.label}</span>
                      <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.8125rem", textTransform: "uppercase", color: S.text, margin: 0, lineHeight: 1.3 }}>{a.title.replace(/\s*\([\d-]+\)\s*$/, "").slice(0, 60)}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Game Info */}
          <div style={{ background: S.surface, padding: "1.25rem" }}>
            <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.15em", color: S.textMuted, marginBottom: "0.75rem" }}>Game Info</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[
                ["Date", new Date(article.game_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })],
                ["Matchup", `${article.away_team} @ ${article.home_team}`],
                opp ? ["Opponent", opp] : null,
              ].filter(Boolean).map(([label, value]: any) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.625rem", color: S.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "Space Grotesk, sans-serif" }}>{label}</span>
                  <span style={{ fontSize: "0.75rem", color: S.text, fontWeight: 600, fontFamily: "Inter, sans-serif", textAlign: "right" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
