'use client';

import dynamic from 'next/dynamic';

// As páginas (web/src) navegam com o React Router e usam o navegador (UIkit, localStorage):
// correm só no cliente, como antes com o Vite. A rota do Next apenas as entrega.
const Spa = dynamic(() => import('../web/src/Root'), { ssr: false });

export default Spa;
