import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Footer from '@/components/Footer';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://ballotlyng.vercel.app'),
  title: {
    default: 'Ballotly | Secure Digital Elections & Voting Platform',
    template: '%s | Ballotly',
  },
  description: 'Cryptographically verified institutional voting platform for transparent campus elections, student councils, and governance ballots.',
  keywords: ['Ballotly', 'Online Voting Platform', 'Student Elections', 'Campus Voting', 'Governance Polls', 'Progressive Web App', 'Election Audit Log'],
  authors: [{ name: 'Ballotly Platform Team' }],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
      { url: '/logo.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Ballotly | Secure Digital Elections & Voting Platform',
    description: 'Cryptographically verified institutional voting platform for transparent campus elections and governance ballots.',
    url: 'https://ballotlyng.vercel.app',
    siteName: 'Ballotly',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'Ballotly Platform Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Ballotly | Secure Digital Elections & Voting Platform',
    description: 'Cryptographically verified institutional voting platform for transparent campus elections and governance ballots.',
    images: ['/logo.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Ballotly',
    startupImage: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body
        suppressHydrationWarning
        className={`${plusJakartaSans.className} min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-blue-600 selection:text-white`}
      >
        <div className="flex-1 flex flex-col">
          {children}
        </div>
        <Footer />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('[PWA] ServiceWorker registered with scope:', registration.scope);
                  }, function(err) {
                    console.log('[PWA] ServiceWorker registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
