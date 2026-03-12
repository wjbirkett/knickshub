import { useQuery } from "@tanstack/react-query"
import { getSchedule, getStandings } from "../utils/api"

export default function SchedulePage() {
  const { data: games, isLoading: gLoading } = useQuery({ queryKey: ["schedule"], queryFn: getSchedule })
  const { data: standings, isLoading: sLoading } = useQuery({ queryKey: ["standings"], queryFn: getStandings })
  const H1 = { fontFamily: "Bebas Neue, sans-serif", fontSize: "3rem", letterSpacing: "0.15em", color: "#F58426" }
  const H2 = { fontFamily: "Bebas Neue, sans-serif", fontSize: "1.4rem", letterSpacing: "0.1em", color: "#F58426", margin: "0 0 0.75rem" }

  const knicks = standings?.find((t: any) => t.team_name.includes("Knicks"))

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = (games ?? []).filter((g: any) => g.status === "Scheduled" || (g.game_date >= today && g.status !== "Final"))
  const recent = (games ?? []).filter((g: any) => g.status === "Final").slice(-10).reverse()

  return (
    <div style={{ maxWidth: "900px" }}>
      <header style={{ borderBottom: "1px solid #1f2937", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
        <h1 style={H1}>SCHEDULE</h1>
      </header>

      {knicks && (
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <h2 style={H2}>KNICKS STANDING</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem" }}>
            <Stat label="Record" value={`${knicks.wins}-${knicks.losses}`} />
            <Stat label="Win %" value={(knicks.win_pct * 100).toFixed(1) + "%"} />
            <Stat label="Conf Rank" value={`#${knicks.conference_rank}`} />
            <Stat label="Games Back" value={knicks.games_back === 0 ? "—" : knicks.games_back.toFixed(1)} />
            <Stat label="Conference" value={knicks.conference} />
          </div>
        </div>
      )}

      <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1.5rem" }}>
        <h2 style={H2}>UPCOMING GAMES</h2>
        {gLoading && <p style={{ color: "#6b7280" }}>Loading...</p>}
        {!gLoading && upcoming.length === 0 && <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>No upcoming games scheduled</p>}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {upcoming.slice(0, 10).map((g: any) => (
            <GameRow key={g.game_id} game={g} />
          ))}
        </div>
      </div>

      <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1.5rem" }}>
        <h2 style={H2}>RECENT RESULTS</h2>
        {gLoading && <p style={{ color: "#6b7280" }}>Loading...</p>}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {recent.map((g: any) => (
            <GameRow key={g.game_id} game={g} />
          ))}
        </div>
      </div>

      <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem" }}>
        <h2 style={H2}>EASTERN CONFERENCE STANDINGS</h2>
        {sLoading && <p style={{ color: "#6b7280" }}>Loading standings...</p>}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ color: "#6b7280", textAlign: "left" }}>
                <th style={{ padding: "0.5rem 0.75rem" }}>Team</th>
                <th style={{ padding: "0.5rem 0.75rem", textAlign: "center" }}>W</th>
                <th style={{ padding: "0.5rem 0.75rem", textAlign: "center" }}>L</th>
                <th style={{ padding: "0.5rem 0.75rem", textAlign: "center" }}>PCT</th>
                <th style={{ padding: "0.5rem 0.75rem", textAlign: "center" }}>GB</th>
              </tr>
            </thead>
            <tbody>
              {(standings ?? []).filter((t: any) => t.conference === "East").map((t: any) => (
                <tr key={t.team_name} style={{
                  borderTop: "1px solid #1f2937",
                  background: t.team_name.includes("Knicks") ? "#0c1a4b" : "transparent",
                }}>
                  <td style={{ padding: "0.6rem 0.75rem", color: t.team_name.includes("Knicks") ? "#93c5fd" : "#e5e7eb", fontWeight: t.team_name.includes("Knicks") ? 700 : 400 }}>
                    {t.conference_rank}. {t.team_name}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", textAlign: "center", color: "#d1d5db" }}>{t.wins}</td>
                  <td style={{ padding: "0.6rem 0.75rem", textAlign: "center", color: "#d1d5db" }}>{t.losses}</td>
                  <td style={{ padding: "0.6rem 0.75rem", textAlign: "center", color: "#d1d5db" }}>{(t.win_pct * 100).toFixed(1)}%</td>
                  <td style={{ padding: "0.6rem 0.75rem", textAlign: "center", color: "#d1d5db" }}>{t.games_back === 0 ? "—" : t.games_back.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function GameRow({ game }: { game: any }) {
  const isKnicksHome = game.home_team.includes("Knicks")
  const isKnicksAway = game.away_team.includes("Knicks")
  const knickWon = game.status === "Final" && (
    (isKnicksHome && game.home_score > game.away_score) ||
    (isKnicksAway && game.away_score > game.home_score)
  )
  const knickLost = game.status === "Final" && !knickWon

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0.75rem 0", borderBottom: "1px solid #1f2937",
    }}>
      <div style={{ minWidth: "120px" }}>
        <p style={{ color: "#6b7280", fontSize: "0.75rem", margin: 0 }}>
          {new Date(game.game_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </p>
        {game.arena && <p style={{ color: "#4b5563", fontSize: "0.7rem", margin: "0.1rem 0 0" }}>{game.arena}</p>}
      </div>
      <div style={{ flex: 1, textAlign: "center" }}>
        <p style={{ color: "#f9fafb", fontWeight: 600, fontSize: "0.9rem", margin: 0 }}>
          <span style={{ color: isKnicksAway ? "#F58426" : "#e5e7eb" }}>{game.away_team}</span>
          <span style={{ color: "#4b5563", margin: "0 0.4rem" }}>@</span>
          <span style={{ color: isKnicksHome ? "#F58426" : "#e5e7eb" }}>{game.home_team}</span>
        </p>
      </div>
      <div style={{ minWidth: "90px", textAlign: "right" }}>
        {game.status === "Final" ? (
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "#f9fafb", fontWeight: 700, margin: 0, fontSize: "0.9rem" }}>{game.away_score} - {game.home_score}</p>
            <span style={{
              fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em",
              color: knickWon ? "#4ade80" : knickLost ? "#f87171" : "#9ca3af"
            }}>
              {knickWon ? "WIN" : knickLost ? "LOSS" : "FINAL"}
            </span>
          </div>
        ) : game.status === "Live" ? (
          <span style={{ background: "#7f1d1d", color: "#fca5a5", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700 }}>LIVE</span>
        ) : (
          <span style={{ background: "#0c1a4b", color: "#93c5fd", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem" }}>
            {new Date(game.game_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#0d0d0d", borderRadius: "0.5rem", padding: "0.75rem", textAlign: "center" }}>
      <p style={{ color: "#6b7280", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>{label}</p>
      <p style={{ color: "#f9fafb", fontSize: "1.1rem", fontWeight: 700, margin: "0.25rem 0 0" }}>{value}</p>
    </div>
  )
}
