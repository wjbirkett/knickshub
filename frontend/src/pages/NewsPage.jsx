import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getNews } from "../utils/api";
const SOURCES = ["ALL", "ESPN", "NYPOST", "KNICKS", "NBA", "BLEACHER"];
const SOURCE_LABELS = {
    ALL: "All", ESPN: "ESPN", NYPOST: "NY Post", KNICKS: "Knicks.com", NBA: "NBA.com", BLEACHER: "Bleacher Report"
};
export default function NewsPage() {
    const [activeSource, setActiveSource] = useState("ALL");
    const source = activeSource === "ALL" ? undefined : activeSource.toLowerCase();
    const { data: articles, isLoading } = useQuery({
        queryKey: ["news", source],
        queryFn: () => getNews(source),
    });
    const H1 = { fontFamily: "Bebas Neue, sans-serif", fontSize: "3rem", letterSpacing: "0.15em", color: "#F58426" };
    return (<div style={{ maxWidth: "900px" }}>
      <header style={{ borderBottom: "1px solid #1f2937", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
        <h1 style={H1}>NEWS FEED</h1>
      </header>

      {/* Source filter */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {SOURCES.map(s => (<button key={s} onClick={() => setActiveSource(s)} style={{
                padding: "0.35rem 1rem", borderRadius: "999px", border: "1px solid",
                fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer",
                background: activeSource === s ? "#F58426" : "transparent",
                borderColor: activeSource === s ? "#F58426" : "#374151",
                color: activeSource === s ? "#000" : "#9ca3af",
            }}>
            {SOURCE_LABELS[s]}
          </button>))}
      </div>

      {isLoading && (<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {[1, 2, 3, 4, 5].map(i => (<div key={i} style={{ background: "#111827", borderRadius: "0.75rem", height: "120px", opacity: 0.5 }}/>))}
        </div>)}

      {!isLoading && (!articles || articles.length === 0) && (<p style={{ color: "#6b7280" }}>No articles found.</p>)}

      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
        {(articles ?? []).map((article) => (<ArticleCard key={article.id} article={article}/>))}
      </div>
    </div>);
}
function ArticleCard({ article }) {
    const sourceColors = {
        espn: "#FF6B35", nypost: "#E4002B", knicks: "#006BB6",
        nba: "#006BB6", bleacher: "#F5A623",
    };
    const color = sourceColors[article.source] ?? "#6b7280";
    const sourceLabel = {
        espn: "ESPN", nypost: "NY Post", knicks: "Knicks.com",
        nba: "NBA.com", bleacher: "Bleacher Report",
    };
    const timeAgo = (iso) => {
        if (!iso)
            return "";
        const diff = (Date.now() - new Date(iso).getTime()) / 1000;
        if (diff < 3600)
            return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400)
            return `${Math.floor(diff / 3600)}h ago`;
        return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };
    return (<a href={article.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
      <div style={{
            display: "flex", gap: "1rem", alignItems: "flex-start",
            padding: "1.25rem 0", borderBottom: "1px solid #1f2937",
            transition: "background 0.15s",
        }} onMouseEnter={e => (e.currentTarget.style.background = "#0d1117")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
        {article.image_url && (<img src={article.image_url} alt="" style={{
                width: "120px", height: "80px", objectFit: "cover",
                borderRadius: "0.5rem", flexShrink: 0, background: "#1f2937"
            }} onError={e => { e.target.style.display = "none"; }}/>)}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: "#f9fafb", fontWeight: 600, fontSize: "1rem", margin: "0 0 0.35rem", lineHeight: 1.4 }}>
            {article.title}
          </p>
          {article.summary && (<p style={{ color: "#6b7280", fontSize: "0.82rem", margin: "0 0 0.5rem", lineHeight: 1.5,
                overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {article.summary.replace(/<[^>]+>/g, "")}
            </p>)}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", fontSize: "0.75rem" }}>
            <span style={{ color, fontWeight: 700 }}>{sourceLabel[article.source] ?? article.source.toUpperCase()}</span>
            {article.author && <span style={{ color: "#4b5563" }}>{article.author}</span>}
            <span style={{ color: "#4b5563" }}>{timeAgo(article.published_at)}</span>
          </div>
        </div>
      </div>
    </a>);
}
