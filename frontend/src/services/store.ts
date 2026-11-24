import { useSyncExternalStore } from 'react';
import {
  AuthenticatedUser,
  clearAuthSession,
  get,
  getAuthenticatedUser,
  patch,
  post,
  put,
  saveAuthSession,
  updateAuthenticatedUser,
} from './api';
import { Movement, Product, Supplier } from '../types';

interface ProductDto {
  idProducto: number;
  codigoSku: string;
  nombre: string;
  categoria: string;
  marca?: string | null;
  precio: number | string;
  ubicacion?: string | null;
  stockMinimo: number;
  stockActual: number;
  activo: boolean;
}

interface SupplierDto {
  idProveedor: number;
  ruc: string;
  razonSocial: string;
  contacto?: string | null;
  telefono?: string | null;
  correo?: string | null;
  tiempoEntrega?: number | null;
  activo: boolean;
}

interface MovementDto {
  id: string;
  fecha: string;
  fechaCreacion?: string;
  tipo: 'Entrada' | 'Salida';
  documento?: string | null;
  motivo?: string | null;
  idProducto: number;
  codigoSku: string;
  nombreProducto: string;
  cantidad: number;
  saldo: number;
  usuario?: string | null;
}

interface StoreStatus {
  ready: boolean;
  loading: boolean;
  error: string;
}

let products: Product[] = [];
let suppliers: Supplier[] = [];
let movements: Movement[] = [];
let storeVersion = 0;
let initialLoad: Promise<void> | null = null;
let storeStatus: StoreStatus = { ready: false, loading: false, error: '' };

const listeners = new Set<() => void>();
const notifyListeners = () => {
  storeVersion++;
  listeners.forEach((listener) => listener());
};

export const useStore = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => storeVersion
  );

export const getStoreStatus = () => storeStatus;

export const resetStore = () => {
  products = [];
  suppliers = [];
  movements = [];
  initialLoad = null;
  storeStatus = { ready: false, loading: false, error: '' };
  notifyListeners();
};

const trim = (value?: string | null) => (value || '').trim();

const mapProduct = (dto: ProductDto): Product => ({
  id: String(dto.idProducto),
  sku: trim(dto.codigoSku),
  name: dto.nombre,
  category: dto.categoria,
  brand: trim(dto.marca),
  price: Number(dto.precio || 0),
  location: trim(dto.ubicacion),
  stock: dto.stockActual ?? 0,
  min: dto.stockMinimo ?? 0,
  active: dto.activo !== false,
});

const mapSupplier = (dto: SupplierDto): Supplier => ({
  id: String(dto.idProveedor),
  ruc: trim(dto.ruc),
  name: dto.razonSocial,
  contact: trim(dto.contacto),
  phone: trim(dto.telefono),
  email: trim(dto.correo),
  lead: dto.tiempoEntrega ?? 0,
  active: dto.activo !== false,
});

const reasonLabels: Record<string, string> = {
  FACTURA: 'Factura',
  GUIA_REMISION: 'Guía de remisión',
  BOLETA: 'Boleta',
  VENTA: 'Venta',
  TRASLADO: 'Traslado',
  MERMA: 'Merma / Deterioro',
};

const mapMovement = (dto: MovementDto): Movement => ({
  id: dto.id,
  date: dto.fecha,
  timestamp: dto.fechaCreacion,
  doc: trim(dto.documento),
  type: dto.tipo,
  reason: reasonLabels[trim(dto.motivo).toUpperCase()] || trim(dto.motivo),
  productId: String(dto.idProducto),
  sku: trim(dto.codigoSku),
  productName: dto.nombreProducto,
  qty: dto.cantidad,
  balance: dto.saldo,
  user: trim(dto.usuario) || '—',
});

const replaceProducts = (items: ProductDto[]) => {
  products = items.map(mapProduct);
  notifyListeners();
};

const replaceSuppliers = (items: SupplierDto[]) => {
  suppliers = items.map(mapSupplier);
  notifyListeners();
};

const replaceMovements = (items: MovementDto[]) => {
  movements = items.map(mapMovement);
  notifyListeners();
};

