'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

export default function PageTransitionWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  return (
    <div key={pathname} className="flex-1 flex flex-col w-full animate-page">
      {children}
    </div>
  );
}
