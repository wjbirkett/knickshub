import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getArticle, getArticles } from "../../utils/api";
import { TYPE_CONFIG } from "../../utils/typeConfig";
function KeyPicksBox({ picks, articleType }) {
    if (!picks || articleType === "history")
        return null;
    const isProp = articleType === "prop";
    if (isProp) {
        const leanColor = picks.lean === "OVER" ? "#4ade80" : "#f87171";
        const leanBg = picks.lean === "OVER" ? "#14532d" : "#7f1d1d";
        const confColor = picks.confidence === "High" ? "#4ade80" : picks.confidence === "Medium" ? "#fbbf24" : "#f87171";
        return (<div style={{ background: "#0d1117", border: "1px solid #374151", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1.5rem" }}>
        <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1rem", letterSpacing: "0.1em", color: "#F58426", margin: "0 0 1rem" }}>🎯 KEY PICK</p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <PickCard label={`${picks.player} ${picks.prop_type}`} value={picks.pick} lean={picks.lean} leanBg={leanBg} leanColor={leanColor}/>
          <div style={{ background: "#111827", borderRadius: "0.5rem", padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            <span style={{ color: "#6b7280", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Confidence</span>
            <span style={{ color: confColor, fontSize: "1rem", fontWeight: 700 }}>{picks.confidence}</span>
          </div>
        </div>
      </div>);
    }
    // Spread/Moneyline/Total for normal predictions
    const totalLeanColor = picks.total_lean === "OVER" ? "#4ade80" : "#f87171";
    const totalLeanBg = picks.total_lean === "OVER" ? "#14532d" : "#7f1d1d";
    const spreadLeanColor = picks.spread_lean === "COVER" ? "#4ade80" : "#f87171";
    const spreadLeanBg = picks.spread_lean === "COVER" ? "#14532d" : "#7f1d1d";
    const mlLeanColor = picks.moneyline_lean === "WIN" ? "#4ade80" : "#f87171";
    const mlLeanBg = picks.moneyline_lean === "WIN" ? "#14532d" : "#7f1d1d";
    const confColor = picks.confidence === "High" ? "#4ade80" : picks.confidence === "Medium" ? "#fbbf24" : "#f87171";
    return (<div style={{ background: "#0d1117", border: "1px solid #374151", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1.5rem" }}>
      <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1rem", letterSpacing: "0.1em", color: "#F58426", margin: "0 0 1rem" }}>🎯 KEY PICKS AT A GLANCE</p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <PickCard label="Spread" value={picks.spread_pick} lean={picks.spread_lean} leanBg={spreadLeanBg} leanColor={spreadLeanColor}/>
        <PickCard label="Moneyline" value={picks.moneyline_pick} lean={picks.moneyline_lean} leanBg={mlLeanBg} leanColor={mlLeanColor}/>
        <PickCard label="Total" value={picks.total_pick} lean={picks.total_lean} leanBg={totalLeanBg} leanColor={totalLeanColor}/>
        <div style={{ background: "#111827", borderRadius: "0.5rem", padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          <span style={{ color: "#6b7280", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Confidence</span>
          <span style={{ color: confColor, fontSize: "1rem", fontWeight: 700 }}>{picks.confidence}</span>
        </div>
      </div>
    </div>);
}
function PickCard({ label, value, lean, leanBg, leanColor }) {
    return (<div style={{ background: "#111827", borderRadius: "0.5rem", padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.2rem", minWidth: "120px" }}>
      <span style={{ color: "#6b7280", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <span style={{ color: "#f9fafb", fontSize: "0.9rem", fontWeight: 700 }}>{value}</span>
      <span style={{ background: leanBg, color: leanColor, fontSize: "0.6rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: "999px", display: "inline-block", width: "fit-content" }}>{lean}</span>
    </div>);
}
export default function MatchupPage() {
    const { matchup } = useParams();
    const { data: article, isLoading } = useQuery({
        queryKey: ["article", matchup],
        queryFn: () => getArticle(matchup),
        enabled: !!matchup,
    });
    const { data: allArticles } = useQuery({
        queryKey: ["articles"],
        queryFn: () => getArticles(100),
    });
    if (isLoading)
        return <p style={{ color: "#6b7280" }}>Loading...</p>;
    if (!article)
        return <p style={{ color: "#f87171" }}>Article not found.</p>;
    const related = (allArticles ?? []).filter((a) => a.game_date === article.game_date && a.slug !== matchup);
    return (<div style={{ maxWidth: "780px", margin: "0 auto" }}>
      <Link to="/predictions" style={{ color: "#6b7280", fontSize: "0.8rem", textDecoration: "none", display: "block", marginBottom: "1rem" }}>← Back to Predictions</Link>

      <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "2.5rem", letterSpacing: "0.1em", color: "#F58426", lineHeight: 1.2 }}>{article.title}</h1>

      <KeyPicksBox picks={article.key_picks} articleType={article.article_type}/>

      <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "2rem", marginBottom: "1.5rem" }}>
        {article.content.split("\n").map((line, i) => {
            if (line.startsWith("## "))
                return <h2 key={i} style={{ color: "#F58426" }}>{line.replace("## ", "")}</h2>;
            if (line.startsWith("# "))
                return <h1 key={i} style={{ color: "#F58426" }}>{line.replace("# ", "")}</h1>;
            if (line.trim() === "")
                return <br key={i}/>;
            return <p key={i} style={{ color: "#d1d5db" }} dangerouslySetInnerHTML={{ __html: line }}/>;
        })}
      </div>

      {related.length > 0 && (<div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1rem", letterSpacing: "0.1em", color: "#F58426", margin: "0 0 0.75rem" }}>MORE FOR THIS GAME</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {related.map((a) => {
                const badge = TYPE_CONFIG[a.article_type] ?? { label: a.article_type?.toUpperCase(), bg: "#1f2937", color: "#9ca3af" };
                return (<Link key={a.slug} to={`/predictions/${a.slug}`} style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
                  <span style={{ background: badge.bg, color: badge.color, padding: "0.15rem 0.6rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700 }}>{badge.label}</span>
                  <span style={{ color: "#d1d5db", fontSize: "0.875rem" }}>{a.title}</span>
                </Link>);
            })}
          </div>
        </div>)}
    </div>);
}
