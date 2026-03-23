import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Helmet } from "react-helmet-async"
import { getArticles, getResults } from "../utils/api"
import { getPlayerImage } from "../utils/playerImages"

const S = {
  bg: "#131313", surface: "#1c1b1b", surfaceHigh: "#2a2a2a",
  surfaceHighest: "#353534", border: "rgba(255,255,255,0.08)",
  orange: "#F58426", peach: "#ffb786", green: "#4ae176",
  greenBg: "#06bb55", red: "#ffb4ab", redBg: "#93000a",
  text: "#e5e2e1", textMuted: "#ddc1b1",
}

const PLAYER_NAMES: Record<string, string> = {
  "jalen-brunson":      "Jalen Brunson",
  "karl-anthony-towns": "Karl-Anthony Towns",
  "mikal-bridges":      "Mikal Bridges",
  "og-anunoby":         "OG Anunoby",
  "josh-hart":          "Josh Hart",
  "miles-mcbride":      "Miles McBride",
  "mitchell-robinson":  "Mitchell Robinson",
  "jordan-clarkson":    "Jordan Clarkson",
}

const PROP_LABELS: Record<string, string> = {
  points: "PTS", rebounds: "REB", assists: "AST",
  threes: "3PM", steals: "STL", blocks: "BLK", pts_reb_ast: "PRA",
}

