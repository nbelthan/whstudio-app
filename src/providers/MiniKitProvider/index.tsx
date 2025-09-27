'use client';
import dynamic from 'next/dynamic';
import { ReactNode, useState, useEffect } from 'react';

interface MiniKitWrapperProps {
  children: ReactNode;
  appId: string;
}

// Component that only renders on client side
function ClientOnlyMiniKitProvider({ children, appId }: MiniKitWrapperProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render anything until we're definitely on the client
  if (!isClient) {
    return <>{children}</>;
  }

  // Dynamic import of MiniKit components to ensure they never run on server
  const MiniKitProviderComponent = dynamic(
    () => import('@worldcoin/minikit-js/minikit-provider').then(mod => ({ default: mod.MiniKitProvider })),
    {
      ssr: false,
      loading: () => <>{children}</>,
    }
  );

  return (
    <MiniKitProviderComponent appId={appId}>
      {children}
    </MiniKitProviderComponent>
  );
}

export default ClientOnlyMiniKitProvider;