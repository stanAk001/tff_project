import axios from 'axios';

const client = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api`,
  withCredentials: true,
  timeout: 30000,
});

// Every failure becomes an Error with a message that is safe to show a customer.
const toError = (error) => {
  if (axios.isCancel(error)) {
    const cancelled = new Error('cancelled');
    cancelled.cancelled = true;
    return cancelled;
  }
  const payload = error.response?.data?.error;
  const friendly = new Error(
    payload?.message ||
      (error.response
        ? 'Something went wrong. Please try again.'
        : 'We can’t reach TFF right now. Check your connection and try again.'),
  );
  friendly.status = error.response?.status ?? 0;
  friendly.code = payload?.code || (error.response ? 'SERVER_ERROR' : 'NETWORK_ERROR');
  friendly.details = payload?.details || [];
  // An expired admin session sends the dashboard back to its sign-in screen
  if (friendly.status === 401 && error.config?.url?.startsWith('/admin/') && !error.config.url.startsWith('/admin/auth/')) {
    window.dispatchEvent(new Event('tff:admin-signed-out'));
  }
  return friendly;
};

const request = async (config) => {
  try {
    const response = await client.request(config);
    return response.data;
  } catch (error) {
    throw toError(error);
  }
};

// api.get(...) resolves to the payload; api.page(...) also returns pagination details.
export const api = {
  get: (url, config) => request({ ...config, method: 'get', url }).then((body) => body.data),
  page: (url, config) => request({ ...config, method: 'get', url }).then((body) => ({ data: body.data, meta: body.meta })),
  post: (url, data, config) => request({ ...config, method: 'post', url, data }).then((body) => body.data),
  put: (url, data, config) => request({ ...config, method: 'put', url, data }).then((body) => body.data),
  patch: (url, data, config) => request({ ...config, method: 'patch', url, data }).then((body) => body.data),
  delete: (url, config) => request({ ...config, method: 'delete', url }).then((body) => body.data),
};

// Turns the server's per-field validation details into { field: message }
export const fieldErrors = (error) =>
  Object.fromEntries((error?.details || []).map((detail) => [detail.field, detail.message]));
