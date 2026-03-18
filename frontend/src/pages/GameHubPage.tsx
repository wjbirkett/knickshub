import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { getArticles, getResults, getSchedule } from "../utils/api"
import { Helmet } from "react-helmet-async"

export default function GameHubPage() {
  const { gameSlug } = useParams<{ gameSlug: string }>()

  const { data: articles } = useQuery({ queryKey: ["articles"], queryFn: () => getArticles(50) })
  const { data: resultsData } = useQuery({ queryKey: ["results"], queryFn: getResults })
  const { data: games } = useQuery({ queryKey: ["schedule"], queryFn: getSchedule })

  if (!gameSlug || !articles) return <p style={{ color: "#6b7280" }}>Loading...</p>

  // Parse date and opponent from slug e.g. "knicks-vs-indiana-pacers-2026-03-17"
  const slugParts = gameSlug.split("-")
  const dateStr = slugParts.slice(-3).join("-")
  const opponentRaw = slugParts.slice(2, -3).join(" ")
  const opponent = opponentRaw.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")

  // Find all articles for this game date
  const gameArticles = articles.filter((a: any) => a.game_date === dateStr)
  const prediction = gameArticles.find((a: any) => a.article_type === "prediction")
  const bestBet = gameArticles.find((a: any) => a.article_type === "best_bet")
  const props = gameArticles.filter((a: any) => a.article_type === "prop")
  const parlay = gameArticles.find((a: any) => a.article_type === "parlay")

  // Find game result
  const predictions = resultsData?.predictions ?? []
  const propResults = resultsData?.props ?? []
  const gameResult = predictions.find((p: any) => p.game_date === dateStr)
  const gamePropResults = propResults.filter((p: any) => p.game_date === dateStr)

  // Find game from schedule
  const game = (games ?? []).find((g: any) => {
    const gDate = typeof g.game_date === "string" ? g.game_date : String(g.game_date)
    return gDate.substring(0, 10) === dateStr
  })

  // Get picks from prediction article
  const picks = prediction?.key_picks ?? {}

  const resultBadge = (result: string | null) => {
    if (!result) return null
    const hit = result === "HIT"
    return (
      <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.45rem", borderRadius: "999px", background: hit ? "#14532d" : "#7f1d1d", color: hit ? "#4ade80" : "#f87171" }}>
        {hit ? "HIT" : "MISS"}
      </span>
    )
  }

  const title = prediction?.title ?? `Knicks vs ${opponent} Prediction, Best Bets & Player Props (${dateStr})`
  const description = `AI-powered Knicks vs ${opponent} prediction, best bet, spread pick and player props. Updated 45 minutes before tip-off. KnicksHub AI betting analysis.`

  return (
    <div style={{ maxWidth: "900px" }}>
      <Helmet>
        <title>{title} | KnicksHub</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
      </Helmet>

      {/* Breadcrumb */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem", fontSize: "0.75rem", color: "#6b7280" }}>
        <Link to="/" style={{ color: "#6b7280", textDecoration: "none" }}>Home</Link>
        <span>/</span>
        <Link to="/predictions" style={{ color: "#6b7280", textDecoration: "none" }}>Predictions</Link>
        <span>/</span>
        <span style={{ color: "#F58426" }}>Knicks vs {opponent}</span>
      </div>

      {/* Hero */}
      <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "2rem", letterSpacing: "0.1em", color: "#F58426", margin: "0 0 0.25rem" }}>
              KNICKS VS {opponent.toUpperCase()}
            </h1>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: 0 }}>{dateStr}</p>
          </div>
          {game && (
            <div style={{ textAlign: "right" }}>
              {game.status === "Final" ? (
                <div>
                  <p style={{ color: "#4ade80", fontSize: "0.75rem", fontWeight: 700, margin: "0 0 0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Final</p>
                  <p style={{ color: "#f9fafb", fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
                    {game.home_team?.includes("Knicks") ? game.home_score : game.away_score}
                    <span style={{ color: "#6b7280", fontSize: "1rem", margin: "0 0.5rem" }}>-</span>
                    {game.home_team?.includes("Knicks") ? game.away_score : game.home_score}
                  </p>
                </div>
              ) : (
                <p style={{ color: "#fbbf24", fontSize: "0.875rem", fontWeight: 600, margin: 0 }}>Upcoming</p>
              )}
            </div>
          )}
        </div>

        {/* Odds strip */}
        {picks.spread_pick && (
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", flexWrap: "wrap" }}>
            {[
              { label: "Spread", value: picks.spread_pick, lean: picks.spread_lean, result: gameResult?.spread_result },
              { label: "Total", value: picks.total_pick, lean: picks.total_lean, result: gameResult?.total_result },
              { label: "Moneyline", value: picks.moneyline_pick, lean: picks.moneyline_lean, result: gameResult?.moneyline_result },
            ].map((item) => item.value && (
              <div key={item.label} style={{ background: "#1f2937", borderRadius: "0.5rem", padding: "0.6rem 0.9rem", minWidth: "120px" }}>
                <p style={{ color: "#6b7280", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.25rem" }}>{item.label}</p>
                <p style={{ color: "#f9fafb", fontSize: "0.9rem", fontWeight: 700, margin: "0 0 0.2rem" }}>{item.value}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ color: "#F58426", fontSize: "0.7rem", fontWeight: 600 }}>{item.lean}</span>
                  {resultBadge(item.result)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick picks box */}
      {(picks.spread_pick || picks.total_pick) && (
        <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", border: "1px solid #F58426", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1.1rem", letterSpacing: "0.1em", color: "#F58426", margin: "0 0 0.75rem" }}>QUICK PICKS</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.5rem" }}>
            {picks.spread_pick && <p style={{ color: "#f9fafb", fontSize: "0.875rem", margin: 0 }}>🏀 <strong>Spread:</strong> {picks.spread_lean} {picks.spread_pick}</p>}
            {picks.total_pick && <p style={{ color: "#f9fafb", fontSize: "0.875rem", margin: 0 }}>📊 <strong>Total:</strong> {picks.total_lean} {picks.total_pick}</p>}
            {picks.moneyline_pick && <p style={{ color: "#f9fafb", fontSize: "0.875rem", margin: 0 }}>💰 <strong>ML:</strong> {picks.moneyline_lean} {picks.moneyline_pick}</p>}
          </div>
        </div>
      )}

      {/* Articles grid */}
      <div style={{ display: "grid", gap: "1.5rem" }}>

        {/* Prediction article */}
        {prediction && (
          <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1rem", letterSpacing: "0.1em", color: "#F58426", margin: 0 }}>GAME PREDICTION</p>
              {gameResult && (
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  {resultBadge(gameResult.spread_result)}
                  {resultBadge(gameResult.total_result)}
                </div>
              )}
            </div>
            <h2 style={{ color: "#f9fafb", fontSize: "1rem", fontWeight: 600, margin: "0 0 0.5rem" }}>{prediction.title}</h2>
            <p style={{ color: "#9ca3af", fontSize: "0.875rem", margin: "0 0 0.75rem", lineHeight: 1.6 }}>
              {prediction.content?.substring(0, 200)}...
            </p>
            <Link to={`/predictions/${prediction.slug}`} style={{ color: "#F58426", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>
              Read Full Prediction →
            </Link>
          </div>
        )}

        {/* Best Bet */}
        {bestBet && (
          <div style={{ background: "#111827", border: "1px solid #F58426", borderRadius: "0.75rem", padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1rem", letterSpacing: "0.1em", color: "#F58426", margin: 0 }}>🔥 BEST BET</p>
              {gameResult && resultBadge(gameResult.spread_result)}
            </div>
            <h2 style={{ color: "#f9fafb", fontSize: "1rem", fontWeight: 600, margin: "0 0 0.5rem" }}>{bestBet.title}</h2>
            <p style={{ color: "#9ca3af", fontSize: "0.875rem", margin: "0 0 0.75rem", lineHeight: 1.6 }}>
              {bestBet.content?.substring(0, 200)}...
            </p>
            <Link to={`/predictions/${bestBet.slug}`} style={{ color: "#F58426", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>
              Read Full Best Bet →
            </Link>
          </div>
        )}

        {/* Props */}
        {props.length > 0 && (
          <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem" }}>
            <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1rem", letterSpacing: "0.1em", color: "#F58426", margin: "0 0 0.75rem" }}>PLAYER PROPS</p>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {props.map((prop: any) => {
                const propResult = gamePropResults.find((r: any) => r.player === prop.player)
                const propPicks = prop.key_picks ?? {}
                return (
                  <div key={prop.slug} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0", borderBottom: "1px solid #1f2937" }}>
                    <div>
                      <p style={{ color: "#f9fafb", fontSize: "0.875rem", fontWeight: 600, margin: "0 0 0.2rem" }}>{prop.player}</p>
                      {propPicks.pick && (
                        <p style={{ color: "#F58426", fontSize: "0.75rem", margin: 0 }}>{propPicks.lean} {propPicks.pick}</p>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      {propResult && (
                        <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>Actual: {propResult.actual_value}</span>
                      )}
                      {resultBadge(propResult?.result ?? null)}
                      <Link to={`/predictions/${prop.slug}`} style={{ color: "#6b7280", fontSize: "0.75rem", textDecoration: "none" }}>View →</Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Parlay */}
        {parlay && (
          <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem" }}>
            <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1rem", letterSpacing: "0.1em", color: "#F58426", margin: "0 0 0.5rem" }}>SAME-GAME PARLAY</p>
            <h2 style={{ color: "#f9fafb", fontSize: "1rem", fontWeight: 600, margin: "0 0 0.75rem" }}>{parlay.title}</h2>
            <Link to={`/predictions/${parlay.slug}`} style={{ color: "#F58426", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>
              View Parlay →
            </Link>
          </div>
        )}

      </div>

      {/* Internal links */}
      <div style={{ marginTop: "2rem", padding: "1rem", background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem" }}>
        <p style={{ color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.75rem" }}>More KnicksHub</p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Link to="/predictions" style={{ color: "#F58426", fontSize: "0.8rem", textDecoration: "none" }}>All Predictions →</Link>
          <Link to="/knicks-betting-record" style={{ color: "#F58426", fontSize: "0.8rem", textDecoration: "none" }}>Betting Record →</Link>
          <Link to="/injuries" style={{ color: "#F58426", fontSize: "0.8rem", textDecoration: "none" }}>Injury Report →</Link>
        </div>
      </div>
    </div>
  )
}
