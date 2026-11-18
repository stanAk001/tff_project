import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import Button from '../components/ui/Button.jsx';
import { Skeleton, StateMessage } from '../components/ui/Feedback.jsx';
import { useCart } from '../context/StoreContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { Seo } from '../hooks/useSeo.js';
import { api } from '../services/api.js';
import { naira } from '../utils/format.js';
import { recallOrderEmail } from '../utils/states.js';

// ── /checkout/verify ─────────────────────────────────────────────────────
// Paystack sends the customer back here. We never trust the redirect itself:
// the server asks Paystack whether the payment really went through.

export const CheckoutVerify = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useCart();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const [state, setState] = useState({ status: 'checking' });
  const [retrying, setRetrying] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!reference) {
      setState({ status: 'error', message: 'This payment link is incomplete.' });
      return;
    }
    api
      .post('/payments/verify', { reference })
      .then(async (result) => {
        if (result.outcome === 'success') {
          await refresh();
          navigate(`/orders/${result.orderNumber}?placed=1`, { replace: true });
        } else {
          setState({ status: result.outcome, orderNumber: result.orderNumber });
        }
      })
      .catch((error) => setState({ status: 'error', message: error.message }));
  }, [reference, navigate, refresh]);

  const retry = async () => {
    setRetrying(true);
    try {
      const result = await api.post('/payments/initialize', { orderNumber: state.orderNumber, email: recallOrderEmail() });
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setState({ status: 'error', message: error.message });
      setRetrying(false);
    }
  };

  return (
    <>
      <Seo title="Confirming payment" noindex />
      {state.status === 'checking' && (
        <StateMessage eyebrow="One moment" title="Confirming your payment." body="Please don’t close this page.">
          <span className="size-6 animate-spin rounded-full border border-ink border-t-transparent" role="status" aria-label="Confirming payment" />
        </StateMessage>
      )}
      {state.status === 'pending' && (
        <StateMessage
          tone="error"
          eyebrow="Payment not completed"
          title="Your order is waiting."
          body="We haven’t received a payment for this order. Your pieces are held for a short while — you can try again now."
        >
          <Button onClick={retry} loading={retrying}>
            Try payment again
          </Button>
          <Button variant="outline" to="/checkout">
            Back to checkout
          </Button>
        </StateMessage>
      )}
      {state.status === 'failed' && (
        <StateMessage
          tone="error"
          eyebrow="Payment failed"
          title="That payment didn’t go through."
          body="You haven’t been charged. Your bag is saved — head back to checkout to try again or use a different payment method."
        >
          <Button to="/checkout">Back to checkout</Button>
          <Button variant="outline" to="/shop">
            Keep shopping
          </Button>
        </StateMessage>
      )}
      {state.status === 'error' && (
        <StateMessage
          tone="error"
          eyebrow="We couldn’t confirm your payment"
          title="Something went wrong."
          body={`${state.message} If you were charged, your order will confirm automatically and we’ll email you.`}
        >
          <Button onClick={() => window.location.reload()}>Check again</Button>
          <Button variant="outline" to="/track">
            Track an order
          </Button>
        </StateMessage>
      )}
    </>
  );
};

// ── /checkout/sandbox ────────────────────────────────────────────────────
// Development only. Stands in for the Paystack payment page when no Paystack
// keys are configured, so the order flow can be tested end to end. The API
// refuses these requests in production or once keys are set.

export const CheckoutSandbox = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reference = searchParams.get('reference');
  const { data: payment, loading, error } = useFetch(reference ? `/payments/sandbox/${reference}` : null);
  const [busy, setBusy] = useState(null);
  const [failure, setFailure] = useState(null);

  const complete = async (outcome) => {
    setBusy(outcome);
    try {
      await api.post('/payments/sandbox', { reference, outcome });
      navigate(`/checkout/verify?reference=${encodeURIComponent(reference)}`, { replace: true });
    } catch (requestError) {
      setFailure(requestError.message);
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-5 py-20">
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !payment) {
    return (
      <StateMessage tone="error" eyebrow="Payment sandbox" title="This test payment isn’t available." body={error?.message || 'The link is missing a payment reference.'}>
        <Button to="/checkout">Back to checkout</Button>
      </StateMessage>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16 md:py-24">
      <Seo title="Test payment" noindex />
      <div className="border border-ink p-6 md:p-8">
        <p className="eyebrow bg-ink px-3 py-2.5 text-center text-[0.625rem] text-paper">Development sandbox — no real money moves</p>
        <p className="mt-6 text-sm text-graphite">
          Paystack keys aren’t configured, so this page stands in for the Paystack payment screen. Add your keys to
          <code className="mx-1 bg-bone px-1.5 py-0.5 text-[0.8125rem]">server/.env</code>to take real payments.
        </p>
        <dl className="mt-6 space-y-2 border-y border-mist py-5 text-sm">
          <div className="flex justify-between">
            <dt className="text-graphite">Order</dt>
            <dd>{payment.orderNumber}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-graphite">Customer</dt>
            <dd className="truncate pl-4">{payment.email}</dd>
          </div>
          <div className="flex justify-between text-base font-medium">
            <dt>Amount</dt>
            <dd className="tabular-nums">{naira(payment.amount)}</dd>
          </div>
        </dl>
        {failure && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {failure}
          </p>
        )}
        <div className="mt-6 space-y-3">
          <Button full onClick={() => complete('success')} loading={busy === 'success'} disabled={Boolean(busy)}>
            Simulate successful payment
          </Button>
          <Button full variant="outline" onClick={() => complete('failed')} loading={busy === 'failed'} disabled={Boolean(busy)}>
            Simulate failed payment
          </Button>
        </div>
      </div>
    </div>
  );
};