export const reloadProducts = async () => replaceProducts(await get<ProductDto[]>('/productos'));
export const reloadSuppliers = async () => replaceSuppliers(await get<SupplierDto[]>('/proveedores'));
export const reloadMovements = async () => replaceMovements(await get<MovementDto[]>('/movimientos'));

export async function refreshAll() {
  const results = await Promise.allSettled([reloadProducts(), reloadSuppliers(), reloadMovements()]);
  const errors = results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result) => result.reason instanceof Error ? result.reason.message : 'Error al actualizar los datos.');
  storeStatus = { ready: errors.length === 0, loading: false, error: errors.join(' ') };
  notifyListeners();
  if (errors.length) throw new Error(errors[0]);
}

export async function initializeStore() {
  if (initialLoad) return initialLoad;

  storeStatus = { ...storeStatus, loading: true, error: '' };
  notifyListeners();
  initialLoad = (async () => {
    const results = await Promise.allSettled([reloadProducts(), reloadSuppliers(), reloadMovements()]);
    const errors = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => result.reason instanceof Error ? result.reason.message : 'Error al cargar datos.');
    storeStatus = {
      ready: errors.length === 0,
      loading: false,
      error: errors.join(' '),
    };
    notifyListeners();
    if (errors.length) throw new Error(errors[0]);
  })().finally(() => {
    initialLoad = null;
  });
  return initialLoad;
}

// Utilidad para calcular el estado del stock de un producto.
export const status = (p: Product) =>
  p.stock <= Math.floor(p.min / 2) ? 'Crítico' : p.stock <= p.min ? 'Bajo' : 'Normal';

export const money = (n: number) =>
  'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const authService = {
  async login(username: string, password: string): Promise<AuthenticatedUser> {
    const session = await post<{
      accessToken: string;
      expiresAt: string;
      usuario: AuthenticatedUser;
    }>('/auth/login', { usuario: username.trim(), contrasena: password });
    saveAuthSession(session);
    return session.usuario;
  },

  async currentUser(): Promise<AuthenticatedUser> {
    const user = await get<AuthenticatedUser>('/auth/me');
    updateAuthenticatedUser(user);
    return user;
  },

  logout() {
    clearAuthSession();
    resetStore();
  },
};

export const productService = {
  list: () => products,
  get: (id?: string) => products.find((p) => p.id === String(id)),
  alerts: () => products
    .filter((p) => p.active && p.stock <= p.min)
    .sort((a, b) => (b.min - b.stock) - (a.min - a.stock)),

  async save(p: Partial<Product> & { sku: string }) {
    const body = {
      codigoSku: p.sku.trim(),
      nombre: p.name?.trim(),
      categoria: p.category?.trim(),
      marca: p.brand?.trim() || null,
      precio: p.price,
      ubicacion: p.location?.trim() || null,
      stockMinimo: p.min,
      stockActual: p.id ? (this.get(p.id)?.stock ?? 0) : 0,
    };
    const saved = p.id
      ? await put<ProductDto>(`/productos/${encodeURIComponent(p.id)}`, body)
      : await post<ProductDto>('/productos', body);
    const updated = products.filter((item) => item.id !== String(saved.idProducto));
    products = [...updated, mapProduct(saved)];
    notifyListeners();
    return true;
  },

  async toggle(id: string) {
    const current = this.get(id);
    if (!current) throw new Error('No se encontró el producto seleccionado.');
    const saved = await patch<ProductDto>(`/productos/${encodeURIComponent(id)}/estado`, {
      activo: !current.active,
    });
    products = products.map((item) => item.id === id ? mapProduct(saved) : item);
    notifyListeners();
  },
};

