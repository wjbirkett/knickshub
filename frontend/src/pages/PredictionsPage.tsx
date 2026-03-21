import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { getArticles } from "../utils/api"

const S = {
  bg: "#131313", surface: "#1c1b1b", surfaceHigh: "#2a2a2a",
  surfaceHighest: "#353534", border: "rgba(255,255,255,0.08)",
  orange: "#F58426", peach: "#ffb786", green: "#4ae176",
  greenBg: "#06bb55", red: "#ffb4ab", redBg: "#93000a",
  blue: "#a0caff", blueBg: "#006bb6",
  text: "#e5e2e1", textMuted: "#ddc1b1",
}


const PLAYER_IMAGES: Record<string, string> = {
  "Jalen Brunson":       "/players/jalen.png",
  "Karl-Anthony Towns":  "/players/KAT.png",
  "Mikal Bridges":       "/players/mikal.png",
  "OG Anunoby":          "/players/OG.png",
  "Josh Hart":           "/players/josh.png",
  "Miles McBride":       "/players/miles.png",
  "Mitchell Robinson":   "/players/mitchell.png",
  "Jordan Clarkson":     "/players/jordan.png",
  "Jose Alvarado":       "/players/jose.png",
  "Landry Shamet":       "/players/landry.png",
  "Jeremy Sochan":       "/players/jeremy.png",
  "Tyler Kolek":         "/players/tyler.png",
  "Mohamed Diawara":     "/players/mohamed.png",
  "Pacome Dadiet":       "/players/pacome.png",
  "Ariel Hukporti":      "/players/ariel.png",
}
const getPlayerImage = (name: string): string | null => {
  if (!name) return null
  const key = Object.keys(PLAYER_IMAGES).find(k => name.toLowerCase().includes(k.toLowerCase().split(" ")[1]))
  return key ? PLAYER_IMAGES[key] : null
}

const BADGES: Record<string, { bg: string; color: string; label: string }> = {
  prediction: { bg: S.blueBg,  color: "#dbe9ff", label: "PREDICTION" },
  best_bet:   { bg: S.greenBg, color: "#00431a", label: "BEST BET" },
  prop:       { bg: S.redBg,   color: "#ffdad6", label: "PROP BET" },
  history:    { bg: "#4a1d96", color: "#d8b4fe", label: "HISTORY" },
}

const FILTERS = [
  { label: "ALL",         value: "all" },
  { label: "PREDICTIONS", value: "prediction" },
  { label: "BEST BETS",   value: "best_bet" },
  { label: "PROP BETS",   value: "prop" },
  { label: "HISTORY",     value: "history" },
]

// NBA stock images for cards by type
const CARD_IMAGES: string[] = [
  "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&q=80",
  "https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=600&q=80",
  "https://images.unsplash.com/photo-1608245449230-4ac19066d2d0?w=600&q=80",
  "https://images.unsplash.com/photo-1627627256672-027a4613d028?w=600&q=80",
  "https://images.unsplash.com/photo-1518063319789-7217e6706b04?w=600&q=80",
  "https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=600&q=80",
]
const FALLBACK_IMG = "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&q=80"

