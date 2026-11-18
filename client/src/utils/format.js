const nairaFormat = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 });

export const naira = (amount) => `₦${nairaFormat.format(amount ?? 0)}`;

export const formatDate = (value, options = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  value ? new Intl.DateTimeFormat('en-GB', options).format(new Date(value)) : '';

export const formatDateTime = (value) =>
  formatDate(value, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const titleCase = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());

export const dropLabel = (collection) =>
  collection?.isDrop && collection.dropNumber ? `Drop ${String(collection.dropNumber).padStart(3, '0')}` : null;

export const cx = (...parts) => parts.filter(Boolean).join(' ');

// True when a hex colour is light enough to need a visible edge on a pale background
export const isLightColour = (hex = '#000000') => {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 190;
};
