'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTrees, getLogs } from '@/lib/mockData';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { 
  Calendar, 
  MapPin, 
  User, 
  Droplet, 
  Camera, 
  Clock, 
  ChevronRight, 
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TreePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const treeId = parseInt(resolvedParams.id, 10);

  const [tree, setTree] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isNaN(treeId)) {
      setLoading(false);
      return;
    }

    const allTrees = getTrees();
    const targetTree = allTrees.find(t => t.id === treeId);
    
    if (targetTree) {
      setTree(targetTree);
      // Get logs for this tree sorted by newest first
      const allLogs = getLogs();
      const treeLogs = allLogs
        .filter(l => l.tree_id === treeId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setLogs(treeLogs);
    }
    
    setLoading(false);
  }, [treeId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground">Loading tree logs...</p>
      </div>
    );
  }

  if (!tree) {
    return notFound();
  }

  const visitLogs = logs.filter(log => log.type === 'visit');
  const visitCount = visitLogs.length;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Banner / Cover Photo - Shows the TREE photo, not the logo! */}
      <div className="relative h-64 w-full bg-secondary sm:h-96 md:h-[400px]">
        <Image
          src={tree.main_photo_url}
          alt={tree.species}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <Badge className="mb-2 bg-primary text-white hover:bg-primary/95 text-xs font-semibold px-2.5 py-0.5 border-none">
            Tree #{tree.id}
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{tree.species}</h1>
          <p className="text-sm opacity-90 flex items-center gap-1 mt-1 font-medium">
            <User className="h-3.5 w-3.5" /> Planter: {tree.planter_name}
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-lg px-4 mt-6">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="shadow-sm border-border bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-primary/10 text-primary rounded-xl">
                <Droplet className="h-6 w-6 fill-current" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary">{visitCount}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Tended / Watered
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-accent/10 text-accent rounded-xl">
                <Calendar className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">
                  {format(new Date(tree.planted_date), 'MMM yyyy')}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Date Planted
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tree Details Card */}
        <Card className="shadow-sm border-border bg-card mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Tree Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5 text-sm">
            <div className="flex justify-between items-center py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Tree Species</span>
              <span className="font-semibold text-foreground">{tree.species}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Planter Name</span>
              <span className="font-semibold text-foreground">{tree.planter_name}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Date Planted</span>
              <span className="font-semibold text-foreground">
                {format(new Date(tree.planted_date), 'PPP')}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Location</span>
              <span className="font-semibold text-foreground">{tree.location}</span>
            </div>

            {/* GPS Coordinates */}
            {tree.latitude && tree.longitude && (
              <div className="pt-2 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-accent" /> GPS Coordinates
                  </span>
                  <span className="font-mono text-xs text-foreground bg-secondary px-2 py-0.5 rounded border border-border">
                    {Number(tree.latitude).toFixed(5)}, {Number(tree.longitude).toFixed(5)}
                  </span>
                </div>

                {/* Embedded Interactive Satellite Map */}
                <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border bg-muted shadow-sm">
                  <iframe
                    title="Tree Location Map"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://maps.google.com/maps?q=${tree.latitude},${tree.longitude}&t=k&z=17&output=embed`}
                  />
                </div>

                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${tree.latitude},${tree.longitude}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' }),
                    "w-full text-xs gap-1 border-border hover:bg-secondary font-medium"
                  )}
                >
                  Open in Google Maps
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Growth timeline */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Growth History Timeline
          </h2>

          {logs.length === 0 ? (
            <Card className="border border-dashed border-border bg-transparent p-6 text-center text-muted-foreground">
              <p className="text-sm">No growth photos or waterings logged yet.</p>
            </Card>
          ) : (
            <div className="relative pl-6 border-l-2 border-primary/20 space-y-6 ml-3">
              {logs.map((log) => (
                <div key={log.id} className="relative">
                  {/* Timeline Dot */}
                  <span className={`absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-background ${
                    log.type === 'photo' ? 'border-accent' : 'border-primary'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      log.type === 'photo' ? 'bg-accent' : 'bg-primary'
                    }`} />
                  </span>

                  {/* Log Content */}
                  <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <Badge variant="outline" className={`text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 ${
                        log.type === 'photo' 
                          ? 'border-accent/30 text-accent bg-accent/5' 
                          : 'border-primary/30 text-primary bg-primary/5'
                      }`}>
                        {log.type === 'photo' ? 'Growth Photo' : 'Watering Visit'}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {format(new Date(log.created_at), 'dd MMM yyyy')}
                      </span>
                    </div>

                    {log.type === 'photo' && log.photo_url && (
                      <div className="relative h-44 w-full rounded-lg overflow-hidden border border-border/50 mb-3 bg-secondary">
                        <Image
                          src={log.photo_url}
                          alt="Growth stage"
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}

                    {log.note && (
                      <p className="text-sm text-foreground italic mb-2 border-l-2 border-border/70 pl-2">
                        &ldquo;{log.note}&rdquo;
                      </p>
                    )}

                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
                      <User className="h-3 w-3" /> Logged by {log.staff_name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-border bg-background/90 backdrop-blur-md print:hidden flex justify-center z-50">
        <Link 
          href={`/tree/${tree.id}/update`}
          className={cn(
            buttonVariants({ variant: 'default' }),
            "w-full max-w-md h-12 text-sm font-semibold rounded-xl shadow-md gap-2 bg-primary text-white hover:bg-primary/95 flex justify-center items-center"
          )}
        >
          <Camera className="h-4 w-4" />
          Staff Update
          <ChevronRight className="h-4 w-4 ml-auto" />
        </Link>
      </div>
    </div>
  );
}

function Loader2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
