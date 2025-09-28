import { auth } from '@/auth';
import ClientProviders from '@/providers';
import '@worldcoin/mini-apps-ui-kit-react/styles.css';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import AppHeader from '@/components/layout/AppHeader';
import { Navigation } from '@/components/Navigation';
import ConsentWrapper from '@/components/privacy/ConsentWrapper';

const inter = Inter({
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'WorldHuman Studio',
  description: 'Earn by completing human intelligence tasks with World ID verification',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] antialiased`}
        suppressHydrationWarning
      >
        <ClientProviders session={session}>
          <ConsentWrapper>
            <AppHeader />
            <div className="pt-16 pb-20">{children}</div>
            <Navigation />
          </ConsentWrapper>
        </ClientProviders>
      </body>
    </html>
  );
}
