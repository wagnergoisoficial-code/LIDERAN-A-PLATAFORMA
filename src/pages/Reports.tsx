import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

interface MemberStat {
  userId: string; name: string;
  posts: number; comments: number; messages: number; total: number; percentage: number;
}
interface ChurchInfo {
  id: string; name: string; title?: string; imageUrl?: string;
  users?: any[]; posts?: any[]; devotionals?: any[];
}

const StatCard = ({ icon, label, value, sub }: { icon: string; label: string; value: string | number; sub?: string }) => (
  <div style={{ border: '1px solid var(--border-strong)', background: 'var(--bg)', padding: '20px 24px', flex: 1, minWidth: '160px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
      <span uk-icon={`icon: ${icon}; ratio: 0.85`} style={{ color: 'var(--accent)' }}></span>
      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>{label}</span>
    </div>
    <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-faint)' }}>{sub}</div>}
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
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [user?.churchId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px' }}>
      <span uk-spinner="ratio: 1.5"></span>
    </div>
  );

  const totalMembers = church?.users?.length ?? stats.length;
  const totalPosts = stats.reduce((s, m) => s + m.posts, 0);
  const totalComments = stats.reduce((s, m) => s + m.comments, 0);
  const activeMembers = stats.filter(m => m.total > 0).length;
  const upcomingEvents = events.filter(e => new Date(e.startDate) >= new Date()).length;
  const answeredPrayers = prayers.filter(p => p.isAnswered).length;
  const totalVotes = polls.reduce((s: number, p: any) => s + (p.totalVotes || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 24px' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span uk-icon="icon: bar-chart; ratio: 1.1" style={{ color: 'var(--accent)' }}></span>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>Relatórios</h1>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Visão geral da comunidade{church ? ` — ${church.name}` : ''}
          </p>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
          <StatCard icon="users" label="Membros" value={totalMembers} sub={`${activeMembers} ativos`} />
          <StatCard icon="pencil" label="Posts" value={totalPosts} sub="total publicados" />
          <StatCard icon="comment" label="Comentários" value={totalComments} sub="total escritos" />
          <StatCard icon="calendar" label="Eventos" value={events.length} sub={`${upcomingEvents} próximos`} />
          <StatCard icon="heart" label="Orações" value={prayers.length} sub={`${answeredPrayers} respondidas`} />
          <StatCard icon="list" label="Enquetes" value={polls.length} sub={`${totalVotes} votos`} />
        </div>

        {/* Member ranking */}
        {stats.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span uk-icon="icon: star; ratio: 0.85" style={{ color: 'var(--warning)' }}></span>
              Ranking de Engajamento
            </div>
            <div style={{ border: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px 80px 80px', padding: '8px 16px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
                {['#', 'Membro', 'Posts', 'Coment.', 'Score'].map(h => (
                  <span key={h} style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-faint)', textAlign: h === '#' ? 'center' : 'left' }}>{h}</span>
                ))}
              </div>
              {stats.map((m, i) => (
                <div key={m.userId} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px 80px 80px', padding: '10px 16px', borderBottom: i < stats.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: i === 0 ? 'var(--warning)' : i === 1 ? 'var(--text-muted)' : 'var(--text-faint)', textAlign: 'center' }}>{i + 1}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Avatar name={m.name || '?'} size="small" />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{m.name}</span>
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{m.posts}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{m.comments}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>{m.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Poll results */}
        {polls.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span uk-icon="icon: list; ratio: 0.85" style={{ color: 'var(--accent)' }}></span>
              Resultados das Enquetes
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {polls.map((poll: any) => (
                <div key={poll.id} style={{ border: '1px solid var(--border)', padding: '16px' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)', marginBottom: '12px' }}>{poll.question}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {poll.options?.map((opt: any) => (
                      <div key={opt.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{opt.text}</span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-faint)' }}>{opt.votes} votos ({opt.percentage}%)</span>
                        </div>
                        <div style={{ height: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                          <div style={{ height: '100%', width: `${opt.percentage}%`, background: 'var(--accent)', transition: 'width 400ms ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-faint)' }}>{poll.totalVotes} votos totais</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prayer requests summary */}
        {prayers.length > 0 && (
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span uk-icon="icon: heart; ratio: 0.85" style={{ color: 'var(--accent)' }}></span>
              Pedidos de Oração
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ border: '1px solid var(--border)', padding: '16px 24px', flex: 1, minWidth: '140px' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)' }}>{prayers.length}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Total de pedidos</div>
              </div>
              <div style={{ border: '1px solid var(--border)', padding: '16px 24px', flex: 1, minWidth: '140px' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--success)' }}>{answeredPrayers}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Orações respondidas</div>
              </div>
              <div style={{ border: '1px solid var(--border)', padding: '16px 24px', flex: 1, minWidth: '140px' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)' }}>{prayers.filter((p: any) => !p.isAnswered).length}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Aguardando oração</div>
              </div>
            </div>
          </div>
        )}

        {!user?.churchId && (
          <div style={{ textAlign: 'center', padding: '80px 20px', border: '1px dashed var(--border)', color: 'var(--text-faint)' }}>
            <span uk-icon="icon: bar-chart; ratio: 2" style={{ display: 'block', marginBottom: '12px' }}></span>
            <p style={{ margin: 0, fontSize: '14px' }}>Nenhuma comunidade vinculada</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
