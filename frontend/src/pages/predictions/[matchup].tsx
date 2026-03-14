import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { getArticle, getArticles } from "../../utils/api"
import { TYPE_CONFIG } from "./ArticlePage"

export default function MatchupPage() {
  const { matchup } = useParams<{ matchup: string }>()
  const { data: article, isLoading } = useQuery({
    queryKey: ["article", matchup],
    queryFn: () => getArticle(matchup!),
    enabled: !!matchup,
  })

  const { data: allArticles } = useQuery({
    queryKey: ["articles"],
    queryFn: () => getArticles(),
  })

  const [filter, setFilter] = useState("ALL")

  if (isLoading) return <p style={{ color: "#6b7280" }}>Loading...</p>
  if (!article) return <p style={{ color: "#f87171" }}>Article not found.</p>

  const related = (allArticles ?? []).filter(
    (a: any) => a.game_date === article.game_date && a.slug !== matchup
  )

  return (
    <div style={{ maxWidth: "780px" }}>
      <Link to="/predictions" style={{ color: "#6b7280", fontSize: "0.8rem", textDecoration: "none", display: "block", marginBottom: "1rem" }}>
        ← Back to Predictions
      </Link>
      <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "2.5rem", color: "#F58426" }}>
        {article.title}
      </h1>
      <p>{article.article_type}</p>
      {related.length > 0 && (
        <div>
          <h2>More for this game</h2>
          {related.map((a: any) => (
            <Link key={a.slug} to={`/predictions/${a.slug}`}>
              <p>{a.title}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}