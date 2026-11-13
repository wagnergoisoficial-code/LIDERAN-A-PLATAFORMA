import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCommunity } from '../../lib/community';
import { isLeader } from '../../lib/cargos';
import ChurchMembers from '../../components/ChurchMembers';
import PageHeader from '../../components/PageHeader';
import Birthdays from './Birthdays';

const tab = ({ isActive }: { isActive: boolean }) => `tab${isActive ? ' is-active' : ''}`;

/** Secretaria: cadastro dos jovens (identificar os integrantes) e os aniversariantes. */
const Cadastro: React.FC<{ view: 'jovens' | 'aniversarios' }> = ({ view }) => {
  const { user } = useAuth();
  const { community } = useCommunity();
  const leader = isLeader(user);

  return (
    <div>
      <PageHeader title="Cadastro dos jovens" subtitle="Identificar os integrantes: dados, contacto e aniversários." />
      <nav className="tabs" aria-label="Cadastro dos jovens">
        <NavLink to="/painel/membros" end className={tab}>Jovens</NavLink>
        <NavLink to="/painel/membros/aniversarios" className={tab}>Aniversariantes</NavLink>
      </nav>
      {view === 'aniversarios' ? <Birthdays /> : (
        <ChurchMembers churchId={user!.churchId!} churchName={community?.name || ''}
          canChangeRoles={leader && (!!community?.isOwner || user?.role === 'admin')} editOnly={!leader} />
      )}
    </div>
  );
};

export default Cadastro;
