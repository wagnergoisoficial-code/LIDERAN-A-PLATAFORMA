// Links do YouTube: a mesma leitura do backend (watch, youtu.be, shorts, embed e live)
export const youtubeId = (link: string) => {
  try {
    const url = new URL(link.trim());
    const id = url.hostname === 'youtu.be'
      ? url.pathname.slice(1)
      : url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/)?.[1];
    return /youtube\.com$|youtu\.be$|youtube-nocookie\.com$/.test(url.hostname) && /^[\w-]{11}$/.test(id || '') ? id! : null;
  } catch {
    return null;
  }
};

export const youtubeThumbnail = (sourceId: string) => `https://i.ytimg.com/vi/${sourceId}/hqdefault.jpg`;
export const youtubeEmbed = (sourceId: string) => `https://www.youtube-nocookie.com/embed/${sourceId}?autoplay=1&rel=0`;

export const VIDEO_CATEGORIES = { pregacao: 'Pregação', hino: 'Hino ou louvor', membro: 'Vídeo de membro' } as const;
export type VideoCategory = keyof typeof VIDEO_CATEGORIES;
