'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Product } from '@flashlab/contracts';
interface CartItem {
  product: Product;
  quantity: number;
}
interface Store {
  cart: CartItem[];
  wishlist: Product[];
  add: (product: Product) => void;
  change: (id: string, delta: number) => void;
  toggle: (product: Product) => void;
}
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('flashlab-store-v1') ?? '{}');
      if (Array.isArray(saved.cart))
        setCart(
          saved.cart.filter(
            (i: CartItem) =>
              i?.product?.id &&
              /^\d+$/.test(i.product.price) &&
              Number.isInteger(i.quantity) &&
              i.quantity > 0 &&
              i.quantity <= 99,
          ),
        );
      if (Array.isArray(saved.wishlist))
        setWishlist(saved.wishlist.filter((p: Product) => p?.id && /^\d+$/.test(p.price)));
    } catch {
      /* Invalid or unavailable local storage starts a fresh demo cart. */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem('flashlab-store-v1', JSON.stringify({ cart, wishlist }));
      } catch {
        /* Private browsing/storage quota: keep session state. */
      }
    }
  }, [cart, wishlist, ready]);
  function add(product: Product) {
    if (!product.available) return;
    setCart((items) => {
      const found = items.find((i) => i.product.id === product.id);
      return found
        ? items.map((i) =>
            i.product.id === product.id ? { product, quantity: Math.min(99, i.quantity + 1) } : i,
          )
        : [...items, { product, quantity: 1 }];
    });
  }
  function change(id: string, delta: number) {
    setCart((items) =>
      items
        .map((i) =>
          i.product.id === id ? { ...i, quantity: Math.min(99, i.quantity + delta) } : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }
  function toggle(product: Product) {
    setWishlist((items) =>
      items.some((p) => p.id === product.id)
        ? items.filter((p) => p.id !== product.id)
        : [...items, product],
    );
  }
  return (
    <Context.Provider value={{ cart, wishlist, add, change, toggle }}>{children}</Context.Provider>
  );
}
export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error('StoreProvider missing');
  return store;
}
