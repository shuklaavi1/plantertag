'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { supabase, isMockMode } from '@/lib/supabase';
import { getMockTrees } from '@/lib/mockData';
import InaugurateLaunch from '@/components/InaugurateLaunch';
import { 
  Search, 
  QrCode, 
  ShieldAlert, 
  Loader2,
  ArrowRight
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [treeId, setTreeId] = useState('');
  const [searchError, setSearchError] = useState('');
  const [matchingTrees, setMatchingTrees] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [totalTreesCount, setTotalTreesCount] = useState<number | null>(null);

  // Typewriter placeholder states
  const [placeholder, setPlaceholder] = useState('Enter Tree ID or Planter\'s Name');
  const [isFocused, setIsFocused] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);

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

  // Listen to visibility state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Typewriter effect for placeholder
  useEffect(() => {
    if (treeId || isFocused || !isTabVisible) {
      setPlaceholder('Enter Tree ID or Planter\'s Name');
      return;
    }

    const phrases = ["Enter your name!", "Enter your tree code!"];
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timer: NodeJS.Timeout;

    const tick = () => {
      const currentPhrase = phrases[phraseIndex];
      
      if (!isDeleting) {
        setPlaceholder(currentPhrase.substring(0, charIndex + 1));
        charIndex++;
        
        if (charIndex === currentPhrase.length) {
          isDeleting = true;
          timer = setTimeout(tick, 1800); // Pause for 1.8s
          return;
        }
        timer = setTimeout(tick, 70);
      } else {
        setPlaceholder(currentPhrase.substring(0, charIndex - 1));
        charIndex--;
        
        if (charIndex === 0) {
          isDeleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          timer = setTimeout(tick, 300);
          return;
        }
        timer = setTimeout(tick, 45);
      }
    };

    timer = setTimeout(tick, 200);
    return () => clearTimeout(timer);
  }, [treeId, isFocused, isTabVisible]);

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
    <div className="flex-1 flex flex-col justify-center items-center relative overflow-hidden px-4 py-16 md:py-24 min-h-[calc(100vh-4rem)] bg-background">
      
      {/* ── Subtle Background Highlight ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none z-0" />

      <div className="w-full max-w-xl text-center space-y-8 relative z-10">

        {/* ── Logo + Sovereign Government Header ── */}
        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border border-border bg-card p-1 shadow-sm transition-transform duration-300 hover:scale-[1.03]">
            <Image
              src="/logo.png"
              alt="Palamau Tiger Reserve Logo"
              fill
              className="object-cover p-1.5"
              priority
            />
          </div>

          <div className="space-y-2">
            <span className="inline-block text-[10px] font-bold tracking-widest text-primary uppercase bg-primary/10 border border-primary/10 px-3.5 py-1 rounded-full">
              Jharkhand Forest Department · Govt. of India
            </span>
            <h1 className="text-4xl sm:text-5xl font-heading font-semibold tracking-tight text-foreground leading-none">
              Palamau Tiger Reserve
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed font-light">
              Official Forest Conservation & Sovereign Tree Registry Portal
            </p>
          </div>
        </div>

        {/* ── High-Quality Search Card ── */}
        <Card className="border border-border bg-card text-foreground rounded-lg overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg animate-in fade-in zoom-in-95 duration-500 delay-150">
          {/* Accent colored top strip for highlights */}
          <div className="h-1.5 bg-gradient-to-r from-primary to-accent" />
          
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center justify-center gap-1.5 font-mono">
              <QrCode className="h-4.5 w-4.5 text-primary" /> Public Tree Lookup
            </h2>
            <p className="text-[11px] text-muted-foreground text-center font-light leading-snug">
              Enter your tree code or registered planter's name to view history.
            </p>
            
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={placeholder}
                  value={treeId}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className="pl-10 h-11 bg-background border-border text-foreground placeholder-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 font-medium text-sm rounded-md"
                />
              </div>
              <Button type="submit" disabled={isSearching} className="bg-primary hover:bg-primary/95 text-primary-foreground h-11 px-5 rounded-md font-semibold text-sm shadow-sm transition-colors flex items-center gap-1 cursor-pointer">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Go</span><ArrowRight className="h-3.5 w-3.5" /></>}
              </Button>
            </form>
            
            {searchError && (
              <p className="text-xs text-rose-600 text-left font-semibold flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <ShieldAlert className="h-4 w-4" />
                {searchError}
              </p>
            )}

            {/* Matching Trees List */}
            {matchingTrees.length > 0 && (
              <div className="mt-2 text-left border border-border bg-muted/20 rounded-md p-3 space-y-2 max-h-60 overflow-y-auto">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 font-mono">
                  Matching Planters ({matchingTrees.length})
                </p>
                <div className="space-y-2">
                  {matchingTrees.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => router.push(`/tree/${t.id}`)}
                      className="w-full text-left p-3 rounded-md border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all flex justify-between items-center group cursor-pointer"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {t.planter_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {t.species.split(' (')[0]} · Planted {new Date(t.planted_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
                        #{t.id}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Inauguration Controller ── */}
        <div className="pt-2 animate-in fade-in duration-500 delay-300">
          <InaugurateLaunch />
        </div>

      </div>
    </div>
  );
}
