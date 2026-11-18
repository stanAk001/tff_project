import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import Button from '../components/ui/Button.jsx';
import { Skeleton, StateMessage } from '../components/ui/Feedback.jsx';
import { Checkbox, Input, Select } from '../components/ui/Field.jsx';
import Media from '../components/ui/Media.jsx';
import { useAuth, useCart, useUi } from '../context/StoreContext.jsx';
import { Seo } from '../hooks/useSeo.js';
import { api, fieldErrors } from '../services/api.js';
import { cx, naira } from '../utils/format.js';
import { NIGERIAN_STATES, rememberOrderEmail } from '../utils/states.js';

const Section = ({ number, title, children }) => (
  <section className="border-t border-mist py-9 first:border-t-0 first:pt-0">
    <h2 className="eyebrow mb-7 flex items-baseline gap-4">
      <span className="tabular-nums text-stone">{number}</span>
      {title}
    </h2>
    {children}
  </section>
);

const Summary = ({ cart, quote, quoting }) => (
  <div>
    <h2 className="eyebrow mb-6">Order summary</h2>
    <ul className="divide-y divide-mist border-y border-mist">
      {cart.items.map((item) => (
        <li key={item.id} className="flex gap-4 py-4">
          <div className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden">
            <Media src={item.imageUrl} alt="" sizes="64px" maxWidth={320} compactPlaceholder />
            <span className="absolute right-0 top-0 flex size-5 items-center justify-center bg-ink text-[0.625rem] tabular-nums text-paper">
              {item.quantity}
              <span className="sr-only"> of</span>
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.name}</p>
            <p className="text-[0.8125rem] text-graphite">
              {item.colour} / {item.size}
            </p>
          </div>
          <p className="text-sm tabular-nums">{naira(item.lineTotal)}</p>
        </li>
      ))}
    </ul>
    <dl className={cx('mt-6 space-y-2.5 text-sm transition-opacity', quoting && 'opacity-50')}>
      <div className="flex justify-between">
        <dt className="text-graphite">Subtotal</dt>
        <dd className="tabular-nums">{naira(quote?.subtotal ?? cart.subtotal)}</dd>
      </div>
      {quote?.discount && (
        <div className="flex justify-between">
          <dt className="text-graphite">Discount ({quote.discount.code})</dt>
          <dd className="tabular-nums">−{naira(quote.discount.amount)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-graphite">Delivery</dt>
        <dd className="tabular-nums">
          {quote?.deliveryFee == null ? 'Choose an option' : quote.deliveryFee === 0 ? 'Free' : naira(quote.deliveryFee)}
        </dd>
      </div>
      <div className="flex justify-between border-t border-ink pt-4 text-lg font-medium">
        <dt>Total</dt>
        <dd className="tabular-nums">{naira(quote?.total ?? cart.subtotal)}</dd>
      </div>
    </dl>
  </div>
);

const Checkout = () => {
  const navigate = useNavigate();
  const { customer } = useAuth();
  const { cart, ready, refresh } = useCart();
  const ui = useUi();

  const [form, setForm] = useState({ fullName: '', email: '', phone: '', addressLine: '', city: '', state: '', saveAddress: true });
  const [deliveryOptionId, setDeliveryOptionId] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Make sure the bag is current, then fill in what we already know about a signed-in customer
  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!customer) return;
    const address = customer.defaultAddress;
    setForm((current) => ({
      ...current,
      fullName: current.fullName || address?.fullName || `${customer.firstName} ${customer.lastName}`,
      email: current.email || customer.email,
      phone: current.phone || address?.phone || customer.phone || '',
      addressLine: current.addressLine || address?.line1 || '',
      city: current.city || address?.city || '',
      state: current.state || address?.state || '',
    }));
  }, [customer]);

  // Totals always come from the server
  useEffect(() => {
    if (!ready || cart.items.length === 0) return undefined;
    let cancelled = false;
    setQuoting(true);
    api
      .post('/orders/quote', { deliveryOptionId: deliveryOptionId || undefined, discountCode })
      .then((result) => {
        if (cancelled) return;
        setQuote(result);
        if (!deliveryOptionId && result.deliveryOptions.length) setDeliveryOptionId(result.deliveryOptions[0].id);
      })
      .catch(() => {})
      .finally(() => !cancelled && setQuoting(false));
    return () => {
      cancelled = true;
    };
  }, [ready, cart.subtotal, cart.items.length, deliveryOptionId, discountCode]);

  const field = (name) => ({
    value: form[name],
    error: errors[name],
    onChange: (event) => {
      setForm({ ...form, [name]: event.target.value });
      if (errors[name]) setErrors({ ...errors, [name]: undefined });
    },
  });

  const applyCode = (event) => {
    event.preventDefault();
    setDiscountCode(codeInput.trim());
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setErrors({});
    try {
      const { saveAddress, ...contact } = form;
      const result = await api.post('/orders', {
        ...contact,
        deliveryOptionId,
        discountCode: quote?.discount ? discountCode : '',
        saveAddress: Boolean(customer) && saveAddress,
      });
      rememberOrderEmail(form.email.trim().toLowerCase());
      if (result.authorizationUrl) {
        // Hand over to the payment page
        window.location.assign(result.authorizationUrl);
      } else {
        await refresh();
        navigate(`/orders/${result.orderNumber}?placed=1`);
      }
    } catch (error) {
      const fields = fieldErrors(error);
      setErrors(fields);
      setSubmitError(error);
      setSubmitting(false);
      if (error.code === 'OUT_OF_STOCK') refresh();
      const firstInvalid = Object.keys(fields)[0];
      if (firstInvalid) document.querySelector(`[name="${firstInvalid}"]`)?.focus();
    }
  };

  if (!ready) {
    return (
      <div className="shell grid gap-12 py-12 lg:grid-cols-2" role="status" aria-label="Loading checkout">
        <Skeleton className="h-96" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <StateMessage eyebrow="Checkout" title="Your bag is waiting." body="Add a piece or two and come back — checkout takes less than a minute.">
        <Seo title="Checkout" noindex />
        <Button to="/shop">Start shopping</Button>
      </StateMessage>
    );
  }

  return (
    <div className="shell grid gap-x-16 gap-y-10 py-8 md:py-14 lg:grid-cols-[1fr_26rem] xl:gap-x-28">
      <Seo title="Checkout" noindex />

      {/* On phones the summary comes first so the customer sees what they're paying for */}
      <aside className="lg:order-2">
        <div className="bg-bone p-5 md:p-8 lg:sticky lg:top-8">
          <Summary cart={cart} quote={quote} quoting={quoting} />

          <form onSubmit={applyCode} className="mt-7 border-t border-mist pt-6">
            <label htmlFor="discount" className="eyebrow block text-graphite">
              Discount code
            </label>
            <div className="mt-1 flex items-end gap-3">
              <input
                id="discount"
                value={codeInput}
                onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
                autoComplete="off"
                className="min-w-0 flex-1 border-b border-mist bg-transparent py-3 uppercase placeholder:normal-case focus:border-ink focus:outline-none"
                aria-describedby="discount-status"
              />
              <Button type="submit" size="sm" variant="outline" disabled={!codeInput.trim()}>
                Apply
              </Button>
            </div>
            <p id="discount-status" role="status" className="mt-2 min-h-5 text-[0.8125rem]">
              {quote?.discountError && discountCode && <span className="text-danger">{quote.discountError}</span>}
              {quote?.discount && (
                <span className="text-success">
                  {quote.discount.code} applied.{' '}
                  <button
                    type="button"
                    className="link-underlined text-ink"
                    onClick={() => {
                      setDiscountCode('');
                      setCodeInput('');
                    }}
                  >
                    Remove
                  </button>
                </span>
              )}
            </p>
          </form>
        </div>
      </aside>

      <form onSubmit={submit} noValidate className="lg:order-1">
        <h1 className="display mb-10 text-5xl md:text-6xl">Checkout</h1>

        {!customer && (
          <p className="mb-9 text-sm text-graphite">
            Have an account?{' '}
            <Link to="/login" state={{ from: '/checkout' }} className="link-underlined text-ink">
              Sign in
            </Link>{' '}
            for faster checkout — or continue as a guest.
          </p>
        )}

        {cart.hasIssues && (
          <p role="alert" className="mb-9 border border-danger p-4 text-sm text-danger">
            Something in your bag is no longer available in the quantity you chose.{' '}
            <button type="button" className="link-underlined" onClick={() => ui.open('cart')}>
              Review your bag
            </button>{' '}
            before paying.
          </p>
        )}

        <Section number="01" title="Contact">
          <div className="grid gap-6 sm:grid-cols-2">
            <Input label="Full name" name="fullName" autoComplete="name" required className="sm:col-span-2" {...field('fullName')} />
            <Input label="Email" name="email" type="email" autoComplete="email" required hint="Your confirmation goes here." {...field('email')} />
            <Input label="Phone" name="phone" type="tel" autoComplete="tel" required placeholder="0801 234 5678" {...field('phone')} />
          </div>
        </Section>

        <Section number="02" title="Delivery address">
          <div className="grid gap-6 sm:grid-cols-2">
            <Input label="Address" name="addressLine" autoComplete="street-address" required className="sm:col-span-2" {...field('addressLine')} />
            <Input label="City" name="city" autoComplete="address-level2" required {...field('city')} />
            <Select label="State" name="state" autoComplete="address-level1" required {...field('state')}>
              <option value="">Select a state</option>
              {NIGERIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </Select>
          </div>
          {customer && (
            <Checkbox
              className="mt-6"
              label="Save this address for next time"
              checked={form.saveAddress}
              onChange={(event) => setForm({ ...form, saveAddress: event.target.checked })}
            />
          )}
        </Section>

        <Section number="03" title="Delivery option">
          <fieldset>
            <legend className="sr-only">Delivery option</legend>
            <div className="space-y-3">
              {(quote?.deliveryOptions || []).map((option) => {
                const selected = option.id === deliveryOptionId;
                return (
                  <label
                    key={option.id}
                    className={cx(
                      'flex cursor-pointer items-center gap-4 border p-4 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
                      selected ? 'border-ink' : 'border-mist hover:border-stone',
                    )}
                  >
                    <input
                      type="radio"
                      name="deliveryOption"
                      className="sr-only"
                      checked={selected}
                      onChange={() => setDeliveryOptionId(option.id)}
                    />
                    <span className={cx('flex size-4 shrink-0 items-center justify-center rounded-full border', selected ? 'border-ink' : 'border-stone')} aria-hidden="true">
                      {selected && <span className="size-2 rounded-full bg-ink" />}
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{option.name}</span>
                      {option.description && <span className="block text-[0.8125rem] text-graphite">{option.description}</span>}
                    </span>
                    <span className="text-sm tabular-nums">{option.fee === 0 ? 'Free' : naira(option.fee)}</span>
                  </label>
                );
              })}
              {!quote && <Skeleton className="h-16" />}
            </div>
          </fieldset>
        </Section>

        <div className="border-t border-mist pt-9">
          {submitError && (
            <div role="alert" className="mb-6 border border-danger p-4 text-sm text-danger">
              <p className="font-medium">
                {submitError.code === 'OUT_OF_STOCK'
                  ? 'Part of your order just sold out'
                  : submitError.code === 'VALIDATION_ERROR'
                    ? 'Please check your details'
                    : 'We couldn’t start your payment'}
              </p>
              <p className="mt-1">{submitError.message}</p>
            </div>
          )}
          <Button type="submit" size="lg" full loading={submitting} disabled={cart.hasIssues || !deliveryOptionId}>
            Pay {quote ? naira(quote.total) : ''}
          </Button>
          <p className="mt-4 text-center text-[0.8125rem] text-stone">
            You’ll be taken to Paystack to pay securely by card, bank transfer or USSD.
          </p>
        </div>
      </form>
    </div>
  );
};

export default Checkout;
