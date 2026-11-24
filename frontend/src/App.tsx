import { useCallback, useEffect, useState } from 'react';
import { Page } from './types';
import AppLayout from './layouts/AppLayout';
import { Btn, Loading, Panel, Toasts } from './components/ui';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Movement from './pages/Movement';
import Kardex from './pages/Kardex';
import Alerts from './pages/Alerts';
import Suppliers from './pages/Suppliers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { authService, getStoreStatus, initializeStore, resetStore, useStore } from './services/store';
import { clearAuthSession, getAccessToken } from './services/api';

const routes: Record<Page, string> = {
  dashboard: '/dashboard',
  products: '/productos',
  entradas: '/entradas',
  salidas: '/salidas',
  kardex: '/kardex',
  suppliers: '/proveedores',
  alerts: '/alertas',
  reports: '/reportes',
  settings: '/configuracion',
};

const pageFromPath = (pathname: string): Page => {
  const entry = Object.entries(routes).find(([, path]) => path === pathname);
  return (entry?.[0] as Page) || 'dashboard';
};

const contextFromLocation = (): Record<string, string> => {
  const params = new URLSearchParams(window.location.search);
  const historyContext = window.history.state?.context || {};
  const context: Record<string, string> = { ...historyContext };
  ['open', 'productId', 'supplierId'].forEach((key) => {
    const value = params.get(key);
    if (value) context[key] = value;
  });
  return context;
};

const locationFor = (page: Page, context: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(context).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const queryString = query.toString();
  return routes[page] + (queryString ? `?${queryString}` : '');
};

export default function App() {
  useStore();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>(() => pageFromPath(window.location.pathname));
  const [pageContext, setPageContext] = useState<Record<string, string | number | undefined>>(contextFromLocation);
  const [retrying, setRetrying] = useState(false);
  const storeStatus = getStoreStatus();

  const navigateTo = (page: Page, context: Record<string, string | number | undefined> = {}) => {
    window.history.pushState({ context }, '', locationFor(page, context));
    setCurrentPage(page);
    setPageContext(context);
    window.scrollTo(0, 0);
  };

  const loadData = useCallback(async () => {
    setRetrying(true);
    try {
      await initializeStore();
    } catch {
      // El estado compartido muestra el error y ofrece reintentar.
    } finally {
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    if (!Object.values(routes).includes(window.location.pathname)) {
      const context = contextFromLocation();
      window.history.replaceState({ context }, '', locationFor(pageFromPath(window.location.pathname), context));
    }
    let active = true;
    const restoreSession = async () => {
      try {
        if (!getAccessToken()) return;
        await authService.currentUser();
        if (!active) return;
        setIsAuthenticated(true);
        try {
          await initializeStore();
        } catch {
          // El estado compartido ofrece reintentar la carga de datos.
        }
      } catch {
        if (!active) return;
        if (!getAccessToken()) {
          clearAuthSession();
          resetStore();
        } else if (active) {
          // Conserva la sesión si la API no responde; el panel de datos permite reintentar.
          setIsAuthenticated(true);
          try {
            await initializeStore();
          } catch {
            // El estado compartido muestra el fallo de conexión.
          }
        }
      } finally {
        if (active) setAuthChecking(false);
      }
    };
    void restoreSession();
    const handlePopState = () => {
      setCurrentPage(pageFromPath(window.location.pathname));
      setPageContext(contextFromLocation());
    };
    const handleAuthenticationExpired = () => {
      setIsAuthenticated(false);
      resetStore();
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('electromarket:authentication-expired', handleAuthenticationExpired);
    return () => {
      active = false;
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('electromarket:authentication-expired', handleAuthenticationExpired);
    };
  }, []);

  if (authChecking) {
    return <div className="grid min-h-screen place-items-center"><Loading rows={2} /></div>;
  }

  if (!isAuthenticated) {
    return (
      <>
        <Login onLogin={() => { setIsAuthenticated(true); void loadData(); }} />
        <Toasts />
      </>
    );
  }

  const sharedProps = {
    go: navigateTo,
    ctx: pageContext,
    key: currentPage + JSON.stringify(pageContext),
  };
  const pageContent = currentPage === 'dashboard' ? <Dashboard {...sharedProps} />
    : currentPage === 'products' ? <Products {...sharedProps} />
    : currentPage === 'entradas' ? <Movement mode="Entrada" {...sharedProps} />
    : currentPage === 'salidas' ? <Movement mode="Salida" {...sharedProps} />
    : currentPage === 'kardex' ? <Kardex {...sharedProps} />
    : currentPage === 'alerts' ? <Alerts {...sharedProps} />
    : currentPage === 'suppliers' ? <Suppliers {...sharedProps} />
    : currentPage === 'reports' ? <Reports {...sharedProps} />
    : <Settings {...sharedProps} />;

  return (
    <AppLayout page={currentPage} go={navigateTo} logout={() => { authService.logout(); setIsAuthenticated(false); }}>
      {storeStatus.loading && <Panel title="Conectando con el inventario"><Loading rows={4} /></Panel>}
      {storeStatus.error && (
        <Panel title="No se pudieron cargar los datos">
          <p role="alert" className="text-sm text-red-700">{storeStatus.error}</p>
          <p className="mt-2 text-sm text-slate-500">Verifica que el backend esté iniciado y que la base de datos esté disponible.</p>
          <Btn className="mt-4" disabled={retrying} onClick={() => void loadData()}>
            {retrying ? 'Conectando…' : 'Reintentar conexión'}
          </Btn>
        </Panel>
      )}
      {!storeStatus.loading && pageContent}
      <Toasts />
    </AppLayout>
  );
}
