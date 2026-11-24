import { useState } from 'react';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { PageProps } from '../types';
import { productService, reportService } from '../services/store';
import { Btn, Field, inp, Panel, Empty, Loading, toast } from '../components/ui';
import { downloadXlsx } from '../utils/xlsx';
import { useStore } from '../services/store';

const reportKinds = ['Reporte de inventario', 'Reporte Kardex', 'Movimientos', 'Productos con stock bajo'];

export default function Reports(_: PageProps) {
  useStore();
  const [kind, setKind] = useState(reportKinds[0]);
  const [category, setCategory] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [reportResult, setReportResult] = useState<{ head: string[]; rows: (string | number)[][] } | null>(null);

  const categories = [...new Set(productService.list().map((p) => p.category))];
  const isDateError = !!fromDate && !!toDate && fromDate > toDate;

  // Generar reporte
  const generateReport = async () => {
    if (isDateError) return;
    setIsBusy(true);
    try {
      setReportResult(await reportService.generate(kind, { category, from: fromDate, to: toDate }));
      toast('Reporte generado');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo generar el reporte.', true);
    } finally {
      setIsBusy(false);
    }
  };

  const exportToExcel = () => {
    if (!reportResult) return;
    downloadXlsx(kind.replace(/[^a-z0-9]+/gi, '_'), kind, reportResult.head, reportResult.rows);
    toast('Archivo Excel descargado');
  };

  return (
    <div className="space-y-4 report-print-root">
      <h2 className="hidden report-print-title text-xl font-semibold">ElectroMarket · {kind}</h2>
      {/* Panel de Filtros para Reportes */}
      <Panel className="report-controls">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Tipo de reporte">
            <select className={inp} value={kind} onChange={(e) => setKind(e.target.value)}>
              {reportKinds.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </Field>

          <Field label="Categoría">
            <select className={inp} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field label="Fecha inicial">
            <input
              type="date"
              className={inp}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </Field>

          <Field
            label="Fecha final"
            error={isDateError ? 'La fecha inicial no puede ser posterior a la final.' : undefined}
          >
            <input
              type="date"
              className={inp}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-slate-100">
          <Btn onClick={generateReport} disabled={isBusy || isDateError}>
            {isBusy ? 'Generando…' : 'Generar reporte'}
          </Btn>
          <Btn v="s" disabled={!reportResult} onClick={() => window.print()}>
            <FileDown size={16} />
            Guardar como PDF
          </Btn>
          <Btn v="s" disabled={!reportResult} onClick={exportToExcel}>
            <FileSpreadsheet size={16} />
            Descargar Excel (.xlsx)
          </Btn>
        </div>
      </Panel>

      {/* Visualización de Resultados */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden report-print-table">
        {isBusy ? (
          <div className="p-4"><Loading /></div>
        ) : !reportResult ? (
          <Empty title="Aún no generaste un reporte" text="Elige los filtros y pulsa Generar reporte." />
        ) : !reportResult.rows.length ? (
          <Empty title="Sin datos para estos filtros" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  {reportResult.head.map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportResult.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-3 text-slate-700">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
