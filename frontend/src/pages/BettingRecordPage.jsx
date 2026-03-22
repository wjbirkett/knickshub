import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getResults } from "../utils/api";
const S = {
    bg: "#131313", surface: "#1c1b1b", surfaceHigh: "#2a2a2a",
    surfaceHighest: "#353534", border: "rgba(255,255,255,0.08)",
    orange: "#F58426", peach: "#ffb786", green: "#4ae176",
    greenBg: "#06bb55", red: "#ffb4ab", redBg: "#93000a",
    text: "#e5e2e1", textMuted: "#ddc1b1",
};
export default function BettingRecordPage() {
    const { data: resultsData, isLoading } = useQuery({ queryKey: ["results"], queryFn: getResults });
    const preds = resultsData?.predictions ?? [];
    const props = resultsData?.props ?? [];
    const atsHits = preds.filter((r) => r.spread_result === "HIT").length;
    const atsTotal = preds.filter((r) => r.spread_result).length;
    const ouHits = preds.filter((r) => r.total_result === "HIT").length;
    const ouTotal = preds.filter((r) => r.total_result).length;
    const mlHits = preds.filter((r) => r.moneyline_result === "HIT").length;
    const mlTotal = preds.filter((r) => r.moneyline_result).length;
    const propHits = props.filter((r) => r.result === "HIT").length;
    const pct = (h, t) => t > 0 ? Math.round(h / t * 100) : 0;
    const color = (h, t) => pct(h, t) >= 55 ? S.green : pct(h, t) >= 45 ? S.peach : S.red;
    const fmt = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return (<div style={{ background: S.bg, minHeight: "100vh" }}>
      <Helmet>
        <title>Knicks AI Betting Record | KnicksHub</title>
        <meta name="description" content="Track KnicksHub AI betting record — ATS, Over/Under, and player prop results."/>
      </Helmet>

      {/* Header */}
      <div style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: "2rem 2.5rem" }}>
        <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.5rem)", textTransform: "uppercase", letterSpacing: "-0.03em", color: S.text, margin: "0 0 0.5rem", fontStyle: "italic" }}>
          AI Betting <span style={{ color: S.peach }}>Record</span>
        </h1>
        <p style={{ color: S.textMuted, fontSize: "0.875rem", margin: 0 }}>Season-to-date performance tracking for all AI picks</p>
      </div>

      <div style={{ padding: "2rem 2.5rem", maxWidth: "1200px" }}>

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
          {[
            ["ATS", atsHits, atsTotal],
            ["Over/Under", ouHits, ouTotal],
            ["Moneyline", mlHits, mlTotal],
            ["Props", propHits, props.length],
        ].map(([label, h, t]) => (<div key={label} style={{ background: S.surface, padding: "1.5rem", borderTop: `3px solid ${color(h, t)}` }}>
              <p style={{ fontSize: "0.625rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: S.textMuted, margin: "0 0 0.5rem", fontFamily: "Space Grotesk, sans-serif" }}>{label}</p>
              <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "2rem", color: color(h, t), margin: "0 0 0.25rem" }}>{h}-{t - h}</p>
              <p style={{ fontSize: "0.75rem", color: S.textMuted, margin: 0 }}>{pct(h, t)}% · {t} picks</p>
            </div>))}
        </div>

        {/* Prediction Results Table */}
        {preds.length > 0 && (<section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.25rem", textTransform: "uppercase", letterSpacing: "-0.01em", fontStyle: "italic", color: S.text, marginBottom: "1rem" }}>
              Game Predictions
            </h2>
            <div style={{ background: S.surface, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 0, borderBottom: `1px solid ${S.border}`, padding: "0.625rem 1rem" }}>
                {["Game", "Spread", "Total", "ML", "Date"].map(h => (<span key={h} style={{ fontSize: "0.5625rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: S.textMuted, fontFamily: "Space Grotesk, sans-serif", textAlign: h !== "Game" ? "center" : "left" }}>{h}</span>))}
              </div>
              {preds.map((r, i) => (<div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 0, padding: "0.875rem 1rem", borderBottom: i < preds.length - 1 ? `1px solid ${S.border}` : "none", alignItems: "center" }} onMouseEnter={e => (e.currentTarget.style.background = S.surfaceHigh)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <Link to={`/predictions/${r.slug}`} style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.8125rem", color: S.text, textDecoration: "none", textTransform: "uppercase" }}>
                    {r.slug?.replace(/-prediction-\d{4}-\d{2}-\d{2}$/, "").replace(/-/g, " ").slice(0, 35)}
                  </Link>
                  {["spread_result", "total_result", "moneyline_result"].map(key => (<span key={key} style={{ width: "64px", textAlign: "center", padding: "0.2rem 0.375rem", background: r[key] === "HIT" ? S.greenBg : r[key] === "MISS" ? S.redBg : S.surfaceHigh, color: r[key] === "HIT" ? "#00431a" : r[key] === "MISS" ? "#ffdad6" : S.textMuted, fontSize: "0.5625rem", fontWeight: 900, textTransform: "uppercase", fontFamily: "Space Grotesk, sans-serif", margin: "0 4px" }}>
                      {r[key] ?? "—"}
                    </span>))}
                  <span style={{ fontSize: "0.625rem", color: S.textMuted, fontFamily: "Inter, sans-serif", width: "60px", textAlign: "right" }}>{fmt(r.game_date)}</span>
                </div>))}
            </div>
          </section>)}

        {/* Prop Results Table */}
        {props.length > 0 && (<section>
            <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.25rem", textTransform: "uppercase", letterSpacing: "-0.01em", fontStyle: "italic", color: S.text, marginBottom: "1rem" }}>
              Player Props
            </h2>
            <div style={{ background: S.surface, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 60px 60px 60px", gap: 0, borderBottom: `1px solid ${S.border}`, padding: "0.625rem 1rem" }}>
                {["Player", "Type", "Line", "Lean", "Result"].map(h => (<span key={h} style={{ fontSize: "0.5625rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: S.textMuted, fontFamily: "Space Grotesk, sans-serif", textAlign: h !== "Player" ? "center" : "left" }}>{h}</span>))}
              </div>
              {props.map((r, i) => (<div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 60px 60px 60px", gap: 0, padding: "0.875rem 1rem", borderBottom: i < props.length - 1 ? `1px solid ${S.border}` : "none", alignItems: "center" }} onMouseEnter={e => (e.currentTarget.style.background = S.surfaceHigh)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <div>
                    <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.8125rem", color: S.text, textTransform: "uppercase" }}>{r.player}</span>
                    <span style={{ display: "block", fontSize: "0.5625rem", color: S.textMuted }}>{fmt(r.game_date)}</span>
                  </div>
                  <span style={{ fontSize: "0.625rem", color: S.textMuted, textAlign: "center", textTransform: "uppercase", fontFamily: "Space Grotesk, sans-serif", fontWeight: 700 }}>{r.prop_type}</span>
                  <span style={{ fontSize: "0.75rem", color: S.text, textAlign: "center", fontFamily: "Space Grotesk, sans-serif", fontWeight: 700 }}>{r.line}</span>
                  <span style={{ fontSize: "0.625rem", color: r.lean === "OVER" ? S.green : S.red, textAlign: "center", fontWeight: 900, fontFamily: "Space Grotesk, sans-serif", textTransform: "uppercase" }}>{r.lean}</span>
                  <span style={{ textAlign: "center", padding: "0.2rem 0.375rem", background: r.result === "HIT" ? S.greenBg : S.redBg, color: r.result === "HIT" ? "#00431a" : "#ffdad6", fontSize: "0.5625rem", fontWeight: 900, textTransform: "uppercase", fontFamily: "Space Grotesk, sans-serif", margin: "0 auto", display: "block", width: "fit-content" }}>
                    {r.result}
                  </span>
                </div>))}
            </div>
          </section>)}

        {isLoading && <p style={{ color: S.textMuted }}>Loading...</p>}
        {!isLoading && preds.length === 0 && props.length === 0 && (<p style={{ color: S.textMuted }}>No results yet. Check back after games are resolved.</p>)}
      </div>
    </div>);
}
