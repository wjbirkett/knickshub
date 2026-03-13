import { useQuery } from "@tanstack/react-query"
import { getArticles } from "../utils/api"
import { Link } from "react-router-dom"

export default function PredictionsPage() {
  const { data: articles, isLoading } = useQuery({ queryKey: ["articles"], queryFn: () => getArticles() })
  const H1 = { fontFamily: "Bebas Neue, sans-serif", fontSize: "3rem", letterSpacing: "0.15em", color: "#F58426" }

  return (
    <div style={{ maxWidth: "900px" }}>
      <header style={{ borderBottom: "1px solid #1f2937", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
        <h1 style={H1}>PREDICTIONS & PICKS</h1>
        <p style={{ color: "#6b7280", margin: 0, fontSize: "0.875rem" }}>AI-powered Knicks game previews, odds analysis, and best bets</p>
      </header>

      {isLoading && <p style={{ color: "#6b7280" }}>Loading articles...</p>}

      {!isLoading && (!articles || articles.length === 0) && (
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "#f9fafb", fontWeight: 600, margin: "0 0 0.5rem" }}>No predictions yet</p>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: 0 }}>Check back before the next Knicks game</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {(articles ?? []).map((a: any) => (
          <Link key={a.slug} to={`/predictions/${a.slug}`} style={{ textDecoration: "none" }}>
            <div
              style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem", transition: "border-color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#F58426")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#1f2937")}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: "#f9fafb", fontWeight: 700, fontSize: "1.05rem", margin: "0 0 0.5rem", lineHeight: 1.4 }}>{a.title}</p>
                  <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: "0 0 0.75rem" }}>
                    {new Date(a.game_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </p>
                  <p style={{ color: "#9ca3af", fontSize: "0.85rem", margin: 0, lineHeight: 1.5 }}>
                    {a.content.replace(/#{1,6}\s/g, "").replace(/\*\*/g, "").slice(0, 200)}...
                  </p>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <span style={{ background: "#0c1a4b", color: "#93c5fd", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700 }}>
                    {a.article_type?.toUpperCase() ?? "PREVIEW"}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <p style={{ color: "#374151", fontSize: "0.7rem", marginTop: "1.5rem", textAlign: "center" }}>
        Predictions are for entertainment purposes only. Please bet responsibly. 21+
      </p>
    </div>
  )
}