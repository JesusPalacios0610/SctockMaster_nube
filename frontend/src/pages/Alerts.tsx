import { useEffect, useState } from 'react';
import { PageProps } from '../types';
import { get } from '../services/api';
import { Btn, Badge, Loading, Panel } from '../components/ui';

interface AlertProduct {
  idProducto: number;
  codigoSku: string;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
  diferencia: number;
}

export default function Alerts({ go }: PageProps) {
  const [alertsList, setAlertsList] = useState<AlertProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAlerts = async () => {
    setLoading(true);
    setError('');
    try {
      setAlertsList(await get<AlertProduct[]>('/alertas-stock'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron consultar las alertas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAlerts(); }, []);

  if (loading) return <Panel title="Alertas de stock"><Loading rows={4} /></Panel>;
  if (error) {
    return (
      <Panel title="Alertas de stock">
        <p role="alert" className="text-sm text-red-700">{error}</p>
        <Btn v="s" className="mt-3" onClick={() => void loadAlerts()}>Reintentar</Btn>
      </Panel>
    );
  }
  if (!alertsList.length) {
    return <Panel><p className="py-10 text-center font-medium text-emerald-700">✓ Sin novedades de stock</p></Panel>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {alertsList.map((product) => {
        const productId = String(product.idProducto);
        const state = product.stockActual <= Math.floor(product.stockMinimo / 2) ? 'Crítico' : 'Bajo';
        return (
          <div key={product.idProducto} className="pop rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-800">{product.nombre}</p>
                <p className="text-xs text-slate-500">{product.codigoSku}</p>
              </div>
              <Badge t={state} />
            </div>
            <dl className="mt-3 grid grid-cols-3 border-t border-b border-slate-100 py-2 text-sm">
              <div><dt className="text-xs text-slate-500">Stock actual</dt><dd className="font-bold text-slate-700">{product.stockActual}</dd></div>
              <div><dt className="text-xs text-slate-500">Mínimo</dt><dd className="font-bold text-slate-700">{product.stockMinimo}</dd></div>
              <div><dt className="text-xs text-slate-500">Déficit</dt><dd className="font-bold text-red-600">{product.diferencia}</dd></div>
            </dl>
            <div className="mt-4 flex gap-2">
              <Btn v="s" onClick={() => go('products', { open: productId })}>Ver producto</Btn>
              <Btn onClick={() => go('entradas', { productId })}>Registrar reposición</Btn>
            </div>
          </div>
        );
      })}
    </div>
  );
}
