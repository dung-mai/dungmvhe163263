export type Money = string;
export type SaleStatus = 'upcoming' | 'active' | 'ended';
export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  image: string;
  images: string[];
  price: Money;
  originalPrice: Money | null;
  currency: 'VND';
  rating: number;
  reviewCount: number;
  badge: string | null;
  available: boolean;
}
export interface Category {
  slug: string;
  name: string;
  image: string;
}
export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  label: string;
  image: string;
  theme: string;
  collectionSlug: string;
}
export interface Sale {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: SaleStatus;
}
export interface HomeData {
  serverTime: string;
  categories: Category[];
  banners: Banner[];
  bestSellers: Product[];
  newArrivals: Product[];
  topSales: Product[];
  flashSale: Sale | null;
}
export interface ProductPage {
  items: Product[];
  page: number;
  limit: number;
  total: number;
}
export interface ApiError {
  statusCode: number;
  message: string | string[];
  requestId: string;
}
