// frontend/src/pages/predictions/[matchup].tsx
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getArticle } from "../../utils/api";
import { TYPE_CONFIG } from "../utils/typeConfig";
export default function MatchupPage() {
    const { matchup } = useParams();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (matchup) {
            setLoading(true);
            getArticle(matchup)
                .then((data) => {
                setArticle(data);
            })
                .finally(() => setLoading(false));
        }
    }, [matchup]);
    if (loading)
        return <p style={{ color: "#6b7280" }}>Loading matchup...</p>;
    if (!article)
        return <p style={{ color: "#6b7280" }}>Matchup not found.</p>;
    const badge = TYPE_CONFIG[article.article_type] ?? { label: "PREVIEW", bg: "#1f2937", color: "#9ca3af" };
    return (<div style={{ maxWidth: "900px", margin: "0 auto", padding: "1rem" }}>
      <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "3rem", letterSpacing: "0.15em", color: "#F58426", marginBottom: "0.5rem" }}>
        {article.title}
      </h1>
      <span style={{
            background: badge.bg,
            color: badge.color,
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            padding: "0.2rem 0.6rem",
            borderRadius: "999px",
            marginBottom: "1rem",
            display: "inline-block",
        }}>
        {badge.label}
      </span>
      <p style={{ color: "#4b5563", fontSize: "0.875rem", marginBottom: "2rem" }}>
        {new Date(article.game_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>

      <div style={{ color: "#f9fafb", fontSize: "0.95rem", lineHeight: 1.5, whiteSpace: "pre-line" }} dangerouslySetInnerHTML={{ __html: article.content }}/>

      <Link to="/predictions" style={{ display: "inline-block", marginTop: "2rem", color: "#1d4ed8", textDecoration: "underline" }}>
        ← Back to Predictions
      </Link>
    </div>);
}
