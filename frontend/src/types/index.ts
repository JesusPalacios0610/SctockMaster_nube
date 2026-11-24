export type Page =
  | 'dashboard'
  | 'products'
  | 'entradas'
  | 'salidas'
  | 'kardex'
  | 'suppliers'
  | 'alerts'
  | 'reports'
  | 'settings';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  location: string;
  stock: number;
  min: number;
  active: boolean;
}

export interface Movement {
  id: string;
  date: string;
  timestamp?: string;
  doc: string;
  type: 'Entrada' | 'Salida';
  reason: string;
  productId: string;
  sku: string;
  productName: string;
  qty: number;
  balance: number;
  user: string;
}

export interface Supplier {
  id: string;
  ruc: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  lead: number;
  active: boolean;
}

export interface PageProps {
  go: (p: Page, c?: Record<string, string | number | undefined>) => void;
  ctx: Record<string, string | number | undefined>;
}
