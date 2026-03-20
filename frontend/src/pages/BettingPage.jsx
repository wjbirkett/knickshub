import { useQuery } from "@tanstack/react-query";
import { getBetting, getSchedule } from "../utils/api";
import { useState, useEffect } from "react";
export default function BettingPage() {
    const { data: lines, isLoading: lLoading } = useQuery({ queryKey: ["betting"], queryFn: getBetting });
    const { data: games } = useQuery({ queryKey: ["schedule"], queryFn: getSchedule });
    const H1 = { fontFamily: "Bebas Neue, sans-serif", fontSize: "3rem", letterSpacing: "0.15em", color: "#F58426" };
    const H2 = { fontFamily: "Bebas Neue, sans-serif", fontSize: "1.4rem", letterSpacing: "0.1em", color: "#F58426", margin: "0 0 0.75rem" };
    const today = new Date().toISOString().slice(0, 10);
    const nextGame = (games ?? []).find((g) => g.game_date >= today && g.status !== "Final");
    const hasLines = lines && lines.length > 0;
    return (<div style={{ maxWidth: "900px" }}>
      <header style={{ borderBottom: "1px solid #1f2937", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
        <h1 style={H1}>BETTING LINES</h1>
        <p style={{ color: "#6b7280", margin: 0, fontSize: "0.875rem" }}>Knicks upcoming games — via The Odds API</p>
      </header>

      {/* Next game card */}
      {nextGame && (<div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={H2}>NEXT GAME</h2>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <p style={{ color: "#f9fafb", fontSize: "1.2rem", fontWeight: 700, margin: "0 0 0.25rem" }}>
                <span style={{ color: nextGame.away_team.includes("Knicks") ? "#F58426" : "#e5e7eb" }}>{nextGame.away_team}</span>
                <span style={{ color: "#4b5563", margin: "0 0.5rem" }}>@</span>
                <span style={{ color: nextGame.home_team.includes("Knicks") ? "#F58426" : "#e5e7eb" }}>{nextGame.home_team}</span>
              </p>
              <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: 0 }}>
                {new Date(nextGame.game_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
            <Countdown gameDate={nextGame.game_date}/>
          </div>
        </div>)}

      {/* Lines */}
      {lLoading && (<div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "#6b7280" }}>Loading lines...</p>
        </div>)}

      {!lLoading && hasLines && (<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {lines.map((game) => <GameOddsCard key={game.id} game={game}/>)}
        </div>)}

      {!lLoading && !hasLines && (<div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "2.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "2rem", margin: "0 0 0.5rem" }}>🏀</p>
          <p style={{ color: "#f9fafb", fontWeight: 600, fontSize: "1rem", margin: "0 0 0.25rem" }}>No lines posted yet</p>
          <p style={{ color: "#4b5563", fontSize: "0.85rem", margin: 0 }}>Sportsbooks typically post lines 24–48 hours before tip-off</p>
        </div>)}

      {/* Disclaimer */}
      <p style={{ color: "#374151", fontSize: "0.7rem", marginTop: "1.5rem", textAlign: "center" }}>
        Odds for informational purposes only. Please gamble responsibly. 21+
      </p>
    </div>);
}
function Countdown({ gameDate }) {
    const target = new Date(gameDate + "T19:30:00").getTime();
    const [diff, setDiff] = useState(target - Date.now());
    useEffect(() => {
        const t = setInterval(() => setDiff(target - Date.now()), 1000);
        return () => clearInterval(t);
    }, [target]);
    if (diff <= 0)
        return <span style={{ color: "#4ade80", fontWeight: 700 }}>GAME TIME</span>;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const d = Math.floor(h / 24);
    return (<div style={{ display: "flex", gap: "0.75rem" }}>
      {d > 0 && <TimeBlock value={d} label="DAYS"/>}
      <TimeBlock value={d > 0 ? h % 24 : h} label="HRS"/>
      <TimeBlock value={m} label="MIN"/>
      <TimeBlock value={s} label="SEC"/>
    </div>);
}
function TimeBlock({ value, label }) {
    return (<div style={{ background: "#0d0d0d", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", textAlign: "center", minWidth: "52px" }}>
      <p style={{ color: "#F58426", fontSize: "1.4rem", fontWeight: 700, margin: 0, fontVariantNumeric: "tabular-nums" }}>
        {String(value).padStart(2, "0")}
      </p>
      <p style={{ color: "#4b5563", fontSize: "0.6rem", letterSpacing: "0.1em", margin: 0 }}>{label}</p>
    </div>);
}
function GameOddsCard({ game }) {
    const isKnicksAway = game.away_team.includes("Knicks") || game.away_team.includes("New York");
    const knicksML = isKnicksAway ? game.moneyline_away : game.moneyline_home;
    const oppML = isKnicksAway ? game.moneyline_home : game.moneyline_away;
    const rawSpread = game.spread;
    const knicksSpread = rawSpread != null ? (isKnicksAway ? -rawSpread : rawSpread) : null;
    return (<div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <p style={{ color: "#f9fafb", fontWeight: 700, fontSize: "1rem", margin: "0 0 0.2rem" }}>
          {game.away_team} @ {game.home_team}
        </p>
        <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: 0 }}>
          {new Date(game.commence_time).toLocaleDateString("en-US", {
            weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
        })}
          {game.bookmaker && <span style={{ color: "#374151" }}> · {game.bookmaker}</span>}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
        <OddsBox label="KNICKS ML" value={knicksML != null ? formatOdds(knicksML) : "—"} sub={oppML != null ? `Opp: ${formatOdds(oppML)}` : ""}/>
        <OddsBox label="SPREAD" value={knicksSpread != null ? `${knicksSpread > 0 ? "+" : ""}${knicksSpread}` : "—"} sub=""/>
        <OddsBox label="O/U" value={game.over_under != null ? `O ${game.over_under}` : "—"} sub=""/>
      </div>
    </div>);
}
function OddsBox({ label, value, sub }) {
    return (<div style={{ background: "#0d0d0d", borderRadius: "0.5rem", padding: "0.75rem", textAlign: "center" }}>
      <p style={{ color: "#6b7280", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 0.25rem" }}>{label}</p>
      <p style={{ color: "#f9fafb", fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>{value}</p>
      {sub && <p style={{ color: "#4b5563", fontSize: "0.75rem", margin: "0.2rem 0 0" }}>{sub}</p>}
    </div>);
}
function formatOdds(price) {
    if (!price)
        return "—";
    return price > 0 ? `+${price}` : `${price}`;
}
