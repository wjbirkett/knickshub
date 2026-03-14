import { GetStaticPaths, GetStaticProps } from 'next';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

interface Article {
  id: string;
  title: string;
  slug: string;
  published_at: string;
  article_type: string;
  home_team: string;
  away_team: string;
}

// Article type badges
const TYPE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  prediction: { label: "PREDICTION", bg: "#0c1a4b", color: "#93c5fd" },
  best_bet:   { label: "BEST BET",   bg: "#14532d", color: "#86efac" },
  prop:       { label: "PROP BET",   bg: "#4a1d1d", color: "#fca5a5" },
  history:    { label: "HISTORY",    bg: "#2e1a4b", color: "#d8b4fe" },
};

// Opponent badge colors
const TEAM_COLORS: Record<string, { bg: string; color: string }> = {
  "New York Knicks": { bg: "#006BB6", color: "#F58426" },
  "Boston Celtics":  { bg: "#007A33", color: "#BA9653" },
  "Los Angeles Lakers": { bg: "#552583", color: "#FDB927" },
  "Golden State Warriors": { bg: "#1D428A", color: "#FFC72C" },
  // Add other NBA teams as needed
};

// Normalize matchups alphabetically
function normalizeMatchupParam(param: string) {
  const teams = param.split('-');
  return teams.sort().join('-');
}

// Get team colors or default gray
function getOpponentBadgeColor(team: string) {
  return TEAM_COLORS[team] ?? { bg: "#1f2937", color: "#d1d5db" };
}

interface MatchupPageProps {
  matchup: string;
  articles: Article[];
}

export default function MatchupPage({ matchup, articles }: MatchupPageProps) {
  const displayMatchup = matchup
    .split('-')
    .map(t => t.charAt(0).toUpperCase() + t.slice(1))
    .join(' vs ');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{displayMatchup}: Predictions Archive</h1>

      {articles.length === 0 ? (
        <p>No articles yet for this matchup.</p>
      ) : (
        <div className="grid gap-4">
          {articles.map(article => {
            const badge = TYPE_CONFIG[article.article_type] ?? { label: article.article_type?.toUpperCase() ?? "PREVIEW", bg: "#1f2937", color: "#9ca3af" };

            const opponent = article.home_team === "New York Knicks" ? article.away_team : article.home_team;
            const opponentBadge = getOpponentBadgeColor(opponent);

            return (
              <Link
                key={article.id}
                href={`/predictions/${article.slug}`}
                className="block p-4 bg-[#111827] border border-[#374151] rounded-lg hover:border-[#F58426] transition"
              >
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <h2 className="text-lg font-bold text-[#F9FAFB]">{article.title}</h2>
                  <div className="flex gap-1 flex-wrap">
                    <span
                      style={{
                        background: badge.bg,
                        color: badge.color,
                        padding: "0.2rem 0.6rem",
                        borderRadius: "999px",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                      }}
                    >
                      {badge.label}
                    </span>
                    <span
                      style={{
                        background: opponentBadge.bg,
                        color: opponentBadge.color,
                        padding: "0.2rem 0.6rem",
                        borderRadius: "999px",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                      }}
                    >
                      vs {opponent}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-[#6B7280] mt-1">{new Date(article.published_at).toLocaleDateString()}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const { data: matchups } = await supabase
    .from('articles')
    .select('matchup')
    .neq('matchup', null);

  const uniqueMatchups = Array.from(new Set(matchups?.map(m => m.matchup)));
  const paths = uniqueMatchups?.map(m => ({ params: { matchup: m } })) || [];

  return { paths, fallback: 'blocking' };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const rawMatchup = params?.matchup as string;
  const matchup = normalizeMatchupParam(rawMatchup);

  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, slug, published_at, article_type, home_team, away_team')
    .eq('matchup', matchup)
    .order('published_at', { ascending: false });

  return {
    props: { matchup, articles: articles || [] },
    revalidate: 60,
  };
};