import Image from 'next/image';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background min-h-[60vh]">
      <div className="relative h-20 w-20 overflow-hidden rounded-full border border-primary/20 bg-white mx-auto shadow-md mb-4 animate-pulse">
        <Image
          src="/logo.png"
          alt="Palamau Tiger Reserve Logo"
          fill
          className="object-cover"
          priority
        />
      </div>
      <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">
        Loading Tree Details...
      </p>
    </div>
  );
}
