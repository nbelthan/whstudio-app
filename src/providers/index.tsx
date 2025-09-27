'use client';
import { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { ErudaProvider } from '@/providers/Eruda';
// Temporarily disabled MiniKit for demo
// import ClientOnlyMiniKitProvider from '@/providers/MiniKitProvider';

// Define props for ClientProviders
interface ClientProvidersProps {
  children: ReactNode;
  session: Session | null; // Use the appropriate type for session from next-auth
}

/**
 * ClientProvider wraps the app with essential context providers.
 *
 * - ErudaProvider:
 *     - Should be used only in development.
 *     - Enables an in-browser console for logging and debugging.
 *
 * - MiniKitProvider:
 *     - Required for MiniKit functionality.
 *
 * This component ensures both providers are available to all child components.
 */
export default function ClientProviders({
  children,
  session,
}: ClientProvidersProps) {
  const appId = process.env.NEXT_PUBLIC_APP_ID || process.env.NEXT_PUBLIC_WLD_APP_ID;

  if (!appId) {
    console.warn('Missing NEXT_PUBLIC_APP_ID or NEXT_PUBLIC_WLD_APP_ID environment variable');
  }

  return (
    <ErudaProvider>
      <SessionProvider session={session}>{children}</SessionProvider>
    </ErudaProvider>
  );
}
