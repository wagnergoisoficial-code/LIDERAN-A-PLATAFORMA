import React, { useState } from 'react';
import UIkit from 'uikit';
import { api } from '../services/api';
import Icon from './Icon';

export type ReportTarget = 'conversation' | 'community_chat' | 'post' | 'prayer_request' | 'video' | 'profile';

/** Envia a denúncia ao líder da comunidade (com o histórico); devolve false se falhar. */
export const sendReport = async (targetType: ReportTarget, targetId: string) => {
  try {
    await api.createReport({ targetType, targetId });
    UIkit.notification({ message: 'Denúncia enviada ao líder da comunidade', status: 'success', pos: 'top-right' });
    return true;
  } catch (err: any) {
    UIkit.notification({ message: err.message || 'Não foi possível enviar a denúncia', status: 'danger', pos: 'top-right' });
    return false;
  }
};

interface ReportButtonProps {
  targetType: ReportTarget;
  targetId: string;
  // compact: só o ícone (cabeçalhos de conversa); senão, botão com texto
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
    const ok = await sendReport(targetType, targetId);
    setCurrent({ target, state: ok ? 'sent' : 'idle' });
  };

  const label = state === 'sent' ? 'Denúncia enviada' : 'Denunciar';

  if (compact) {
    return (
      <button type="button" className="action-btn" title={label} aria-label={label} onClick={report} disabled={state !== 'idle'}>
        <Icon name={state === 'sent' ? 'check' : 'flag'} />
      </button>
    );
  }

  return (
    <button type="button" className="uk-button uk-button-default" onClick={report} disabled={state !== 'idle'}>
      <Icon name={state === 'sent' ? 'check' : 'flag'} size={18} />
      {label}
    </button>
  );
};

export default ReportButton;
