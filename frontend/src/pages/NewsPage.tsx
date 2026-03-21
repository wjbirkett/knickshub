import { useQuery } from "@tanstack/react-query"
import { Helmet } from "react-helmet-async"
import { getNews } from "../utils/api"

const S = {
  bg: "#131313", surface: "#1c1b1b", surfaceHigh: "#2a2a2a",
  border: "rgba(255,255,255,0.08)", orange: "#F58426", peach: "#ffb786",
  text: "#e5e2e1", textMuted: "#ddc1b1",
}

export default function NewsPage() {
  const { data: news, isLoading } = useQuery({ queryKey: ["news"], queryFn: () => getNews(undefined) })

  const items = (news as any[]) ?? []
  const featured = items.slice(0, 3)
  const rest = items.slice(3)

  return (
    <div className="main-content" style={{ background: S.bg, minHeight: "100vh" }}>
      <Helmet>
        <title>Knicks News Feed | KnicksHub</title>
        <meta name="description" content="Latest New York Knicks news, updates, and analysis." />
      </Helmet>

      <div style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: "2rem 2.5rem" }}>
        <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.5rem)", textTransform: "uppercase", letterSpacing: "-0.03em", color: S.text, margin: "0 0 0.5rem", fontStyle: "italic" }}>
          Editorial <span style={{ color: S.peach }}>News Feed</span>
        </h1>
        <p style={{ color: S.textMuted, fontSize: "0.875rem", margin: 0 }}>The latest from around the Knicks universe</p>
      </div>

      <div style={{ padding: "2rem 2.5rem", maxWidth: "1200px" }}>
        {isLoading ? <p style={{ color: S.textMuted }}>Loading...</p> : (
          <>
            {/* Featured 3 */}
            {featured.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
                {featured.map((item: any, i: number) => (
                  <a key={i} href={item.url || item.link || "#"} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block" }}>
                    <div style={{ background: S.surface, overflow: "hidden", transition: "transform 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
                      onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}>
                      <div style={{ height: "180px", background: S.surfaceHigh, overflow: "hidden" }}>
                        {item.image && <img src={item.image} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(30%)" }} onError={e => ((e.target as HTMLImageElement).style.display = "none")} />}
                      </div>
                      <div style={{ padding: "1.25rem" }}>
                        <span style={{ fontSize: "0.5625rem", fontWeight: 900, color: S.orange, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: "0.5rem", fontFamily: "Space Grotesk, sans-serif" }}>{item.source || "ESPN"}</span>
                        <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "1.0625rem", textTransform: "uppercase", lineHeight: 1.3, color: S.text, margin: "0 0 0.5rem" }}>{item.title}</h3>
                        {item.description && <p style={{ fontSize: "0.8125rem", color: S.textMuted, lineHeight: 1.5, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.description}</p>}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* Rest as list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {rest.map((item: any, i: number) => (
                <a key={i} href={item.url || item.link || "#"} target="_blank" rel="noopener noreferrer"
                  style={{ textDecoration: "none", display: "flex", gap: "1rem", padding: "0.875rem 1rem", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = S.surface)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "0.5625rem", fontWeight: 900, color: S.orange, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: "0.25rem", fontFamily: "Space Grotesk, sans-serif" }}>{item.source || "ESPN"}</span>
                    <h4 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.9375rem", textTransform: "uppercase", lineHeight: 1.3, color: S.text, margin: 0 }}>{item.title}</h4>
                  </div>
                  <span className="material-symbols-outlined" style={{ color: S.textMuted, fontSize: "1.125rem", flexShrink: 0, alignSelf: "center" }}>north_east</span>
                </a>
              ))}
            </div>

            {items.length === 0 && <p style={{ color: S.textMuted }}>No news available.</p>}
          </>
        )}
      </div>
    </div>
  )
}
