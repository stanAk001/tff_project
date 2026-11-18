import { useEffect, useState } from 'react';
import { useAuth } from '../../context/StoreContext.jsx';
import { api } from '../../services/api.js';
import Button from '../ui/Button.jsx';

// Shown in place of "Add to bag" when the chosen colour/size is sold out.
const NotifyMe = ({ variant }) => {
  const { customer } = useAuth();
  const [email, setEmail] = useState(customer?.email || '');
  const [state, setState] = useState({ status: 'idle', message: '' });

  useEffect(() => setState({ status: 'idle', message: '' }), [variant.id]);
  useEffect(() => {
    if (customer?.email) setEmail((current) => current || customer.email);
  }, [customer?.email]);

  const submit = async (event) => {
    event.preventDefault();
    setState({ status: 'loading', message: '' });
    try {
      await api.post('/stock-notifications', { email, variantId: variant.id });
      setState({ status: 'done', message: '' });
    } catch (error) {
      setState({ status: 'error', message: error.message });
    }
  };

  if (state.status === 'done') {
    return (
      <div className="border border-ink p-5" role="status">
        <p className="eyebrow">You’re on the list</p>
        <p className="mt-2 text-sm text-graphite">
          We’ll email {email} as soon as {variant.colour} / {variant.size} is back.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border border-mist p-5" noValidate>
      <p className="eyebrow">Notify me when available</p>
      <p className="mt-2 text-sm text-graphite">
        {variant.colour} / {variant.size} is sold out. Leave your email and we’ll tell you the moment it returns.
      </p>
      <label htmlFor="notify-email" className="sr-only">
        Email address
      </label>
      <input
        id="notify-email"
        type="email"
        required
        autoComplete="email"
        placeholder="Email address"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="mt-4 block w-full border-b border-mist bg-transparent py-3 placeholder:text-stone focus:border-ink focus:outline-none"
      />
      {state.status === 'error' && (
        <p role="alert" className="mt-2 text-[0.8125rem] text-danger">
          {state.message}
        </p>
      )}
      <Button type="submit" variant="outline" full className="mt-5" loading={state.status === 'loading'}>
        Notify me
      </Button>
    </form>
  );
};

export default NotifyMe;
