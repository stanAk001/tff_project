import { cx, isLightColour } from '../../utils/format.js';

// Helpers shared by the product page and quick add
export const findVariant = (variants, colour, size) =>
  variants.find((variant) => variant.colour === colour && variant.size === size) || null;

export const stockFor = (variants, colour, size) => findVariant(variants, colour, size)?.stock ?? 0;

export const firstAvailableColour = (product) =>
  product.colours.find((colour) => product.variants.some((v) => v.colour === colour.name && v.stock > 0))?.name ||
  product.colours[0]?.name ||
  null;

// Colour swatches + size buttons. Sold-out sizes stay selectable when
// `allowSoldOut` is set, so the customer can ask to be notified.
const VariantSelector = ({ product, colour, size, onColour, onSize, allowSoldOut = false, sizeGuide }) => {
  const oneSize = product.sizes.length === 1;

  return (
    <div className="space-y-7">
      <fieldset>
        <legend className="eyebrow flex w-full items-baseline gap-3">
          Colour <span className="text-[0.8125rem] font-normal normal-case tracking-normal text-graphite">{colour}</span>
        </legend>
        <div className="mt-4 flex flex-wrap gap-3">
          {product.colours.map((option) => {
            const selected = option.name === colour;
            const soldOut = !product.variants.some((v) => v.colour === option.name && v.stock > 0);
            return (
              <button
                key={option.name}
                type="button"
                onClick={() => onColour(option.name)}
                aria-pressed={selected}
                aria-label={`${option.name}${soldOut ? ' (sold out)' : ''}`}
                title={option.name}
                className={cx(
                  'relative size-9 rounded-full p-[3px] transition-shadow',
                  selected ? 'shadow-[0_0_0_1px_var(--color-ink)]' : 'shadow-[0_0_0_1px_transparent] hover:shadow-[0_0_0_1px_var(--color-stone)]',
                )}
              >
                <span
                  className={cx('block size-full rounded-full', isLightColour(option.hex) && 'border border-mist')}
                  style={{ backgroundColor: option.hex }}
                />
                {soldOut && (
                  <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                    <span className="h-px w-full rotate-45 bg-stone" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="flex w-full items-baseline justify-between">
          <span className="eyebrow flex items-baseline gap-3">
            Size {size && <span className="text-[0.8125rem] font-normal normal-case tracking-normal text-graphite">{size}</span>}
          </span>
          {sizeGuide}
        </legend>
        <div className={cx('mt-4 grid gap-2', oneSize ? 'grid-cols-2' : 'grid-cols-5')}>
          {product.sizes.map((option) => {
            const stock = stockFor(product.variants, colour, option);
            const exists = Boolean(findVariant(product.variants, colour, option));
            const soldOut = stock === 0;
            const selected = option === size;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onSize(option)}
                disabled={!exists || (soldOut && !allowSoldOut)}
                aria-pressed={selected}
                aria-label={`Size ${option}${soldOut ? ' (sold out)' : ''}`}
                className={cx(
                  'relative flex h-12 items-center justify-center border text-sm transition-colors',
                  selected ? 'border-ink bg-ink text-paper' : 'border-mist hover:border-ink',
                  soldOut && !selected && 'text-stone',
                  !exists && 'opacity-40',
                )}
              >
                <span className={cx(soldOut && 'line-through decoration-1')}>{option}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
};

export default VariantSelector;
