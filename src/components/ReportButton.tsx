import React, { useState } from 'react';
import UIkit from 'uikit';
import { api } from '../services/api';

type TargetType = 'conversation' | 'community_chat' | 'post' | 'prayer_request' | 'profile';

interface ReportButtonProps {
  targetType: TargetType;
  targetId: string;
  // compact: só o ícone (cartões e cabeçalhos de conversa); senão, botão com texto
  compact?: boolean;
}

// Denúncia com um toque: vai direto para o líder da comunidade, com o histórico
const ReportButton: React.FC<ReportButtonProps> = ({ targetType, targetId, compact }) => {
  // O estado pertence ao alvo: ao trocar de conversa, o mesmo botão volta a "Denunciar"
  const target = `${targetType}:${targetId}`;
  const [current, setCurrent] = useState<{ target: string; state: 'idle' | 'sending' | 'sent' }>({ target, state: 'idle' });
  const state = current.target === target ? current.state : 'idle';

  const report = async () => {
    if (state !== 'idle') return;
    setCurrent({ target, state: 'sending' });
    try {
      await api.createReport({ targetType, targetId });
      setCurrent({ target, state: 'sent' });
      UIkit.notification({ message: 'Denúncia enviada ao líder da comunidade', status: 'success', pos: 'top-right' });
    } catch (err: any) {
      setCurrent({ target, state: 'idle' });
      UIkit.notification({ message: err.message || 'Não foi possível enviar a denúncia', status: 'danger', pos: 'top-right' });
    }
  };

  const title = state === 'sent' ? 'Denúncia enviada' : 'Denunciar';

  if (compact) {
    return (
      <button type="button" className="action-btn" title={title} aria-label={title} onClick={report} disabled={state !== 'idle'}>
        <span uk-icon={`icon: ${state === 'sent' ? 'check' : 'warning'}; ratio: 0.8`}></span>
      </button>
    );
  }

  return (
    <button type="button" className="uk-button uk-button-default" onClick={report} disabled={state !== 'idle'}>
      <span uk-icon={`icon: ${state === 'sent' ? 'check' : 'warning'}; ratio: 0.8`}></span>
      {state === 'sent' ? 'Denúncia enviada' : 'Denunciar'}
    </button>
  );
};

export default ReportButton;
