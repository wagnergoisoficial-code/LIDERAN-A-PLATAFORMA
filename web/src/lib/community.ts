import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export interface Community {
  id: string;
  name: string;
  title?: string | null;
  description?: string | null;
  cultosDias?: string[];
  memberCount?: number;
  isOwner?: boolean;
}

// A comunidade ativa muda pouco: guarda-se a última para as páginas abrirem sem esperar
let cached: Community | null = null;

/** Dados da comunidade ativa da pessoa (nome, igreja, dias de culto, número de membros). */
export const useCommunity = () => {
  const { user } = useAuth();
  const churchId = user?.churchId || null;
  const [community, setCommunity] = useState<Community | null>(cached?.id === churchId ? cached : null);
  const [loading, setLoading] = useState(!!churchId && cached?.id !== churchId);

  useEffect(() => {
    if (!churchId) {
      setCommunity(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    api.getChurch(churchId)
      .then(res => {
        if (cancelled) return;
        const { id, name, title, description, cultosDias, memberCount, isOwner } = res.data;
        cached = { id, name, title, description, cultosDias, memberCount, isOwner };
        setCommunity(cached);
      })
      .catch(() => { /* fica o que havia */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [churchId]);

  return { community, loading };
};

// Aviso do diálogo de publicar (ou da agenda) para o feed: o que mudou e, se houver, o item novo
export type FeedKind = 'post' | 'video' | 'prayer' | 'devotional' | 'event' | 'poll';
export const FEED_CHANGED_EVENT = 'lidera:feed-changed';
export const announceFeedChange = (kind: FeedKind, item?: unknown) =>
  window.dispatchEvent(new CustomEvent(FEED_CHANGED_EVENT, { detail: { kind, item } }));
