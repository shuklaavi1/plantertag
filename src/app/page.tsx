'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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
  Loader2
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

  // Fetch live count of trees in the registry (keep to compute validation range, though hidden in hero)
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

    const phrases = ["Enter your name", "Enter your unique tree code"];
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timer: NodeJS.Timeout;

    const tick = () => {
      const currentPhrase = phrases[phraseIndex];
      
      if (!isDeleting) {
        // Typing
        setPlaceholder(currentPhrase.substring(0, charIndex + 1));
        charIndex++;
        
        if (charIndex === currentPhrase.length) {
          isDeleting = true;
          timer = setTimeout(tick, 1800); // Pause for 1.8s
          return;
        }
        timer = setTimeout(tick, 70); // 70ms per character
      } else {
        // Deleting
        setPlaceholder(currentPhrase.substring(0, charIndex - 1));
        charIndex--;
        
        if (charIndex === 0) {
          isDeleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          timer = setTimeout(tick, 300); // Brief pause before next phrase
          return;
        }
        timer = setTimeout(tick, 45); // 45ms per character when backspacing
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
    <div className="flex-1 flex flex-col justify-center items-center bg-background px-4 py-12 md:py-24">
      <div className="w-full max-w-2xl text-center space-y-8">
        {/* Reserve Logo */}
        <div className="relative h-28 w-28 overflow-hidden rounded-full border border-primary/20 bg-white mx-auto shadow-md transition-transform duration-300 hover:scale-105">
          <Image
            src="/logo.png"
            alt="Palamau Tiger Reserve Logo"
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Title & Tagline */}
        <div className="space-y-3">
          <span className="text-[10px] font-bold tracking-widest text-primary uppercase bg-primary/10 px-3.5 py-1.5 rounded-full">
            Department of Forests & Environment
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground font-sans uppercase">
            Palamau Tiger Reserve
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Official QR-based tree registry portal. Enter your tree's ID or your registered planter's name below to look up survival and growth history.
          </p>
        </div>

        {/* Search Tree Form */}
        <Card className="shadow-lg border-border bg-card max-w-md mx-auto rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center justify-center gap-1.5">
              <QrCode className="h-4 w-4 text-primary" /> Public Tree Lookup
            </h2>
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
                  className="pl-10 h-11 border-border focus-visible:ring-primary font-medium text-sm rounded-xl focus:border-primary"
                />
              </div>
              <Button type="submit" disabled={isSearching} className="bg-primary hover:bg-primary/95 text-white h-11 px-5 rounded-xl font-semibold text-sm">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Go'}
              </Button>
            </form>
            {searchError && (
              <p className="text-xs text-destructive text-left font-semibold flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <ShieldAlert className="h-4 w-4" />
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
                      className="w-full text-left p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all flex justify-between items-center group cursor-pointer"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {t.planter_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {t.species.split(' (')[0]} • Planted {new Date(t.planted_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                        #{t.id}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
