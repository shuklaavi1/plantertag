'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, isMockMode } from '@/lib/supabase';
import { getMockSession, getMockTrees, getMockLogs, getMockGuardAssignments } from '@/lib/mockData';
import LeafletMap from '@/components/LeafletMap';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  ChevronRight, 
  User, 
  Trees,
  Calendar,
  Layers
} from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { UPDATE_DUE_DAYS, UPDATE_OVERDUE_DAYS } from '@/lib/config';

export default function MyTreesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [assignedZones, setAssignedZones] = useState<string[]>([]);
  const [trees, setTrees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Authenticate user
  useEffect(() => {
    if (isMockMode) {
      const session = getMockSession();
      if (!session) {
        router.push('/login?redirectTo=/my-trees');
      } else {
        setUser(session);
      }
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) {
          router.push('/login?redirectTo=/my-trees');
        } else {
          setUser(session.user);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session?.user) {
          router.push('/login?redirectTo=/my-trees');
        } else {
          setUser(session.user);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, [router]);

  // 2. Fetch guard assignments & trees once authenticated
  useEffect(() => {
    if (!user) return;

    const loadDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        let zones: string[] = [];
        let fetchedTrees: any[] = [];
        let latestLogs: any[] = [];

        // a) Fetch assignments (zones)
        if (isMockMode) {
          zones = getMockGuardAssignments(user.email);
          latestLogs = getMockLogs();
        } else {
          const { data: assignments, error: assignErr } = await supabase
            .from('guard_assignments')
            .select('zone')
            .eq('staff_email', user.email);

          if (assignErr) throw assignErr;
          zones = assignments?.map((a: any) => a.zone) || [];

          if (zones.length > 0) {
            // Fetch logs to find the latest update per tree
            const { data: logs, error: logsErr } = await supabase
              .from('tree_logs')
              .select('tree_id, created_at')
              .order('created_at', { ascending: false });
            
            if (logsErr) throw logsErr;
            latestLogs = logs || [];
          }
        }

        setAssignedZones(zones);

        if (zones.length === 0) {
          setTrees([]);
          setLoading(false);
          return;
        }

        // b) Fetch trees in the guard's assigned zones
        if (isMockMode) {
          const allTrees = getMockTrees();
          fetchedTrees = allTrees.filter(t => t.location && zones.includes(t.location));
        } else {
          const { data, error: treesErr } = await supabase
            .from('trees')
            .select('*')
            .in('location', zones)
            .order('id', { ascending: true });

          if (treesErr) throw treesErr;
          fetchedTrees = data || [];
        }

        // c) Combine trees and logs to compute due status
        const logsMap = new Map<number, string>();
        latestLogs.forEach(log => {
          if (!logsMap.has(log.tree_id)) {
            logsMap.set(log.tree_id, log.created_at);
          }
        });

        const enrichedTrees = fetchedTrees.map(tree => {
          const lastUpdatedStr = logsMap.get(tree.id) || tree.planted_date;
          const lastUpdated = new Date(lastUpdatedStr);
          const daysSinceUpdate = differenceInDays(new Date(), lastUpdated);

          let statusBadge: 'up-to-date' | 'due-soon' | 'overdue' = 'up-to-date';
          if (daysSinceUpdate > UPDATE_OVERDUE_DAYS) {
            statusBadge = 'overdue';
          } else if (daysSinceUpdate > UPDATE_DUE_DAYS) {
            statusBadge = 'due-soon';
          }

          return {
            ...tree,
            last_updated: lastUpdatedStr,
            days_since_update: daysSinceUpdate,
            due_status: statusBadge
          };
        });

        setTrees(enrichedTrees);
      } catch (err: any) {
        console.error('Failed to load guard dashboard data:', err);
        setError(err.message || 'Failed to load assigned trees list.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-20 gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Loading Guard Dashboard...</p>
      </div>
    );
  }

  // Calculate counts
  const totalTrees = trees.length;
  const overdueTrees = trees.filter(t => t.due_status === 'overdue').length;
  const dueSoonTrees = trees.filter(t => t.due_status === 'due-soon').length;
  const attentionRequired = overdueTrees + dueSoonTrees;
  const upToDateTrees = totalTrees - attentionRequired;

  return (
    <div className="flex-1 flex flex-col bg-background px-4 py-8 max-w-5xl mx-auto w-full space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
            <Trees className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
              My Trees Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">Personal patrol updates for Palamau Forest Guards</p>
          </div>
        </div>
        
        {assignedZones.length > 0 && (
          <div className="flex items-center gap-1.5 self-start text-xs font-bold text-primary bg-primary/10 px-3.5 py-1.5 rounded-full border border-primary/20">
            <Layers className="h-4 w-4 text-primary" />
            <span>Assigned: {assignedZones.join(', ')}</span>
          </div>
        )}
      </div>

      {error && (
        <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4 text-center">
          <p className="text-sm font-semibold">{error}</p>
        </Card>
      )}

      {assignedZones.length === 0 ? (
        <Card className="border-border shadow-sm p-8 text-center max-w-md mx-auto">
          <div className="h-16 w-16 bg-muted text-muted-foreground rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-foreground">No Zones Assigned</h2>
          <p className="text-sm text-muted-foreground mt-2">
            You are logged in as <span className="font-semibold">{user.email}</span> but have not been assigned to any monitoring zones yet.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-3 border-t border-border/50 pt-3">
            Ask the administrator to map your email to a zone (e.g. Qila Grassland or Alhra) in the database.
          </p>
        </Card>
      ) : (
        <>
          {/* Summary Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-border shadow-sm bg-card md:col-span-2">
              <CardContent className="p-5 flex flex-col justify-center h-full">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patrol Summary</p>
                <h2 className="text-2xl font-black text-foreground mt-2">
                  You have {totalTrees} trees.
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {attentionRequired > 0 ? (
                    <span className="text-amber-600 font-semibold flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-4 w-4" />
                      {attentionRequired} {attentionRequired === 1 ? 'tree is' : 'trees are'} due for an update soon.
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                      <CheckCircle className="h-4 w-4" />
                      All trees are currently up to date. Excellent work!
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            {/* Micro Stats */}
            <div className="grid grid-cols-3 gap-3 md:col-span-2">
              <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-2xl font-bold text-emerald-600">{upToDateTrees}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase mt-1 tracking-wider">Up to Date</span>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-2xl font-bold text-amber-600">{dueSoonTrees}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase mt-1 tracking-wider">Due Soon</span>
              </div>
              <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-2xl font-bold text-rose-600">{overdueTrees}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase mt-1 tracking-wider">Overdue</span>
              </div>
            </div>
          </div>

          {/* Interactive Map Block */}
          <div className="h-[280px] md:h-[350px] rounded-2xl overflow-hidden border border-border shadow-sm">
            <LeafletMap trees={trees} />
          </div>

          {/* Trees Update Checklist */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Update Checklist ({totalTrees})</h3>
            
            {trees.length === 0 ? (
              <Card className="border border-dashed p-6 text-center text-muted-foreground bg-transparent">
                <p className="text-sm">No trees found in your assigned zones.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {trees.map((t) => {
                  let badgeColor = '';
                  let badgeLabel = '';
                  
                  if (t.due_status === 'overdue') {
                    badgeColor = 'bg-rose-500/10 text-rose-600 border-rose-500/20';
                    badgeLabel = `Overdue (${t.days_since_update}d)`;
                  } else if (t.due_status === 'due-soon') {
                    badgeColor = 'bg-amber-500/10 text-amber-600 border-amber-500/20';
                    badgeLabel = `Due Soon (${t.days_since_update}d)`;
                  } else {
                    badgeColor = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
                    badgeLabel = 'Up to Date';
                  }

                  return (
                    <button
                      key={t.id}
                      onClick={() => router.push(`/tree/${t.id}/update`)}
                      className="w-full text-left bg-card border border-border rounded-2xl p-4 flex justify-between items-center hover:border-primary/50 hover:shadow-md transition-all group cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                            #{t.id}
                          </span>
                          <Badge variant="outline" className={`text-[9px] font-bold px-2 py-0.5 border ${badgeColor}`}>
                            {badgeLabel}
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {t.species.split(' (')[0]}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3 shrink-0" /> {t.planter_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" /> {t.location}
                          </span>
                        </div>
                        
                        <p className="text-[9px] text-muted-foreground flex items-center gap-1 pt-1 border-t border-border/40">
                          <Clock className="h-3 w-3" /> Last Update:{' '}
                          <span className="font-semibold text-foreground">
                            {t.days_since_update === 0 
                              ? 'Today' 
                              : `${t.days_since_update} day${t.days_since_update === 1 ? '' : 's'} ago`}
                          </span>
                        </p>
                      </div>
                      
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors ml-2" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
