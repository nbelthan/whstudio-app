'use client';

import { ReactNode, useEffect, useState } from 'react';

export const ErudaProvider = (props: { children: ReactNode }) => {
  const [erudaLoaded, setErudaLoaded] = useState(false);

  useEffect(() => {
    // Only load Eruda in development and not in production
    if (process.env.NEXT_PUBLIC_APP_ENV !== 'production' && typeof window !== 'undefined') {
      import('./eruda-provider').then(({ Eruda }) => {
        setErudaLoaded(true);
      }).catch(() => {
        // Silently fail if Eruda fails to load
        setErudaLoaded(true);
      });
    } else {
      setErudaLoaded(true);
    }
  }, []);

  // In production, render children immediately
  if (process.env.NEXT_PUBLIC_APP_ENV === 'production') {
    return <>{props.children}</>;
  }

  // In development, wait for Eruda to be checked before rendering
  if (!erudaLoaded) {
    return <>{props.children}</>;
  }

  return <>{props.children}</>;
};