export default function PlayerArchivePage() {
  const { player } = useParams<{ player: string }>()
  const playerName = PLAYER_NAMES[player ?? ""] ?? ""
  const heroImg = getPlayerImage(playerName)

  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles", 200],
    queryFn: () => getArticles(200),
  })
  const { data: resultsData } = useQuery({ queryKey: ["results"], queryFn: getResults })

  const propResults: any[] = (resultsData as any)?.props ?? []

  const propArticles = (articles as any[])?.filter((a: any) =>
    a.article_type === "prop" && a.player === playerName
  ).sort((a: any, b: any) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime()) ?? []

  const results = propResults.filter(r => r.player === playerName)
  const hits = results.filter(r => r.result === "HIT").length
  const total = results.length
  const pct = total > 0 ? Math.round(hits / total * 100) : null
  const pctColor = pct === null ? S.textMuted : pct >= 65 ? S.green : pct >= 50 ? S.peach : S.red

  // Per prop-type breakdown
  const propTypes = Array.from(new Set(propArticles.map((a: any) => a.prop_type).filter(Boolean)))
  const propBreakdown = propTypes.map(pt => {
    const ptResults = results.filter(r => r.prop_type === pt)
    const ptHits = ptResults.filter(r => r.result === "HIT").length
    return { pt, hits: ptHits, total: ptResults.length }
  }).filter(p => p.total > 0)

  const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()
  const getResult = (slug: string) => propResults.find(r => r.slug === slug)

  if (!playerName) return (
    <div className="main-content" style={{ background: S.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: S.textMuted, fontFamily: "Space Grotesk, sans-serif" }}>Player not found.</p>
    </div>
  )

  return (
    <div className="main-content" style={{ background: S.bg, minHeight: "100vh" }}>
      <Helmet>
        <title>{playerName} Prop Picks & Archive | KnicksHub</title>
        <meta name="description" content={`All KnicksHub AI prop picks for ${playerName} — tracked, graded, and archived.`} />
        <link rel="canonical" href={`https://knickshub.com/props/${player}`} />
      </Helmet>

      {/* Back link */}
      <div style={{ padding: "1rem 2.5rem", background: S.bg }}>
        <Link to="/props" style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: S.textMuted, textDecoration: "none", opacity: 0.6, display: "inline-flex", alignItems: "center", gap: "0.375rem" }}>
          ← All Props
        </Link>
      </div>

      {/* Hero */}
      <div style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: "2rem 2.5rem", display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
        <img src={heroImg} alt={playerName} style={{ width: "5rem", height: "5rem", borderRadius: "50%", objectFit: "cover", border: `2px solid ${S.orange}` }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: S.orange, margin: "0 0 0.25rem" }}>Prop Archive</p>
          <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "clamp(1.75rem, 4vw, 3rem)", textTransform: "uppercase", letterSpacing: "-0.03em", color: S.text, margin: 0, fontStyle: "italic" }}>{playerName}</h1>
        </div>
        {/* Stats */}
        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <span style={{ display: "block", fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "2rem", color: S.text }}>{hits}-{total - hits}</span>
            <span style={{ fontSize: "0.5625rem", color: S.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>W-L RECORD</span>
          </div>
          {pct !== null && (
            <div style={{ textAlign: "center" }}>
              <span style={{ display: "block", fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "2rem", color: pctColor }}>{pct}%</span>
              <span style={{ fontSize: "0.5625rem", color: S.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>HIT RATE</span>
            </div>
          )}
          <div style={{ textAlign: "center" }}>
            <span style={{ display: "block", fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "2rem", color: S.peach }}>{propArticles.length}</span>
            <span style={{ fontSize: "0.5625rem", color: S.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>ARTICLES</span>
          </div>
        </div>
      </div>

      <div style={{ padding: "2rem 2.5rem", maxWidth: "900px" }}>

        {/* Prop type breakdown */}
        {propBreakdown.length > 0 && (
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "2rem" }}>
            {propBreakdown.map(({ pt, hits: h, total: t }) => (
              <div key={pt} style={{ background: S.surface, border: `1px solid ${S.border}`, padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.15em", color: S.orange }}>{PROP_LABELS[pt] ?? pt.toUpperCase()}</span>
                <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.25rem", color: S.text }}>{h}-{t - h}</span>
                <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "0.625rem", color: t > 0 ? (Math.round(h/t*100) >= 50 ? S.green : S.red) : S.textMuted, fontWeight: 700 }}>{t > 0 ? Math.round(h/t*100) + "%" : "—"}</span>
              </div>
            ))}
          </div>
        )}

        {/* Articles list */}
        {isLoading ? (
          <p style={{ color: S.textMuted }}>Loading...</p>
        ) : propArticles.length === 0 ? (
          <p style={{ color: S.textMuted, fontFamily: "Space Grotesk, sans-serif" }}>No prop articles yet for {playerName}.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {propArticles.map((a: any) => {
              const result = getResult(a.slug)
              const picks = a.key_picks
              const lean = picks?.lean ?? ""
              const line = picks?.pick ?? ""
              const propLabel = PROP_LABELS[a.prop_type] ?? a.prop_type?.toUpperCase() ?? "PROP"
              return (
                <Link key={a.slug} to={`/predictions/${a.slug}`} style={{ textDecoration: "none" }}>
                  <div style={{ background: S.surface, padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = S.surfaceHigh)}
                    onMouseLeave={e => (e.currentTarget.style.background = S.surface)}
                  >
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.3rem", flexWrap: "wrap" }}>
                        <span style={{ background: S.redBg, color: "#ffdad6", padding: "0.1rem 0.4rem", fontSize: "0.5rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "Space Grotesk, sans-serif" }}>{propLabel}</span>
                        <span style={{ fontSize: "0.625rem", color: S.textMuted, fontFamily: "Space Grotesk, sans-serif" }}>{fmt(a.game_date)}</span>
                      </div>
                      <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.9375rem", textTransform: "uppercase", color: S.text, margin: 0, lineHeight: 1.3 }}>
                        {a.title.replace(/\s*\([\d-]+\)\s*$/, "").slice(0, 70)}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexShrink: 0 }}>
                      {line && (
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "0.75rem", color: lean === "OVER" ? S.green : S.red }}>{lean}</div>
                          <div style={{ fontSize: "0.5625rem", color: S.textMuted }}>{line}</div>
                        </div>
                      )}
                      {result ? (
                        <span style={{ background: result.result === "HIT" ? S.greenBg : S.redBg, color: result.result === "HIT" ? "#00431a" : "#ffdad6", padding: "0.25rem 0.625rem", fontSize: "0.625rem", fontWeight: 900, textTransform: "uppercase", fontFamily: "Space Grotesk, sans-serif", minWidth: "48px", textAlign: "center" }}>
                          {result.result === "HIT" ? "✓ HIT" : "✗ MISS"}
                        </span>
                      ) : (
                        <span style={{ background: S.surfaceHigh, color: S.textMuted, padding: "0.25rem 0.625rem", fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", fontFamily: "Space Grotesk, sans-serif", minWidth: "48px", textAlign: "center" }}>PENDING</span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
