'use client';

import { useState, useEffect } from 'react';
import { supabase, isMockMode } from '@/lib/supabase';
import { getMockTrees } from '@/lib/mockData';
import LeafletMap from '@/components/LeafletMap';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Map, Loader2, Compass, TreePine, MapPin } from 'lucide-react';

export default function MapPage() {
  const [trees, setTrees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrees = async () => {
      try {
        if (isMockMode) {
          setTrees(getMockTrees());
        } else {
          const { data, error: err } = await supabase
            .from('trees')
            .select('id, planter_name, species, latitude, longitude, location')
            .order('id', { ascending: true });
          
          if (err) throw err;
          setTrees(data || []);
        }
      } catch (err: any) {
        console.error('Failed to load trees:', err);
        setError(err.message || 'Failed to load tree registry coordinates.');
      } finally {
        setLoading(false);
      }
    };
    fetchTrees();
  }, []);

  const totalTagged = trees.filter(t => t.latitude && t.longitude && t.latitude !== 0 && t.longitude !== 0).length;

  return (
    <div className="flex-1 flex flex-col bg-background px-4 py-8 max-w-5xl mx-auto w-full">
      {/* Title */}
      <div className="flex items-center gap-3 border-b border-border/60 pb-4 mb-6">
        <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
          <Map className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
            Interactive Reserve Map
          </h1>
          <p className="text-xs text-muted-foreground">Geographic distribution of tagged trees in Palamau Tiger Reserve</p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col justify-center items-center py-20 gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Loading map coordinates...</p>
        </div>
      ) : error ? (
        <Card className="border-destructive/20 bg-destructive/5 text-destructive p-6 text-center">
          <p className="text-sm font-semibold mb-2">Error Loading Map</p>
          <p className="text-xs">{error}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
          {/* Map display */}
          <div className="lg:col-span-3 h-[500px] md:h-[600px] rounded-2xl overflow-hidden border border-border shadow-md">
            <LeafletMap trees={trees} />
          </div>

          {/* Sidebar Panel */}
          <div className="space-y-6">
            <Card className="border-border shadow-sm bg-card rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="h-4.5 w-4.5 text-primary" /> Map Legend
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">
                  Trees are color-coded by zone
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs">
                <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/10">
                  <span className="h-3.5 w-3.5 rounded-full bg-emerald-600 border border-white shadow-sm shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Qila Grassland</p>
                    <p className="text-[10px] text-muted-foreground">
                      {trees.filter(t => t.location === 'Qila Grassland').length} trees tagged
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/10 border-t border-border/30 pt-3">
                  <span className="h-3.5 w-3.5 rounded-full bg-green-800 border border-white shadow-sm shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Alhra Zone</p>
                    <p className="text-[10px] text-muted-foreground">
                      {trees.filter(t => t.location === 'Alhra').length} trees tagged
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm bg-card rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <TreePine className="h-4.5 w-4.5 text-primary" /> GPS Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2.5">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Total Tagged Trees</span>
                  <span className="font-bold text-foreground">{trees.length}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Geo-Tagged (GPS Pins)</span>
                  <span className="font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {totalTagged} ({Math.round((totalTagged / (trees.length || 1)) * 100)}%)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Missing GPS</span>
                  <span className="font-bold text-muted-foreground">
                    {trees.length - totalTagged}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
