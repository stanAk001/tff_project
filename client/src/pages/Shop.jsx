import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import ProductGrid from '../components/product/ProductGrid.jsx';
import FilterDrawer from '../components/shop/FilterDrawer.jsx';
import Button from '../components/ui/Button.jsx';
import { ErrorState, Pagination, ProductGridSkeleton, StateMessage } from '../components/ui/Feedback.jsx';
import { ChevronIcon, CloseIcon, FilterIcon } from '../components/ui/Icons.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useSeo } from '../hooks/useSeo.js';
import { naira } from '../utils/format.js';

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'popular', label: 'Popular' },
];

const list = (value) => (value ? value.split(',').filter(Boolean) : []);

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  // The URL is the single source of truth for filters, so every view can be shared or bookmarked
  const filters = useMemo(
    () => ({
      q: searchParams.get('q') || '',
      category: searchParams.get('category') || '',
      collection: searchParams.get('collection') || '',
      gender: searchParams.get('gender') || '',
      sizes: list(searchParams.get('sizes')),
      colours: list(searchParams.get('colours')),
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      availability: searchParams.get('availability') || '',
      sort: searchParams.get('sort') || 'featured',
      page: Number(searchParams.get('page')) || 1,
    }),
    [searchParams],
  );

  const params = useMemo(() => {
    const entries = { ...filters, sizes: filters.sizes.join(','), colours: filters.colours.join(','), limit: 24 };
    return Object.fromEntries(Object.entries(entries).filter(([, value]) => value !== '' && value != null));
  }, [filters]);

  const { data: products, meta, loading, error, reload } = useFetch('/products', { params, paged: true });
  const { data: facets } = useFetch('/products/facets');

  const update = (changes, { keepPage = false } = {}) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) next.delete(key);
      else next.set(key, Array.isArray(value) ? value.join(',') : String(value));
    }
    if (!keepPage) next.delete('page');
    setSearchParams(next, { preventScrollReset: true });
  };

  const toggleInList = (key, value) => {
    const current = filters[key];
    update({ [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value] });
  };

  const clearAll = () => setSearchParams(filters.q ? { q: filters.q } : {});

  const categoryName = facets?.categories.find((c) => c.slug === filters.category)?.name;
  const collectionName = facets?.collections.find((c) => c.slug === filters.collection)?.name;
  const genderName = { MEN: 'Men', WOMEN: 'Women' }[filters.gender];

  // Removable chips for everything currently applied
  const chips = [
    categoryName && { label: categoryName, clear: { category: null } },
    collectionName && { label: collectionName, clear: { collection: null } },
    genderName && { label: genderName, clear: { gender: null } },
    ...filters.sizes.map((size) => ({ label: `Size ${size}`, clear: { sizes: filters.sizes.filter((s) => s !== size) } })),
    ...filters.colours.map((colour) => ({ label: colour, clear: { colours: filters.colours.filter((c) => c !== colour) } })),
    (filters.minPrice || filters.maxPrice) && {
      label: `${filters.minPrice ? naira(filters.minPrice) : '₦0'} – ${filters.maxPrice ? naira(filters.maxPrice) : 'any'}`,
      clear: { minPrice: null, maxPrice: null },
    },
    filters.availability === 'in_stock' && { label: 'In stock', clear: { availability: null } },
  ].filter(Boolean);

  const title = filters.q ? `“${filters.q}”` : categoryName || collectionName || genderName || 'All pieces';

  useSeo({
    title: filters.q ? `Search: ${filters.q}` : categoryName || collectionName || (genderName ? `${genderName}’s` : 'Shop'),
    description: `Shop ${categoryName || 'the full TFF range'} — limited drops and essentials, delivered across Nigeria.`,
    noindex: Boolean(filters.q),
  });

  const goToPage = (page) => {
    update({ page: page > 1 ? page : null }, { keepPage: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="shell pb-24 pt-10 md:pb-32 md:pt-16">
      <header>
        <p className="eyebrow mb-4 text-stone">{filters.q ? 'Search results' : 'Shop'}</p>
        <h1 className="display text-5xl md:text-8xl">{title}</h1>
      </header>

      <div className="sticky top-[var(--nav-offset,var(--header-h))] z-30 transition-[top] duration-500 ease-out-expo -mx-5 mt-10 flex items-center justify-between gap-4 border-y border-mist bg-paper px-5 py-1 md:-mx-10 md:px-10 xl:-mx-14 xl:px-14">
        <button type="button" onClick={() => setFiltersOpen(true)} className="eyebrow flex h-11 items-center gap-3">
          <FilterIcon />
          Filter{chips.length ? ` (${chips.length})` : ''}
        </button>

        <p className="hidden text-sm text-graphite md:block" aria-live="polite">
          {meta ? `${meta.total} ${meta.total === 1 ? 'piece' : 'pieces'}` : ''}
        </p>

        <label className="relative flex h-11 items-center">
          <span className="sr-only">Sort by</span>
          <select
            value={filters.sort}
            onChange={(event) => update({ sort: event.target.value === 'featured' ? null : event.target.value })}
            className="eyebrow appearance-none bg-transparent py-2 pr-6 text-right focus:outline-none focus-visible:underline"
            style={{ fontSize: '0.6875rem' }}
          >
            {SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {sort.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-0">
            <ChevronIcon size={10} />
          </span>
        </label>
      </div>

      {chips.length > 0 && (
        <ul className="mt-5 flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((chip) => (
            <li key={chip.label}>
              <button
                type="button"
                onClick={() => update(chip.clear)}
                className="flex items-center gap-2.5 border border-mist py-2 pl-3.5 pr-3 text-[0.8125rem] transition-colors hover:border-ink"
                aria-label={`Remove filter: ${chip.label}`}
              >
                {chip.label}
                <CloseIcon size={9} />
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={clearAll} className="eyebrow link-underlined ml-2 text-[0.625rem]">
              Clear all
            </button>
          </li>
        </ul>
      )}

      <div className="mt-8 md:mt-12">
        {loading && <ProductGridSkeleton count={8} />}
        {!loading && error && <ErrorState error={error} onRetry={reload} />}
        {!loading && !error && products?.length === 0 && (
          <StateMessage
            eyebrow={filters.q ? 'No results' : 'Nothing here yet'}
            title={filters.q ? 'No pieces matched your search.' : 'No pieces match those filters.'}
            body={
              filters.q
                ? 'Check the spelling or try a broader term — or browse everything instead.'
                : 'Try removing a filter or two to see more.'
            }
          >
            {chips.length > 0 && <Button onClick={clearAll}>Clear filters</Button>}
            <Button variant="outline" onClick={() => setSearchParams({})}>
              View all pieces
            </Button>
          </StateMessage>
        )}
        {!loading && !error && products?.length > 0 && (
          <>
            <ProductGrid products={products} priorityCount={4} />
            <Pagination page={meta.page} pages={meta.pages} onChange={goToPage} />
          </>
        )}
      </div>

      <FilterDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        facets={facets}
        filters={filters}
        setFilter={update}
        toggleInList={toggleInList}
        clearAll={clearAll}
        total={meta?.total}
        activeCount={chips.length}
      />
    </div>
  );
};

export default Shop;
