import { useState } from 'react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { PageProps } from '../types';
import { inventoryService, productService, supplierService, useStore } from '../services/store';
import { Btn, Badge, Field, inp, Panel, Confirm, Empty, toast } from '../components/ui';

interface Item {
  pid: string;
  qty: number;
}

export default function Movement({ mode, go, ctx }: PageProps & { mode: 'Entrada' | 'Salida' }) {
  useStore();
  const isEntry = mode === 'Entrada';
  const activeProducts = productService.list().filter((p) => p.active);
  const activeSuppliers = supplierService.list().filter((supplier) => supplier.active);
  const movementOptions = isEntry
    ? ['Factura', 'Guía de remisión', 'Boleta']
    : ['Venta', 'Traslado', 'Merma / Deterioro'];

  const [kind, setKind] = useState(movementOptions[0]);
  const [reference, setReference] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [productId, setProductId] = useState(ctx.productId ? String(ctx.productId) : '');
  const [supplierId, setSupplierId] = useState(ctx.supplierId ? String(ctx.supplierId) : '');
  const [quantity, setQuantity] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [askConfirm, setAskConfirm] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');

  const currentProduct = productService.get(productId);
  const parsedQty = +quantity;
  const alreadyInListQty = items.filter((item) => item.pid === productId).reduce((acc, item) => acc + item.qty, 0);
  const isStockExceeded = !isEntry && !!currentProduct && parsedQty + alreadyInListQty > currentProduct.stock;
  const shownProducts = activeProducts.filter((product) =>
    (product.sku + product.name).toLowerCase().includes(searchTerm.toLowerCase())
  );
  const history = inventoryService.movements(undefined, mode)
    .filter((movement) =>
      (!historyFrom || movement.date >= historyFrom) &&
      (!historyTo || movement.date <= historyTo) &&
      [movement.doc, movement.reason, movement.sku, movement.productName, movement.user]
        .join(' ').toLowerCase().includes(historyQuery.toLowerCase())
    )
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || (b.timestamp || '').localeCompare(a.timestamp || ''));

  const addItem = () => {
    setErrorMsg('');
    if (!currentProduct) return setErrorMsg('Selecciona un producto activo.');
    if (!(parsedQty > 0 && Number.isInteger(parsedQty))) return setErrorMsg('Ingresa una cantidad entera mayor a 0.');
    if (!isEntry && items.length > 0) {
      return setErrorMsg('Cada salida registra un solo producto. Finaliza esta operación y crea otra si hace falta.');
    }
    if (isStockExceeded) return;

    setItems((previous) => [...previous, { pid: currentProduct.id, qty: parsedQty }]);
    setQuantity('');
    setProductId('');
  };

  const confirmMovement = async () => {
    if (isEntry && !supplierId) {
      setErrorMsg('Selecciona un proveedor activo.');
      setAskConfirm(false);
      return;
    }
    if (isEntry && !reference.trim()) {
      setErrorMsg('Ingresa el número del documento.');
      setAskConfirm(false);
      return;
    }

    setIsBusy(true);
    setErrorMsg('');
    try {
      await inventoryService.register(
        mode,
        kind,
        reference.trim(),
        items.map((item) => ({ pid: item.pid, qty: item.qty })),
        supplierId
      );
      setAskConfirm(false);
      setIsDone(true);
      toast(`${mode} registrada`);
    } catch (error) {
      setAskConfirm(false);
      const message = error instanceof Error ? error.message : `No se pudo registrar la ${mode.toLowerCase()}.`;
      setErrorMsg(message);
      toast(message, true);
    } finally {
      setIsBusy(false);
    }
  };

  const startNew = () => {
    setIsDone(false);
    setItems([]);
    setReference('');
    setQuantity('');
    setErrorMsg('');
  };

  if (isDone) {
    return (
      <Panel>
        <div className="flex flex-col items-center py-10 text-center">
          <CheckCircle2 size={44} className="text-emerald-600" />
          <p className="mt-3 text-lg font-semibold text-slate-800">{isEntry ? 'Entrada registrada' : 'Salida registrada'}</p>
          <p className="text-sm text-slate-500">El backend actualizó el stock y el historial del producto.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Btn v="s" onClick={startNew}>Nueva operación</Btn>
            <Btn onClick={() => go('kardex', { productId: items[0]?.pid })}>Ver Kardex</Btn>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-5">
        <Panel title={isEntry ? 'Datos de la entrada' : 'Datos de la salida'} className="lg:col-span-2">
          <div className="space-y-3">
            <Field label={isEntry ? 'Tipo de documento' : 'Motivo'}>
              <select className={inp} value={kind} onChange={(e) => setKind(e.target.value)}>
                {movementOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </Field>

            {isEntry && (
              <Field label="Proveedor *">
                <select className={inp} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  <option value="">Selecciona un proveedor activo…</option>
                  {activeSuppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.ruc} · {supplier.name}</option>
                  ))}
                </select>
              </Field>
            )}

            <Field label={isEntry ? 'N.º de guía o factura *' : 'Documento de referencia'}>
              <input
                className={inp}
                value={reference}
                maxLength={20}
                onChange={(e) => setReference(e.target.value)}
                placeholder={isEntry ? 'F001-00234' : 'B001-00045'}
              />
            </Field>

            <Field label="Buscar producto">
              <input
                className={inp}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="SKU o nombre"
              />
            </Field>

            <Field label="Producto">
              <select className={inp} value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">Selecciona…</option>
                {shownProducts.map((product) => (
                  <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>
                ))}
              </select>
            </Field>

            {currentProduct && (
              <p className="text-sm text-slate-600">
                Stock disponible: <b>{currentProduct.stock}</b>
                {alreadyInListQty > 0 && <span className="text-slate-500"> ({alreadyInListQty} ya en la lista)</span>}
              </p>
            )}

            <Field label="Cantidad">
              <input
                className={inp}
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </Field>

            {isStockExceeded && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                No hay stock suficiente para realizar esta operación.
              </p>
            )}
            {errorMsg && <p role="alert" className="text-sm text-red-600">{errorMsg}</p>}
            {isEntry && !activeSuppliers.length && (
              <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                Activa o registra un proveedor antes de crear una entrada.
              </p>
            )}

            <Btn
              v="s"
              className="w-full"
              onClick={addItem}
              disabled={isStockExceeded || (!isEntry && items.length > 0)}
            >
              <Plus size={16} />
              Agregar a la lista
            </Btn>
          </div>
        </Panel>

        <Panel title="Productos agregados" className="lg:col-span-3">
          {!items.length ? (
            <Empty title="Aún no agregaste productos" text="Selecciona un producto y una cantidad." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-slate-500 bg-slate-50">
                    <tr>
                      <th className="px-3 py-2">Producto</th>
                      <th className="px-3 py-2">Cantidad</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, index) => (
                      <tr key={`${item.pid}-${index}`}>
                        <td className="px-3 py-2 font-medium">{productService.get(item.pid)?.name || item.pid}</td>
                        <td className="px-3 py-2">{item.qty}</td>
                        <td className="px-3 py-2">
                          <button
                            aria-label="Quitar producto"
                            className="p-2 text-slate-500 hover:text-red-600"
                            onClick={() => setItems((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <p className="text-sm">{items.length} producto(s) · {items.reduce((sum, item) => sum + item.qty, 0)} unidades</p>
                <Btn onClick={() => setAskConfirm(true)}>Revisar y confirmar</Btn>
              </div>
            </>
          )}
        </Panel>
      </div>

      <Panel title={`Historial de ${mode.toLowerCase()}s`}>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Field label="Buscar">
            <input
              className={inp}
              value={historyQuery}
              onChange={(event) => setHistoryQuery(event.target.value)}
              placeholder="Documento, motivo, SKU o producto"
            />
          </Field>
          <Field label="Desde">
            <input type="date" className={inp} value={historyFrom} onChange={(event) => setHistoryFrom(event.target.value)} />
          </Field>
          <Field label="Hasta">
            <input type="date" className={inp} value={historyTo} onChange={(event) => setHistoryTo(event.target.value)} />
          </Field>
        </div>
        {!history.length ? (
          <Empty
            title={inventoryService.movements(undefined, mode).length ? 'Sin resultados' : `Aún no hay ${mode.toLowerCase()}s`}
            text={inventoryService.movements(undefined, mode).length ? 'Cambia los filtros para ver otros registros.' : 'Los registros aparecerán aquí cuando se guarden en el sistema.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  {['Fecha', 'Documento', 'Motivo', 'Producto', 'Cantidad', 'Saldo', 'Usuario'].map((heading) => (
                    <th key={heading} className="px-3 py-2 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((movement) => (
                  <tr key={movement.id}>
                    <td className="px-3 py-2">{movement.date}</td>
                    <td className="px-3 py-2">{movement.doc || '—'}</td>
                    <td className="px-3 py-2"><Badge t={movement.reason || movement.type} /></td>
                    <td className="px-3 py-2">{movement.productName}</td>
                    <td className="px-3 py-2">{movement.qty}</td>
                    <td className="px-3 py-2 font-semibold">{movement.balance}</td>
                    <td className="px-3 py-2 text-slate-500">{movement.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {askConfirm && (
        <Confirm
          title={isEntry ? '¿Deseas registrar esta entrada de stock?' : '¿Deseas registrar esta salida de stock?'}
          text={`${items.length} producto(s), ${items.reduce((sum, item) => sum + item.qty, 0)} unidades. El stock se actualizará en la base de datos.`}
          busy={isBusy}
          onOk={() => void confirmMovement()}
          onCancel={() => setAskConfirm(false)}
        />
      )}
    </div>
  );
}
