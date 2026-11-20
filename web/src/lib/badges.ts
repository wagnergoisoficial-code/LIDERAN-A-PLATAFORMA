import { createContext, useContext } from 'react';

/** Números dos ícones: conversas privadas por ler, mensagens novas no chat da comunidade e novidades no feed. */
export interface Badges { messages: number; chat: number; feed: number }

export const NO_BADGES: Badges = { messages: 0, chat: 0, feed: 0 };
export const BadgeContext = createContext<Badges>(NO_BADGES);
export const useBadges = () => useContext(BadgeContext);
