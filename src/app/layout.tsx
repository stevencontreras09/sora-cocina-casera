import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { PwaRegistration } from '@/components/layout/PwaRegistration';

export const metadata: Metadata = {
  title: 'Sora Cocina Casera - Sistema de Gestión',
  description:
    'Plataforma integral para gestión de pedidos, delivery y gastos de Sora Cocina Casera.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sora Cocina Casera',
  },
  applicationName: 'Sora',
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#C2665B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Sora" />
      </head>
      <body className="min-h-full font-sans antialiased bg-bg-sora text-text-sora selection:bg-primary-sora/20 selection:text-primary-sora">
        <AuthProvider>
          <PwaRegistration />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