export default function PredictionsPage() {
  const [filter, setFilter] = useState("all")

  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles", 100],
    queryFn: () => getArticles(100),
  })

  const filtered = (articles as any[])?.filter((a: any) =>
    filter === "all" ? true : a.article_type === filter
  ) ?? []

  const opponents = Array.from(new Set(
    (articles as any[])?.filter((a: any) => a.article_type !== "history")
      .map((a: any) => a.home_team?.includes("Knicks") ? a.away_team : a.home_team)
      .filter(Boolean)
  )).sort() as string[]

  const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()

  const gameHubSlug = (a: any) => {
    const opp = a.home_team?.includes("Knicks") ? a.away_team : a.home_team
    const oppSlug = opp?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") ?? "unknown"
    const date = String(a.game_date).substring(0, 10)
    return `knicks-vs-${oppSlug}-${date}`
  }

  return (
    <div style={{ background: S.bg, minHeight: "100vh" }}>
      <Helmet>
        <title>Knicks Predictions Hub — AI Picks & Best Bets | KnicksHub</title>
        <meta name="description" content="All New York Knicks AI predictions, best bets, spread picks, and player props in one place. Filter by type and browse the full archive." />
        <link rel="canonical" href="https://knickshub.vercel.app/predictions" />
      </Helmet>

      {/* Hero Header */}
      <section style={{ position: "relative", height: "420px", display: "flex", alignItems: "flex-end", overflow: "hidden", background: "#0a0a0a" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <img
            src="https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1600&q=80"
            alt="Basketball court"
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.35, filter: "grayscale(80%) contrast(1.2)" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #131313 30%, rgba(19,19,19,0.5) 70%, transparent)" }} />
        </div>
        <div style={{ position: "relative", zIndex: 10, padding: "0 3rem 2.5rem", width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <span style={{ display: "inline-block", background: S.orange, color: "#5c2b00", padding: "0.25rem 0.75rem", fontSize: "0.625rem", fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "Space Grotesk, sans-serif", marginBottom: "1rem" }}>
              Featured Analysis
            </span>
            <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "clamp(3rem, 8vw, 6rem)", textTransform: "uppercase", letterSpacing: "-0.04em", lineHeight: 0.9, color: S.text, margin: 0 }}>
              Predictions <span style={{ color: S.peach, fontStyle: "italic" }}>Hub</span>
            </h1>
          </div>
          <p style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.25rem", color: S.textMuted, maxWidth: "280px", lineHeight: 1.3, textTransform: "uppercase", fontWeight: 700, textAlign: "right", display: "none" }}
            className="hero-subtitle">
            The Sharpest Picks for the Blue & Orange.
          </p>
        </div>
      </section>

      {/* Sticky Filter Bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(19,19,19,0.95)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${S.border}`, padding: "0.75rem 3rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.25rem" }}>
          {FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              style={{
                padding: "0.5rem 1.25rem",
                background: filter === value ? S.peach : "transparent",
                color: filter === value ? "#5c2b00" : S.textMuted,
                fontFamily: "Space Grotesk, sans-serif",
                fontWeight: 700, fontSize: "0.75rem",
                textTransform: "uppercase", letterSpacing: "0.1em",
                border: "none", cursor: "pointer",
                borderRadius: "999px", transition: "all 0.15s",
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* Article Grid */}
      <section style={{ padding: "2.5rem 3rem" }}>
        {isLoading ? (
          <p style={{ color: S.textMuted }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: S.textMuted }}>No articles found.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.5rem" }}>
            {filtered.map((a: any) => {
              const b = BADGES[a.article_type] ?? BADGES.prediction
              const imgIdx = filtered.indexOf(a) % CARD_IMAGES.length
              const playerImg = a.article_type === "prop" && a.player ? getPlayerImage(a.player) : null
              const img = playerImg ?? CARD_IMAGES[imgIdx] ?? FALLBACK_IMG
              return (
                <article key={a.slug} style={{ background: S.surface, overflow: "hidden", borderLeft: `1px solid ${S.border}`, transition: "transform 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}>
                  {/* Card Image */}
                  <div style={{ height: "180px", overflow: "hidden", position: "relative" }}>
                    <img src={img} alt={a.title} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%)", transition: "filter 0.4s" }}
                      onMouseEnter={e => ((e.target as HTMLImageElement).style.filter = "grayscale(0%)")}
                      onMouseLeave={e => ((e.target as HTMLImageElement).style.filter = "grayscale(100%)")}
                    />
                  </div>
                  {/* Card Body */}
                  <div style={{ padding: "1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      <span style={{ background: b.bg, color: b.color, padding: "0.2rem 0.5rem", fontSize: "0.5625rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "Space Grotesk, sans-serif" }}>
                        {b.label}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.625rem", color: S.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "0.5rem", fontFamily: "Space Grotesk, sans-serif" }}>
                      {fmt(a.game_date)}
                    </p>
                    <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 800, fontSize: "1.25rem", textTransform: "uppercase", lineHeight: 1.2, marginBottom: "0.75rem", color: S.text }}>
                      {a.title.replace(/\s*\([\d-]+\)\s*$/, "").replace(/AI Prediction,?\s*/i, "").replace(/Best Bets & Player Props/i, "").trim()}
                    </h3>
                    {a.key_picks && (
                      <p style={{ fontSize: "0.8125rem", color: S.textMuted, lineHeight: 1.5, marginBottom: "1rem" }}>
                        {a.key_picks.spread_pick && `Spread: ${a.key_picks.spread_pick} · `}
                        {a.key_picks.total_pick && `Total: ${a.key_picks.total_pick}`}
                        {a.key_picks.pick && `${a.key_picks.lean} ${a.key_picks.pick}`}
                      </p>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <Link to={`/predictions/${a.slug}`} style={{
                        background: S.surfaceHigh, color: S.text, padding: "0.75rem",
                        textAlign: "center", fontSize: "0.75rem", fontWeight: 900,
                        textTransform: "uppercase", letterSpacing: "0.1em",
                        textDecoration: "none", fontFamily: "Space Grotesk, sans-serif",
                        transition: "background 0.15s",
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = S.surfaceHighest)}
                        onMouseLeave={e => (e.currentTarget.style.background = S.surfaceHigh)}
                      >Read</Link>
                      <Link to={`/game/${gameHubSlug(a)}`} style={{
                        background: S.surfaceHigh, color: S.text, padding: "0.75rem",
                        textAlign: "center", fontSize: "0.75rem", fontWeight: 900,
                        textTransform: "uppercase", letterSpacing: "0.1em",
                        textDecoration: "none", fontFamily: "Space Grotesk, sans-serif",
                        transition: "background 0.15s",
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = S.surfaceHighest)}
                        onMouseLeave={e => (e.currentTarget.style.background = S.surfaceHigh)}
                      >Game Hub</Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Matchup Archives */}
      {opponents.length > 0 && (
        <section style={{ padding: "3rem", background: "#0e0e0e" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "2rem" }}>
            <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "2rem", textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", color: S.text, whiteSpace: "nowrap" }}>
              Matchup <span style={{ color: S.peach }}>Archives</span>
            </h2>
            <div style={{ flex: 1, height: "1px", background: "rgba(86,67,54,0.3)" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem" }}>
            {opponents.map((opp) => (
              <Link key={opp} to={`/matchup/${opp.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`}
                style={{ border: `1px solid ${S.border}`, padding: "0.875rem", textDecoration: "none", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = S.surfaceHigh)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <p style={{ fontSize: "0.5625rem", color: S.textMuted, opacity: 0.5, fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.25rem" }}>Matchup</p>
                <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, textTransform: "uppercase", color: S.text, fontSize: "0.875rem" }}>{opp.split(" ").pop()}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer style={{ background: S.bg, borderTop: `1px solid ${S.border}`, padding: "2.5rem 3rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <p style={{ fontSize: "0.625rem", fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em", color: S.textMuted, opacity: 0.6 }}>© 2026 KnicksHub. Responsible Gaming Only.</p>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            {[["About", "/about"], ["Privacy", "/privacy"], ["Terms", "/terms"]].map(([label, to]) => (
              <Link key={to} to={to} style={{ fontSize: "0.625rem", fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em", color: S.textMuted, opacity: 0.5, textDecoration: "none" }}>{label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
