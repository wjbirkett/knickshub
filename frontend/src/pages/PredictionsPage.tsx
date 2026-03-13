import { useQuery } from "@tanstack/react-query"
import { getArticles } from "../utils/api"
import { Link } from "react-router-dom"
import { useState } from "react"

const TYPE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  prediction: { label: "PREDICTION", bg: "#0c1a4b", color: "#93c5fd" },
  best_bet:   { label: "BEST BET",   bg: "#14532d", color: "#86efac" },
  prop:       { label: "PROP BET",   bg: "#4a1d1d", color: "#fca5a5" },
}

function getBadge(type: string) {
  return TYPE_CONFIG[type] ?? { label: type?.toUpperCase() ?? "PREVIEW", bg: "#1f2937", color: "#9ca3af" }
}

export default function PredictionsPage() {
  const { data: articles, isLoading } = useQuery({ queryKey: ["articles"], queryFn: () => getArticles() })
  const [filter, setFilter] = useState<string>("all")

  const H1 = { fontFamily: "Bebas Neue, sans-serif", fontSize: "3rem", letterSpacing: "0.15em", color: "#F58426" }

  const filtered = (articles ?? []).filter((a: any) => filter === "all" || a.article_type === filter)

  const filterBtn = (val: string, label: string) => (
    <button
      onClick={() => setFilter(val)}
      style={{
        background: filter === val ? "#F58426" : "#1f2937",
        color: filter === val ? "#000" : "#9ca3af",
        border: "none", borderRadius: "999px",
        padding: "0.35rem 1rem", fontSize: "0.75rem",
        fontWeight: 700, cursor: "pointer", letterSpacing: "0.05em",
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ maxWidth: "900px" }}>
      <header style={{ borderBottom: "1px solid #1f2937", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
        <h1 style={H1}>PREDICTIONS & PICKS</h1>
        <p style={{ color: "#6b7280", margin: 0, fontSize: "0.875rem" }}>AI-powered Knicks game previews, odds analysis, and best bets</p>
      </header>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {filterBtn("all", "ALL")}
        {filterBtn("prediction", "PREDICTIONS")}
        {filterBtn("best_bet", "BEST BETS")}
        {filterBtn("prop", "PROP BETS")}
      </div>

      {isLoading && <p style={{ color: "#6b7280" }}>Loading articles...</p>}

      {!isLoading && filtered.length === 0 && (
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "#f9fafb", fontWeight: 600, margin: "0 0 0.5rem" }}>No articles yet</p>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: 0 }}>Check back before the next Knicks game</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {filtered.map((a: any) => {
          const badge = getBadge(a.article_type)
          return (
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
                    <span style={{ background: badge.bg, color: badge.color, padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700 }}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <p style={{ color: "#374151", fontSize: "0.7rem", marginTop: "1.5rem", textAlign: "center" }}>
        Predictions are for entertainment purposes only. Please bet responsibly. 21+
      </p>
    </div>
  )
}
