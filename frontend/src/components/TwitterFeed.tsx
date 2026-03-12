interface TwitterFeedProps {
  handle?: string
  height?: number
}

export default function TwitterFeed({ handle = "nyknicks", height = 500 }: TwitterFeedProps) {
  const src = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}?dnt=true&embedId=twitter-widget-0&frame=false&hideBorder=false&hideFooter=false&hideHeader=false&hideScrollBar=false&lang=en&theme=dark&widgetId=0`

  return (
    <div style={{ borderRadius: "0.75rem", overflow: "hidden", border: "1px solid #1f2937", background: "#111827" }}>
      <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #1f2937", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#1d9bf0"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        <span style={{ color: "#9ca3af", fontSize: "0.8rem", fontWeight: 600 }}>@{handle}</span>
      </div>
      <iframe
        src={src}
        style={{ width: "100%", height: `${height}px`, border: "none", display: "block", background: "#111827" }}
        title={`@${handle} on X`}
        sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  )
}
