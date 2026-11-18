import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import Button from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Field.jsx';
import { useAuth } from '../context/StoreContext.jsx';
import { Seo } from '../hooks/useSeo.js';
import { fieldErrors } from '../services/api.js';

const Frame = ({ eyebrow, title, children, footer }) => (
  <div className="mx-auto max-w-md px-5 py-16 md:py-24">
    <p className="eyebrow mb-4 text-stone">{eyebrow}</p>
    <h1 className="display text-5xl md:text-6xl">{title}</h1>
    {children}
    <p className="mt-8 text-sm text-graphite">{footer}</p>
  </div>
);

// Shared behaviour for both forms: submit, show errors, then return the customer to where they came from
const useAuthForm = (action, initial) => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/account';
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const field = (name) => ({
    name,
    value: form[name],
    error: errors[name],
    onChange: (event) => setForm({ ...form, [name]: event.target.value }),
  });

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrors({});
    setMessage('');
    try {
      await action(form);
      navigate(from, { replace: true });
    } catch (error) {
      const fields = fieldErrors(error);
      setErrors(fields);
      if (!Object.keys(fields).length) setMessage(error.message);
      setLoading(false);
    }
  };

  return { field, submit, loading, message, from };
};

export const Login = () => {
  const auth = useAuth();
  const { field, submit, loading, message, from } = useAuthForm(auth.login, { email: '', password: '' });
  if (auth.ready && auth.customer && !loading) return <Navigate to={from} replace />;

  return (
    <Frame
      eyebrow="Account"
      title="Sign in"
      footer={
        <>
          New to TFF?{' '}
          <Link to="/register" state={{ from }} className="link-underlined text-ink">
            Create an account
          </Link>
        </>
      }
    >
      <Seo title="Sign in" noindex />
      <form onSubmit={submit} className="mt-10 space-y-6" noValidate>
        <Input label="Email" type="email" autoComplete="email" required {...field('email')} />
        <Input label="Password" type="password" autoComplete="current-password" required {...field('password')} />
        {message && (
          <p role="alert" className="text-sm text-danger">
            {message}
          </p>
        )}
        <Button type="submit" full loading={loading}>
          Sign in
        </Button>
      </form>
    </Frame>
  );
};

export const Register = () => {
  const auth = useAuth();
  const { field, submit, loading, message, from } = useAuthForm(auth.register, { firstName: '', lastName: '', email: '', password: '' });
  if (auth.ready && auth.customer && !loading) return <Navigate to={from} replace />;

  return (
    <Frame
      eyebrow="Account"
      title="Join TFF"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={{ from }} className="link-underlined text-ink">
            Sign in
          </Link>
        </>
      }
    >
      <Seo title="Create an account" noindex />
      <p className="mt-4 text-graphite">Save pieces, check out faster and follow your orders.</p>
      <form onSubmit={submit} className="mt-10 space-y-6" noValidate>
        <div className="grid grid-cols-2 gap-5">
          <Input label="First name" autoComplete="given-name" required {...field('firstName')} />
          <Input label="Last name" autoComplete="family-name" required {...field('lastName')} />
        </div>
        <Input label="Email" type="email" autoComplete="email" required {...field('email')} />
        <Input label="Password" type="password" autoComplete="new-password" required hint="At least 8 characters." {...field('password')} />
        {message && (
          <p role="alert" className="text-sm text-danger">
            {message}
          </p>
        )}
        <Button type="submit" full loading={loading}>
          Create account
        </Button>
      </form>
    </Frame>
  );
};
