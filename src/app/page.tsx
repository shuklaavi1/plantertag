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
  TreePine,
  Clock,
  Compass,
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
    <div className="flex-1 flex flex-col justify-center items-center relative overflow-hidden px-4 py-16 md:py-28 min-h-[calc(100vh-4rem)]">
      
      {/* ── Background Cinematic Loop Video ── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260619_191346_9d19d66e-86a4-47f7-8dc6-712c1788c3b2.mp4"
          className="w-full h-full object-cover scale-[1.01]"
        />
        {/* Dark subtle forest-themed gradient scrim overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/40 via-neutral-950/70 to-neutral-950/90 backdrop-blur-[1.5px]" />
      </div>

      <div className="w-full max-w-2xl text-center space-y-8 relative z-10">

        {/* ── Logo + Sovereign Government Header ── */}
        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="relative h-20 w-20 overflow-hidden rounded-full border border-white/10 bg-white/95 p-1 shadow-lg transition-transform duration-300 hover:scale-[1.04]">
            <Image
              src="/logo.png"
              alt="Palamau Tiger Reserve Logo"
              fill
              className="object-cover p-1.5"
              priority
            />
          </div>

          <div className="space-y-2">
            <span className="inline-block text-[9px] font-bold tracking-widest text-emerald-300 uppercase bg-emerald-950/80 border border-emerald-800/30 px-3.5 py-1 rounded-full">
              Jharkhand Forest Department · Govt. of India
            </span>
            <h1 className="text-4xl sm:text-5xl font-heading font-semibold tracking-tight text-white leading-none">
              Palamau Tiger Reserve
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-sm mx-auto leading-relaxed font-light">
              Official Forest Conservation & Sovereign Tree Registry Portal
            </p>
          </div>
        </div>

        {/* ── Liquid Glass Search Card ── */}
        <Card className="border border-white/15 bg-neutral-900/40 backdrop-blur-md text-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300 hover:border-white/20 animate-in fade-in zoom-in-95 duration-500 delay-150">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xs font-bold text-emerald-300 uppercase tracking-widest flex items-center justify-center gap-1.5 font-mono">
              <QrCode className="h-4.5 w-4.5 text-emerald-400" /> Public Tree Lookup
            </h2>
            <p className="text-[11px] text-neutral-300 text-center font-light leading-snug">
              Enter your tree code or registered planter's name to view history.
            </p>
            
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-emerald-300/60" />
                <Input
                  type="text"
                  placeholder={placeholder}
                  value={treeId}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className="pl-10 h-11 bg-neutral-950/40 border-white/10 text-white placeholder-neutral-400 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-0 font-medium text-sm rounded-md"
                />
              </div>
              <Button type="submit" disabled={isSearching} className="bg-emerald-600 hover:bg-emerald-500 text-white h-11 px-5 rounded-md font-semibold text-sm shadow-md transition-colors flex items-center gap-1 cursor-pointer">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Go</span><ArrowRight className="h-3.5 w-3.5" /></>}
              </Button>
            </form>
            
            {searchError && (
              <p className="text-xs text-rose-400 text-left font-semibold flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <ShieldAlert className="h-4 w-4" />
                {searchError}
              </p>
            )}

            {/* Matching Trees List (Glassmorphic) */}
            {matchingTrees.length > 0 && (
              <div className="mt-2 text-left border border-white/10 bg-black/30 rounded-md p-3 space-y-2 max-h-60 overflow-y-auto">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2 font-mono">
                  Matching Planters ({matchingTrees.length})
                </p>
                <div className="space-y-2">
                  {matchingTrees.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => router.push(`/tree/${t.id}`)}
                      className="w-full text-left p-3 rounded-md border border-white/5 bg-white/5 hover:border-emerald-500 hover:bg-emerald-950/20 transition-all flex justify-between items-center group cursor-pointer"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                          {t.planter_name}
                        </p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">
                          {t.species.split(' (')[0]} · Planted {new Date(t.planted_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                        #{t.id}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Modern Glassmorphism Stats Cards ── */}
        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          <div className="border border-white/10 bg-neutral-900/30 backdrop-blur-sm p-4 rounded-md text-left flex flex-col justify-between space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-bold uppercase tracking-wider font-mono">
              <TreePine className="h-3.5 w-3.5 text-emerald-400" />
              <span>Forest Canopy</span>
            </div>
            <div>
              <p className="text-2xl font-heading font-semibold text-white">95%+</p>
              <p className="text-[10px] text-neutral-400 font-light">Sapling survival logging standard</p>
            </div>
          </div>

          <div className="border border-white/10 bg-neutral-900/30 backdrop-blur-sm p-4 rounded-md text-left flex flex-col justify-between space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-bold uppercase tracking-wider font-mono">
              <Clock className="h-3.5 w-3.5 text-emerald-400" />
              <span>Active Logging</span>
            </div>
            <div>
              <p className="text-2xl font-heading font-semibold text-white">10 Years</p>
              <p className="text-[10px] text-neutral-400 font-light">Active monitoring & telemetry scope</p>
            </div>
          </div>
        </div>

        {/* ── Inauguration Controller ── */}
        <div className="pt-2 animate-in fade-in duration-500 delay-500">
          <InaugurateLaunch />
        </div>

      </div>
    </div>
  );
}
