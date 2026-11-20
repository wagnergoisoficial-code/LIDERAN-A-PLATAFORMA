import Spa from '../spa';

// Todos os endereços (/, /biblia/JHN/3, /painel/tesouraria…) abrem a mesma app; o React Router escolhe a página
export default function Page() {
  return <Spa />;
}
