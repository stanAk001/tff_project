import { CampaignBanner, FeaturedCollection, LookbookTeaser } from '../components/home/Campaigns.jsx';
import CategoryGrid from '../components/home/CategoryGrid.jsx';
import Editorial from '../components/home/Editorial.jsx';
import FeaturedProducts from '../components/home/FeaturedProducts.jsx';
import Hero from '../components/home/Hero.jsx';
import Manifesto from '../components/home/Manifesto.jsx';
import NewDrop from '../components/home/NewDrop.jsx';
import Newsletter from '../components/Newsletter.jsx';
import ShopTheLook from '../components/ShopTheLook.jsx';
import { ErrorState, ProductGridSkeleton, Skeleton } from '../components/ui/Feedback.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useSeo } from '../hooks/useSeo.js';

// Which component draws each homepage section. The order, content and on/off
// state all come from Admin → Homepage.
const SECTIONS = {
  HERO: ({ section }) => <Hero content={section.content} />,
  MANIFESTO: ({ section }) => <Manifesto content={section.content} proof={section.proof} />,
  NEW_DROP: ({ section }) => <NewDrop content={section.content} products={section.products} />,
  CATEGORIES: ({ section }) => <CategoryGrid content={section.content} categories={section.categories} />,
  FEATURED_PRODUCTS: ({ section }) => <FeaturedProducts content={section.content} products={section.products} />,
  FEATURED_COLLECTION: ({ section }) => <FeaturedCollection content={section.content} collections={section.collections} />,
  EDITORIAL: ({ section }) => <Editorial content={section.content} />,
  SHOP_THE_LOOK: ({ section }) => <ShopTheLook content={section.content} look={section.look} />,
  CAMPAIGN_BANNER: ({ section }) => <CampaignBanner content={section.content} />,
  LOOKBOOK: ({ section }) => <LookbookTeaser content={section.content} lookbook={section.lookbook} />,
  NEWSLETTER: ({ section }) => <Newsletter content={section.content} />,
};

const HomeSkeleton = () => (
  <div role="status" aria-label="Loading">
    <Skeleton className="h-svh w-full" />
    <div className="shell py-24">
      <Skeleton className="mb-10 h-10 w-64" />
      <ProductGridSkeleton count={4} />
    </div>
  </div>
);

const Home = () => {
  const { data: sections, loading, error, reload } = useFetch('/homepage');
  useSeo({
    description: 'TFF — a modern fashion label. Shop limited drops, essentials and the latest collection.',
    jsonLd: { '@context': 'https://schema.org', '@type': 'Organization', name: 'TFF', url: window.location.origin },
  });

  if (loading) return <HomeSkeleton />;
  if (error) {
    return (
      <div className="pt-24">
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }

  // If the hero is switched off, leave room for the fixed navigation
  const startsWithHero = sections[0]?.type === 'HERO';

  return (
    <div className={startsWithHero ? '' : 'pt-[var(--header-h)]'}>
      {!startsWithHero && <h1 className="sr-only">TFF</h1>}
      {sections.map((section) => {
        const Section = SECTIONS[section.type];
        return Section ? <Section key={section.id} section={section} /> : null;
      })}
    </div>
  );
};

export default Home;
