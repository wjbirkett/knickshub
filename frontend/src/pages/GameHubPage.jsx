import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getArticles, getResults, getSchedule } from "../utils/api";
import { Helmet } from "react-helmet-async";
const S = {
    bg: "#131313", surface: "#1c1b1b", surfaceHigh: "#2a2a2a",
    surfaceHighest: "#353534", border: "rgba(255,255,255,0.08)",
    orange: "#F58426", peach: "#ffb786", green: "#4ae176",
    greenBg: "#06bb55", red: "#ffb4ab", redBg: "#93000a",
    blue: "#a0caff", text: "#e5e2e1", textMuted: "#ddc1b1",
};
const PLAYER_IMAGES = {
    "Jalen Brunson": "/players/jalen.png",
    "Karl-Anthony Towns": "/players/KAT.png",
    "Mikal Bridges": "/players/mikal.png",
    "OG Anunoby": "/players/OG.png",
    "Josh Hart": "/players/josh.png",
    "Miles McBride": "/players/miles.png",
    "Mitchell Robinson": "/players/mitchell.png",
};
export default function GameHubPage() {
    const { gameSlug } = useParams();
    const { data: articles } = useQuery({ queryKey: ["articles", 50], queryFn: () => getArticles(50) });
    const { data: resultsData } = useQuery({ queryKey: ["results"], queryFn: getResults });
    const { data: games } = useQuery({ queryKey: ["schedule"], queryFn: getSchedule });
    if (!gameSlug)
        return null;
    const slugParts = gameSlug.split("-");
    const dateStr = slugParts.slice(-3).join("-");
    const opponentRaw = slugParts.slice(2, -3).join(" ");
    const opponent = opponentRaw.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    const gameArticles = articles?.filter((a) => a.game_date === dateStr) ?? [];
    const prediction = gameArticles.find((a) => a.article_type === "prediction");
    const bestBet = gameArticles.find((a) => a.article_type === "best_bet");
    const propArticles = gameArticles.filter((a) => a.article_type === "prop");
    const predictions = resultsData?.predictions ?? [];
    const propResults = resultsData?.props ?? [];
    const gameResult = predictions.find((p) => p.game_date === dateStr);
    const gamePropResults = propResults.filter((p) => p.game_date === dateStr);
    const game = games?.find((g) => String(g.game_date).substring(0, 10) === dateStr);
    const picks = prediction?.key_picks ?? bestBet?.key_picks ?? {};
    const isHome = game?.home_team?.includes("Knicks");
    const kScore = isHome ? game?.home_score : game?.away_score;
    const oScore = isHome ? game?.away_score : game?.home_score;
    const hasScore = kScore != null && oScore != null;
    const win = hasScore && kScore > oScore;
    const fmt = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
    const resultBadge = (result) => {
        if (!result)
            return null;
        return (<span style={{ background: result === "HIT" ? S.greenBg : S.redBg, color: result === "HIT" ? "#00431a" : "#ffdad6", padding: "0.15rem 0.5rem", fontSize: "0.5625rem", fontWeight: 900, textTransform: "uppercase", fontFamily: "Space Grotesk, sans-serif" }}>
        {result}
      </span>);
    };
    return (<div style={{ background: S.bg, minHeight: "100vh" }}>
      <Helmet>
        <title>Knicks vs {opponent} Game Hub | KnicksHub</title>
        <meta name="description" content={`Knicks vs ${opponent} predictions, best bets, and player props — ${dateStr}`}/>
      </Helmet>

      {/* Hero Scoreboard */}
      <section style={{ position: "relative", height: "420px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "#0a0a0a" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <img src="/players/msg-arena.jpg" alt="MSG" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.35, filter: "grayscale(60%)" }}/>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(19,19,19,0.3), rgba(19,19,19,0.8))" }}/>
        </div>
        <div style={{ position: "relative", zIndex: 10, textAlign: "center", width: "100%", maxWidth: "900px", padding: "0 2rem" }}>
          {hasScore && (<span style={{ fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: S.textMuted, display: "block", marginBottom: "1rem", fontFamily: "Space Grotesk, sans-serif" }}>
              {game?.status === "Final" ? "Final" : "Live"} · {dateStr}
            </span>)}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "3rem" }}>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "clamp(3rem, 8vw, 6rem)", letterSpacing: "-0.04em", color: S.text, lineHeight: 1 }}>NYK</span>
              <span style={{ display: "block", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: S.orange, marginTop: "0.5rem" }}>New York Knicks</span>
            </div>
            <div style={{ textAlign: "center" }}>
              {hasScore ? (<div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "clamp(3.5rem, 10vw, 7rem)", letterSpacing: "-0.05em", color: S.text }}>{kScore}</span>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2rem", color: "rgba(221,193,177,0.3)", fontStyle: "italic" }}>-</span>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "clamp(3.5rem, 10vw, 7rem)", letterSpacing: "-0.05em", color: S.text }}>{oScore}</span>
                </div>) : (<div>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.5rem", letterSpacing: "-0.02em", color: S.textMuted, display: "block" }}>{fmt(dateStr)}</span>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "2rem", letterSpacing: "-0.02em", color: S.peach }}>VS</span>
                </div>)}
              {!hasScore && game?.arena && (<span style={{ display: "block", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: S.textMuted, marginTop: "0.5rem", border: `1px solid rgba(86,67,54,0.3)`, padding: "0.25rem 0.75rem", fontFamily: "Space Grotesk, sans-serif" }}>{game.arena}</span>)}
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "clamp(3rem, 8vw, 6rem)", letterSpacing: "-0.04em", color: S.text, lineHeight: 1 }}>
                {opponent.split(" ").pop()?.substring(0, 3).toUpperCase()}
              </span>
              <span style={{ display: "block", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: S.blue, marginTop: "0.5rem" }}>{opponent}</span>
            </div>
          </div>
          {hasScore && (<span style={{ display: "inline-block", marginTop: "1.5rem", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: S.textMuted, border: `1px solid rgba(86,67,54,0.3)`, padding: "0.25rem 0.75rem", fontFamily: "Space Grotesk, sans-serif" }}>
              {fmt(dateStr)} · {game?.arena || "Madison Square Garden"}
            </span>)}
        </div>
      </section>

      {/* Odds Strip */}
      {(picks.spread_pick || picks.total_pick || picks.moneyline_pick) && (<div style={{ position: "sticky", top: 0, zIndex: 40, background: S.surface, borderBottom: `1px solid ${S.border}`, padding: "0.875rem 2.5rem", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "3rem" }}>
          {[
                ["Spread", picks.spread_pick, gameResult?.spread_result],
                ["Total", picks.total_pick, gameResult?.total_result],
                ["Moneyline", picks.moneyline_pick, gameResult?.moneyline_result],
            ].filter(([, v]) => v).map(([label, value, result]) => (<div key={label} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: S.textMuted, fontFamily: "Space Grotesk, sans-serif" }}>{label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.25rem", color: S.text }}>{value}</span>
                {resultBadge(result)}
              </div>
            </div>))}
        </div>)}

      {/* Main Content */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2.5rem", display: "grid", gridTemplateColumns: "1fr 340px", gap: "2.5rem", alignItems: "start" }}>

        {/* Left: Game Analysis + Prop Market Watch */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>

          {/* Game Analysis */}
          {prediction && (<section>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.5rem", textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", color: S.text, margin: 0 }}>The Game Analysis</h2>
                <Link to={`/predictions/${prediction.slug}`} style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: S.orange, textDecoration: "none", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  Read Full Predictions <span className="material-symbols-outlined" style={{ fontSize: "0.875rem" }}>north_east</span>
                </Link>
              </div>
              <div style={{ background: S.surfaceHigh, padding: "2rem", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, right: 0, width: "8rem", height: "8rem", background: "rgba(245,132,38,0.04)", borderRadius: "50%", transform: "translate(3rem, -3rem)", filter: "blur(20px)" }}/>
                <span style={{ fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: S.blue, fontFamily: "Space Grotesk, sans-serif", display: "block", marginBottom: "0.75rem" }}>Strategic Preview</span>
                <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.75rem", lineHeight: 1.1, color: S.text, marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "-0.02em" }}>
                  {prediction.title.replace(/\s*\([\d-]+\)\s*$/, "").slice(0, 60)}
                </h3>
                <p style={{ color: S.textMuted, lineHeight: 1.7, fontSize: "0.9375rem", fontFamily: "Inter, sans-serif", marginBottom: "1.5rem" }}>
                  {prediction.content?.replace(/[#*]/g, "").slice(0, 300)}...
                </p>
                {picks.spread_pick && (<div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ background: S.surfaceHighest, padding: "0.875rem 1.25rem" }}>
                      <span style={{ display: "block", fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: S.textMuted, marginBottom: "0.25rem", fontFamily: "Space Grotesk, sans-serif" }}>Spread Pick</span>
                      <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.25rem", color: S.orange }}>{picks.spread_pick}</span>
                    </div>
                    {picks.total_pick && (<div style={{ background: S.surfaceHighest, padding: "0.875rem 1.25rem" }}>
                        <span style={{ display: "block", fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: S.textMuted, marginBottom: "0.25rem", fontFamily: "Space Grotesk, sans-serif" }}>Total</span>
                        <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.25rem", color: S.text }}>{picks.total_pick}</span>
                      </div>)}
                  </div>)}
              </div>
            </section>)}

          {/* Prop Market Watch */}
          {propArticles.length > 0 && (<section>
              <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.5rem", textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", color: S.text, marginBottom: "1.25rem" }}>Prop Market Watch</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1px", background: S.border, border: `1px solid ${S.border}` }}>
                {propArticles.map((a) => {
                const propResult = gamePropResults.find((r) => r.slug === a.slug);
                const img = a.player ? Object.entries(PLAYER_IMAGES).find(([k]) => a.player.toLowerCase().includes(k.toLowerCase().split(" ")[1]))?.[1] : null;
                const picks = a.key_picks;
                return (<Link key={a.slug} to={`/predictions/${a.slug}`} style={{ textDecoration: "none" }}>
                      <div style={{ background: S.surfaceHigh, padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background 0.15s" }} onMouseEnter={e => (e.currentTarget.style.background = S.surfaceHighest)} onMouseLeave={e => (e.currentTarget.style.background = S.surfaceHigh)}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          {img && <img src={img} alt={a.player} style={{ width: "2.5rem", height: "2.5rem", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}/>}
                          <div>
                            <span style={{ display: "block", fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: S.textMuted, fontFamily: "Space Grotesk, sans-serif" }}>{a.player}</span>
                            <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.9375rem", color: S.text }}>
                              {picks?.pick || `${a.prop_type} Prop`}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.375rem" }}>
                          {picks?.lean && (<span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1rem", color: picks.lean === "OVER" ? S.green : S.red }}>{picks.lean}</span>)}
                          {propResult && resultBadge(propResult.result)}
                        </div>
                      </div>
                    </Link>);
            })}
              </div>
            </section>)}

          {/* No articles */}
          {gameArticles.length === 0 && (<div style={{ background: S.surface, padding: "3rem", textAlign: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: S.textMuted, display: "block", marginBottom: "1rem" }}>analytics</span>
              <p style={{ color: S.textMuted, fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, textTransform: "uppercase" }}>No articles yet for this game.</p>
              <p style={{ color: S.textMuted, fontSize: "0.8125rem", fontFamily: "Inter, sans-serif" }}>AI picks drop ~45 minutes before tip-off.</p>
            </div>)}
        </div>

        {/* Right: Quick Picks + Editor's Best Bet + Links */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", position: "sticky", top: "4rem" }}>

          {/* Quick Picks */}
          {(picks.spread_pick || picks.moneyline_pick) && (<div style={{ background: S.surface, padding: "1.5rem", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(to right, ${S.orange}, ${S.blue})` }}/>
              <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.1rem", textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.01em", color: S.text, marginBottom: "1rem" }}>Quick Picks</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {picks.spread_pick && (<div style={{ background: S.surfaceHigh, padding: "0.875rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span className="material-symbols-outlined" style={{ color: S.orange, fontSize: "1.125rem" }}>bolt</span>
                    <div>
                      <span style={{ display: "block", fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: S.textMuted, fontFamily: "Space Grotesk, sans-serif" }}>Lock of the Night</span>
                      <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.9375rem", color: S.text }}>{picks.spread_pick}</span>
                    </div>
                  </div>)}
                {picks.total_pick && (<div style={{ background: S.surfaceHigh, padding: "0.875rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span className="material-symbols-outlined" style={{ color: S.blue, fontSize: "1.125rem" }}>trending_up</span>
                    <div>
                      <span style={{ display: "block", fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: S.textMuted, fontFamily: "Space Grotesk, sans-serif" }}>Value Play</span>
                      <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.9375rem", color: S.text }}>{picks.total_pick}</span>
                    </div>
                  </div>)}
              </div>
            </div>)}

          {/* Editor's Best Bet */}
          {bestBet && (<div style={{ background: S.surfaceHigh, padding: "1.5rem", border: `2px solid ${S.orange}`, position: "relative", overflow: "hidden" }}>
              <span style={{ position: "absolute", top: 0, left: 0, background: S.orange, color: "#5c2b00", fontSize: "0.5625rem", fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase", padding: "0.25rem 0.625rem", fontFamily: "Space Grotesk, sans-serif" }}>Editor's Best Bet</span>
              <div style={{ marginTop: "1.5rem" }}>
                <h4 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.5rem", fontStyle: "italic", letterSpacing: "-0.02em", color: S.text, marginBottom: "0.5rem" }}>
                  {bestBet.key_picks?.spread_pick || bestBet.title.slice(0, 40)}
                </h4>
                <p style={{ color: S.textMuted, fontSize: "0.8125rem", lineHeight: 1.6, marginBottom: "1rem", fontFamily: "Inter, sans-serif" }}>
                  {bestBet.content?.replace(/[#*]/g, "").slice(0, 150)}...
                </p>
                <Link to={`/predictions/${bestBet.slug}`} style={{ display: "block", width: "100%", padding: "0.75rem", background: "rgba(245,132,38,0.1)", border: `1px solid rgba(245,132,38,0.3)`, color: S.peach, fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: "0.75rem", textAlign: "center", textDecoration: "none", transition: "all 0.15s", boxSizing: "border-box" }} onMouseEnter={e => { e.currentTarget.style.background = S.orange; e.currentTarget.style.color = "#5c2b00"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(245,132,38,0.1)"; e.currentTarget.style.color = S.peach; }}>Tail This Pick</Link>
              </div>
            </div>)}

          {/* Quick Nav */}
          <div style={{ background: S.surface }}>
            {[
            ["/injuries", "Full Injury Report", "medical_services"],
            ["/knicks-betting-record", "Historical Record", "receipt_long"],
            ["/predictions", "All Predictions", "analytics"],
        ].map(([to, label, icon]) => (<Link key={to} to={to} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: `1px solid ${S.border}`, textDecoration: "none", transition: "background 0.15s" }} onMouseEnter={e => (e.currentTarget.style.background = S.surfaceHigh)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.05em", color: S.text }}>{label}</span>
                <span className="material-symbols-outlined" style={{ color: S.textMuted, fontSize: "1.125rem" }}>{icon}</span>
              </Link>))}
          </div>
        </div>
      </div>
    </div>);
}
