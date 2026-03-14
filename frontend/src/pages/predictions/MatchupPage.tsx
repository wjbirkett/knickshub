import { Helmet } from "react-helmet-async"
import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { getArticles } from "../utils/api"

export const TYPE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  prediction: { label: "PREDICTION", bg: "#0c1a4b", color: "#93c5fd" },
  best_bet:   { label: "BEST BET",   bg: "#14532d", color: "#86efac" },
  prop:       { label: "PROP BET",   bg: "#4a1d1d", color: "#fca5a5" },
  history:    { label: "HISTORY",    bg: "#2e1a4b", color: "#d8b4fe" },
}

function KeyPicksBox({ picks, articleType }: { picks: any; articleType: string }) {
  if (!picks || articleType === "history") return null

  return (
    <div style={{ background: "#0d1117", border: "1px solid #374151", borderRadius: "0.75rem", padding: "1rem", marginBottom: "1rem" }}>
      <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1rem", color: "#F58426", marginBottom: "0.75rem" }}>
        🎯 KEY PICKS AT A GLANCE
      </p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {picks.spread_pick && <PickCard label="Spread" value={picks.spread_pick} lean={picks.spread_lean} leanColor={picks.spread_lean === "COVER" ? "#4ade80" : "#f87171"} leanBg={picks.spread_lean === "COVER" ? "#14532d" : "#7f1d1d"} />}
        {picks.moneyline_pick && <PickCard label="Moneyline" value={picks.moneyline_pick} lean={picks.moneyline_lean} leanColor={picks.moneyline_lean === "WIN" ? "#4ade80" : "#f87171"} leanBg={picks.moneyline_lean === "WIN" ? "#14532d" : "#7f1d1d"} />}
        {picks.total_pick && <PickCard label="Total" value={picks.total_pick} lean={picks.total_lean} leanColor={picks.total_lean === "OVER" ? "#4ade80" : "#f87171"} leanBg={picks.total_lean === "OVER" ? "#14532d" : "#7f1d1d"} />}
      </div>
    </div>
  )
}

function PickCard({ label, value, lean, leanBg, leanColor }: { label: string; value: string; lean: string; leanBg: string; leanColor: string }) {
  return (
    <div style={{ background: "#111827", borderRadius: "0.5rem", padding: "0.5rem 1rem", minWidth: "120px", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
      <span style={{ color: "#6b7280", fontSize: "0.65rem", textTransform: "uppercase" }}>{label}</span>
      <span style={{ color: "#f9fafb", fontWeight: 700 }}>{value}</span>
      <span style={{ background: leanBg, color: leanColor, padding: "0.1rem 0.4rem", borderRadius: "999px", fontSize: "0.6rem", fontWeight: 700, width: "fit-content" }}>{lean}</span>
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
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>Share:</span>
      <a href={twitterUrl} target="_blank" rel="noopener noreferrer"
        style={{ background: "#0d1117", border: "1px solid #1f2937", color: "#f9fafb", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", fontSize: "0.75rem", fontWeight: 600 }}>
        𝕏 Post
      </a>
      <button onClick={handleCopy}
        style={{ background: "#0d1117", border: "1px solid #1f2937", color: copied ? "#4ade80" : "#f9fafb", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", fontSize: "0.75rem", fontWeight: 600 }}>
        {copied ? "✓ Copied!" : "🔗 Copy Link"}
      </button>
    </div>
  )
}

export default function MatchupPage() {
  const { matchup } = useParams<{ matchup: string }>()
  const { data: allArticles, isLoading } = useQuery({
    queryKey: ["articles"],
    queryFn: getArticles,
  })

  if (isLoading) return <p style={{ color: "#6b7280" }}>Loading...</p>
  if (!allArticles) return <p style={{ color: "#f87171" }}>No articles found.</p>

  const articles = allArticles.filter(a => a.matchup === matchup)
  const displayMatchup = matchup?.split("-").map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(" vs ")

  return (
    <div className="container mx-auto px-4 py-8" style={{ maxWidth: "780px" }}>
      <Helmet>
        <title>{displayMatchup} | KnicksHub</title>
      </Helmet>

      <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "2rem", color: "#F58426", marginBottom: "1rem" }}>{displayMatchup}: Predictions Archive</h1>

      {articles.length === 0 ? (
        <p>No articles yet for this matchup.</p>
      ) : (
        articles.map(article => (
          <div key={article.id} style={{ marginBottom: "1.5rem", border: "1px solid #374151", borderRadius: "0.75rem", padding: "1rem", background: "#0d1117" }}>
            <Link to={`/predictions/${article.slug}`} style={{ color: "#93c5fd", fontWeight: 700, fontSize: "1rem" }}>{article.title}</Link>
            <span style={{ display: "block", color: "#6b7280", fontSize: "0.75rem" }}>{new Date(article.game_date).toLocaleDateString()}</span>

            <KeyPicksBox picks={article.key_picks} articleType={article.article_type} />
            <ShareButtons title={article.title} slug={article.slug} />
          </div>
        ))
      )}

      <Link to="/predictions" style={{ color: "#6b7280", fontSize: "0.8rem", textDecoration: "none", display: "block", marginTop: "1rem" }}>← Back to Predictions</Link>
    </div>
  )
}