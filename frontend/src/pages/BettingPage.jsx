import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getArticles, getResults } from "../utils/api";
const S = {
    bg: "#131313", surface: "#1c1b1b", surfaceHigh: "#2a2a2a",
    surfaceHighest: "#353534", border: "rgba(255,255,255,0.08)",
    orange: "#F58426", peach: "#ffb786", green: "#4ae176",
    greenBg: "#06bb55", red: "#ffb4ab", redBg: "#93000a",
    text: "#e5e2e1", textMuted: "#ddc1b1",
};
export default function BettingPage() {
    const { data: articles } = useQuery({ queryKey: ["articles", 50], queryFn: () => getArticles(50) });
    const { data: resultsData } = useQuery({ queryKey: ["results"], queryFn: getResults });
    const bestBets = articles?.filter((a) => a.article_type === "best_bet").slice(0, 10) ?? [];
    const preds = resultsData?.predictions ?? [];
    const props = resultsData?.props ?? [];
    const atsHits = preds.filter((r) => r.spread_result === "HIT").length;
    const atsTotal = preds.filter((r) => r.spread_result).length;
    const propHits = props.filter((r) => r.result === "HIT").length;
    const ouHits = preds.filter((r) => r.total_result === "HIT").length;
    const ouTotal = preds.filter((r) => r.total_result).length;
    const fmt = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const opp = (a) => a?.home_team?.includes("Knicks") ? a.away_team : a.home_team;
    return (<div style={{ background: S.bg, minHeight: "100vh" }}>
      <Helmet>
        <title>Knicks Betting Trends & Best Bets | KnicksHub</title>
        <meta name="description" content="Knicks betting trends, best bets archive, and AI pick performance."/>
      </Helmet>

      <div style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: "2rem 2.5rem" }}>
        <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.5rem)", textTransform: "uppercase", letterSpacing: "-0.03em", color: S.text, margin: "0 0 0.5rem", fontStyle: "italic" }}>
          Betting <span style={{ color: S.peach }}>Trends</span>
        </h1>
        <p style={{ color: S.textMuted, fontSize: "0.875rem", margin: 0 }}>AI performance metrics and best bets archive</p>
      </div>

      <div style={{ padding: "2rem 2.5rem", maxWidth: "1200px" }}>
        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
          {[
            ["ATS", atsHits, atsTotal],
            ["O/U", ouHits, ouTotal],
            ["Props", propHits, props.length],
        ].map(([label, h, t]) => {
            const pct = t > 0 ? Math.round(h / t * 100) : 0;
            const col = pct >= 55 ? S.green : pct >= 45 ? S.peach : S.red;
            return (<div key={label} style={{ background: S.surface, padding: "1.25rem", borderTop: `3px solid ${col}` }}>
                <p style={{ fontSize: "0.5625rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: S.textMuted, margin: "0 0 0.375rem", fontFamily: "Space Grotesk, sans-serif" }}>{label}</p>
                <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.75rem", color: col, margin: "0 0 0.1rem" }}>{h}-{t - h}</p>
                <p style={{ fontSize: "0.6875rem", color: S.textMuted, margin: 0 }}>{pct}%</p>
              </div>);
        })}
          <Link to="/knicks-betting-record" style={{ background: S.surface, padding: "1.25rem", borderTop: `3px solid ${S.orange}`, textDecoration: "none", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <p style={{ fontSize: "0.5625rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: S.textMuted, margin: "0 0 0.375rem", fontFamily: "Space Grotesk, sans-serif" }}>Full Record</p>
            <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "0.875rem", color: S.orange, margin: 0, textTransform: "uppercase" }}>View All →</p>
          </Link>
        </div>

        {/* Best Bets Archive */}
        <section>
          <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.25rem", textTransform: "uppercase", letterSpacing: "-0.01em", fontStyle: "italic", color: S.text, marginBottom: "1rem" }}>
            Best Bets Archive
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {bestBets.map((a) => {
            const result = preds.find((r) => r.game_date === a.game_date);
            return (<Link key={a.slug} to={`/predictions/${a.slug}`} style={{ textDecoration: "none" }}>
                  <div style={{ background: S.surface, padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", transition: "background 0.15s" }} onMouseEnter={e => (e.currentTarget.style.background = S.surfaceHigh)} onMouseLeave={e => (e.currentTarget.style.background = S.surface)}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "0.625rem", color: S.textMuted, fontFamily: "Inter, sans-serif" }}>{fmt(a.game_date)} · vs {opp(a)}</span>
                      <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.9375rem", textTransform: "uppercase", color: S.text, margin: "0.2rem 0 0" }}>{a.key_picks?.spread_pick || a.title.slice(0, 50)}</p>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
                      {a.key_picks?.confidence && (<span style={{ fontSize: "0.5625rem", fontWeight: 900, color: a.key_picks.confidence === "High" ? S.green : S.textMuted, textTransform: "uppercase", fontFamily: "Space Grotesk, sans-serif" }}>{a.key_picks.confidence}</span>)}
                      {result?.spread_result && (<span style={{ background: result.spread_result === "HIT" ? S.greenBg : S.redBg, color: result.spread_result === "HIT" ? "#00431a" : "#ffdad6", padding: "0.2rem 0.5rem", fontSize: "0.5625rem", fontWeight: 900, textTransform: "uppercase", fontFamily: "Space Grotesk, sans-serif" }}>
                          {result.spread_result}
                        </span>)}
                    </div>
                  </div>
                </Link>);
        })}
            {bestBets.length === 0 && <p style={{ color: S.textMuted }}>No best bets yet.</p>}
          </div>
        </section>
      </div>
    </div>);
}
