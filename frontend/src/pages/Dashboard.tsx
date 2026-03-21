import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { getNews, getInjuries, getBirthdays, getSchedule, getStandings, getArticles, getResults } from "../utils/api"

const S = {
  // Colors
  bg: "#131313",
  surface: "#1c1b1b",
  surfaceHigh: "#2a2a2a",
  surfaceHighest: "#353534",
  border: "rgba(255,255,255,0.08)",
  orange: "#F58426",
  peach: "#ffb786",
  blue: "#a0caff",
  green: "#4ae176",
  greenBg: "#06bb55",
  red: "#ffb4ab",
  redBg: "#93000a",
  text: "#e5e2e1",
  textMuted: "#ddc1b1",
  textDim: "rgba(221,193,177,0.5)",
}

const badge = (type: string) => {
  const map: Record<string, [string, string]> = {
    prediction: ["#006bb6", "#dbe9ff"],
    best_bet:   ["#06bb55", "#00431a"],
    prop:       ["#93000a", "#ffdad6"],
    history:    ["#4a1d96", "#d8b4fe"],
  }
  const labels: Record<string, string> = {
    prediction: "PREDICTION", best_bet: "BEST BET", prop: "PROP BET", history: "HISTORY"
  }
  return { bg: map[type]?.[0] ?? "#333", color: map[type]?.[1] ?? "#fff", label: labels[type] ?? type.toUpperCase() }
}

