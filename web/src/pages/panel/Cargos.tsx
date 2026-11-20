import { useEffect, useState } from 'react';
import UIkit from 'uikit';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { CARGOS } from '../../lib/cargos';
import Avatar from '../../components/Avatar';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';

const notify = (message: string, status: 'success' | 'danger' = 'danger') => UIkit.notification({ message, status, pos: 'top-right' });

/** Liderança: quem é secretário(a), tesoureiro(a) ou regente. Cada cargo abre o painel da sua área. */
const Cargos = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<any[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    api.getChurchMembers(user!.churchId!)
      .then(res => setMembers(res.data || []))
      .catch(() => { setMembers([]); notify('Não foi possível carregar os membros'); });
  }, [user]);

  const change = async (member: any, cargo: string) => {
    setSaving(member.id);
    try {
      const res = await api.setCargo(member.id, cargo || null);
      setMembers(list => (list || []).map(m => (m.id === member.id ? { ...m, cargo: res.data.cargo } : m)));
      notify(res.message, 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível mudar o cargo');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div>
      <PageHeader title="Cargos" subtitle="Quem tem cargo encontra o painel da sua área no menu da conta. Os líderes entram em todos." />
      {members === null ? (
        <div className="card loading-block"><span uk-spinner="ratio: 0.8"></span></div>
      ) : members.length === 0 ? (
        <div className="card"><EmptyState icon="users" title="Ainda não há membros" /></div>
      ) : (
        <div className="card table-scroll">
          <table className="data-table">
            <thead>
              <tr><th scope="col">Membro</th><th scope="col">Cargo</th></tr>
            </thead>
            <tbody>
              {members.map(m => {
                const leader = m.role === 'leader' || m.role === 'admin';
                const eligible = !m.isMinor && (m.status || 'active') === 'active';
                return (
                  <tr key={m.id}>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, minWidth: '180px' }}>
                        <Avatar name={m.name} profileImage={m.profileImage} size={32} /> {m.name}
                      </span>
                    </td>
                    <td style={{ width: '280px' }}>
                      {leader ? (
                        <span className="muted">Líder · todos os painéis</span>
                      ) : (
                        <>
                          <select className="form-input" aria-label={`Cargo de ${m.name}`} value={m.cargo || ''}
                            disabled={saving === m.id || (!eligible && !m.cargo)} onChange={e => change(m, e.target.value)}>
                            <option value="">Sem cargo</option>
                            {CARGOS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                          {!eligible && <span className="form-hint" style={{ display: 'block' }}>Só adultos com a conta ativa.</span>}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Cargos;
