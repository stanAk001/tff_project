import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../../context/StoreContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { api, fieldErrors } from '../../services/api.js';
import { formatDate } from '../../utils/format.js';
import Button from '../ui/Button.jsx';
import { Skeleton, Stars } from '../ui/Feedback.jsx';
import { Input, Textarea } from '../ui/Field.jsx';
import { StarIcon } from '../ui/Icons.jsx';

const ReviewForm = ({ productId, onDone }) => {
  const [form, setForm] = useState({ rating: 0, title: '', comment: '' });
  const [errors, setErrors] = useState({});
  const [state, setState] = useState({ status: 'idle', message: '' });

  const submit = async (event) => {
    event.preventDefault();
    if (!form.rating) return setErrors({ rating: 'Choose a rating.' });
    setState({ status: 'loading', message: '' });
    setErrors({});
    try {
      await api.post('/reviews', { productId, ...form });
      onDone();
    } catch (error) {
      setErrors(fieldErrors(error));
      setState({ status: 'error', message: error.message });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <fieldset>
        <legend className="eyebrow text-graphite">Your rating</legend>
        <div className="mt-3 flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm({ ...form, rating: value })}
              aria-label={`${value} star${value > 1 ? 's' : ''}`}
              aria-pressed={form.rating === value}
              className="flex size-10 items-center justify-center"
            >
              <StarIcon size={22} filled={value <= form.rating} />
            </button>
          ))}
        </div>
        {errors.rating && (
          <p role="alert" className="mt-1 text-[0.8125rem] text-danger">
            {errors.rating}
          </p>
        )}
      </fieldset>
      <Input label="Title" value={form.title} error={errors.title} maxLength={100} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <Textarea
        label="Your review"
        value={form.comment}
        error={errors.comment}
        maxLength={1500}
        onChange={(e) => setForm({ ...form, comment: e.target.value })}
      />
      {state.status === 'error' && !Object.keys(errors).length && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
      <Button type="submit" loading={state.status === 'loading'}>
        Submit review
      </Button>
    </form>
  );
};

const Reviews = ({ product }) => {
  const { customer } = useAuth();
  const location = useLocation();
  const [page, setPage] = useState(1);
  const [writing, setWriting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { data: reviews, meta, loading } = useFetch(`/products/${product.slug}/reviews`, { params: { page, limit: 6 }, paged: true });

  return (
    <section className="border-t border-mist py-16 md:py-24" aria-labelledby="reviews-heading">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 id="reviews-heading" className="display text-4xl md:text-5xl">
            Reviews
          </h2>
          {product.rating.count > 0 ? (
            <div className="mt-5 flex items-center gap-3">
              <Stars rating={product.rating.average} size={15} />
              <p className="text-sm text-graphite">
                {product.rating.average} from {product.rating.count} {product.rating.count === 1 ? 'review' : 'reviews'}
              </p>
            </div>
          ) : (
            <p className="mt-4 max-w-xs text-graphite">No reviews yet. If you own this piece, be the first to share how it wears.</p>
          )}

          <div className="mt-8">
            {submitted ? (
              <p className="border border-ink p-5 text-sm" role="status">
                Thank you. Your review will appear once it has been checked by our team.
              </p>
            ) : !customer ? (
              <p className="text-sm text-graphite">
                <Link to="/login" state={{ from: location.pathname }} className="link-underlined text-ink">
                  Sign in
                </Link>{' '}
                to write a review.
              </p>
            ) : (
              !writing && (
                <Button variant="outline" onClick={() => setWriting(true)}>
                  Write a review
                </Button>
              )
            )}
          </div>
        </div>

        <div className="lg:col-span-7 lg:col-start-6">
          {writing && !submitted && (
            <div className="mb-12 border-b border-mist pb-12">
              <ReviewForm
                productId={product.id}
                onDone={() => {
                  setSubmitted(true);
                  setWriting(false);
                }}
              />
            </div>
          )}

          {loading && (
            <div className="space-y-8" role="status" aria-label="Loading reviews">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          )}

          {reviews?.length > 0 && (
            <ul className="divide-y divide-mist">
              {reviews.map((review) => (
                <li key={review.id} className="py-7 first:pt-0">
                  <div className="flex items-center justify-between gap-4">
                    <Stars rating={review.rating} />
                    <time dateTime={review.createdAt} className="text-[0.8125rem] text-stone">
                      {formatDate(review.createdAt)}
                    </time>
                  </div>
                  <h3 className="mt-3 font-medium">{review.title}</h3>
                  <p className="mt-2 whitespace-pre-line text-graphite">{review.comment}</p>
                  <p className="eyebrow mt-4 text-[0.625rem] text-stone">{review.customerName}</p>
                </li>
              ))}
            </ul>
          )}

          {meta?.pages > 1 && (
            <div className="mt-8 flex gap-6">
              <button type="button" className="eyebrow link disabled:opacity-30" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Newer
              </button>
              <button type="button" className="eyebrow link disabled:opacity-30" disabled={page >= meta.pages} onClick={() => setPage(page + 1)}>
                Older
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Reviews;
