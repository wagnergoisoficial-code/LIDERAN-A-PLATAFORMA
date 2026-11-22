import React, { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Icon, { IconName } from '../../components/Icon';
import Avatar from '../../components/Avatar';
import PageHeader from '../../components/PageHeader';
import VerificationsPanel from '../../components/VerificationsPanel';
import { plural, roleLabel } from '../../lib/format';
import { useCountUp } from '../../lib/motion';

interface Person {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  profileImage?: string | null;
  createdAt: string;
  leaderVerifiedAt?: string | null;
  church?: { name: string } | null;
}

interface Overview {
  counts: Record<'people' | 'peopleWeek' | 'leaders' | 'verifiedLeaders' | 'members' | 'churches' | 'posts' | 'postsWeek' | 'prayers' | 'events' | 'pendingVerifications' | 'openReports', number>;
  pending: { id: string; churchName: string; position: string; city: string; country: string; submittedAt: string; user: { name: string; email: string } }[];
  recent: Person[];
}

interface Community {
  id: string;
  name: string;
  createdAt: string;
  members: number;
  posts: number;
  leader: { name: string; email: string } | null;
}

const LINKS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/admin', label: 'Visão geral', icon: 'dashboard', end: true },
  { to: '/admin/lideres', label: 'Líderes', icon: 'shield' },
  { to: '/admin/comunidades', label: 'Comunidades', icon: 'world' },
  { to: '/admin/pessoas', label: 'Pessoas', icon: 'users' },
];

const STATUS: Record<string, string> = { active: 'Ativa', suspended: 'Suspensa', blocked: 'Bloqueada' };

// Só a data (sem as horas): "22 de novembro de 2026"
const day = (value: string | Date) => new Date(value).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

const CountUp = ({ value }: { value: number }) => <>{useCountUp(value)}</>;

const Stat = ({ label, value, sub }: { label: string; value: number; sub?: string }) => (
  <div className="stat">
    <div className="stat-label">{label}</div>
    <div className="stat-value"><CountUp value={value} /></div>
    {sub && <div className="stat-sub">{sub}</div>}
  </div>
);

const Loading = () => <div className="loading-block" role="status" aria-label="Carregando"><span uk-spinner="ratio: 1"></span></div>;

// Papel com o selo de verificação dos líderes
const RoleTag = ({ person }: { person: Person }) => (
  <span className="tag">
    {roleLabel(person.role)}
    {person.role === 'leader' && (person.leaderVerifiedAt ? ' · verificado' : ' · por verificar')}
  </span>
);

const PersonCell = ({ person }: { person: Person }) => (
  <span className="admin-person">
    <Avatar name={person.name} profileImage={person.profileImage} size={32} />
    <span className="admin-person-text">
      <span className="admin-person-name truncate">{person.name}</span>
      <span className="admin-person-email truncate">{person.email}</span>
    </span>
  </span>
);

