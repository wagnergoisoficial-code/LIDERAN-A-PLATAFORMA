import { useNavigate } from 'react-router-dom';
import { Composer } from '../components/Composer';
import PageHeader from '../components/PageHeader';

// Página de publicar (ligações diretas); o resto da app abre o mesmo formulário num diálogo
const Posts = () => {
  const navigate = useNavigate();
  return (
    <div className="page is-narrow">
      <PageHeader title="Publicar" subtitle="Compartilhe uma foto, um vídeo, um pedido de oração ou uma doação." />
      <div className="card" style={{ padding: '20px' }}>
        <Composer onPublished={() => navigate('/')} />
      </div>
    </div>
  );
};

export default Posts;
