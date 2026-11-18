import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { api } from '../services/api.js';
import { useToast } from './ToastContext.jsx';

// Shopper state shared across the storefront: who is signed in, what is in the
// bag, what is saved, store settings, and which overlay is open.

const AuthContext = createContext(null);
const CartContext = createContext(null);
const WishlistContext = createContext(null);
const SettingsContext = createContext(null);
const UiContext = createContext(null);
const CategoriesContext = createContext([]);

const EMPTY_CART = { items: [], saved: [], itemCount: 0, subtotal: 0, hasIssues: false };

export const StoreProvider = ({ children }) => {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // ── Account ────────────────────────────────────────────────────────────
  const [customer, setCustomer] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // ── Bag ────────────────────────────────────────────────────────────────
  const [cart, setCart] = useState(EMPTY_CART);
  const [cartReady, setCartReady] = useState(false);

  // ── Wishlist ───────────────────────────────────────────────────────────
  const [wishlist, setWishlist] = useState([]);

  // ── Settings & overlays ────────────────────────────────────────────────
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [overlay, setOverlay] = useState(null); // 'cart' | 'search' | 'menu' | null

  const refreshCart = useCallback(
    () =>
      api
        .get('/cart')
        .then(setCart)
        .catch(() => {})
        .finally(() => setCartReady(true)),
    [],
  );

  useEffect(() => {
    api
      .get('/auth/me')
      .then(setCustomer)
      .catch(() => {})
      .finally(() => setAuthReady(true));
    api.get('/settings').then(setSettings).catch(() => {});
    api.get('/categories').then(setCategories).catch(() => {});
    refreshCart();
  }, [refreshCart]);

  const customerId = customer?.id;
  useEffect(() => {
    if (!customerId) {
      setWishlist([]);
      return;
    }
    api.get('/wishlist').then(setWishlist).catch(() => {});
  }, [customerId]);

  // Overlays close when the page changes
  useEffect(() => setOverlay(null), [location.pathname, location.search]);

  const auth = useMemo(
    () => ({
      customer,
      ready: authReady,
      login: async (credentials) => {
        const account = await api.post('/auth/login', credentials);
        setCustomer(account);
        await refreshCart();
        return account;
      },
      register: async (details) => {
        const account = await api.post('/auth/register', details);
        setCustomer(account);
        await refreshCart();
        return account;
      },
      update: async (details) => {
        const account = await api.patch('/auth/me', details);
        setCustomer(account);
        return account;
      },
      logout: async () => {
        await api.post('/auth/logout');
        setCustomer(null);
        await refreshCart();
      },
    }),
    [customer, authReady, refreshCart],
  );

  const cartApi = useMemo(
    () => ({
      cart,
      ready: cartReady,
      refresh: refreshCart,
      add: async (variantId, quantity = 1, { open = true } = {}) => {
        const next = await api.post('/cart/items', { variantId, quantity });
        setCart(next);
        if (open) setOverlay('cart');
        return next;
      },
      update: async (itemId, changes) => {
        try {
          setCart(await api.patch(`/cart/items/${itemId}`, changes));
        } catch (error) {
          toast.error(error.message);
          refreshCart();
        }
      },
      remove: async (itemId) => {
        try {
          setCart(await api.delete(`/cart/items/${itemId}`));
        } catch (error) {
          toast.error(error.message);
        }
      },
    }),
    [cart, cartReady, refreshCart, toast],
  );

  const wishlistApi = useMemo(() => {
    const ids = new Set(wishlist.map((product) => product.id));
    return {
      items: wishlist,
      has: (productId) => ids.has(productId),
      toggle: async (product) => {
        if (!customer) {
          toast.toast('Sign in to save pieces to your wishlist.', {
            action: { label: 'Sign in', onClick: () => navigate('/login', { state: { from: location.pathname } }) },
          });
          return;
        }
        try {
          if (ids.has(product.id)) {
            setWishlist(await api.delete(`/wishlist/${product.id}`));
          } else {
            setWishlist(await api.post('/wishlist', { productId: product.id }));
            toast.success('Saved to your wishlist.');
          }
        } catch (error) {
          toast.error(error.message);
        }
      },
    };
  }, [wishlist, customer, toast, navigate, location.pathname]);

  const ui = useMemo(
    () => ({
      overlay,
      open: setOverlay,
      close: () => setOverlay(null),
    }),
    [overlay],
  );

  return (
    <SettingsContext.Provider value={settings}>
      <CategoriesContext.Provider value={categories}>
      <UiContext.Provider value={ui}>
        <AuthContext.Provider value={auth}>
          <CartContext.Provider value={cartApi}>
            <WishlistContext.Provider value={wishlistApi}>{children}</WishlistContext.Provider>
          </CartContext.Provider>
        </AuthContext.Provider>
      </UiContext.Provider>
      </CategoriesContext.Provider>
    </SettingsContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export const useCart = () => useContext(CartContext);
export const useWishlist = () => useContext(WishlistContext);
export const useSettings = () => useContext(SettingsContext);
export const useUi = () => useContext(UiContext);
export const useCategories = () => useContext(CategoriesContext);
