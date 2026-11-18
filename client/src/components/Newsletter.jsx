import { useId, useState } from 'react';
import { api } from '../services/api.js';
import { cx } from '../utils/format.js';
import { ArrowIcon } from './ui/Icons.jsx';

// The email signup form. `dark` is used on black backgrounds (the footer).
export const NewsletterForm = ({ dark = false, className }) => {
  const id = useId();
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ status: 'idle', message: '' });

  const submit = async (event) => {
    event.preventDefault();
    setState({ status: 'loading', message: '' });
    try {
      await api.post('/newsletter', { email });
      setEmail('');
      setState({ status: 'done', message: 'You’re on the list. Watch your inbox.' });
    } catch (error) {
      setState({ status: 'error', message: error.message });
    }
  };

  return (
    <form onSubmit={submit} className={className} noValidate>
      <label htmlFor={id} className="sr-only">
        Email address
      </label>
      <div className={cx('flex items-center border-b', dark ? 'border-paper/40 focus-within:border-paper' : 'border-ink/30 focus-within:border-ink')}>
        <input
          id={id}
          type="email"
          required
          autoComplete="email"
          placeholder="Email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={cx(
            'min-w-0 flex-1 bg-transparent py-4 focus:outline-none',
            dark ? 'placeholder:text-paper/50' : 'placeholder:text-stone',
          )}
          aria-describedby={`${id}-status`}
        />
        <button
          type="submit"
          disabled={state.status === 'loading'}
          className="eyebrow flex items-center gap-3 py-4 pl-4 disabled:opacity-50"
        >
          {state.status === 'loading' ? 'Joining' : 'Join'}
          <ArrowIcon size={14} />
        </button>
      </div>
      <p
        id={`${id}-status`}
        role="status"
        className={cx('mt-3 min-h-5 text-[0.8125rem]', state.status === 'error' ? (dark ? 'text-[#e8a090]' : 'text-danger') : 'opacity-70')}
      >
        {state.message}
      </p>
    </form>
  );
};

// Homepage section
const Newsletter = ({ content }) => (
  <section className="border-t border-mist bg-bone">
    <div className="shell grid gap-10 py-20 md:grid-cols-2 md:items-end md:py-28">
      <div>
        <h2 className="display text-5xl md:text-7xl">{content.heading || 'Join TFF'}</h2>
        {content.body && <p className="mt-5 max-w-sm text-graphite">{content.body}</p>}
      </div>
      <NewsletterForm className="w-full max-w-md md:justify-self-end" />
    </div>
  </section>
);

export default Newsletter;
