import { useState } from 'react';
import { useStore } from '../lib/store.jsx';

function shortDate(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

function PersonRow({ p, isMe, onSave, onRemove }) {
  const [role, setRole] = useState(p.role);
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const changed = role !== p.role || (role === 'director' && pin);

  if (p.role === 'admin') {
    return (
      <tr>
        <td><strong>{p.name}</strong>{isMe && <span className="muted"> (tú)</span>}</td>
        <td><span className="role-pill role-admin">Administrador</span></td>
        <td className="muted small">{shortDate(p.lastSeen)}</td>
        <td />
      </tr>
    );
  }

  return (
    <tr>
      <td><strong>{p.name}</strong>{isMe && <span className="muted"> (tú)</span>}</td>
      <td>
        <div className="row gap wrap">
          <select value={role} onChange={(e) => { setRole(e.target.value); setMsg(''); }} aria-label={`Perfil de ${p.name}`}>
            <option value="colaborador">Colaborador</option>
            <option value="director">Director musical</option>
          </select>
          {role === 'director' && (
            <input
              className="pin-input"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              placeholder={p.role === 'director' ? 'Nuevo PIN' : 'PIN (8+ números)'}
              aria-label={`PIN de ${p.name}`}
            />
          )}
          {changed && (
            <button
              className="btn primary small"
              disabled={saving || (role === 'director' && pin.length < 8 && (p.role !== 'director' || pin.length > 0))}
              onClick={async () => {
                setSaving(true);
                try {
                  await onSave(p.key, role, role === 'director' ? pin || null : null);
                  setPin('');
                  setMsg('✓ Guardado');
                } catch (e) {
                  setMsg(e.message);
                } finally {
                  setSaving(false);
                }
              }}
            >
              Guardar
            </button>
          )}
        </div>
        {msg && <div className="small">{msg}</div>}
      </td>
      <td className="muted small">{shortDate(p.lastSeen)}</td>
      <td className="num">
        {!isMe && (
          <button className="btn small ghost danger" onClick={() => window.confirm(`¿Quitar a ${p.name} de la lista?`) && onRemove(p.key)}>
            Quitar
          </button>
        )}
      </td>
    </tr>
  );
}

export function UsersCard() {
  const { people, me, setPersonRole, removePerson } = useStore();
  const sorted = [...people].sort((a, b) => (b.role === 'admin') - (a.role === 'admin') || (a.name || '').localeCompare(b.name || '', 'es'));

  const save = async (key, role, pin) => {
    // Si ya es director y no se escribe PIN nuevo, se mantiene el anterior.
    if (role === 'director' && !pin) {
      const p = people.find((x) => x.key === key);
      if (p?.role === 'director') return;
      throw new Error('Escribe un PIN de al menos 8 números.');
    }
    if (role === 'director' && String(pin).length < 8) throw new Error('El PIN debe tener al menos 8 números.');
    await setPersonRole(key, role, pin);
  };

  return (
    <section className="card">
      <h2>Usuarios</h2>
      <p className="muted small">
        Aquí aparecen todos los que alguna vez entraron a la iglesia. <strong>Director musical:</strong> edita canciones
        y crea eventos, y entra con el PIN que le asignes. <strong>Colaborador:</strong> ve canciones y cambia su tono personal.
      </p>
      <div className="table-scroll">
        <table className="rank-table users-table">
          <thead>
            <tr><th>Nombre</th><th>Perfil</th><th>Última vez</th><th /></tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <PersonRow key={p.key} p={p} isMe={p.key === me?.key} onSave={save} onRemove={removePerson} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

