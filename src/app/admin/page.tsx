'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase, isMockMode } from '@/lib/supabase';
import { getMockTrees, getMockLogs, getMockSession, signInMock, signOutMock } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button, buttonVariants } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  QrCode, 
  Droplet, 
  Camera, 
  Trees, 
  ArrowUpDown, 
  ExternalLink,
  Loader2, 
  LogIn, 
  AlertCircle,
  Info,
  Activity,
  HeartCrack,
  Heart,
  AlertTriangle,
  LogOut,
  Sparkles
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

const DEMO_EMAIL = "demo@ptr.org";
const DEMO_PASSWORD = "demo1234";
const OVERDUE_DAYS = 7;

interface Tree {
  id: number;
  planter_name: string;
  species: string;
  planted_date: string;
  main_photo_url: string;
  latitude: number;
  longitude: number;
  status: string;
}

interface TreeLog {
  id: string;
  tree_id: number;
  type: 'photo' | 'visit';
  photo_url?: string;
  note?: string;
  staff_name: string;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [logs, setLogs] = useState<TreeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Login form pre-filled
  const [loginEmail, setLoginEmail] = useState(DEMO_EMAIL);
  const [loginPassword, setLoginPassword] = useState(DEMO_PASSWORD);

  // Table filtering and sorting states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showOverdueOnly, setShowOverdueOnly] = useState<boolean>(false);
  const [sortField, setSortField] = useState<'id' | 'species' | 'planter_name' | 'planted_date' | 'total_visits' | 'days_overdue'>('id');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, showOverdueOnly]);

  // Fetch all data
  const fetchData = async () => {
    try {
      if (isMockMode) {
        setTrees(getMockTrees());
        setLogs(getMockLogs());
      } else {
        const { data: treesData, error: treesErr } = await supabase
          .from('trees')
          .select('*')
          .order('id', { ascending: true });

        if (treesErr) throw treesErr;

        const { data: logsData, error: logsErr } = await supabase
          .from('tree_logs')
          .select('*');

        if (logsErr) throw logsErr;

        setTrees(treesData || []);
        setLogs(logsData || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch registry data.');
    }
  };

  useEffect(() => {
    if (isMockMode) {
      const session = getMockSession();
      setUser(session);
      if (session) {
        fetchData();
      }
      setLoading(false);
    } else {
      // Check session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchData();
        }
        setLoading(false);
      });

      // Listen reactively to auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchData();
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('login');
    setError(null);

    if (isMockMode) {
      if (loginEmail === DEMO_EMAIL && loginPassword === DEMO_PASSWORD) {
        signInMock();
        setUser({ email: DEMO_EMAIL, name: 'Demo Staff' });
        fetchData();
      } else {
        setError('Invalid credentials.');
      }
      setActionLoading(null);
    } else {
      const { data, error: loginErr } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (loginErr) {
        setError(loginErr.message || 'Invalid credentials.');
      } else {
        setUser(data.user);
        fetchData();
      }
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    if (isMockMode) {
      signOutMock();
      setUser(null);
    } else {
      await supabase.auth.signOut();
      setUser(null);
    }
    router.push('/login');
  };

  // Enriched tree rows with computed days overdue & visit counts
  const enrichedTrees = useMemo(() => {
    return trees.map((tree) => {
      const treeLogs = logs.filter((l) => l.tree_id === tree.id);
      const visits = treeLogs.filter((l) => l.type === 'visit');
      
      // Get latest log
      const latestLog = treeLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      
      let daysSinceLastTended = 0;
      if (latestLog && latestLog.created_at && !isNaN(new Date(latestLog.created_at).getTime())) {
        daysSinceLastTended = differenceInDays(new Date(), new Date(latestLog.created_at));
      } else if (tree.planted_date && !isNaN(new Date(tree.planted_date).getTime())) {
        daysSinceLastTended = differenceInDays(new Date(), new Date(tree.planted_date));
      }

      return {
        ...tree,
        total_visits: visits.length,
        days_overdue: daysSinceLastTended,
        is_overdue: daysSinceLastTended >= OVERDUE_DAYS,
        last_activity: latestLog ? latestLog.created_at : null,
      };
    });
  }, [trees, logs]);

  // Aggregate statistics for dashboard counters
  const stats = useMemo(() => {
    const totalTrees = enrichedTrees.length;
    const totalVisits = logs.filter(l => l.type === 'visit').length;
    const totalPhotos = logs.filter(l => l.type === 'photo').length;
    
    const healthy = enrichedTrees.filter(t => t.status === 'Healthy').length;
    const needsAttention = enrichedTrees.filter(t => t.status === 'Needs Attention').length;
    const dead = enrichedTrees.filter(t => t.status === 'Dead').length;
    const overdue = enrichedTrees.filter(t => t.is_overdue).length;

    return { totalTrees, totalVisits, totalPhotos, healthy, needsAttention, dead, overdue };
  }, [enrichedTrees, logs]);

  // Sorting and Filtering logic
  const filteredTrees = useMemo(() => {
    return enrichedTrees
      .filter((tree) => {
        // Search filter
        const matchesSearch = 
          tree.id.toString().includes(search) ||
          (tree.species || '').toLowerCase().includes(search.toLowerCase()) ||
          (tree.planter_name || '').toLowerCase().includes(search.toLowerCase());

        // Status filter
        const matchesStatus = statusFilter === 'all' || tree.status === statusFilter;

        // Overdue filter
        const matchesOverdue = !showOverdueOnly || tree.is_overdue;

        return matchesSearch && matchesStatus && matchesOverdue;
      })
      .sort((a, b) => {
        let valA: string | number = a[sortField] ?? '';
        let valB: string | number = b[sortField] ?? '';

        if (sortField === 'planted_date') {
          const dateA = new Date(a.planted_date);
          const dateB = new Date(b.planted_date);
          valA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
          valB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
        }

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [enrichedTrees, search, statusFilter, showOverdueOnly, sortField, sortAsc]);

  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredTrees.length / itemsPerPage);

  const displayedTrees = useMemo(() => {
    return filteredTrees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredTrees, currentPage, itemsPerPage]);

  // Quick helper to reverse sorting directions
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'days_overdue' ? false : true); // sort descending by default for overdue times
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground">Checking authorization & loading registry...</p>
      </div>
    );
  }

  // RENDER ADMIN PORTAL LOGIN
  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background px-4 py-16 min-h-screen">
        <Card className="w-full max-w-sm border-border shadow-lg bg-card">
          <CardHeader className="text-center space-y-2 pb-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border border-primary/20 bg-white mx-auto shadow-sm">
              <Image
                src="/logo.png"
                alt="Palamau Tiger Reserve Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight text-primary uppercase">
                Admin Portal
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                PTR Reserve Dashboard Access
              </CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-lg flex gap-2 items-start">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="bg-primary/5 border border-primary/10 text-muted-foreground text-xs p-3 rounded-lg flex gap-2 items-start">
                <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <p>
                  Use pre-authorized credentials:<br />
                  <code className="bg-background px-1 rounded font-semibold text-primary">{DEMO_EMAIL}</code> / <code className="bg-background px-1 rounded font-semibold text-primary">{DEMO_PASSWORD}</code>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@ptr.org"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  disabled={actionLoading === 'login'}
                  className="h-11 border-border focus-visible:ring-primary font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  disabled={actionLoading === 'login'}
                  className="h-11 border-border focus-visible:ring-primary font-medium"
                />
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                type="submit"
                disabled={actionLoading === 'login'}
                className="w-full h-11 bg-primary hover:bg-primary/95 text-white gap-2 font-semibold"
              >
                {actionLoading === 'login' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Access Dashboard
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background px-4 py-8 md:py-12">
      <div className="container mx-auto max-w-5xl space-y-8">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Trees className="h-6 w-6 text-primary" /> PTR Forestry Registry
            </h1>
            <p className="text-xs text-muted-foreground">
              Official tree-tracking console for Palamau Tiger Reserve
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2.5">
            <Link 
              href="/admin/qr-codes" 
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "border-border hover:bg-secondary text-xs gap-1.5 font-semibold")}
            >
              <QrCode className="h-4 w-4 text-primary" /> Print QR Tags
            </Link>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout} 
              className="border-border hover:bg-destructive/10 hover:text-destructive text-xs gap-1.5 font-semibold"
            >
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>

        {/* Dynamic Aggregated Statistics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm border-border bg-card">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
                <Trees className="h-5 w-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xl font-black text-primary leading-none">{stats.totalTrees}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1 truncate">
                  Total Trees
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border bg-card">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl shrink-0">
                <Droplet className="h-5 w-5 fill-current" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xl font-black text-blue-600 leading-none">{stats.totalVisits}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1 truncate">
                  Watering Logs
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border bg-card">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="p-3 bg-accent/10 text-accent rounded-xl shrink-0">
                <Camera className="h-5 w-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xl font-black text-accent leading-none">{stats.totalPhotos}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1 truncate">
                  Growth Photos
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border bg-card border-rose-500/20 bg-rose-500/5">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="p-3 bg-rose-500/10 text-rose-600 rounded-xl shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xl font-black text-rose-600 leading-none">{stats.overdue}</span>
                <span className="text-[10px] text-rose-600 uppercase font-bold tracking-wider mt-1 truncate">
                  Overdue Waterings
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tree Health Conditions Breakdown Strip */}
        <div className="grid grid-cols-3 gap-4 border border-border/80 bg-muted/20 rounded-xl p-4">
          <div className="flex items-center gap-2 justify-center border-r border-border/80 last:border-none">
            <Heart className="h-4 w-4 text-emerald-600 shrink-0 fill-current" />
            <div className="flex flex-col text-center sm:text-left">
              <span className="text-sm font-bold text-foreground leading-none">{stats.healthy}</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Healthy</span>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-center border-r border-border/80 last:border-none">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 fill-current" />
            <div className="flex flex-col text-center sm:text-left">
              <span className="text-sm font-bold text-foreground leading-none">{stats.needsAttention}</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Needs Attention</span>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-center last:border-none">
            <HeartCrack className="h-4 w-4 text-rose-600 shrink-0 fill-current" />
            <div className="flex flex-col text-center sm:text-left">
              <span className="text-sm font-bold text-foreground leading-none">{stats.dead}</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Dead</span>
            </div>
          </div>
        </div>

        {/* Data-Table Control Bar */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            {/* Search and Filters */}
            <div className="flex flex-1 flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search species, planter name, ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10 border-border focus-visible:ring-primary text-sm font-medium"
                />
              </div>

              {/* Status Select Filter */}
              <div className="w-full sm:w-44">
                <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
                  <SelectTrigger className="h-10 border-border focus:ring-primary text-xs font-semibold">
                    <SelectValue placeholder="Filter Condition" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all" className="text-xs font-medium">All Statuses</SelectItem>
                    <SelectItem value="Healthy" className="text-xs font-medium text-emerald-600">💚 Healthy</SelectItem>
                    <SelectItem value="Needs Attention" className="text-xs font-medium text-amber-600">💛 Needs Attention</SelectItem>
                    <SelectItem value="Dead" className="text-xs font-medium text-rose-600">❤️ Dead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Overdue watering alert toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <label 
                className={cn(
                  "inline-flex items-center gap-2 cursor-pointer border px-3 py-2 rounded-lg text-xs font-bold transition-all",
                  showOverdueOnly 
                    ? "border-rose-500 bg-rose-500/10 text-rose-600" 
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                )}
              >
                <input
                  type="checkbox"
                  checked={showOverdueOnly}
                  onChange={(e) => {
                    setShowOverdueOnly(e.target.checked);
                    if (e.target.checked) {
                      setSortField('days_overdue');
                      setSortAsc(false); // longest overdue first
                    }
                  }}
                  className="hidden"
                />
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Overdue Watering Only
              </label>
            </div>
          </div>

          {/* Tree Registry Data Table */}
          <Card className="border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40 border-b border-border">
                  <TableRow>
                    <TableHead className="w-16 text-center">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('id')} className="h-8 font-bold text-xs gap-0.5">
                        ID <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>Species</TableHead>
                    <TableHead>Planter</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('planted_date')} className="h-8 font-bold text-xs gap-0.5">
                        Planted <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">Condition</TableHead>
                    <TableHead className="text-center">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('total_visits')} className="h-8 font-bold text-xs gap-0.5">
                        Visits <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('days_overdue')} className="h-8 font-bold text-xs gap-0.5">
                        Tending Alert <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-12 text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground">
                        No trees match the selected filters or search parameters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedTrees.map((tree) => {
                      // Survival colors
                      const statusStyles = {
                        'Healthy': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                        'Needs Attention': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                        'Dead': 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                      };
                      const sStyle = statusStyles[tree.status as keyof typeof statusStyles] || statusStyles['Healthy'];

                      return (
                        <TableRow key={tree.id} className={cn("hover:bg-muted/30 transition-colors border-b border-border/50", tree.is_overdue && "bg-rose-500/[0.02]")}>
                          <TableCell className="font-mono text-center font-bold text-xs text-muted-foreground">
                            #{tree.id}
                          </TableCell>
                          <TableCell className="font-semibold text-foreground text-sm">
                            {(tree.species || 'To be updated').split(' (')[0]}
                            <span className="hidden md:inline text-xs text-muted-foreground font-medium block">
                              {tree.species && tree.species.includes('(') ? '(' + tree.species.split('(')[1] : ''}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-medium">
                            {tree.planter_name || 'To be updated'}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs text-muted-foreground font-medium">
                            {tree.planted_date && !isNaN(new Date(tree.planted_date).getTime())
                              ? format(new Date(tree.planted_date), 'dd MMM yyyy')
                              : 'To be updated'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={cn("text-[9px] font-extrabold uppercase px-1.5 py-0.5 border", sStyle)}>
                              {tree.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-bold text-primary font-mono text-xs">
                            {tree.total_visits}
                          </TableCell>
                          <TableCell className="text-right">
                            {tree.is_overdue ? (
                              <Badge variant="outline" className="bg-rose-500/15 border-rose-500/30 text-rose-700 text-[9px] font-black uppercase px-2 py-0.5 animate-pulse">
                                Overdue {tree.days_overdue} days
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground font-semibold">
                                Tended {tree.days_overdue}d ago
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Link 
                              href={`/tree/${tree.id}`}
                              className="text-primary hover:text-primary/80 transition-colors inline-flex justify-center items-center"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border border-border bg-card px-4 py-3 rounded-xl shadow-sm mt-4">
              <div className="flex flex-1 justify-between sm:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="border-border text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="border-border text-xs"
                >
                  Next
                </Button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Showing <span className="font-semibold text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-semibold text-foreground">{Math.min(currentPage * itemsPerPage, filteredTrees.length)}</span> of{' '}
                    <span className="font-semibold text-foreground">{filteredTrees.length}</span> trees
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0 border-border"
                  >
                    &lt;&lt;
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-3 border-border text-xs"
                  >
                    Previous
                  </Button>
                  <span className="text-xs font-semibold text-muted-foreground px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="h-8 px-3 border-border text-xs"
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0 border-border"
                  >
                    &gt;&gt;
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
