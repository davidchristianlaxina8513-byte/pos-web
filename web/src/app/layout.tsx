import type { Metadata, Viewport } from 'next';
import './globals.css';
import { APPEARANCE_STORAGE_KEY } from '@/features/settings/preferences';

export const metadata: Metadata = { title: 'IPSS — Cafe Elvira' };

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeBoot = `(function(){try{var value=localStorage.getItem('${APPEARANCE_STORAGE_KEY}')||'system';var dark=value==='dark'||(value==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=dark?'dark':'light'}catch(e){}})()`;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
