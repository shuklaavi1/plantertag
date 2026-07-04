'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { supabase, isMockMode } from '@/lib/supabase';
import { getMockTrees } from '@/lib/mockData';
import { 
  Search, 
  QrCode, 
  ShieldAlert, 
  ArrowRight,
  Info,
  Loader2
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [treeId, setTreeId] = useState('');
  const [searchError, setSearchError] = useState('');
  const [matchingTrees, setMatchingTrees] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [totalTreesCount, setTotalTreesCount] = useState<number | null>(null);

  // Fetch live count of trees in the registry
  useEffect(() => {
    const fetchTreeCount = async () => {
      try {
        if (isMockMode) {
          setTotalTreesCount(getMockTrees().length);
        } else {
          const { count, error } = await supabase
            .from('trees')
            .select('*', { count: 'exact', head: true });
          
          if (error) throw error;
          setTotalTreesCount(count !== null ? count : 150);
        }
      } catch (err) {
        console.error("Failed to fetch tree count:", err);
        setTotalTreesCount(150); // fallback
      }
    };
    fetchTreeCount();
  }, []);

  const handleInputChange = (val: string) => {
    setTreeId(val);
    setSearchError('');
    if (!val.trim()) {
      setMatchingTrees([]);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setMatchingTrees([]);

    const query = treeId.trim();
    if (!query) {
      setSearchError('Please enter a Tree ID or Planter\'s Name.');
      return;
    }

    if (/^\d+$/.test(query)) {
      const id = parseInt(query, 10);
      const maxTrees = totalTreesCount || 150;
      if (isNaN(id) || id < 1 || id > maxTrees) {
        setSearchError(`Please enter a valid tree ID between 1 and ${maxTrees}.`);
        return;
      }
      router.push(`/tree/${id}`);
      return;
    }

    // Treat as planter name lookup
    setIsSearching(true);
    try {
      let results: any[] = [];
      if (isMockMode) {
        const allTrees = getMockTrees();
        results = allTrees.filter(t => 
          t.planter_name.toLowerCase().includes(query.toLowerCase())
        );
      } else {
        const { data, error } = await supabase
          .from('trees')
          .select('id, species, planted_date, planter_name')
          .ilike('planter_name', `%${query}%`);
        
        if (error) throw error;
        results = data || [];
      }

      if (results.length === 0) {
        setSearchError("No tree found for that name or ID");
      } else if (results.length === 1) {
        router.push(`/tree/${results[0].id}`);
      } else {
        setMatchingTrees(results);
      }
    } catch (err: any) {
      setSearchError("Error searching by name. Please try again.");
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center bg-background px-4 py-12 md:py-20">
      <div className="w-full max-w-2xl text-center space-y-6">
        {/* Reserve Logo */}
        <div className="relative h-28 w-28 overflow-hidden rounded-full border border-primary bg-white mx-auto shadow-md">
          <Image
            src="/logo.png"
            alt="Palamau Tiger Reserve Logo"
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <span className="text-xs font-bold tracking-widest text-primary uppercase bg-primary/10 px-3 py-1 rounded-full">
            Department of Forests & Environment
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Palamau Tiger Reserve
          </h1>
          <p className="text-base text-muted-foreground max-w-md mx-auto">
            Official QR-based tree growth tracking and tending registry portal.
          </p>
          <div className="pt-1 flex justify-center">
            {totalTreesCount !== null ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 animate-pop-in">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {totalTreesCount} trees in the registry
              </span>
            ) : (
              <div className="h-6 flex items-center justify-center">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/70" />
              </div>
            )}
          </div>
        </div>

        {/* Search Tree Form */}
        <Card className="shadow-md border-border bg-card max-w-md mx-auto">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center justify-center gap-1.5">
              <QrCode className="h-4 w-4 text-primary" /> Public Tree Lookup
            </h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Enter Tree ID or Planter's Name"
                  value={treeId}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="pl-9 h-11 border-border focus-visible:ring-primary font-medium"
                />
              </div>
              <Button type="submit" disabled={isSearching} className="bg-primary hover:bg-primary/95 text-white h-11 px-5">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Go'}
              </Button>
            </form>
            {searchError && (
              <p className="text-xs text-destructive text-left font-medium flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" />
                {searchError}
              </p>
            )}

            {/* Matching Trees List */}
            {matchingTrees.length > 0 && (
              <div className="mt-4 text-left border border-border bg-card rounded-xl p-4 space-y-2 max-h-60 overflow-y-auto">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Matching Planters ({matchingTrees.length})
                </p>
                <div className="space-y-2">
                  {matchingTrees.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => router.push(`/tree/${t.id}`)}
                      className="w-full text-left p-2.5 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all flex justify-between items-center group cursor-pointer"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {t.planter_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {t.species.split(' (')[0]} • Planted {new Date(t.planted_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        #{t.id}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staff/Admin CTA Link */}
        <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4 text-sm text-muted-foreground">
          <Link 
            href="/login" 
            className="flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            Forest Guard / Staff Login
            <ArrowRight className="h-4 w-4" />
          </Link>
          <span className="hidden sm:inline opacity-40">|</span>
          <Link 
            href="/admin" 
            className="flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            Go to Admin Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Informational Blurb */}
        <div className="max-w-md mx-auto bg-primary/5 border border-primary/10 p-4 rounded-xl flex gap-3 text-left text-xs leading-relaxed text-muted-foreground mt-8">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-primary mb-0.5">Forest Monitoring Initiative</p>
            <p>
              Each tree in the reserve is marked with a secure QR tag. Scanning it instantly shows the tree's planting history, health status, and growth timeline.
            </p>
          </div>
        </div>

        {/* How to Use Section */}
        <div className="max-w-md mx-auto mt-4 border border-border bg-card rounded-xl p-4 text-left shadow-sm">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2">
            <Info className="h-4 w-4 text-primary" /> How to Use the Portal
          </h3>
          <div className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
            <div>
              <p className="font-semibold text-foreground">For Public Visitors:</p>
              <p>Scan any tree's QR tag, or enter its Tree ID or planter's name above, to see its growth history.</p>
            </div>
            <div className="border-t border-border/50 pt-2 mt-1">
              <p className="font-semibold text-foreground">For Forest Staff:</p>
              <p>Log in via Staff Login, then scan a tree's tag and tap 'Staff Update' to log a watering visit, edit details, or upload a growth photo.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
