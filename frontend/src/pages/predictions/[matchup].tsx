import { GetStaticPaths, GetStaticProps } from 'next';
import { createClient } from '@supabase/supabase-js';
import ArticleCard from '@/components/ArticleCard'; // adjust path if needed

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

interface Article {
  id: string;
  title: string;
  slug: string;
  published_at: string;
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
          {articles.map(article => (
            <ArticleCard
              key={article.id}
              title={article.title}
              slug={`/predictions/${article.slug}`}
              date={article.published_at}
            />
          ))}
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
  const matchup = params?.matchup as string;

  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, slug, published_at')
    .eq('matchup', matchup)
    .order('published_at', { ascending: false });

  return {
    props: { matchup, articles: articles || [] },
    revalidate: 60,
  };
};