export const supplierService = {
  list: () => suppliers,

  async save(s: Supplier) {
    const body = {
      ruc: s.ruc.trim(),
      razonSocial: s.name.trim(),
      contacto: s.contact.trim() || null,
      telefono: s.phone.trim() || null,
      correo: s.email.trim() || null,
      tiempoEntrega: s.lead || 0,
    };
    const saved = s.id
      ? await put<SupplierDto>(`/proveedores/${encodeURIComponent(s.id)}`, body)
      : await post<SupplierDto>('/proveedores', body);
    suppliers = [...suppliers.filter((item) => item.id !== String(saved.idProveedor)), mapSupplier(saved)];
    notifyListeners();
    return true;
  },

  async toggle(id: string) {
    const current = suppliers.find((item) => item.id === id);
    if (!current) throw new Error('No se encontró el proveedor seleccionado.');
    const saved = await patch<SupplierDto>(`/proveedores/${encodeURIComponent(id)}/estado`, {
      activo: !current.active,
    });
    suppliers = suppliers.map((item) => item.id === id ? mapSupplier(saved) : item);
    notifyListeners();
  },
};

const documentTypeCodes: Record<string, string> = {
  Factura: 'FACTURA',
  'Guía de remisión': 'GUIA_REMISION',
  Boleta: 'BOLETA',
};

const exitReasonCodes: Record<string, string> = {
  Venta: 'VENTA',
  Traslado: 'TRASLADO',
  'Merma / Deterioro': 'MERMA',
  'Merma/Deterioro': 'MERMA',
};

export const inventoryService = {
  movements: (pid?: string, type?: 'Entrada' | 'Salida') => movements.filter(
    (m) => (!pid || m.productId === String(pid)) && (!type || m.type === type)
  ),

  async register(
    type: 'Entrada' | 'Salida',
    reason: string,
    doc: string,
    items: { pid: string; qty: number }[],
    supplierId?: string
  ) {
    if (!items.length) throw new Error('Agrega al menos un producto.');

    if (type === 'Entrada') {
      if (!supplierId) throw new Error('Selecciona un proveedor activo.');
      await post('/entradas', {
        idProveedor: Number(supplierId),
        tipoDocumento: documentTypeCodes[reason] || reason.toUpperCase(),
        documento: doc.trim(),
        detalles: items.map((item) => ({ idProducto: Number(item.pid), cantidad: item.qty })),
      });
    } else {
      if (items.length !== 1) throw new Error('Cada salida debe registrar un solo producto.');
      const item = items[0];
      await post('/salidas', {
        idProducto: Number(item.pid),
        documento: doc.trim() || null,
        tipoSalida: exitReasonCodes[reason] || reason.toUpperCase(),
        cantidad: item.qty,
      });
    }

    await refreshAll();
    return true;
  },
};

export const reportService = {
  async generate(kind: string, f: { category: string; from: string; to: string }) {
    const byDate = (m: Movement) => (!f.from || m.date >= f.from) && (!f.to || m.date <= f.to);
    const categoryOf = (m: Movement) => products.find((p) => p.id === m.productId)?.category;
    let head: string[];
    let rows: (string | number)[][];

    if (kind === 'Reporte de inventario' || kind === 'Productos con stock bajo') {
      const list = products.filter((p) =>
        (!f.category || p.category === f.category) &&
        (kind === 'Reporte de inventario' || (p.active && p.stock <= p.min))
      );
      head = ['SKU', 'Producto', 'Categoría', 'Stock', 'Mínimo', 'Valor del inventario'];
      rows = list.map((p) => [p.sku, p.name, p.category, p.stock, p.min, money(p.stock * p.price)]);
    } else {
      const list = movements
        .filter((m) => byDate(m) && (!f.category || categoryOf(m) === f.category))
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date) || (a.timestamp || '').localeCompare(b.timestamp || ''));
      if (kind === 'Reporte Kardex') {
        head = ['Fecha', 'SKU', 'Producto', 'Documento', 'Movimiento', 'Motivo', 'Entradas', 'Salidas', 'Saldo', 'Usuario'];
        rows = list.map((m) => [
          m.date, m.sku, m.productName, m.doc, m.type, m.reason,
          m.type === 'Entrada' ? m.qty : '', m.type === 'Salida' ? m.qty : '', m.balance, m.user,
        ]);
      } else {
        head = ['Fecha', 'SKU', 'Producto', 'Documento', 'Tipo', 'Motivo', 'Cantidad', 'Saldo', 'Usuario'];
        rows = list.map((m) => [m.date, m.sku, m.productName, m.doc, m.type, m.reason, m.qty, m.balance, m.user]);
      }
    }

    return { head, rows };
  },
};
