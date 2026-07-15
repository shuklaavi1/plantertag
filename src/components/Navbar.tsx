'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { supabase, isMockMode } from '@/lib/supabase';
import { getMockSession, signOutMock, getMockGuardAssignments } from '@/lib/mockData';
import { Button, buttonVariants } from '@/components/ui/button';
import { 
  LogOut, 
  LayoutDashboard, 
  User, 
  RefreshCw, 
  Menu, 
  X, 
  HelpCircle, 
  Map, 
  Trees, 
  Info 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getQueue, syncOfflineQueue } from '@/lib/offlineQueue';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHowToUseOpen, setIsHowToUseOpen] = useState(false);
  const [assignedZones, setAssignedZones] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  const checkQueue = async () => {
    try {
      const q = await getQueue();
      setQueueCount(q.length);
    } catch (e) {
      console.warn('checkQueue error in Navbar:', e);
    }
  };

  useEffect(() => {
    checkQueue();
    
    const handleOnline = () => {
      syncOfflineQueue();
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('ptr_sync_queue_changed', checkQueue);
    
    if (typeof window !== 'undefined' && navigator.onLine) {
      syncOfflineQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('ptr_sync_queue_changed', checkQueue);
    };
  }, []);

  useEffect(() => {
    if (isMockMode) {
      setUser(getMockSession());
      
      const handleAuthChange = () => {
        setUser(getMockSession());
      };
      window.addEventListener('ptr_auth_change', handleAuthChange);
      return () => window.removeEventListener('ptr_auth_change', handleAuthChange);
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  // Fetch guard assignments dynamically
  useEffect(() => {
    if (!user) {
      setAssignedZones([]);
      return;
    }
    const fetchAssignments = async () => {
      try {
        if (isMockMode) {
          setAssignedZones(getMockGuardAssignments(user.email));
        } else {
          const { data } = await supabase
            .from('guard_assignments')
            .select('zone')
            .eq('staff_email', user.email);
          setAssignedZones(data?.map((d: any) => d.zone) || []);
        }
      } catch (err) {
        console.warn('Failed to fetch assignments:', err);
      }
    };
    fetchAssignments();
  }, [user]);

  // Click-outside listener to close menu
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleLogout = async () => {
    if (isMockMode) {
      signOutMock();
    } else {
      await supabase.auth.signOut();
    }
    setUser(null);
    setAssignedZones([]);
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-md print:hidden">
        <div className="container mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-primary/20 bg-white">
              <Image
                src="/logo.png"
                alt="Palamau Tiger Reserve Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-semibold tracking-wide uppercase text-primary text-[10px] sm:text-xs">
                <span className="sm:hidden">PTR</span>
                <span className="hidden sm:inline">Palamau Tiger Reserve</span>
              </span>
              <span className="text-[9px] tracking-widest text-muted-foreground uppercase hidden sm:block">
                Tree Tracker
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-2 relative" ref={menuRef}>
            {user && queueCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full animate-pulse mr-1">
                <RefreshCw className="h-3 w-3 animate-spin text-amber-500" />
                {queueCount} pending
              </span>
            )}

            {/* Combined Top-Right Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-md border border-border bg-card hover:bg-muted/10 transition-all font-semibold text-sm cursor-pointer shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Menu className="h-4 w-4 text-primary" />
                <span>Menu</span>
                {user && (
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md border border-border bg-card p-2.5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                  {user && (
                    <div className="px-2.5 py-1.5 border-b border-border/50 mb-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Logged In As</p>
                      <p className="text-xs font-semibold text-foreground truncate">{user.email}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    {user ? (
                      <>
                        {assignedZones.length > 0 && (
                          <Link
                            href="/my-trees"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-primary/5 hover:text-primary transition-colors font-medium"
                          >
                            <Trees className="h-4 w-4 text-primary" />
                            My Trees
                          </Link>
                        )}
                        <Link
                          href="/admin"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-primary/5 hover:text-primary transition-colors font-medium"
                        >
                          <LayoutDashboard className="h-4 w-4 text-primary" />
                          Admin Dashboard
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/login"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-primary/5 hover:text-primary transition-colors font-medium"
                        >
                          <User className="h-4 w-4 text-primary" />
                          Staff Login
                        </Link>
                        <Link
                          href="/admin"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-primary/5 hover:text-primary transition-colors font-medium"
                        >
                          <LayoutDashboard className="h-4 w-4 text-primary" />
                          Admin Dashboard
                        </Link>
                      </>
                    )}
                    
                    <Link
                      href="/map"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-primary/5 hover:text-primary transition-colors font-medium"
                    >
                      <Map className="h-4 w-4 text-primary" />
                      Interactive Map
                    </Link>

                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsHowToUseOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-left text-foreground hover:bg-primary/5 hover:text-primary transition-colors font-medium cursor-pointer"
                    >
                      <HelpCircle className="h-4 w-4 text-primary" />
                      How to Use
                    </button>

                    {user && (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          handleLogout();
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-left text-rose-600 hover:bg-rose-500/10 transition-colors font-medium cursor-pointer border-t border-border/40 pt-2 mt-1"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Global How to Use Modal */}
      {isHowToUseOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 print:hidden">
          <div className="bg-card border border-border rounded-lg max-w-md w-full shadow-xl p-6 text-left relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsHowToUseOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none p-1 rounded-lg hover:bg-muted/30"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-4">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">How to Use the Portal</h3>
            </div>

            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <div className="space-y-1">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  For Public Visitors:
                </p>
                <p className="pl-3 text-xs">
                  Scan any tree's QR tag or enter its Tree ID or planter's name on the homepage lookup box to view its growth timeline, survival status, coordinates, and download a club membership certificate.
                </p>
              </div>

              <div className="space-y-1 pt-2 border-t border-border/40">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  For Forest Guards:
                </p>
                <p className="pl-3 text-xs">
                  Log in via <strong>Staff Login</strong> under the menu. Go to <strong>My Trees</strong> in the menu to see the trees in your assigned zone. Scan a tree's tag and tap <strong>Staff Update</strong> to water it, update its health status, capture the device GPS, or upload growth photos.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => setIsHowToUseOpen(false)}
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs px-5 py-2 rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Got It
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
