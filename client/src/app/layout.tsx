import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ballotly — Secure Digital Elections & Voting Platform',
  description: 'Ballotly is the smart, transparent platform for running secure elections, polls, and governance votes at any scale.',
  keywords: ['Ballotly', 'Online Voting', 'Elections', 'Student Voting', 'Governance', 'PWA', 'Polls'],
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    shortcut: '/icon.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ballotly',
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
        <meta name="theme-color" content="#4f46e5" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body suppressHydrationWarning className={`${inter.className} min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-indigo-600 selection:text-white`}>
        {children}
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
