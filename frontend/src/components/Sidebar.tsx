import { NavLink } from "react-router-dom"
import { Home, Newspaper, Activity, TrendingUp, Calendar, BarChart2, Twitter, Target } from "lucide-react"

const NAV = [
  { to: "/",           label: "Dashboard",   icon: Home },
  { to: "/news",       label: "News Feed",   icon: Newspaper },
  { to: "/injuries",   label: "Injuries",    icon: Activity },
  { to: "/betting",    label: "Betting",     icon: TrendingUp },
  { to: "/schedule",   label: "Schedule",    icon: Calendar },
  { to: "/stats",      label: "Stats",       icon: BarChart2 },
  { to: "/tweets",     label: "Tweets",      icon: Twitter },
  { to: "/predictions",label: "Predictions", icon: Target },
]

export default function Sidebar() {
  return (
    <aside style={{position:"fixed",inset:"0 auto 0 0",width:"16rem",background:"#0d0d0d",borderRight:"1px solid #1f2937",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"1.25rem 1.5rem",borderBottom:"1px solid #1f2937"}}>
        <span style={{fontFamily:"Bebas Neue,sans-serif",fontSize:"2.25rem",letterSpacing:"0.15em",color:"#F58426"}}>KNICKS</span>
        <span style={{fontFamily:"Bebas Neue,sans-serif",fontSize:"2.25rem",letterSpacing:"0.15em",color:"#006BB6"}}>HUB</span>
      </div>
      <nav style={{flex:1,padding:"1rem 0.75rem",display:"flex",flexDirection:"column",gap:"0.25rem"}}>
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to==="/"}
            style={({ isActive }) => ({
              display:"flex", alignItems:"center", gap:"0.75rem",
              padding:"0.6rem 1rem", borderRadius:"0.5rem",
              fontSize:"0.875rem", fontWeight:500, textDecoration:"none",
              background: isActive ? "#1d4ed8" : "transparent",
              color: isActive ? "#fff" : "#9ca3af",
              transition:"all 0.15s",
            })}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div style={{padding:"1rem 1.5rem",borderTop:"1px solid #1f2937",fontSize:"0.75rem",color:"#4b5563"}}>
        KnicksHub 2026
      </div>
    </aside>
  )
}
