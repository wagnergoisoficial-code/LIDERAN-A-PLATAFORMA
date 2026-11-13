import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAY = 24 * 60 * 60 * 1000;
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

// Próximo aniversário a partir de hoje (29/02 conta como 28/02 nos anos comuns, como no aviso do feed)
const nextBirthday = (birthDate: string, today: Date) => {
  const birth = new Date(birthDate);
  const at = (year: number) => new Date(year, birth.getUTCMonth(),
    birth.getUTCMonth() === 1 && birth.getUTCDate() === 29 && !isLeap(year) ? 28 : birth.getUTCDate());
  const thisYear = at(today.getFullYear());
  return thisYear >= today ? thisYear : at(today.getFullYear() + 1);
};

/** Cadastro → Aniversariantes: por mês, a começar pelo atual, e quem ainda não tem data. */
const Birthdays = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<any[] | null>(null);

  useEffect(() => {
    api.getChurchMembers(user!.churchId!).then(res => setMembers(res.data || [])).catch(() => setMembers([]));
  }, [user]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const people = (members || []).filter(m => m.birthDate && (m.status || 'active') === 'active').map(m => {
    const next = nextBirthday(m.birthDate, today);
    return { ...m, next, days: Math.round((next.getTime() - today.getTime()) / DAY), turns: next.getFullYear() - new Date(m.birthDate).getUTCFullYear() };
  }).sort((a, b) => a.next.getTime() - b.next.getTime());
  const missing = (members || []).filter(m => !m.birthDate);
  const months = [...new Set(people.map(p => `${p.next.getFullYear()}-${p.next.getMonth()}`))];

  return (
    <div>
      <p className="form-hint" style={{ margin: '0 0 16px' }}>Na véspera de cada aniversário, o feed publica um aviso para a comunidade dar os parabéns.</p>
      {members === null ? (
        <div className="card loading-block"><span uk-spinner="ratio: 0.8"></span></div>
      ) : people.length === 0 ? (
        <div className="card"><EmptyState icon="cake" title="Ainda não há datas de nascimento" text="Complete os dados em Membros → Gerir → Editar dados." /></div>
      ) : months.map(key => {
        const group = people.filter(p => `${p.next.getFullYear()}-${p.next.getMonth()}` === key);
        return (
          <section key={key} className="section" aria-labelledby={`mes-${key}`}>
            <h2 id={`mes-${key}`} className="list-label">{MONTHS[group[0].next.getMonth()]} · {group.length}</h2>
            <div className="card">
              {group.map(p => (
                <Link key={p.id} to={`/profile/${p.id}`} className="list-row">
                  <Avatar name={p.name} profileImage={p.profileImage} size={36} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="list-row-title"><span className="truncate">{p.name}</span></span>
                    <span className="list-row-meta">Dia {p.next.getDate()} · faz {p.turns} anos</span>
                  </span>
                  {p.days <= 1 && <span className="tag">{p.days === 0 ? 'Hoje' : 'Amanhã'}</span>}
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {missing.length > 0 && (
        <section className="section" aria-labelledby="sem-data">
          <h2 id="sem-data" className="list-label">Sem data de nascimento · {missing.length}</h2>
          <p className="form-hint" style={{ marginTop: 0 }}>Cada pessoa pode indicar a data no feed, ou a secretaria completa em Membros → Gerir → Editar dados.</p>
          <div className="card">
            {missing.map(m => (
              <Link key={m.id} to={`/profile/${m.id}`} className="list-row">
                <Avatar name={m.name} profileImage={m.profileImage} size={36} />
                <span className="list-row-title"><span className="truncate">{m.name}</span></span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Birthdays;
