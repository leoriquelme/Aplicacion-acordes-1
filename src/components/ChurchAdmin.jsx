import { useState } from 'react';
import { ROLES, useStore } from '../lib/store.jsx';
import { forgetChurch, logout, useAuth } from '../lib/cloud.jsx';

export function ChurchCard() {
  const { church, me, role, churchId } = useStore();
  const { user, setChurchId } = useAuth();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(church.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* el navegador no permitió copiar */
    }
  };

  return (
    <section className="card">
      <h2>Iglesia</h2>
      <p className="church-name">⛪ <strong>{church?.name || '…'}</strong></p>
      <p>
        Estás como <strong>{me?.name}</strong> · perfil <span className={`role-pill role-${role}`}>{ROLES[role]?.label}</span>
      </p>
      {church?.code && (
        <div className="code-box">
          <span className="muted small">Código para invitar músicos</span>
          <div className="row gap">
            <code className="church-code">{church.code}</code>
            <button className="btn small" onClick={copy}>{copied ? '✓ Copiado' : 'Copiar'}</button>
          </div>
          <span className="muted small">Quien entre con este código queda como Músico. Después puedes cambiar su perfil.</span>
        </div>
      )}
      <div className="row gap wrap">
        <button className="btn" onClick={() => setChurchId('')}>Cambiar de iglesia</button>
        <button className="btn ghost" onClick={logout}>Cerrar sesión ({user?.email})</button>
        {role !== 'admin' && (
          <button
            className="btn ghost danger"
            onClick={async () => {
              if (!window.confirm(`¿Salir de ${church?.name}? Necesitarás el código para volver a entrar.`)) return;
              await forgetChurch(user.uid, { id: churchId, name: church?.name });
              setChurchId('');
            }}
          >
            Salir de esta iglesia
          </button>
        )}
      </div>
    </section>
  );
}

export function UsersCard() {
  const { members, setMemberRole, removeMember } = useStore();
  const { user } = useAuth();
  const admins = members.filter((m) => m.role === 'admin').length;
  const sorted = [...members].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));

  return (
    <section className="card">
      <h2>Usuarios</h2>
      <p className="muted small">
        <strong>Administrador:</strong> todo. <strong>Director musical:</strong> editar canciones y crear eventos.{' '}
        <strong>Músico:</strong> ver canciones y cambiar su tono personal.
      </p>
      <table className="rank-table users-table">
        <thead>
          <tr><th>Nombre</th><th>Perfil</th><th /></tr>
        </thead>
        <tbody>
          {sorted.map((m) => {
            const isMe = m.uid === user.uid;
            const lastAdmin = m.role === 'admin' && admins === 1;
            return (
              <tr key={m.uid}>
                <td>
                  <strong>{m.name}</strong>{isMe && <span className="muted"> (tú)</span>}
                  {m.email && <div className="muted small">{m.email}</div>}
                </td>
                <td>
                  <select
                    value={m.role}
                    disabled={lastAdmin}
                    title={lastAdmin ? 'Debe quedar al menos un administrador' : ''}
                    onChange={(e) => setMemberRole(m.uid, e.target.value)}
                    aria-label={`Perfil de ${m.name}`}
                  >
                    {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
                  </select>
                </td>
                <td className="num">
                  {!isMe && (
                    <button
                      className="btn small ghost danger"
                      onClick={() => window.confirm(`¿Quitar a ${m.name} de la iglesia?`) && removeMember(m.uid)}
                    >
                      Quitar
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
