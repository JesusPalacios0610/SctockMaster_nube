import { useState } from 'react';
import { Pencil, Plus, Power, Search } from 'lucide-react';
import { PageProps, Supplier } from '../types';
import { supplierService, useStore } from '../services/store';
import { Btn, Badge, Modal, Field, inp, Empty, toast } from '../components/ui';

export default function Suppliers(_: PageProps) {
  useStore();
  const [query, setQuery] = useState('');
  const [formSupplier, setFormSupplier] = useState<Supplier | null | undefined>(undefined);
  const suppliersList = supplierService
    .list()
    .filter((s) => (s.ruc + s.name + s.contact).toLowerCase().includes(query.toLowerCase()));

  const toggleSupplier = async (supplier: Supplier) => {
    try {
      await supplierService.toggle(supplier.id);
      toast(supplier.active ? 'Proveedor inactivado' : 'Proveedor activado');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo actualizar el proveedor.', true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            aria-label="Buscar proveedor"
            className={inp + ' pl-9'}
            placeholder="Buscar por RUC, razón social o contacto"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Btn onClick={() => setFormSupplier(null)}>
          <Plus size={16} />
          Nuevo proveedor
        </Btn>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {!suppliersList.length ? (
          <Empty title={query ? 'Sin resultados' : 'Sin proveedores'} text={query ? 'Prueba con otro término.' : 'Registra el primer proveedor.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  {['RUC', 'Razón social', 'Contacto', 'Teléfono', 'Correo', 'Entrega', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliersList.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{supplier.ruc}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{supplier.name}</td>
                    <td className="px-4 py-3">{supplier.contact || '—'}</td>
                    <td className="px-4 py-3">{supplier.phone || '—'}</td>
                    <td className="px-4 py-3">{supplier.email || '—'}</td>
                    <td className="px-4 py-3">{supplier.lead ? `${supplier.lead} días` : '—'}</td>
                    <td className="px-4 py-3"><Badge t={supplier.active ? 'Activo' : 'Inactivo'} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        aria-label={`Editar ${supplier.name}`}
                        className="p-2 text-slate-500 hover:text-blue-600"
                        onClick={() => setFormSupplier(supplier)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        aria-label={`${supplier.active ? 'Inactivar' : 'Activar'} ${supplier.name}`}
                        className={`p-2 ${supplier.active ? 'text-slate-500 hover:text-red-600' : 'text-slate-500 hover:text-emerald-600'}`}
                        onClick={() => void toggleSupplier(supplier)}
                      >
                        <Power size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formSupplier !== undefined && (
        <SupplierForm supplier={formSupplier} onClose={() => setFormSupplier(undefined)} />
      )}
    </div>
  );
}

function SupplierForm({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
  const [formData, setFormData] = useState({
    ruc: supplier?.ruc || '',
    name: supplier?.name || '',
    contact: supplier?.contact || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    lead: supplier?.lead ? String(supplier.lead) : '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isBusy, setIsBusy] = useState(false);

  const saveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors: Record<string, string> = {};
    if (!/^\d{11}$/.test(formData.ruc)) validationErrors.ruc = 'El RUC debe tener 11 dígitos.';
    if (!formData.name.trim()) validationErrors.name = 'Campo obligatorio.';
    if (formData.phone && !/^\d{9}$/.test(formData.phone)) validationErrors.phone = 'Ingresa 9 dígitos.';
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) validationErrors.email = 'Correo no válido.';
    if (formData.lead && (!Number.isInteger(+formData.lead) || +formData.lead < 0)) {
      validationErrors.lead = 'Ingresa 0 o más días.';
    }
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    setIsBusy(true);
    try {
      await supplierService.save({
        id: supplier?.id || '',
        ruc: formData.ruc.trim(),
        name: formData.name.trim(),
        contact: formData.contact.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        lead: formData.lead ? Number(formData.lead) : 0,
        active: supplier?.active ?? true,
      });
      toast(supplier ? 'Proveedor actualizado' : 'Proveedor creado');
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el proveedor.';
      setErrors({ ruc: message });
    } finally {
      setIsBusy(false);
    }
  };

  const renderField = (fieldKey: keyof typeof formData, labelText: string, inputType = 'text', required = false) => (
    <Field label={labelText + (required ? ' *' : '')} error={errors[fieldKey]}>
      <input
        className={inp}
        type={inputType}
        value={formData[fieldKey]}
        onChange={(e) => setFormData({ ...formData, [fieldKey]: e.target.value })}
      />
    </Field>
  );

  return (
    <Modal wide title={supplier ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={onClose}>
      <form onSubmit={saveSupplier} noValidate className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {renderField('ruc', 'RUC', 'text', true)}
          {renderField('name', 'Razón social', 'text', true)}
          {renderField('contact', 'Contacto')}
          {renderField('phone', 'Teléfono', 'tel')}
          {renderField('email', 'Correo', 'email')}
          {renderField('lead', 'Tiempo de entrega (días)', 'number')}
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Btn type="button" v="s" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={isBusy}>{isBusy ? 'Guardando…' : 'Guardar'}</Btn>
        </div>
      </form>
    </Modal>
  );
}
