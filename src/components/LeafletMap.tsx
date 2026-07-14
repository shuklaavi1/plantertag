'use client';

import dynamic from 'next/dynamic';

interface Tree {
  id: number;
  planter_name: string;
  species: string;
  latitude: number;
  longitude: number;
  location?: string;
}

interface LeafletMapProps {
  trees: Tree[];
  center?: [number, number];
  zoom?: number;
}

const LeafletMap = dynamic(() => import('./LeafletMapInner'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-muted/30 animate-pulse rounded-2xl flex flex-col items-center justify-center gap-2 border border-border">
      <span className="h-2.5 w-2.5 rounded-full bg-primary animate-ping" />
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Loading interactive map...</p>
    </div>
  ),
});

export default LeafletMap;
