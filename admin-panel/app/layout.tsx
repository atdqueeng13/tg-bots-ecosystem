import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sherlock Admin — Реестр Улик',
  description: 'Панель управления экосистемой Telegram-ботов с ИИ Google Gemini',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-background text-on-background min-h-screen antialiased selection:bg-secondary selection:text-on-secondary">
        {children}
      </body>
    </html>
  );
}
