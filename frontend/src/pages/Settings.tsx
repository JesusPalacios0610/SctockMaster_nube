import { useState } from 'react';
import { CheckCircle2, CircleAlert, RefreshCw } from 'lucide-react';
import { API_BASE_URL, get, getAuthenticatedUser } from '../services/api';
import { PageProps } from '../types';
import { Btn, Panel } from '../components/ui';

export default function Settings(_: PageProps) {
  const user = getAuthenticatedUser();
  const [checking, setChecking] = useState(false);
  const [connection, setConnection] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  const [message, setMessage] = useState('');

  const checkConnection = async () => {
    setChecking(true);
    setMessage('');
    try {
      await get('/productos');
      setConnection('connected');
      setMessage('El backend respondió correctamente.');
    } catch (error) {
      setConnection('failed');
      setMessage(error instanceof Error ? error.message : 'No se pudo conectar con la API.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-4">
      <Panel title="Conexión con el sistema">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">API configurada</dt>
            <dd className="mt-1 break-all font-medium text-slate-800">{API_BASE_URL}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Sesión activa</dt>
            <dd className="mt-1 font-medium text-slate-800">{user?.nombre} · {user?.rol}</dd>
          </div>
        </dl>
        <div className="mt-5 border-t border-slate-100 pt-4">
          <Btn v="s" onClick={() => void checkConnection()} disabled={checking}>
            <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Comprobando…' : 'Comprobar conexión'}
          </Btn>
          {message && (
            <p role="status" className={`mt-3 flex items-center gap-2 text-sm ${connection === 'failed' ? 'text-red-700' : 'text-emerald-700'}`}>
              {connection === 'failed' ? <CircleAlert size={16} /> : <CheckCircle2 size={16} />}
              {message}
            </p>
          )}
        </div>
      </Panel>

      <Panel title="Configuración local">
        <p className="text-sm leading-6 text-slate-600">
          La dirección de la API se configura en <code>frontend/.env.local</code>. Después de cambiar ese archivo, reinicia Vite.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{`VITE_API_BASE_URL=${API_BASE_URL}`}</pre>
      </Panel>
    </div>
  );
}
