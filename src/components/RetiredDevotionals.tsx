import React, { useEffect, useState } from 'react';
import UIkit from 'uikit';
import { api } from '../services/api';
import { timeAgo } from '../lib/format';
import { announceFeedChange } from '../lib/community';
import MoreMenu from './MoreMenu';

interface Devotional { id: string; title: string; createdAt: string; isActive: boolean; user?: { name: string } }

const notify = (message: string, status: 'success' | 'danger' = 'danger') => UIkit.notification({ message, status, pos: 'top-right' });

// Painel do líder: devocionais que saíram do feed (por terem passado 24 h ou por terem sido retirados)
const RetiredDevotionals: React.FC = () => {
  const [list, setList] = useState<Devotional[]>([]);

  const load = () => api.getDevotionals().then(res => setList((res.data || []).filter((d: Devotional) => !d.isActive))).catch(() => {});
  useEffect(() => { load(); }, []);

  const republish = async (id: string) => {
    try {
      await api.reactivateDevotional(id);
      announceFeedChange('devotional');
      notify('Devocional publicado de novo no feed', 'success');
      load();
    } catch (err: any) {
      notify(err.message || 'Não foi possível publicar');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir este devocional definitivamente?')) return;
    try {
      await api.deleteDevotional(id);
      setList(prev => prev.filter(d => d.id !== id));
      notify('Devocional excluído', 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível excluir');
    }
  };

  if (!list.length) return null;

  return (
    <section aria-labelledby="retired-title">
      <h2 id="retired-title" className="list-label">Devocionais que saíram do feed</h2>
      <div className="card">
        {list.map(d => (
          <div key={d.id} className="list-row">
            <span className="list-row-body">
              <span className="list-row-title"><span>{d.title}</span></span>
              <span className="list-row-meta" style={{ display: 'block' }}>{d.user?.name} · {timeAgo(d.createdAt)}</span>
            </span>
            <span className="list-row-aside">
              <button type="button" className="uk-button uk-button-default uk-button-small" onClick={() => republish(d.id)}>Publicar de novo</button>
              <MoreMenu label={`Opções de ${d.title}`} actions={[{ label: 'Excluir', icon: 'trash', danger: true, onSelect: () => remove(d.id) }]} />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RetiredDevotionals;
