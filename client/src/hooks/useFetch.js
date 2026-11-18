import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api.js';

// Loads data from the API and keeps track of loading / error state.
// Pass `null` as the url to skip the request. `reload()` fetches again.
export const useFetch = (url, { params, paged = false } = {}) => {
  const [state, setState] = useState({ data: null, meta: null, error: null, loading: Boolean(url) });
  const [tick, setTick] = useState(0);
  const key = url ? `${url}?${JSON.stringify(params || {})}` : null;
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useEffect(() => {
    if (!key) {
      setState({ data: null, meta: null, error: null, loading: false });
      return undefined;
    }
    const controller = new AbortController();
    setState((previous) => ({ ...previous, error: null, loading: true }));

    const config = { params: paramsRef.current, signal: controller.signal };
    (paged ? api.page(url, config) : api.get(url, config).then((data) => ({ data, meta: null })))
      .then(({ data, meta }) => setState({ data, meta, error: null, loading: false }))
      .catch((error) => {
        if (!error.cancelled) setState({ data: null, meta: null, error, loading: false });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick, paged]);

  const reload = useCallback(() => setTick((value) => value + 1), []);
  const setData = useCallback((data) => setState((previous) => ({ ...previous, data })), []);

  return { ...state, reload, setData };
};
