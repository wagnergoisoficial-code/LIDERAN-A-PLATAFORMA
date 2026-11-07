import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useCountUp } from '../lib/motion';
import { plural } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { LeaderTabs } from '../components/SectionTabs';

interface MemberStat {
  userId: string; name: string; profileImage?: string;
  posts: number; comments: number; messages: number; total: number; percentage: number;
}
interface ChurchInfo { id: string; name: string; users?: any[] }

// Os números contam até ao valor ao abrir a página
const CountUp = ({ value }: { value: number }) => <>{useCountUp(value)}</>;

const Stat = ({ label, value, sub }: { label: string; value: number; sub?: string }) => (
  <div className="stat">
    <div className="stat-label">{label}</div>
    <div className="stat-value"><CountUp value={value} /></div>
    {sub && <div className="stat-sub">{sub}</div>}
  </div>
);

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<MemberStat[]>([]);
  const [church, setChurch] = useState<ChurchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [prayers, setPrayers] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!user?.churchId) { setLoading(false); return; }
    try {
      const [statsRes, churchRes, eventsRes, prayersRes, pollsRes] = await Promise.all([
        api.getChurchMemberStats(user.churchId),
        api.getChurch(user.churchId),
        api.getEvents(),
        api.getPrayerRequests(),
        api.getPolls(),
      ]);
      if (statsRes.success) setStats(statsRes.data || []);
      if (churchRes.success) setChurch(churchRes.data);
      if (eventsRes.success) setEvents(eventsRes.data || []);
      if (prayersRes.success) setPrayers(prayersRes.data || []);
      if (pollsRes.success) setPolls(pollsRes.data || []);
    } catch { /* os números ficam a zero */ }
    finally { setLoading(false); }
  }, [user?.churchId]);

  useEffect(() => { load(); }, [load]);

  if (!user?.churchId) {
    return (
      <div className="page is-medium">
        <LeaderTabs />
        <div className="card"><EmptyState icon="reports" title="Nenhuma comunidade ativa" text="Os relatórios mostram a comunidade ativa. Escolha-a no Painel do líder." /></div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading-block" role="status" aria-label="Carregando relatórios"><span uk-spinner="ratio: 1.2"></span></div>;
  }

  const totalMembers = church?.users?.length ?? stats.length;
  const totalPosts = stats.reduce((s, m) => s + m.posts, 0);
  const totalComments = stats.reduce((s, m) => s + m.comments, 0);
  const activeMembers = stats.filter(m => m.total > 0).length;
  const upcomingEvents = events.filter(e => new Date(e.startDate) >= new Date()).length;
  const answeredPrayers = prayers.filter(p => p.isAnswered).length;
  const totalVotes = polls.reduce((s: number, p: any) => s + (p.totalVotes || 0), 0);

  return (
    <div>
      <LeaderTabs />
      <PageHeader title="Relatórios" subtitle={`Participação na comunidade${church ? ` ${church.name}` : ''}, desde o início.`} />

      <section className="card" aria-label="Resumo">
        <div className="stat-grid">
          <Stat label="Membros" value={totalMembers} sub={`${activeMembers} já participaram`} />
          <Stat label="Publicações" value={totalPosts} />
          <Stat label="Comentários" value={totalComments} />
          <Stat label="Encontros" value={events.length} sub={`${upcomingEvents} próximos`} />
          <Stat label="Pedidos de oração" value={prayers.length} sub={plural(answeredPrayers, 'respondido', 'respondidos')} />
          <Stat label="Enquetes" value={polls.length} sub={plural(totalVotes, 'voto', 'votos')} />
        </div>
      </section>

      {stats.length > 0 && (
        <section className="section" aria-labelledby="ranking-title">
          <h2 id="ranking-title" className="list-label">Participação por membro</h2>
          <div className="card table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '48px' }}>#</th>
                  <th scope="col">Membro</th>
                  <th scope="col">Publicações</th>
                  <th scope="col">Comentários</th>
                  <th scope="col">Mensagens</th>
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((m, i) => (
                  <tr key={m.userId}>
                    <td className="muted">{i + 1}</td>
                    <td>
                      <Link to={`/profile/${m.userId}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text)', fontWeight: 600 }}>
                        <Avatar name={m.name || '?'} profileImage={m.profileImage} size={32} />
                        <span className="truncate">{m.name}</span>
                      </Link>
                    </td>
                    <td>{m.posts}</td>
                    <td>{m.comments}</td>
                    <td>{m.messages}</td>
                    <td style={{ fontWeight: 600 }}>{m.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {polls.length > 0 && (
        <section className="section" aria-labelledby="polls-title">
          <h2 id="polls-title" className="list-label">Resultados das enquetes</h2>
          <div className="card">
            {polls.map((poll: any) => (
              <div key={poll.id} style={{ padding: '16px', borderTop: '1px solid var(--border)' }} className="poll-result">
                <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>{poll.question}</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {poll.options?.map((opt: any) => (
                    <div key={opt.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '4px', fontSize: '14px' }}>
                        <span>{opt.text}</span>
                        <span className="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{plural(opt.votes, 'voto', 'votos')} · {opt.percentage}%</span>
                      </div>
                      <div className="meter" role="img" aria-label={`${opt.percentage}%`}>
                        <div className="meter-fill" style={{ transform: `scaleX(${opt.percentage / 100})` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="form-hint">{plural(poll.totalVotes, 'voto', 'votos')} no total</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Reports;
