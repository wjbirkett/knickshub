import { Link, useLocation } from "react-router-dom"

const NAV_ITEMS = [
  { to: "/",                        label: "Dashboard",      icon: "dashboard" },
  { to: "/predictions",             label: "Predictions",    icon: "analytics" },
  { to: "/props",                   label: "Player Props",   icon: "sports_basketball" },
  { to: "/knicks-betting-record",   label: "Betting Record", icon: "receipt_long" },
  { to: "/betting",                 label: "Betting",        icon: "trending_up" },
  { to: "/news",                    label: "News Feed",      icon: "newspaper" },
  { to: "/injuries",                label: "Injuries",       icon: "medical_services" },
  { to: "/schedule",                label: "Schedule",       icon: "calendar_month" },
  { to: "/stats",                   label: "Stats",          icon: "leaderboard" },
]

export default function Sidebar() {
  const { pathname } = useLocation()

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col h-screen fixed left-0 top-0 w-64 border-r border-white/15 bg-[#1C1B1B]/70 backdrop-blur-xl z-50 shadow-[24px_0_48px_rgba(0,0,0,0.4)]">
        <div className="p-8">
          <Link to="/">
            <h1 className="text-2xl font-black text-[#F58426] tracking-tighter italic font-headline uppercase">KnicksHub</h1>
          </Link>
          <p className="text-[10px] uppercase tracking-widest text-[#DDC1B1] font-headline mt-1 opacity-70">The Courtside Editorial</p>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon }) => {
            const isActive = pathname === to || (to !== "/" && pathname.startsWith(to))
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-4 py-3 font-headline tracking-tight uppercase font-bold text-sm transition-all duration-200 ${
                  isActive
                    ? "text-[#FFB786] border-l-2 border-[#FFB786] bg-gradient-to-r from-[#F58426]/10 to-transparent"
                    : "text-[#DDC1B1] opacity-70 hover:bg-white/5 hover:text-[#FFB786] hover:opacity-100"
                }`}
              >
                <span className="material-symbols-outlined text-xl">{icon}</span>
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-6">
          <a
            href="https://www.draftkings.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-4 bg-gradient-to-br from-primary-container to-primary text-on-primary-container font-headline font-black uppercase tracking-widest text-sm rounded shadow-lg text-center transition-all active:scale-95 hover:opacity-90"
          >
            Place Bet
          </a>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden fixed top-0 w-full z-50 h-16 bg-[#131313]/80 backdrop-blur-lg border-b border-white/10 flex justify-between items-center px-6">
        <Link to="/">
          <h1 className="text-xl font-black text-[#F58426] font-headline italic uppercase">KnicksHub</h1>
        </Link>
        <span className="material-symbols-outlined text-[#FFB786]">menu</span>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 w-full z-50 bg-[#131313]/80 backdrop-blur-lg border-t border-white/10 h-16 flex items-center justify-around px-2">
        {[
          { to: "/",            icon: "dashboard",        label: "Home" },
          { to: "/predictions", icon: "analytics",        label: "Picks" },
          { to: "/props",       icon: "sports_basketball",label: "Props" },
          { to: "/betting",     icon: "trending_up",      label: "Bet" },
          { to: "/news",        icon: "newspaper",        label: "News" },
        ].map(({ to, icon, label }) => {
          const isActive = pathname === to || (to !== "/" && pathname.startsWith(to))
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 ${isActive ? "text-[#FFB786]" : "text-[#DDC1B1] opacity-50"}`}
            >
              <span className="material-symbols-outlined text-xl">{icon}</span>
              <span className="text-[8px] font-bold uppercase tracking-tighter">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