export default function Dashboard() {
  const { data: news }        = useQuery({ queryKey: ["news"],      queryFn: () => getNews(undefined) })
  const { data: injuries }    = useQuery({ queryKey: ["injuries"],  queryFn: getInjuries })
  const { data: birthdays }   = useQuery({ queryKey: ["birthdays"], queryFn: getBirthdays })
  const { data: schedule }    = useQuery({ queryKey: ["schedule"],  queryFn: getSchedule })
  const { data: standings }   = useQuery({ queryKey: ["standings"], queryFn: getStandings })
  const { data: articles }    = useQuery({ queryKey: ["articles"],  queryFn: () => getArticles(20) })
  const { data: resultsData } = useQuery({ queryKey: ["results"],   queryFn: getResults })

  const knicks = (standings as any[])?.find((t: any) =>
    (t.team || t.teamName || "").includes("Knicks")
  )
  const todayBestBet      = (articles as any[])?.find((a: any) => a.article_type === "best_bet")
  const latestPredictions = (articles as any[])?.filter((a: any) =>
    ["prediction","best_bet","prop"].includes(a.article_type)
  ).slice(0, 3)
  const nextGame  = (schedule as any[])?.find((g: any) => g.status === "scheduled")
  const lastGame  = (schedule as any[])?.filter((g: any) => g.status === "closed").slice(-1)[0]
  const knicksInj = (injuries as any[])?.slice(0, 4) ?? []
  const bdays     = (birthdays as any[])?.slice(0, 2) ?? []

  const preds    = (resultsData as any)?.predictions ?? []
  const propRes  = (resultsData as any)?.props ?? []
  const atsHits  = preds.filter((r: any) => r.spread_result === "HIT").length
  const atsTotal = preds.filter((r: any) => r.spread_result).length
  const ouHits   = preds.filter((r: any) => r.total_result === "HIT").length
  const ouTotal  = preds.filter((r: any) => r.total_result).length
  const propHits = propRes.filter((r: any) => r.result === "HIT").length

  const opp = (a: any) => a?.home_team?.includes("Knicks") ? a.away_team : a.home_team
  const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })

  return (
    <>
      <Helmet>
        <title>KnicksHub — Knicks Predictions, Best Bets & Player Props</title>
        <meta name="description" content="AI-powered New York Knicks betting predictions, best bets, spread picks, and player props." />
        <link rel="canonical" href="https://knickshub.vercel.app" />
      </Helmet>

      {/* Team Record Bar */}
      <div style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: "0.75rem 2rem", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div>
            <span style={{ display: "block", fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.1rem", letterSpacing: "-0.02em", textTransform: "uppercase", color: S.text }}>NEW YORK KNICKS</span>
            <span style={{ fontSize: "0.625rem", color: S.textMuted, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" }}>Eastern Conference</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "2.5rem" }}>
          {knicks && <>
            <div style={{ textAlign: "center" }}>
              <span style={{ display: "block", fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.4rem" }}>{knicks.wins}-{knicks.losses}</span>
              <span style={{ fontSize: "0.5625rem", color: S.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>W-L RECORD</span>
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={{ display: "block", fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.4rem", color: S.peach }}>#{knicks.conferenceRank || knicks.rank || "—"}</span>
              <span style={{ fontSize: "0.5625rem", color: S.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>SEED</span>
            </div>
          </>}
          {atsTotal > 0 && (
            <div style={{ textAlign: "center" }}>
              <span style={{ display: "block", fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.4rem", color: atsHits/atsTotal >= 0.5 ? S.green : S.red }}>{atsHits}-{atsTotal-atsHits}</span>
              <span style={{ fontSize: "0.5625rem", color: S.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>ATS</span>
            </div>
          )}
          {ouTotal > 0 && (
            <div style={{ textAlign: "center" }}>
              <span style={{ display: "block", fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.4rem", color: ouHits/ouTotal >= 0.5 ? S.green : S.red }}>{ouHits}-{ouTotal-ouHits}</span>
              <span style={{ fontSize: "0.5625rem", color: S.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>O/U</span>
            </div>
          )}
          {propRes.length > 0 && (
            <div style={{ textAlign: "center" }}>
              <span style={{ display: "block", fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.4rem", color: propHits/propRes.length >= 0.5 ? S.green : S.red }}>{propHits}-{propRes.length-propHits}</span>
              <span style={{ fontSize: "0.5625rem", color: S.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>PROPS</span>
            </div>
          )}
        </div>
      </div>

      {/* Hero Bento Grid */}
      <div style={{ padding: "1.5rem 2rem", display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem", maxWidth: "1400px" }}>

        {/* AI Best Bet Hero */}
        {todayBestBet ? (
          <Link to={`/predictions/${todayBestBet.slug}`} style={{ textDecoration: "none" }}>
            <div style={{ position: "relative", overflow: "hidden", background: S.surfaceHigh, borderRadius: "0.75rem", padding: "2rem", borderLeft: `4px solid ${S.orange}`, boxShadow: "0 25px 50px rgba(0,0,0,0.5)", minHeight: "280px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: S.orange, color: "#5c2b00", padding: "0.25rem 0.75rem", fontSize: "0.6875rem", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", borderRadius: "0.25rem", marginBottom: "1.25rem", fontFamily: "Space Grotesk, sans-serif", fontStyle: "italic" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "0.875rem" }}>auto_awesome</span>
                AI Recommended Best Bet
              </span>
              <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 4vw, 3.5rem)", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: "1rem", color: S.text }}>
                {todayBestBet.title}
              </h2>
              {todayBestBet.key_picks && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                  {todayBestBet.key_picks.spread_pick && (
                    <span style={{ background: S.surfaceHighest, padding: "0.375rem 0.75rem", borderRadius: "0.25rem", fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.8125rem" }}>
                      {todayBestBet.key_picks.spread_pick}
                      <span style={{ marginLeft: "0.5rem", color: todayBestBet.key_picks.spread_lean === "COVER" ? S.green : S.red, fontSize: "0.6875rem" }}>{todayBestBet.key_picks.spread_lean}</span>
                    </span>
                  )}
                  {todayBestBet.key_picks.total_pick && (
                    <span style={{ background: S.surfaceHighest, padding: "0.375rem 0.75rem", borderRadius: "0.25rem", fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.8125rem" }}>
                      {todayBestBet.key_picks.total_pick}
                      <span style={{ marginLeft: "0.5rem", color: todayBestBet.key_picks.total_lean === "OVER" ? S.green : S.red, fontSize: "0.6875rem" }}>{todayBestBet.key_picks.total_lean}</span>
                    </span>
                  )}
                  {todayBestBet.key_picks.confidence && (
                    <span style={{ background: todayBestBet.key_picks.confidence === "High" ? S.greenBg : S.surfaceHighest, color: todayBestBet.key_picks.confidence === "High" ? "#00431a" : S.textMuted, padding: "0.375rem 0.75rem", borderRadius: "0.25rem", fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      {todayBestBet.key_picks.confidence} Confidence
                    </span>
                  )}
                </div>
              )}
              <p style={{ color: S.textMuted, fontSize: "0.8125rem" }}>vs {opp(todayBestBet)} · {fmt(todayBestBet.game_date)} · Read full analysis →</p>
            </div>
          </Link>
        ) : (
          <div style={{ background: S.surfaceHigh, borderRadius: "0.75rem", padding: "2rem", borderLeft: `4px solid rgba(245,132,38,0.3)`, minHeight: "280px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(245,132,38,0.15)", color: S.peach, padding: "0.25rem 0.75rem", fontSize: "0.6875rem", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", borderRadius: "0.25rem", marginBottom: "1.25rem", fontFamily: "Space Grotesk, sans-serif", fontStyle: "italic", width: "fit-content" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "0.875rem" }}>schedule</span>
              AI Picks Drop ~45 Min Before Tip-Off
            </span>
            <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "clamp(1.75rem, 3vw, 3rem)", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: "0.75rem", color: S.text }}>
              {nextGame ? `Next: vs ${opp(nextGame)}` : "No Upcoming Game"}
            </h2>
            <p style={{ color: S.textMuted, fontSize: "0.875rem", marginBottom: "1.5rem" }}>Best bet, prediction, and player props auto-generate before tip-off.</p>
            {atsTotal > 0 && (
              <div style={{ display: "flex", gap: "2rem" }}>
                {[["ATS", atsHits, atsTotal], ["O/U", ouHits, ouTotal], ["PROPS", propHits, propRes.length]].filter(([,, t]) => (t as number) > 0).map(([label, h, t]) => (
                  <div key={label as string}>
                    <span style={{ display: "block", fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.75rem", color: (h as number)/(t as number) >= 0.5 ? S.green : S.red }}>{h as number}-{(t as number)-(h as number)}</span>
                    <span style={{ fontSize: "0.5625rem", color: S.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Right Column: Next + Last Game */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {nextGame && (
            <div style={{ flex: 1, background: S.surfaceHigh, borderRadius: "0.75rem", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.5625rem", fontWeight: 900, letterSpacing: "0.2rem", color: S.orange, textTransform: "uppercase" }}>Next Battle</span>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.75rem" }}>NYK</span>
                </div>
                <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.25rem", color: S.textDim, fontStyle: "italic" }}>VS</span>
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.75rem" }}>{opp(nextGame)?.split(" ").pop()}</span>
                </div>
              </div>
              <p style={{ fontSize: "0.6875rem", color: S.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em" }}>
                {new Date((nextGame.date || nextGame.game_date) + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                {nextGame.time ? ` · ${nextGame.time}` : ""}
              </p>
            </div>
          )}
          {lastGame && (
            <div style={{ flex: 1, background: S.surfaceHigh, borderRadius: "0.75rem", padding: "1.25rem", borderLeft: `4px solid ${S.green}`, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.5625rem", fontWeight: 900, letterSpacing: "0.2rem", color: S.green, textTransform: "uppercase" }}>Last Result</span>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ display: "block", fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.5rem" }}>
                    {lastGame.score?.NYK ?? "—"} - {lastGame.score ? Object.entries(lastGame.score).find(([k]) => k !== "NYK")?.[1] ?? "—" : "—"}
                  </span>
                  <span style={{ fontSize: "0.5625rem", fontWeight: 700, color: S.textMuted, textTransform: "uppercase" }}>vs {opp(lastGame)}</span>
                </div>
                <span style={{ background: S.green, color: "#003915", padding: "0.25rem 0.625rem", fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.125rem", borderRadius: "0.25rem", textTransform: "uppercase", fontStyle: "italic" }}>
                  {lastGame.result || "W"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Predictions + Sidebar */}
      <div style={{ padding: "0 2rem 2rem", display: "grid", gridTemplateColumns: "1fr 320px", gap: "2.5rem", maxWidth: "1400px" }}>

        {/* Left: Latest Predictions + News */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>

          {/* Latest Predictions */}
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.375rem", textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.01em", color: S.text }}>Latest Predictions</h3>
              <Link to="/predictions" style={{ fontSize: "0.6875rem", fontWeight: 700, color: S.orange, letterSpacing: "0.15em", textTransform: "uppercase", textDecoration: "none" }}>See All</Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
              {latestPredictions?.map((a: any) => {
                const b = badge(a.article_type)
                return (
                  <Link key={a.slug} to={`/predictions/${a.slug}`} style={{ textDecoration: "none" }}>
                    <div style={{ background: S.surfaceHigh, padding: "1.25rem", borderRadius: "0.5rem", border: `1px solid ${S.border}`, height: "100%", display: "flex", flexDirection: "column", gap: "0.5rem", transition: "border-color 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = S.orange)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = S.border)}
                    >
                      <span style={{ background: b.bg, color: b.color, padding: "0.1875rem 0.5rem", fontSize: "0.5625rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", borderRadius: "999px", width: "fit-content" }}>{b.label}</span>
                      <h4 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.9375rem", lineHeight: 1.3, color: S.text, flex: 1 }}>{a.title}</h4>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.625rem", fontWeight: 900, textTransform: "uppercase", color: S.orange }}>
                        <span>{fmt(a.game_date)}</span>
                        {a.key_picks?.confidence && <span style={{ color: a.key_picks.confidence === "High" ? S.green : S.textMuted }}>{a.key_picks.confidence} Conf</span>}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>

          {/* News Feed */}
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.375rem", textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.01em", color: S.text }}>Editorial News Feed</h3>
              <Link to="/news" style={{ fontSize: "0.6875rem", fontWeight: 700, color: S.orange, letterSpacing: "0.15em", textTransform: "uppercase", textDecoration: "none" }}>See All</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {(news as any[])?.slice(0, 8).map((item: any, i: number) => (
                <a key={i} href={item.url || item.link || "#"} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "flex", gap: "1rem", padding: "0.75rem", borderRadius: "0.5rem", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "0.5625rem", fontWeight: 900, color: S.orange, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>{item.source || "ESPN"}</span>
                    <h4 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.9375rem", lineHeight: 1.3, color: S.text }}>{item.title}</h4>
                  </div>
                </a>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Injuries + Birthdays + Record */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Injury Report */}
          <section style={{ background: S.surface, padding: "1.5rem", borderRadius: "0.75rem", border: `1px solid ${S.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <span className="material-symbols-outlined" style={{ color: S.peach, fontSize: "1.25rem" }}>medical_services</span>
              <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.0625rem", textTransform: "uppercase", fontStyle: "italic", color: S.text }}>Injury Report</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {knicksInj.length > 0 ? knicksInj.map((inj: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ display: "block", fontWeight: 700, fontSize: "0.875rem", color: S.text }}>{inj.player_name || inj.name}</span>
                    <span style={{ fontSize: "0.625rem", color: S.textMuted, textTransform: "uppercase" }}>{inj.reason || inj.injury}</span>
                  </div>
                  <span style={{
                    background: (inj.status || "").toLowerCase().includes("out") ? S.redBg : S.surfaceHighest,
                    color: (inj.status || "").toLowerCase().includes("out") ? "#ffdad6" : S.orange,
                    padding: "0.1875rem 0.5rem", fontSize: "0.5625rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", borderRadius: "0.25rem"
                  }}>{inj.status || "GTD"}</span>
                </div>
              )) : <p style={{ fontSize: "0.8125rem", color: S.textMuted }}>No injuries reported.</p>}
            </div>
            <Link to="/injuries" style={{ display: "block", marginTop: "1rem", fontSize: "0.625rem", fontWeight: 700, color: S.orange, textTransform: "uppercase", letterSpacing: "0.15em", textDecoration: "none" }}>Full Report →</Link>
          </section>

          {/* Birthdays */}
          {bdays.length > 0 && (
            <section style={{ background: S.surface, padding: "1.5rem", borderRadius: "0.75rem", border: `1px solid ${S.border}`, position: "relative", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
                <span className="material-symbols-outlined" style={{ color: S.orange, fontSize: "1.25rem" }}>cake</span>
                <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.0625rem", textTransform: "uppercase", fontStyle: "italic", color: S.text }}>Birthdays</h3>
              </div>
              {bdays.map((b: any, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", opacity: i > 0 ? 0.5 : 1, paddingTop: i > 0 ? "0.75rem" : 0, borderTop: i > 0 ? `1px solid ${S.border}` : "none", marginTop: i > 0 ? "0.75rem" : 0 }}>
                  <div>
                    <span style={{ display: "block", fontWeight: 700, fontSize: "0.875rem", color: S.text }}>{b.name}</span>
                    <span style={{ fontSize: "0.625rem", color: S.orange, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em" }}>{i === 0 ? "Today" : "Upcoming"} · {b.date}</span>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* AI Record */}
          {atsTotal > 0 && (
            <div style={{ background: "linear-gradient(135deg, #1c1b1b, #131313)", padding: "1.5rem", borderRadius: "0.75rem", borderLeft: `4px solid ${S.orange}` }}>
              <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.15em", color: S.text, marginBottom: "1rem" }}>AI Season Record</h3>
              <div style={{ display: "flex", gap: "1.5rem" }}>
                {[[atsHits, atsTotal-atsHits, "ATS"], [ouHits, ouTotal-ouHits, "O/U"], [propHits, propRes.length-propHits, "PROPS"]].filter(([,, l]) => l === "PROPS" ? propRes.length > 0 : (l === "O/U" ? ouTotal > 0 : atsTotal > 0)).map(([h, m, l]) => (
                  <div key={l as string}>
                    <span style={{ display: "block", fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.5rem", color: (h as number)/((h as number)+(m as number)) >= 0.5 ? S.green : S.red }}>{h}-{m}</span>
                    <span style={{ fontSize: "0.5625rem", color: S.textMuted, fontWeight: 700, textTransform: "uppercase" }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: "#131313", borderTop: `1px solid ${S.border}`, padding: "2.5rem 2rem", marginTop: "1rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem", maxWidth: "1400px" }}>
          <p style={{ fontSize: "0.625rem", fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em", color: S.textMuted, opacity: 0.6 }}>© 2026 KnicksHub. Responsible Gaming Only.</p>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            {[["About", "/about"], ["Privacy", "/privacy"], ["Terms", "/terms"]].map(([label, to]) => (
              <Link key={to} to={to} style={{ fontSize: "0.625rem", fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em", color: S.textMuted, opacity: 0.5, textDecoration: "none" }}>{label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </>
  )
}
