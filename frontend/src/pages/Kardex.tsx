import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageProps } from '../types';
import { get, apiRequest } from '../services/api';
import { productService, inventoryService, useStore } from '../services/store';
import { Btn, Field, inp, Panel, Badge, Empty, Loading, toast } from '../components/ui';

interface KardexRow {
  idKardex: number;
  idProducto: number;
  codigoSku: string;
  nombreProducto: string;
  fechaCalculo: string;
  stockInicial: number;
  entradas: number;
  salidas: number;
  stockFinal: number;
}

export default function Kardex({ ctx }: PageProps) {
  useStore();
  const productsList = productService.list();
  const [selectedProductId, setSelectedProductId] = useState(ctx.productId ? String(ctx.productId) : productsList[0]?.id || '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [kardexRows, setKardexRows] = useState<KardexRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadError, setLoadError] = useState('');
  const isDateError = !!fromDate && !!toDate && fromDate > toDate;

  useEffect(() => {
    if (!selectedProductId || isDateError) {
      setKardexRows([]);
      setIsLoading(false);
      setLoadError('');
      return;
    }
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setLoadError('');
      const params = new URLSearchParams({ idProducto: selectedProductId });
      if (fromDate) params.set('desde', fromDate);
      if (toDate) params.set('hasta', toDate);
      try {
        const result = await get<KardexRow[]>(`/kardex?${params.toString()}`);
        if (active) setKardexRows(result);
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'No se pudo consultar el kardex.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [selectedProductId, fromDate, toDate, isDateError]);

  const allMovements = inventoryService.movements(selectedProductId).slice().sort(
    (a, b) => a.date.localeCompare(b.date) || (a.timestamp || '').localeCompare(b.timestamp || '')
  );
  const filteredRows = isDateError
    ? []
    : allMovements.filter((movement) =>
      (!fromDate || movement.date >= fromDate) && (!toDate || movement.date <= toDate)
    );
  const netMovement = (rows: typeof allMovements) => rows.reduce(
    (sum, movement) => sum + (movement.type === 'Entrada' ? movement.qty : -movement.qty), 0
  );
  const currentStock = productService.get(selectedProductId)?.stock || 0;
  const baselineStock = currentStock - netMovement(allMovements);
  const initialStock = baselineStock + netMovement(allMovements.filter((movement) => fromDate && movement.date < fromDate));
  const totalEntries = filteredRows.filter((movement) => movement.type === 'Entrada').reduce((sum, movement) => sum + movement.qty, 0);
  const totalOutputs = filteredRows.filter((movement) => movement.type === 'Salida').reduce((sum, movement) => sum + movement.qty, 0);
  const finalStock = initialStock + totalEntries - totalOutputs;

  const generateToday = async () => {
    setIsGenerating(true);
    try {
      await apiRequest('/kardex/generar', { method: 'POST' });
      const params = new URLSearchParams({ idProducto: selectedProductId });
      if (fromDate) params.set('desde', fromDate);
      if (toDate) params.set('hasta', toDate);
      setKardexRows(await get<KardexRow[]>(`/kardex?${params.toString()}`));
      toast('Corte de kardex generado');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo generar el corte.';
      setLoadError(message);
      toast(message, true);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Panel>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Producto">
            <select className={inp} value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
              {productsList.map((product) => (
                <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Fecha inicial" error={isDateError ? 'La fecha inicial no puede ser posterior a la final.' : undefined}>
            <input type="date" className={inp} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </Field>
          <Field label="Fecha final">
            <input type="date" className={inp} value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </Field>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Stock inicial', initialStock],
          ['Total entradas', totalEntries],
          ['Total salidas', totalOutputs],
          ['Stock final', finalStock],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-xl font-bold text-slate-800">{value}</p>
          </div>
        ))}
      </div>

      <Panel title="Movimientos del producto">
        {!filteredRows.length ? (
          <Empty title="Sin movimientos" text="No hay movimientos en el rango elegido." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>{['Fecha', 'Documento', 'Tipo', 'Entrada', 'Salida', 'Stock', 'Usuario'].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((movement) => (
                  <tr key={movement.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{movement.date}</td>
                    <td className="px-4 py-3">{movement.doc || '—'}</td>
                    <td className="px-4 py-3"><Badge t={movement.type} /></td>
                    <td className="px-4 py-3">{movement.type === 'Entrada' ? movement.qty : ''}</td>
                    <td className="px-4 py-3">{movement.type === 'Salida' ? movement.qty : ''}</td>
                    <td className="px-4 py-3 font-semibold">{movement.balance}</td>
                    <td className="px-4 py-3 text-slate-500">{movement.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title="Cortes diarios guardados"
        action={
          <Btn v="s" onClick={() => void generateToday()} disabled={isGenerating || !selectedProductId || isDateError}>
            <RefreshCw size={15} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? 'Generando…' : 'Generar corte de hoy'}
          </Btn>
        }
      >
        {loadError && <p role="alert" className="mb-3 text-sm text-red-700">{loadError}</p>}
        {isLoading ? <Loading rows={3} /> : !kardexRows.length ? (
          <Empty title="Aún no hay cortes guardados" text="Genera el corte de hoy para guardar el saldo diario del inventario." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>{['Fecha', 'SKU', 'Producto', 'Stock inicial', 'Entradas', 'Salidas', 'Stock final'].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kardexRows.map((row) => (
                  <tr key={row.idKardex}>
                    <td className="px-4 py-3">{row.fechaCalculo}</td>
                    <td className="px-4 py-3">{row.codigoSku}</td>
                    <td className="px-4 py-3 font-medium">{row.nombreProducto}</td>
                    <td className="px-4 py-3">{row.stockInicial}</td>
                    <td className="px-4 py-3">{row.entradas}</td>
                    <td className="px-4 py-3">{row.salidas}</td>
                    <td className="px-4 py-3 font-semibold">{row.stockFinal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
