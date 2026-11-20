import type { Metadata, Viewport } from 'next';
import '../web/src/index.css';

export const metadata: Metadata = {
  title: 'Lidera',
  description: 'A rede social da juventude da igreja: feed, chat, Bíblia e agenda da comunidade.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
