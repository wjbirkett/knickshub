import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { getArticles } from "../utils/api"
import { TYPE_CONFIG } from "./ArticlePage"

export default function PredictionsPage() {
  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles", 100],
    queryFn: () => getArticles(100),
  })

  const [filter, setFilter] = useState("ALL")
  const filters = ["ALL", "PREDICTIONS", "BEST BETS", "PROP BETS", "HISTORY"]

  const typeMap: Record<string, string> = {
    "PREDICTIONS": "prediction",
    "BEST BETS": "best_bet",
    "PROP BETS": "prop",
    "HISTORY": "history",
  }

  const filtered = (articles ?? []).filter((a: any) =>
    filter === "ALL" ? true : a.article_type === typeMap[filter]
  )

  return (
    <div style={{ maxWidth: "900px" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "3rem", letterSpacing: "0.15em", color: "#F58426", margin: 0 }}>
          PREDICTIONS
        </h1>
        <p style={{ color: "#6b7280", margin: "0.25rem 0 0", fontSize: "0.875rem" }}>Daily Knicks picks, best bets, props, and history.</p>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: "0.4rem 1rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700,
              cursor: "pointer", border: "1px solid",
              background: filter === f ? "#1d4ed8" : "transparent",
              color: filter === f ? "#fff" : "#6b7280",
              borderColor: filter === f ? "#1d4ed8" : "#374151",
              transition: "all 0.15s",
            }}
          >{f}</button>
        ))}
      </div>

      {isLoading && <p style={{ color: "#6b7280" }}>Loading...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {filtered.map((a: any) => {
          const badge = TYPE_CONFIG[a.article_type] ?? { label: "PREVIEW", bg: "#1f2937", color: "#9ca3af" }
          return (
            <Link key={a.slug} to={`/predictions/${a.slug}`} style={{ textDecoration: "none" }}>
              <div
                style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1rem", display: "flex", alignItems: "flex-start", gap: "0.75rem", transition: "border-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#006BB6")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#1f2937")}
              >
                <span style={{ background: badge.bg, color: badge.color, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", padding: "0.2rem 0.6rem", borderRadius: "999px", flexShrink: 0, marginTop: "0.1rem" }}>
                  {badge.label}
                </span>
                <div>
                  <p style={{ color: "#f9fafb", fontWeight: 600, fontSize: "0.875rem", margin: "0 0 0.25rem", lineHeight: 1.4 }}>{a.title}</p>
                  <p style={{ color: "#4b5563", fontSize: "0.72rem", margin: 0 }}>
                    {new Date(a.game_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
