import { Link } from 'react-router';
import { useCart, useUi } from '../../context/StoreContext.jsx';
import { naira } from '../../utils/format.js';
import Button from '../ui/Button.jsx';
import { MinusIcon, PlusIcon } from '../ui/Icons.jsx';
import Media from '../ui/Media.jsx';
import Modal from '../ui/Modal.jsx';

const ISSUE_TEXT = {
  UNAVAILABLE: 'Sold out — remove to continue',
  INSUFFICIENT_STOCK: 'Not enough left — reduce the quantity',
};

const Stepper = ({ item, onChange }) => (
  <div className="inline-flex h-9 items-center border border-mist">
    <button
      type="button"
      className="flex size-9 items-center justify-center disabled:opacity-30"
      aria-label={`Reduce quantity of ${item.name}`}
      disabled={item.quantity <= 1}
      onClick={() => onChange(item.quantity - 1)}
    >
      <MinusIcon size={10} />
    </button>
    <span className="w-7 text-center text-sm tabular-nums" aria-label={`Quantity ${item.quantity}`}>
      {item.quantity}
    </span>
    <button
      type="button"
      className="flex size-9 items-center justify-center disabled:opacity-30"
      aria-label={`Increase quantity of ${item.name}`}
      disabled={item.quantity >= Math.min(item.stock, 10)}
      onClick={() => onChange(item.quantity + 1)}
    >
      <PlusIcon size={10} />
    </button>
  </div>
);

export const CartLine = ({ item, saved = false }) => {
  const { update, remove } = useCart();
  return (
    <li className="flex gap-4 py-5">
      <Link to={`/products/${item.slug}`} className="relative block aspect-[4/5] w-24 shrink-0 overflow-hidden" tabIndex={-1} aria-hidden="true">
        <Media src={item.imageUrl} alt="" sizes="96px" maxWidth={320} compactPlaceholder />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-4">
          <div className="min-w-0">
            <Link to={`/products/${item.slug}`} className="block truncate text-sm font-medium">
              {item.name}
            </Link>
            <p className="mt-0.5 text-[0.8125rem] text-graphite">
              {item.colour} / {item.size}
            </p>
          </div>
          <p className="shrink-0 text-sm tabular-nums">{naira(item.lineTotal)}</p>
        </div>

        {item.issue && !saved && (
          <p role="alert" className="mt-2 text-[0.8125rem] text-danger">
            {ISSUE_TEXT[item.issue]}
          </p>
        )}
        {!item.issue && !saved && item.stock <= 3 && (
          <p className="mt-2 text-[0.8125rem] text-graphite">Only {item.stock} left</p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          {saved ? (
            <button
              type="button"
              className="eyebrow link-underlined text-[0.625rem] disabled:opacity-40"
              disabled={item.stock === 0}
              onClick={() => update(item.id, { savedForLater: false, quantity: Math.min(item.quantity, item.stock) || 1 })}
            >
              {item.stock === 0 ? 'Sold out' : 'Move to bag'}
            </button>
          ) : (
            <Stepper item={item} onChange={(quantity) => update(item.id, { quantity })} />
          )}
          <div className="flex gap-4">
            {!saved && (
              <button type="button" className="eyebrow link text-[0.625rem] text-graphite" onClick={() => update(item.id, { savedForLater: true })}>
                Save for later
              </button>
            )}
            <button
              type="button"
              className="eyebrow link text-[0.625rem] text-graphite"
              onClick={() => remove(item.id)}
              aria-label={`Remove ${item.name}`}
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </li>
  );
};

const CartDrawer = () => {
  const ui = useUi();
  const { cart } = useCart();
  const empty = cart.items.length === 0;

  return (
    <Modal
      open={ui.overlay === 'cart'}
      onClose={ui.close}
      side="right"
      title={`Your bag${cart.itemCount ? ` (${cart.itemCount})` : ''}`}
    >
      {empty && cart.saved.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <p className="display text-4xl">Your bag is waiting.</p>
          <p className="mt-4 max-w-xs text-graphite">Pieces you add will appear here, ready when you are.</p>
          <Button to="/shop" className="mt-8">
            Start shopping
          </Button>
        </div>
      ) : (
        <>
          <div className="flex-1 px-5 md:px-8">
            {empty ? (
              <p className="py-10 text-center text-graphite">Your bag is empty — your saved pieces are below.</p>
            ) : (
              <ul className="divide-y divide-mist">
                {cart.items.map((item) => (
                  <CartLine key={item.id} item={item} />
                ))}
              </ul>
            )}

            {cart.saved.length > 0 && (
              <section className="mt-4 border-t border-ink pt-6" aria-label="Saved for later">
                <h3 className="eyebrow text-stone">Saved for later</h3>
                <ul className="divide-y divide-mist">
                  {cart.saved.map((item) => (
                    <CartLine key={item.id} item={item} saved />
                  ))}
                </ul>
              </section>
            )}
          </div>

          {!empty && (
            <div className="sticky bottom-0 shrink-0 border-t border-mist bg-paper px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 md:px-8">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-graphite">Subtotal</dt>
                  <dd className="tabular-nums">{naira(cart.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-graphite">Delivery</dt>
                  <dd className="text-graphite">Calculated at checkout</dd>
                </div>
                <div className="flex justify-between border-t border-mist pt-3 text-base font-medium">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{naira(cart.subtotal)}</dd>
                </div>
              </dl>
              {cart.hasIssues ? (
                <Button full disabled className="mt-5">
                  Resolve the items above to continue
                </Button>
              ) : (
                <Button to="/checkout" full className="mt-5">
                  Checkout
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

export default CartDrawer;
