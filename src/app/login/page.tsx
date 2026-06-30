'use client';

import { useState, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, isMockMode } from '@/lib/supabase';
import { signInMock } from '@/lib/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ShieldAlert, LogIn, Loader2, Info } from 'lucide-react';

const DEMO_EMAIL = "demo@ptr.org";
const DEMO_PASSWORD = "demo1234";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the redirect path from query params, fallback to /admin
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isMockMode) {
      if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
        signInMock();
        router.push(redirectTo);
        router.refresh();
      } else {
        setError('Invalid email or password.');
        setLoading(false);
      }
    } else {
      const { data, error: loginErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginErr) {
        setError(loginErr.message || 'Invalid email or password.');
        setLoading(false);
      } else {
        router.push(redirectTo);
        router.refresh();
      }
    }
  };

  return (
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
              Staff Portal
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Sign in to log tree watering and growth photos
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-lg flex gap-2 items-start">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
  
            {/* Alert box reminding about staff credentials */}
            <div className="bg-primary/5 border border-primary/10 text-muted-foreground text-xs p-3 rounded-lg flex gap-2 items-start">
              <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <p>
                Fields are pre-filled with default staff credentials 
                (<code className="bg-background px-1 rounded font-semibold text-primary">{DEMO_EMAIL}</code>).
              </p>
            </div>
  
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@ptr.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11 border-border focus-visible:ring-primary font-medium"
              />
            </div>
  
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="h-11 border-border focus-visible:ring-primary font-medium"
              />
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary hover:bg-primary/95 text-white gap-2 font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center bg-background px-4 py-16">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading...</p>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
