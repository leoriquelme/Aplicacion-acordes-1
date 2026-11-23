import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import ConfirmX from './ConfirmX.jsx';
import { Avatar } from './Avatares.jsx';

function shortDate(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Nombre con su foto; el Administrador puede quitar la foto de otra persona. */
function Nombre({ p, isMe }) {
  const { removePhoto } = useStore();
  return (
    <td>
      <span className="row gap nombre-celda">
        <Avatar name={p.name} personKey={p.key} size="sm" photo={p.photo || ''} />
        <span><strong>{p.name}</strong>{isMe && <span className="muted"> (tú)</span>}</span>
      </span>
      {p.photo && !isMe && removePhoto && (
        <ConfirmX label={`Quitar la foto de ${p.name}`} className="btn small ghost danger" text="Quitar foto" armedText="¿Quitar foto?" onConfirm={() => removePhoto(p.key)} />
      )}
    </td>
  );
}

function PersonRow({ p, isMe, onSave, onRemove }) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  if (p.role === 'admin') {
    return (
      <tr>
        <Nombre p={p} isMe={isMe} />
        <td><span className="role-pill role-admin">Administrador</span></td>
        <td className="muted small">{shortDate(p.lastSeen)}</td>
        <td />
      </tr>
    );
  }

  return (
    <tr>
      <Nombre p={p} isMe={isMe} />
      <td>
        <select
          value={p.role || 'colaborador'}
          disabled={saving}
          aria-label={`Perfil de ${p.name}`}
          onChange={async (e) => {
            setSaving(true);
            setMsg('');
            try {
              await onSave(p.key, e.target.value);
              setMsg('✓ Guardado');
            } catch (er) {
              setMsg(`No se pudo: ${er.message}`);
            } finally {
              setSaving(false);
            }
          }}
        >
          <option value="colaborador">Colaborador</option>
          <option value="director">Director musical</option>
        </select>
        {msg && <div className="small">{msg}</div>}
      </td>
      <td className="muted small">{shortDate(p.lastSeen)}</td>
      <td className="num">
        {!isMe && (
          <ConfirmX label={`Sacar a ${p.name} de la iglesia`} className="btn small ghost danger" text="Quitar" armedText="¿Quitar?" onConfirm={() => onRemove(p.key)} />
        )}
      </td>
    </tr>
  );
}

export function UsersCard() {
  const { people, me, setPersonRole, removePerson } = useStore();
  const sorted = [...people].sort((a, b) => (b.role === 'admin') - (a.role === 'admin') || (a.name || '').localeCompare(b.name || '', 'es'));

  return (
    <section className="card">
      <h2>Miembros</h2>
      <div className="table-scroll">
        <table className="rank-table users-table">
          <thead>
            <tr><th>Nombre</th><th>Perfil</th><th>Última vez</th><th /></tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <PersonRow key={p.key} p={p} isMe={p.key === me?.key} onSave={setPersonRole} onRemove={removePerson} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
