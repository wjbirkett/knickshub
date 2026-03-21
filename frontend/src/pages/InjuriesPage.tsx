import { useQuery } from "@tanstack/react-query"
import { Helmet } from "react-helmet-async"
import { getInjuries } from "../utils/api"

const S = {
  bg: "#131313", surface: "#1c1b1b", surfaceHigh: "#2a2a2a",
  border: "rgba(255,255,255,0.08)", orange: "#F58426", peach: "#ffb786",
  green: "#4ae176", greenBg: "#06bb55", red: "#ffb4ab", redBg: "#93000a",
  text: "#e5e2e1", textMuted: "#ddc1b1",
}

const STATUS_STYLE = (status: string) => {
  const s = status?.toLowerCase() ?? ""
  if (s.includes("out")) return { bg: S.redBg, color: "#ffdad6" }
  if (s.includes("day") || s.includes("gtd")) return { bg: "#451a03", color: S.peach }
  if (s.includes("probable")) return { bg: "#14532d", color: S.green }
  return { bg: S.surfaceHigh, color: S.textMuted }
}

const PLAYER_IMAGES: Record<string, string> = {
  "Jalen Brunson": "/players/jalen.png",
  "Karl-Anthony Towns": "/players/KAT.png",
  "Mikal Bridges": "/players/mikal.png",
  "OG Anunoby": "/players/OG.png",
  "Josh Hart": "/players/josh.png",
  "Miles McBride": "/players/miles.png",
  "Mitchell Robinson": "/players/mitchell.png",
  "Jordan Clarkson": "/players/jordan.png",
  "Jose Alvarado": "/players/jose.png",
  "Landry Shamet": "/players/landry.png",
  "Jeremy Sochan": "/players/jeremy.png",
  "Tyler Kolek": "/players/tyler.png",
  "Mohamed Diawara": "/players/mohamed.png",
}

export default function InjuriesPage() {
  const { data: injuries, isLoading } = useQuery({ queryKey: ["injuries"], queryFn: getInjuries })

  const knicks = (injuries as any[])?.filter((i: any) => i.team === "New York Knicks" || i.is_knicks) ?? []
  const others = (injuries as any[])?.filter((i: any) => i.team !== "New York Knicks" && !i.is_knicks) ?? []

  const getImg = (name: string) => {
    const key = Object.keys(PLAYER_IMAGES).find(k => name?.toLowerCase().includes(k.toLowerCase().split(" ")[1]))
    return key ? PLAYER_IMAGES[key] : null
  }

  return (
    <div style={{ background: S.bg, minHeight: "100vh" }}>
      <Helmet>
        <title>Knicks Injury Report | KnicksHub</title>
        <meta name="description" content="Latest New York Knicks injury report and NBA injury updates." />
      </Helmet>

      <div style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: "2rem 2.5rem" }}>
        <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.5rem)", textTransform: "uppercase", letterSpacing: "-0.03em", color: S.text, margin: "0 0 0.5rem", fontStyle: "italic" }}>
          Injury <span style={{ color: S.peach }}>Report</span>
        </h1>
        <p style={{ color: S.textMuted, fontSize: "0.875rem", margin: 0 }}>Live injury updates — updated daily</p>
      </div>

      <div style={{ padding: "2rem 2.5rem", maxWidth: "1200px" }}>
        {isLoading ? (
          <p style={{ color: S.textMuted }}>Loading...</p>
        ) : (injuries as any[])?.length === 0 ? (
          <p style={{ color: S.textMuted }}>No injuries reported.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
            {/* Knicks */}
            <section>
              <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.125rem", textTransform: "uppercase", letterSpacing: "0.05em", color: S.orange, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "1.25rem" }}>medical_services</span>
                Knicks
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {knicks.length > 0 ? knicks.map((inj: any, i: number) => {
                  const img = getImg(inj.player_name || inj.name)
                  const st = STATUS_STYLE(inj.status)
                  return (
                    <div key={i} style={{ background: S.surface, padding: "1rem", display: "flex", alignItems: "center", gap: "0.875rem" }}>
                      {img && <img src={img} alt={inj.player_name} style={{ width: "3rem", height: "3rem", objectFit: "cover", borderRadius: "50%", flexShrink: 0 }} />}
                      {!img && <div style={{ width: "3rem", height: "3rem", background: S.surfaceHigh, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><span className="material-symbols-outlined" style={{ fontSize: "1.25rem", color: S.textMuted }}>person</span></div>}
                      <div style={{ flex: 1 }}>
                        <span style={{ display: "block", fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.9375rem", color: S.text }}>{inj.player_name || inj.name}</span>
                        <span style={{ fontSize: "0.6875rem", color: S.textMuted, textTransform: "uppercase" }}>{inj.reason || inj.injury || inj.shortComment || "Injury"}</span>
                      </div>
                      <span style={{ background: st.bg, color: st.color, padding: "0.2rem 0.5rem", fontSize: "0.5625rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "Space Grotesk, sans-serif", whiteSpace: "nowrap" }}>
                        {inj.status || "GTD"}
                      </span>
                    </div>
                  )
                }) : <p style={{ color: S.textMuted, fontSize: "0.875rem" }}>No Knicks injuries reported.</p>}
              </div>
            </section>

            {/* League-wide */}
            <section>
              <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.125rem", textTransform: "uppercase", letterSpacing: "0.05em", color: S.textMuted, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "1.25rem" }}>sports_basketball</span>
                Around the League
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "600px", overflowY: "auto" }}>
                {others.length > 0 ? others.slice(0, 30).map((inj: any, i: number) => {
                  const st = STATUS_STYLE(inj.status)
                  return (
                    <div key={i} style={{ background: S.surface, padding: "0.75rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                      <div>
                        <span style={{ display: "block", fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.8125rem", color: S.text }}>{inj.player_name || inj.name}</span>
                        <span style={{ fontSize: "0.5625rem", color: S.textMuted, textTransform: "uppercase" }}>{inj.team} · {inj.reason || inj.injury || inj.shortComment || "Injury"}</span>
                      </div>
                      <span style={{ background: st.bg, color: st.color, padding: "0.2rem 0.5rem", fontSize: "0.5625rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "Space Grotesk, sans-serif", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {inj.status || "GTD"}
                      </span>
                    </div>
                  )
                }) : <p style={{ color: S.textMuted, fontSize: "0.875rem" }}>Loading league injuries...</p>}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