const PeopleTable = ({ people }: { people: Person[] }) => (
  <div className="card table-scroll">
    <table className="data-table">
      <thead>
        <tr>
          <th scope="col">Pessoa</th>
          <th scope="col">Papel</th>
          <th scope="col">Comunidade</th>
          <th scope="col">Conta</th>
          <th scope="col">Desde</th>
        </tr>
      </thead>
      <tbody>
        {people.map((p) => (
          <tr key={p.id}>
            <td><PersonCell person={p} /></td>
            <td><RoleTag person={p} /></td>
            <td className={p.church ? undefined : 'muted'}>{p.church?.name || 'Sem comunidade'}</td>
            <td className={p.status === 'active' ? undefined : 'text-danger'}>{STATUS[p.status] || p.status}</td>
            <td className="muted">{day(p.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/** Consola do administrador: cabeçalho próprio e navegação à esquerda, fora da app dos membros. */
export const AdminLayout = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) return <Navigate to="/admin/entrar" replace />;
  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  const leave = () => {
    logout();
    navigate('/admin/entrar', { replace: true });
  };

  return (
    <div className="app is-wide">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/admin" className="brand" aria-label="Fourux, administração">fourux</Link>
          <span className="admin-badge">Administração</span>
          <div className="admin-header-actions">
            <Link to="/" className="uk-button uk-button-default uk-button-small">Ver a app</Link>
            <button type="button" className="uk-button uk-button-default uk-button-small" onClick={leave}>Sair</button>
          </div>
        </div>
      </header>
      <main id="conteudo" className="app-main" tabIndex={-1}>
        <div className="panel">
          <nav className="panel-nav" aria-label="Administração">
            <div className="panel-nav-group">
              <p className="panel-nav-title">Plataforma</p>
              {LINKS.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => `panel-nav-link${isActive ? ' is-active' : ''}`}>
                  <Icon name={link.icon} size={18} /> {link.label}
                </NavLink>
              ))}
            </div>
          </nav>
          <div className="panel-main"><Outlet /></div>
        </div>
      </main>
    </div>
  );
};

export const AdminOverview = () => {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getAdminOverview().then((res) => setData(res.data)).catch((err) => setError(err.message || 'Não foi possível carregar'));
  }, []);

  if (error) return <p className="list-empty">{error}</p>;
  if (!data) return <Loading />;
  const c = data.counts;

  return (
    <div>
      <PageHeader title="Visão geral" subtitle={`A Fourux hoje, ${day(new Date())}.`} />

      {c.pendingVerifications > 0 && (
        <div className="card admin-alert" role="status">
          <p>
            <strong>{plural(c.pendingVerifications, 'líder espera', 'líderes esperam')}</strong> a sua aprovação para abrir a comunidade.
          </p>
          <Link to="/admin/lideres" className="uk-button uk-button-primary">Analisar pedidos</Link>
        </div>
      )}

      <section className="card" aria-label="Números da plataforma">
        <div className="stat-grid">
          <Stat label="Pessoas" value={c.people} sub={`+${c.peopleWeek} nesta semana`} />
          <Stat label="Líderes" value={c.leaders} sub={plural(c.verifiedLeaders, 'verificado', 'verificados')} />
          <Stat label="Comunidades" value={c.churches} sub={plural(c.members, 'membro', 'membros')} />
          <Stat label="Publicações" value={c.posts} sub={`+${c.postsWeek} nesta semana`} />
          <Stat label="Pedidos de oração" value={c.prayers} sub={plural(c.events, 'encontro marcado', 'encontros marcados')} />
          <Stat label="Denúncias abertas" value={c.openReports} />
        </div>
      </section>

      <section className="section" aria-labelledby="admin-pending">
        <div className="section-head">
          <h2 id="admin-pending" className="list-label">Líderes à espera de aprovação</h2>
          <Link to="/admin/lideres" className="section-link">Ver todos</Link>
        </div>
        <div className="card">
          {data.pending.length === 0 ? (
            <p className="list-empty">Nenhum pedido à espera.</p>
          ) : (
            <ul className="admin-list">
              {data.pending.map((v) => (
                <li key={v.id}>
                  <span className="admin-person-text">
                    <span className="admin-person-name">{v.user.name} · {v.churchName}</span>
                    <span className="admin-person-email">{v.position} · {v.city}, {v.country} · enviado em {day(v.submittedAt)}</span>
                  </span>
                  <Link to="/admin/lideres" className="uk-button uk-button-default uk-button-small">Analisar</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="section" aria-labelledby="admin-recent">
        <div className="section-head">
          <h2 id="admin-recent" className="list-label">Cadastros recentes</h2>
          <Link to="/admin/pessoas" className="section-link">Ver todas as pessoas</Link>
        </div>
        {data.recent.length ? <PeopleTable people={data.recent} /> : <div className="card"><p className="list-empty">Ainda não há cadastros.</p></div>}
      </section>
    </div>
  );
};

export const AdminLeaders = () => (
  <div>
    <PageHeader title="Líderes" subtitle="Confira os dados da igreja e os documentos antes de aprovar. Só líderes aprovados abrem comunidade." />
    <VerificationsPanel />
  </div>
);

export const AdminChurches = () => {
  const [list, setList] = useState<Community[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getAdminChurches().then((res) => setList(res.data)).catch((err) => setError(err.message || 'Não foi possível carregar'));
  }, []);

  if (error) return <p className="list-empty">{error}</p>;
  if (!list) return <Loading />;

  return (
    <div>
      <PageHeader title="Comunidades" subtitle={`${plural(list.length, 'comunidade', 'comunidades')} na Fourux.`} />
      {list.length === 0 ? (
        <div className="card"><p className="list-empty">Ainda não há comunidades. Aparecem aqui quando um líder aprovado cria a sua.</p></div>
      ) : (
        <div className="card table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Comunidade</th>
                <th scope="col">Líder</th>
                <th scope="col">Membros</th>
                <th scope="col">Publicações</th>
                <th scope="col">Criada em</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>
                    {c.leader ? (
                      <span className="admin-person-text">
                        <span className="admin-person-name">{c.leader.name}</span>
                        <span className="admin-person-email">{c.leader.email}</span>
                      </span>
                    ) : <span className="muted">Sem líder</span>}
                  </td>
                  <td>{c.members}</td>
                  <td>{c.posts}</td>
                  <td className="muted">{day(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const AdminPeople = () => {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ users: Person[]; total: number; pageSize: number } | null>(null);
  const [error, setError] = useState('');

  // Busca enquanto escreve, com uma pequena pausa
  useEffect(() => {
    const timer = window.setTimeout(() => {
      api.getAdminUsers(query.trim(), page)
        .then((res) => { setResult(res.data); setError(''); })
        .catch((err) => setError(err.message || 'Não foi possível carregar'));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, page]);

  const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <div>
      <PageHeader title="Pessoas" subtitle={!result ? 'Todas as contas da plataforma.' : query.trim() ? `${plural(result.total, 'pessoa encontrada', 'pessoas encontradas')}.` : `${plural(result.total, 'pessoa', 'pessoas')} na Fourux.`} />
      <div className="admin-search">
        <label className="visually-hidden" htmlFor="admin-search">Buscar por nome ou e-mail</label>
        <input id="admin-search" className="uk-input" type="search" placeholder="Buscar por nome ou e-mail"
          value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
      </div>
      {error ? <p className="list-empty">{error}</p>
        : !result ? <Loading />
        : result.users.length === 0 ? <div className="card"><p className="list-empty">Ninguém encontrado.</p></div>
        : <PeopleTable people={result.users} />}
      {result && pages > 1 && (
        <div className="admin-pager">
          <button type="button" className="uk-button uk-button-default uk-button-small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
          <span className="muted">Página {page} de {pages}</span>
          <button type="button" className="uk-button uk-button-default uk-button-small" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Próxima</button>
        </div>
      )}
    </div>
  );
};
