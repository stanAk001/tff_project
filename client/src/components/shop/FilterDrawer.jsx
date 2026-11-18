import { useEffect, useState } from 'react';
import { cx, isLightColour } from '../../utils/format.js';
import Button from '../ui/Button.jsx';
import { Checkbox } from '../ui/Field.jsx';
import Modal from '../ui/Modal.jsx';

const Group = ({ title, children }) => (
  <fieldset className="border-b border-mist py-6">
    <legend className="eyebrow float-left mb-4 w-full">{title}</legend>
    <div className="clear-both">{children}</div>
  </fieldset>
);

const Option = ({ selected, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={cx('flex w-full items-center justify-between py-1.5 text-left text-sm', selected ? 'font-medium' : 'text-graphite hover:text-ink')}
  >
    {children}
    {selected && <span className="size-1.5 rounded-full bg-ink" aria-hidden="true" />}
  </button>
);

const GENDERS = [
  { value: 'MEN', label: 'Men' },
  { value: 'WOMEN', label: 'Women' },
];

// All shop filters. Every change updates the URL, and the product list is
// re-fetched from the server with those filters.
const FilterDrawer = ({ open, onClose, facets, filters, setFilter, toggleInList, clearAll, total, activeCount }) => {
  const [min, setMin] = useState(filters.minPrice || '');
  const [max, setMax] = useState(filters.maxPrice || '');

  useEffect(() => {
    setMin(filters.minPrice || '');
    setMax(filters.maxPrice || '');
  }, [filters.minPrice, filters.maxPrice]);

  const applyPrice = (event) => {
    event.preventDefault();
    setFilter({ minPrice: min || null, maxPrice: max || null });
  };

  return (
    <Modal open={open} onClose={onClose} side="left" title={`Filter${activeCount ? ` (${activeCount})` : ''}`}>
      <div className="flex-1 px-5 md:px-8">
        {facets?.categories.length > 0 && (
          <Group title="Category">
            <Option selected={!filters.category} onClick={() => setFilter({ category: null })}>
              All
            </Option>
            {facets.categories.map((category) => (
              <Option
                key={category.slug}
                selected={filters.category === category.slug}
                onClick={() => setFilter({ category: category.slug })}
              >
                {category.name}
              </Option>
            ))}
          </Group>
        )}

        <Group title="Shop for">
          <Option selected={!filters.gender} onClick={() => setFilter({ gender: null })}>
            Everyone
          </Option>
          {GENDERS.map((gender) => (
            <Option key={gender.value} selected={filters.gender === gender.value} onClick={() => setFilter({ gender: gender.value })}>
              {gender.label}
            </Option>
          ))}
        </Group>

        {facets?.collections.length > 0 && (
          <Group title="Collection">
            <Option selected={!filters.collection} onClick={() => setFilter({ collection: null })}>
              All
            </Option>
            {facets.collections.map((collection) => (
              <Option
                key={collection.slug}
                selected={filters.collection === collection.slug}
                onClick={() => setFilter({ collection: collection.slug })}
              >
                {collection.name}
              </Option>
            ))}
          </Group>
        )}

        {facets?.sizes.length > 0 && (
          <Group title="Size">
            <div className="flex flex-wrap gap-2">
              {facets.sizes.map((size) => {
                const selected = filters.sizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleInList('sizes', size)}
                    className={cx(
                      'flex h-10 min-w-12 items-center justify-center border px-3 text-sm transition-colors',
                      selected ? 'border-ink bg-ink text-paper' : 'border-mist hover:border-ink',
                    )}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </Group>
        )}

        {facets?.colours.length > 0 && (
          <Group title="Colour">
            <div className="grid grid-cols-2 gap-x-4">
              {facets.colours.map((colour) => {
                const selected = filters.colours.includes(colour.name);
                return (
                  <button
                    key={colour.name}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleInList('colours', colour.name)}
                    className={cx('flex items-center gap-3 py-2 text-left text-sm', selected ? 'font-medium' : 'text-graphite hover:text-ink')}
                  >
                    <span
                      className={cx(
                        'size-5 shrink-0 rounded-full',
                        isLightColour(colour.hex) && 'border border-mist',
                        selected && 'outline outline-1 outline-offset-2 outline-ink',
                      )}
                      style={{ backgroundColor: colour.hex }}
                    />
                    {colour.name}
                  </button>
                );
              })}
            </div>
          </Group>
        )}

        <Group title="Price (₦)">
          <form onSubmit={applyPrice} className="flex items-end gap-3">
            <label className="flex-1 text-[0.8125rem] text-graphite">
              From
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={min}
                onChange={(event) => setMin(event.target.value)}
                placeholder={facets ? String(facets.price.min) : '0'}
                className="mt-1 block w-full border-b border-mist bg-transparent py-2 text-ink focus:border-ink focus:outline-none"
              />
            </label>
            <label className="flex-1 text-[0.8125rem] text-graphite">
              To
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={max}
                onChange={(event) => setMax(event.target.value)}
                placeholder={facets ? String(facets.price.max) : ''}
                className="mt-1 block w-full border-b border-mist bg-transparent py-2 text-ink focus:border-ink focus:outline-none"
              />
            </label>
            <Button type="submit" size="sm" variant="outline">
              Apply
            </Button>
          </form>
        </Group>

        <Group title="Availability">
          <Checkbox
            label="In stock only"
            checked={filters.availability === 'in_stock'}
            onChange={(event) => setFilter({ availability: event.target.checked ? 'in_stock' : null })}
          />
        </Group>
      </div>

      <div className="sticky bottom-0 flex shrink-0 gap-3 border-t border-mist bg-paper px-5 py-4 md:px-8">
        <Button variant="outline" onClick={clearAll} disabled={!activeCount} className="flex-1 px-4">
          Clear
        </Button>
        <Button onClick={onClose} className="flex-[2] px-4">
          View {total ?? ''} {total === 1 ? 'piece' : 'pieces'}
        </Button>
      </div>
    </Modal>
  );
};

export default FilterDrawer;
