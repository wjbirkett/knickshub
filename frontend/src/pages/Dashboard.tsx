import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { getNews, getInjuries, getBirthdays, getSchedule, getStandings, getArticles, getResults } from "../utils/api"

const ARTICLE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  prediction: { bg: "#0c1a4b", color: "#93c5fd", label: "PREDICTION" },
  best_bet:   { bg: "#14532d", color: "#86efac", label: "BEST BET" },
  prop:       { bg: "#4a1d1d", color: "#fca5a5", label: "PROP BET" },
  history:    { bg: "#2e1a4b", color: "#d8b4fe", label: "HISTORY" },
}

export default function Dashboard() {
  const { data: news }       = useQuery({ queryKey: ["news"],      queryFn: () => getNews(undefined) })
  const { data: injuries }   = useQuery({ queryKey: ["injuries"],  queryFn: getInjuries })
  const { data: birthdays }  = useQuery({ queryKey: ["birthdays"], queryFn: getBirthdays })
  const { data: schedule }   = useQuery({ queryKey: ["schedule"],  queryFn: getSchedule })
  const { data: standings }  = useQuery({ queryKey: ["standings"], queryFn: getStandings })
  const { data: articles }   = useQuery({ queryKey: ["articles"],  queryFn: () => getArticles(20) })
  const { data: resultsData }= useQuery({ queryKey: ["results"],   queryFn: getResults })

  const knicks = (standings as any[])?.find((t: any) =>
    t.team?.includes("Knicks") || t.teamName?.includes("Knicks")
  )

  const todayBestBet = (articles as any[])?.find((a: any) => a.article_type === "best_bet")
  const latestPredictions = (articles as any[])?.filter((a: any) =>
    ["prediction", "best_bet", "prop"].includes(a.article_type)
  ).slice(0, 3)

  const nextGame = (schedule as any[])?.find((g: any) => g.status === "scheduled")
  const lastGame = (schedule as any[])?.filter((g: any) => g.status === "closed").slice(-1)[0]

  const knicksInjuries = (injuries as any[])?.slice(0, 4) ?? []
  const upcomingBirthdays = (birthdays as any[])?.slice(0, 2) ?? []

  const preds = resultsData?.predictions ?? []
  const propRes = resultsData?.props ?? []
  const atsHits  = preds.filter((r: any) => r.spread_result === "HIT").length
  const atsTotal = preds.filter((r: any) => r.spread_result).length
  const ouHits   = preds.filter((r: any) => r.total_result === "HIT").length
  const ouTotal  = preds.filter((r: any) => r.total_result).length
  const propHits = propRes.filter((r: any) => r.result === "HIT").length

  const formatDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })

  const opponent = (a: any) =>
    a?.home_team?.includes("Knicks") ? a.away_team : a.home_team

  return (
    <div className="bg-background text-on-background min-h-screen">
      <Helmet>
        <title>KnicksHub — Knicks Predictions, Best Bets & Player Props</title>
        <meta name="description" content="AI-powered New York Knicks betting predictions, best bets, spread picks, and player props. Daily analysis from KnicksHub." />
        <link rel="canonical" href="https://knickshub.vercel.app" />
      </Helmet>

      {/* Team Record Bar */}
      {knicks && (
        <div className="bg-surface-container-low border-b border-white/10 px-6 lg:px-12 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-headline font-black text-sm text-on-surface uppercase tracking-tight">New York Knicks</span>
            <span className="text-[10px] text-on-surface-variant uppercase tracking-widest">Eastern Conference</span>
          </div>
          <div className="flex gap-8">
            <div className="text-center">
              <span className="block font-headline font-black text-lg">{knicks.wins}-{knicks.losses}</span>
              <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-tighter">W-L</span>
            </div>
            <div className="text-center">
              <span className="block font-headline font-black text-lg text-primary">#{knicks.conferenceRank || knicks.rank || "—"}</span>
              <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-tighter">SEED</span>
            </div>
            {atsTotal > 0 && (
              <div className="text-center">
                <span className="block font-headline font-black text-lg" style={{ color: atsHits/atsTotal >= 0.5 ? "#4ade80" : "#f87171" }}>
                  {atsHits}-{atsTotal - atsHits}
                </span>
                <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-tighter">ATS</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="px-6 lg:px-12 py-8">
        {/* AI Best Bet Hero + Next/Last Game */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">

          {/* AI Best Bet Hero */}
          {todayBestBet ? (
            <Link to={`/predictions/${todayBestBet.slug}`} className="lg:col-span-8 no-underline">
              <div className="relative overflow-hidden bg-surface-container-high rounded-xl p-8 border-l-4 border-primary shadow-2xl h-full group hover:border-[#F58426] transition-colors">
                <div className="relative z-10">
                  <span className="inline-flex items-center gap-2 bg-primary-container text-on-primary-container px-3 py-1 text-xs font-black tracking-widest uppercase rounded mb-6 italic">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    AI Recommended Best Bet
                  </span>
                  <h2 className="text-4xl lg:text-5xl font-headline font-black tracking-tighter mb-4 leading-tight text-on-surface group-hover:text-primary transition-colors">
                    {todayBestBet.title}
                  </h2>
                  {todayBestBet.key_picks && (
                    <div className="flex flex-wrap gap-3 mb-6">
                      {todayBestBet.key_picks.spread_pick && (
                        <span className="bg-surface-container-highest px-4 py-2 rounded font-headline font-bold text-sm">
                          {todayBestBet.key_picks.spread_pick}
                          <span className={`ml-2 text-xs ${todayBestBet.key_picks.spread_lean === 'COVER' ? 'text-tertiary' : 'text-error'}`}>
                            {todayBestBet.key_picks.spread_lean}
                          </span>
                        </span>
                      )}
                      {todayBestBet.key_picks.total_pick && (
                        <span className="bg-surface-container-highest px-4 py-2 rounded font-headline font-bold text-sm">
                          {todayBestBet.key_picks.total_pick}
                          <span className={`ml-2 text-xs ${todayBestBet.key_picks.total_lean === 'OVER' ? 'text-tertiary' : 'text-error'}`}>
                            {todayBestBet.key_picks.total_lean}
                          </span>
                        </span>
                      )}
                      {todayBestBet.key_picks.confidence && (
                        <span className={`px-4 py-2 rounded font-headline font-bold text-xs uppercase ${
                          todayBestBet.key_picks.confidence === 'High' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-container-highest text-on-surface-variant'
                        }`}>
                          {todayBestBet.key_picks.confidence} Conf
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-on-surface-variant text-sm">
                    vs {opponent(todayBestBet)} · {formatDate(todayBestBet.game_date)} · Click to read full analysis →
                  </p>
                </div>
              </div>
            </Link>
          ) : (
            <div className="lg:col-span-8 bg-surface-container-high rounded-xl p-8 border-l-4 border-primary/30 flex flex-col justify-center">
              <span className="inline-flex items-center gap-2 bg-primary-container/20 text-primary px-3 py-1 text-xs font-black tracking-widest uppercase rounded mb-4 italic w-fit">
                <span className="material-symbols-outlined text-sm">schedule</span>
                AI Picks Drop ~45 Min Before Tip-Off
              </span>
              <h2 className="text-3xl font-headline font-black tracking-tighter text-on-surface mb-3">
                Next Game: {nextGame ? `vs ${opponent(nextGame)}` : "Loading..."}
              </h2>
              <p className="text-on-surface-variant text-sm">
                Best bet, prediction, and player props will auto-generate before tip-off.
              </p>
              {atsTotal > 0 && (
                <div className="flex gap-6 mt-6">
                  <div>
                    <span className="block font-headline font-black text-2xl" style={{ color: atsHits/atsTotal >= 0.5 ? "#4ade80" : "#f87171" }}>{atsHits}-{atsTotal-atsHits}</span>
                    <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-tighter">ATS</span>
                  </div>
                  {ouTotal > 0 && (
                    <div>
                      <span className="block font-headline font-black text-2xl" style={{ color: ouHits/ouTotal >= 0.5 ? "#4ade80" : "#f87171" }}>{ouHits}-{ouTotal-ouHits}</span>
                      <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-tighter">O/U</span>
                    </div>
                  )}
                  {propRes.length > 0 && (
                    <div>
                      <span className="block font-headline font-black text-2xl" style={{ color: propHits/propRes.length >= 0.5 ? "#4ade80" : "#f87171" }}>{propHits}-{propRes.length-propHits}</span>
                      <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-tighter">PROPS</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Next + Last Game */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {nextGame && (
              <div className="flex-1 bg-surface-container-high rounded-xl p-6">
                <span className="text-[10px] font-black tracking-[0.2rem] text-primary uppercase mb-3 block">Next Battle</span>
                <div className="flex items-center justify-between">
                  <span className="font-headline font-black text-2xl">NYK</span>
                  <span className="font-headline text-on-surface-variant italic font-black">VS</span>
                  <span className="font-headline font-black text-2xl">
                    {opponent(nextGame)?.split(" ").pop()}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-3 font-bold uppercase tracking-widest">
                  {new Date(nextGame.date || nextGame.game_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  {nextGame.time && ` · ${nextGame.time}`}
                </p>
              </div>
            )}
            {lastGame && (
              <div className="flex-1 bg-surface-container-high rounded-xl p-6 border-l-4 border-tertiary">
                <span className="text-[10px] font-black tracking-[0.2rem] text-tertiary uppercase mb-3 block">Last Result</span>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block font-headline font-black text-2xl">
                      {lastGame.score?.NYK ?? lastGame.homeScore ?? "—"} - {
                        lastGame.score
                          ? Object.values(lastGame.score).find((_,i) => Object.keys(lastGame.score)[i] !== "NYK") ?? "—"
                          : lastGame.awayScore ?? "—"
                      }
                    </span>
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                      vs {opponent(lastGame)}
                    </span>
                  </div>
                  <span className={`px-3 py-1 font-headline font-black text-lg rounded uppercase italic ${
                    ((lastGame.score?.NYK ?? 0) > ((Object.values(lastGame.score || {}) as number[]).filter((_,i) => Object.keys(lastGame.score||{})[i] !== "NYK")[0] ?? 0))
                      ? "bg-tertiary text-on-tertiary"
                      : "bg-error-container text-on-error-container"
                  }`}>
                    {lastGame.result || (lastGame.score?.NYK > 0 ? "W" : "L")}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Grid: Predictions + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left: Predictions + News */}
          <div className="lg:col-span-8 space-y-10">

            {/* Latest Predictions */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-headline font-black tracking-tight uppercase italic text-on-surface">Latest Predictions</h2>
                <Link to="/predictions" className="text-xs font-bold text-primary tracking-widest uppercase hover:underline">See All</Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {latestPredictions?.map((a: any) => {
                  const badge = ARTICLE_BADGE[a.article_type] ?? ARTICLE_BADGE.prediction
                  return (
                    <Link key={a.slug} to={`/predictions/${a.slug}`} className="no-underline">
                      <div className="bg-surface-container-high p-5 rounded-lg border border-white/5 h-full hover:border-primary/30 transition-colors group">
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded mb-3 inline-block"
                          style={{ background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                        <h4 className="font-headline font-bold text-base mb-2 leading-tight text-on-surface group-hover:text-primary transition-colors line-clamp-3">
                          {a.title}
                        </h4>
                        <div className="flex justify-between items-center text-[10px] font-black text-primary uppercase mt-3">
                          <span>{formatDate(a.game_date)}</span>
                          {a.key_picks?.confidence && (
                            <span className={a.key_picks.confidence === "High" ? "text-tertiary" : "text-on-surface-variant"}>
                              {a.key_picks.confidence} Conf
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>

            {/* News Feed */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-headline font-black tracking-tight uppercase italic text-on-surface">Editorial News Feed</h2>
                <Link to="/news" className="text-xs font-bold text-primary tracking-widest uppercase hover:underline">See All</Link>
              </div>
              <div className="space-y-3">
                {(news as any[])?.slice(0, 8).map((item: any, i: number) => (
                  <a key={i} href={item.url || item.link || "#"} target="_blank" rel="noopener noreferrer"
                    className="flex gap-4 p-3 hover:bg-white/5 rounded-lg transition-colors cursor-pointer group no-underline">
                    <div className="flex flex-col justify-center flex-1">
                      <span className="text-[9px] font-black text-primary tracking-widest uppercase mb-1">
                        {item.source || item.category || "Knicks"}
                      </span>
                      <h4 className="font-headline font-bold text-base leading-tight text-on-surface group-hover:text-primary transition-colors">
                        {item.title}
                      </h4>
                      {item.description && (
                        <p className="text-xs text-on-surface-variant mt-1 line-clamp-1">{item.description}</p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </section>
          </div>

          {/* Right: Injuries + Birthdays */}
          <div className="lg:col-span-4 space-y-6">

            {/* Injury Report */}
            <section className="bg-surface-container-low p-6 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-primary">medical_services</span>
                <h3 className="text-lg font-headline font-black uppercase italic text-on-surface">Injury Report</h3>
              </div>
              <div className="space-y-4">
                {knicksInjuries.length > 0 ? knicksInjuries.map((inj: any, i: number) => (
                  <div key={i} className="flex justify-between items-start">
                    <div>
                      <span className="block font-bold text-sm text-on-surface">{inj.player_name || inj.name}</span>
                      <span className="text-[10px] text-on-surface-variant uppercase">{inj.reason || inj.injury}</span>
                    </div>
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded ${
                      (inj.status || "").toLowerCase().includes("out")
                        ? "bg-error-container text-on-error-container"
                        : "bg-surface-container-highest text-primary"
                    }`}>
                      {inj.status || "GTD"}
                    </span>
                  </div>
                )) : (
                  <p className="text-xs text-on-surface-variant">No injuries reported.</p>
                )}
              </div>
              <Link to="/injuries" className="block mt-4 text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">
                Full Report →
              </Link>
            </section>

            {/* Birthdays */}
            {upcomingBirthdays.length > 0 && (
              <section className="bg-surface-container-low p-6 rounded-xl border border-white/5 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10">
                  <span className="material-symbols-outlined text-8xl" style={{ fontVariationSettings: "'FILL' 1" }}>cake</span>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="material-symbols-outlined text-primary">cake</span>
                    <h3 className="text-lg font-headline font-black uppercase italic text-on-surface">Birthdays</h3>
                  </div>
                  <div className="space-y-4">
                    {upcomingBirthdays.map((b: any, i: number) => (
                      <div key={i} className={`flex items-center gap-3 ${i > 0 ? "opacity-50 pt-3 border-t border-white/5" : ""}`}>
                        <div>
                          <span className="block font-bold text-sm text-on-surface">{b.name}</span>
                          <span className="text-[10px] text-primary font-bold uppercase tracking-widest">
                            {i === 0 ? "Today" : "Upcoming"} · {b.date}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Record Summary */}
            {(atsTotal > 0 || propRes.length > 0) && (
              <div className="bg-gradient-to-br from-[#1C1B1B] to-[#131313] p-6 rounded-xl border-l-4 border-primary">
                <h3 className="text-sm font-headline font-black uppercase tracking-widest text-on-surface mb-4">AI Record</h3>
                <div className="flex gap-6">
                  {atsTotal > 0 && (
                    <div>
                      <span className="block font-headline font-black text-2xl" style={{ color: atsHits/atsTotal >= 0.5 ? "#4ade80" : "#f87171" }}>{atsHits}-{atsTotal-atsHits}</span>
                      <span className="text-[9px] text-on-surface-variant font-bold uppercase">ATS</span>
                    </div>
                  )}
                  {ouTotal > 0 && (
                    <div>
                      <span className="block font-headline font-black text-2xl" style={{ color: ouHits/ouTotal >= 0.5 ? "#4ade80" : "#f87171" }}>{ouHits}-{ouTotal-ouHits}</span>
                      <span className="text-[9px] text-on-surface-variant font-bold uppercase">O/U</span>
                    </div>
                  )}
                  {propRes.length > 0 && (
                    <div>
                      <span className="block font-headline font-black text-2xl" style={{ color: propHits/propRes.length >= 0.5 ? "#4ade80" : "#f87171" }}>{propHits}-{propRes.length-propHits}</span>
                      <span className="text-[9px] text-on-surface-variant font-bold uppercase">PROPS</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#131313] w-full py-10 px-8 border-t border-white/5 mt-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 max-w-7xl mx-auto">
          <p className="text-[10px] font-label uppercase tracking-widest text-[#DDC1B1] opacity-60">© 2026 KnicksHub. Responsible Gaming Only.</p>
          <div className="flex gap-6">
            {[["About", "/about"], ["Privacy", "/privacy"], ["Terms", "/terms"]].map(([label, to]) => (
              <Link key={to} to={to} className="text-[10px] font-label uppercase tracking-widest text-[#DDC1B1] opacity-50 hover:text-[#FFB786] transition-colors no-underline">{label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
