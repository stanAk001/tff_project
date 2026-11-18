import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useCategories, useUi } from '../../context/StoreContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useDebounced } from '../../hooks/useUi.js';
import { naira } from '../../utils/format.js';
import { Skeleton } from '../ui/Feedback.jsx';
import { SearchIcon } from '../ui/Icons.jsx';
import Media from '../ui/Media.jsx';
import Modal from '../ui/Modal.jsx';

const SearchOverlay = () => {
  const ui = useUi();
  const navigate = useNavigate();
  const categories = useCategories();
  const open = ui.overlay === 'search';
  const [query, setQuery] = useState('');
  const term = useDebounced(query.trim(), 280);
  const searching = term.length >= 2;

  const { data, meta, loading, error } = useFetch(open && searching ? '/products' : null, {
    params: { q: term, limit: 6 },
    paged: true,
  });
  const { data: collections } = useFetch(open ? '/collections' : null);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const submit = (event) => {
    event.preventDefault();
    if (query.trim()) navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
  };

  const waiting = searching && (loading || term !== query.trim());
  const results = searching && !waiting ? data || [] : [];

  return (
    <Modal open={open} onClose={ui.close} side="top" title="Search" hideTitle className="min-h-[60dvh] md:min-h-[32rem]">
      <div className="shell w-full pb-14 pt-20 md:pt-24">
        <form onSubmit={submit} role="search" className="flex items-center gap-4 border-b border-ink pb-3">
          <SearchIcon size={22} />
          <label htmlFor="site-search" className="sr-only">
            Search TFF
          </label>
          <input
            id="site-search"
            data-autofocus
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pieces, categories, collections"
            autoComplete="off"
            className="display min-w-0 flex-1 bg-transparent text-2xl placeholder:text-stone focus:outline-none md:text-4xl [&::-webkit-search-cancel-button]:hidden"
          />
        </form>

        <div className="mt-10" aria-live="polite">
          {!searching && (
            <div className="grid gap-10 md:grid-cols-2">
              <div>
                <p className="eyebrow mb-5 text-stone">Categories</p>
                <ul className="flex flex-wrap gap-x-8 gap-y-2">
                  {categories.map((category) => (
                    <li key={category.id}>
                      <Link to={`/shop?category=${category.slug}`} className="display link text-2xl">
                        {category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              {collections?.length > 0 && (
                <div>
                  <p className="eyebrow mb-5 text-stone">Collections</p>
                  <ul className="space-y-2">
                    {collections.slice(0, 4).map((collection) => (
                      <li key={collection.id}>
                        <Link to={`/collections/${collection.slug}`} className="display link text-2xl">
                          {collection.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {waiting && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-6" role="status" aria-label="Searching">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index}>
                  <Skeleton className="aspect-[4/5]" />
                  <Skeleton className="mt-3 h-3 w-3/4" />
                </div>
              ))}
            </div>
          )}

          {searching && !waiting && error && <p className="text-danger">{error.message}</p>}

          {searching && !waiting && !error && results.length === 0 && (
            <div>
              <p className="display text-3xl md:text-4xl">No pieces matched “{term}”.</p>
              <p className="mt-3 text-graphite">Check the spelling, or explore one of these instead.</p>
              <ul className="mt-6 flex flex-wrap gap-3">
                {categories.map((category) => (
                  <li key={category.id}>
                    <Link to={`/shop?category=${category.slug}`} className="eyebrow block border border-ink px-4 py-3 transition-colors hover:bg-ink hover:text-paper">
                      {category.name}
                    </Link>
                  </li>
                ))}
                {collections?.slice(0, 2).map((collection) => (
                  <li key={collection.id}>
                    <Link to={`/collections/${collection.slug}`} className="eyebrow block border border-ink px-4 py-3 transition-colors hover:bg-ink hover:text-paper">
                      {collection.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {results.length > 0 && (
            <>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-6">
                {results.map((product) => (
                  <li key={product.id}>
                    <Link to={`/products/${product.slug}`} className="group block">
                      <div className="relative aspect-[4/5] overflow-hidden">
                        <Media
                          src={product.images[0]?.url}
                          alt={product.images[0]?.alt || product.name}
                          tone={product.colours[0]?.hex}
                          sizes="(min-width: 768px) 16vw, 50vw"
                          maxWidth={640}
                          compactPlaceholder
                        />
                      </div>
                      <p className="mt-3 text-sm">{product.name}</p>
                      <p className="text-sm text-graphite">{naira(product.price)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
              {meta?.total > results.length && (
                <Link to={`/shop?q=${encodeURIComponent(term)}`} className="eyebrow link-underlined mt-10 inline-block">
                  View all {meta.total} results
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SearchOverlay;
