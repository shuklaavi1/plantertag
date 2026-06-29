import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { supabase, isMockMode } from '@/lib/supabase';
import { getMockTrees, getMockLogs } from '@/lib/mockData';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { 
  Calendar, 
  MapPin, 
  User, 
  Droplet, 
  Clock, 
  ChevronRight, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0; // Disable caching so it always loads live data on scan

export default async function TreePage({ params }: PageProps) {
  const { id } = await params;
  const treeId = parseInt(id, 10);

  if (isNaN(treeId)) {
    return notFound();
  }

  let tree: any = null;
  let logs: any[] = [];

  if (isMockMode) {
    const allTrees = getMockTrees();
    tree = allTrees.find(t => t.id === treeId) || null;
    if (tree) {
      const allLogs = getMockLogs();
      logs = allLogs
        .filter(l => l.tree_id === treeId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  } else {
    const { data, error } = await supabase
      .from('trees')
      .select('*')
      .eq('id', treeId)
      .single();
    
    tree = data;

    if (tree) {
      const { data: rawLogs } = await supabase
        .from('tree_logs')
        .select('*')
        .eq('tree_id', treeId)
        .order('created_at', { ascending: false });
      
      logs = rawLogs || [];
    }
  }

  if (!tree) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 text-center">
        <Card className="w-full max-w-sm border-border p-6 shadow-md bg-card">
          <div className="h-16 w-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Tree Not Found</h2>
          <p className="text-sm text-muted-foreground mt-2">
            The scanned QR tag ID #{id} does not exist in the official Palamu Tiger Reserve registry.
          </p>
          <div className="mt-6">
            <Link href="/" className={cn(buttonVariants({ variant: 'default' }), "w-full bg-primary text-white hover:bg-primary/95")}>
              Go to Homepage
            </Link>
          </div>
        </Card>
      </div>
    );
  }



  const visitLogs = logs?.filter(log => log.type === 'visit') || [];
  const visitCount = visitLogs.length;

  // Missed-watering Calculation
  const OVERDUE_DAYS = 7;
  const latestLog = logs && logs.length > 0 ? logs[0] : null;
  let daysSinceLastTended = 0;
  
  if (latestLog) {
    daysSinceLastTended = differenceInDays(new Date(), new Date(latestLog.created_at));
  } else {
    // If no logs, compare with planted_date
    daysSinceLastTended = differenceInDays(new Date(), new Date(tree.planted_date));
  }
  const isOverdue = daysSinceLastTended >= OVERDUE_DAYS;

  // Status Badge Colors
  const statusConfig = {
    'Healthy': { bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', label: 'Healthy' },
    'Needs Attention': { bg: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Needs Attention' },
    'Dead': { bg: 'bg-rose-500/10 text-rose-600 border-rose-500/20', label: 'Dead' }
  };
  const currentStatus = (tree.status as keyof typeof statusConfig) || 'Healthy';
  const statusStyle = statusConfig[currentStatus];

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Cover / Hero Photo */}
      <div className="relative h-64 w-full bg-secondary sm:h-96 md:h-[400px]">
        <Image
          src={tree.main_photo_url || "/demo/tree_mature.png"}
          alt={tree.species}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge className="bg-primary text-white hover:bg-primary/95 text-xs font-semibold px-2.5 py-0.5 border-none">
              Tree #{tree.id}
            </Badge>
            <Badge variant="outline" className={cn("text-xs font-semibold px-2.5 py-0.5 border uppercase", statusStyle.bg)}>
              {statusStyle.label}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{tree.species}</h1>
          <p className="text-sm opacity-90 flex items-center gap-1 mt-1 font-medium">
            <User className="h-3.5 w-3.5" /> Planter: {tree.planter_name}
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-lg px-4 mt-6">
        
        {/* Overdue Warning Notification (Subtle text for public-facing page) */}
        {isOverdue && (
          <div className="mb-4 bg-amber-500/5 border border-amber-500/10 rounded-xl p-3.5 text-center">
            <p className="text-xs text-amber-700 font-medium">
              ⚠️ Last tended {daysSinceLastTended} days ago
            </p>
          </div>
        )}

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
              <span className="font-semibold text-foreground">Kasturba School, PTR</span>
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

                    <div className="flex flex-wrap justify-between items-center gap-2 mt-2 pt-2 border-t border-border/40">
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
                        <User className="h-3 w-3" /> Logged by {log.staff_name.split('@')[0]}
                      </p>

                      {/* GPS Verified Badge */}
                      {log.log_latitude && log.log_longitude && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold uppercase">
                          <ShieldCheck className="h-3 w-3 text-emerald-600" /> Location Verified
                        </span>
                      )}
                    </div>
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
          Staff Update
          <ChevronRight className="h-4 w-4 ml-auto" />
        </Link>
      </div>
    </div>
  );
}
