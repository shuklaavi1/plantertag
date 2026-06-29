'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase, isMockMode } from '@/lib/supabase';
import { getMockSession, signOutMock } from '@/lib/mockData';
import { Button, buttonVariants } from '@/components/ui/button';
import { LogOut, LayoutDashboard, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (isMockMode) {
      setUser(getMockSession());
      
      const handleAuthChange = () => {
        setUser(getMockSession());
      };
      window.addEventListener('ptr_auth_change', handleAuthChange);
      return () => window.removeEventListener('ptr_auth_change', handleAuthChange);
    } else {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
      });

      // Listen reactively to auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const handleLogout = async () => {
    if (isMockMode) {
      signOutMock();
    } else {
      await supabase.auth.signOut();
    }
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-md print:hidden">
      <div className="container mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        {/* The Palamu Tiger Reserve logo is wrapped in a Link as requested */}
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-primary/20 bg-white">
            <Image
              src="/logo.png"
              alt="Palamu Tiger Reserve Logo"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-sans text-sm font-semibold tracking-wide uppercase text-primary">
              Palamu Tiger Reserve
            </span>
            <span className="text-[10px] tracking-widest text-muted-foreground uppercase">
              Tree Tracker (PTR)
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Link 
                href="/admin" 
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  "hidden sm:flex gap-1.5 text-foreground hover:text-primary"
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <div className="flex items-center gap-2">
                <span className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full border border-border">
                  <User className="h-3 w-3 text-primary" />
                  {user.email}
                </span>
                <Button variant="outline" size="sm" onClick={handleLogout} className="border-border hover:bg-destructive/10 hover:text-destructive gap-1.5">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </>
          ) : (
            <Link 
              href="/login" 
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                "border-border hover:border-primary hover:text-primary"
              )}
            >
              Staff Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
