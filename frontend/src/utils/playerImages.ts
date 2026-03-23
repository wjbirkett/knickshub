// ESPN CDN headshots for Knicks players
const PLAYER_IMAGES: Record<string, string> = {
  "Jalen Brunson": "https://a.espncdn.com/i/headshots/nba/players/full/3934672.png",
  "Karl-Anthony Towns": "https://a.espncdn.com/i/headshots/nba/players/full/3136195.png",
  "Mikal Bridges": "https://a.espncdn.com/i/headshots/nba/players/full/3147657.png",
  "OG Anunoby": "https://a.espncdn.com/i/headshots/nba/players/full/3934719.png",
  "Josh Hart": "https://a.espncdn.com/i/headshots/nba/players/full/3062679.png",
  "Miles McBride": "https://a.espncdn.com/i/headshots/nba/players/full/4431823.png",
  "Mitchell Robinson": "https://a.espncdn.com/i/headshots/nba/players/full/4351852.png",
  "Jordan Clarkson": "https://a.espncdn.com/i/headshots/nba/players/full/2528426.png",
  "Jose Alvarado": "https://a.espncdn.com/i/headshots/nba/players/full/4277869.png",
  "Landry Shamet": "https://a.espncdn.com/i/headshots/nba/players/full/3914044.png",
  "Tyler Kolek": "https://a.espncdn.com/i/headshots/nba/players/full/4433225.png",
  "Mohamed Diawara": "https://a.espncdn.com/i/headshots/nba/players/full/5289900.png",
  "Jeremy Sochan": "https://a.espncdn.com/i/headshots/nba/players/full/4610139.png",
  "Ariel Hukporti": "https://a.espncdn.com/i/headshots/nba/players/full/4871141.png",
  "Kevin McCullar Jr.": "https://a.espncdn.com/i/headshots/nba/players/full/4411057.png",
  "Pacome Dadiet": "https://a.espncdn.com/i/headshots/nba/players/full/5211983.png",
  "Pacôme Dadiet": "https://a.espncdn.com/i/headshots/nba/players/full/5211983.png",
  "Guerschon Yabusele": "https://a.espncdn.com/i/headshots/nba/players/full/3155535.png",
  "Trey Jemison III": "https://a.espncdn.com/i/headshots/nba/players/full/4395623.png",
  "Dillon Jones": "https://a.espncdn.com/i/headshots/nba/players/full/4702159.png",
  "Tosan Evbuomwan": "https://a.espncdn.com/i/headshots/nba/players/full/4702042.png",
}

const FALLBACK = "https://a.espncdn.com/combiner/i?img=/i/headshots/nophoto.png&w=200&h=146"

export const getPlayerImage = (name: string): string => PLAYER_IMAGES[name] || FALLBACK

export default PLAYER_IMAGES
