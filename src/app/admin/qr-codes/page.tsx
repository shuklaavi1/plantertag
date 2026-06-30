'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase, isMockMode } from '@/lib/supabase';
import { getMockTrees, getMockSession, signInMock } from '@/lib/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button, buttonVariants } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Printer, 
  Loader2, 
  LogIn, 
  AlertCircle,
  Info,
  QrCode,
  ShieldAlert
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';

const DEMO_EMAIL = "demo@ptr.org";
const DEMO_PASSWORD = "demo1234";

interface Tree {
  id: number;
  planter_name: string;
  species: string;
  planted_date: string;
  main_photo_url: string;
  latitude: number;
  longitude: number;
}

export default function QrCodesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Login form pre-filled
  const [loginEmail, setLoginEmail] = useState(DEMO_EMAIL);
  const [loginPassword, setLoginPassword] = useState(DEMO_PASSWORD);

  // Fetch trees list
  const fetchTrees = async () => {
    try {
      if (isMockMode) {
        setTrees(getMockTrees());
      } else {
        const { data, error: err } = await supabase
          .from('trees')
          .select('*')
          .order('id', { ascending: true });

        if (err) throw err;
        setTrees(data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch trees for QR sheet.');
    }
  };

  useEffect(() => {
    if (isMockMode) {
      const session = getMockSession();
      setUser(session);
      if (session) {
        fetchTrees();
      }
      setLoading(false);
    } else {
      // Check initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchTrees();
        }
        setLoading(false);
      });

      // Listen reactively to auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchTrees();
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
        fetchTrees();
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
        fetchTrees();
      }
      setActionLoading(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Determine site base URL (from env or window origin fallback)
  const getSiteUrl = () => {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return process.env.NEXT_PUBLIC_SITE_URL;
    }
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'http://localhost:3000';
  };

  const siteUrl = getSiteUrl();

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground">Checking authentication status...</p>
      </div>
    );
  }

  // RENDER DEMO LOGIN IF NOT SIGNED IN
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
                PTR QR Tag Grid Access
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

              <div className="bg-primary/5 border border-primary/10 text-muted-foreground text-xs p-3 rounded-lg flex gap-2 items-start">
                <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <p>
                  Default staff credentials pre-filled. Just click <strong>Sign In</strong> to load the QR tags.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  disabled={actionLoading === 'login'}
                  className="h-11 border-border font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  disabled={actionLoading === 'login'}
                  className="h-11 border-border font-medium"
                />
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                type="submit"
                disabled={actionLoading === 'login'}
                className="w-full h-11 bg-primary hover:bg-primary/95 text-white gap-2 font-medium"
              >
                {actionLoading === 'login' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating...
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
      </div>
    );
  }

  // RENDER DYNAMIC GRID IF LOGGED IN
  return (
    <div className="min-h-screen bg-background p-6">
      {/* Control bar - hidden during print */}
      <div className="container mx-auto max-w-5xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6 mb-8 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <QrCode className="h-6 w-6 text-primary" /> Print QR Codes
          </h1>
          <p className="text-sm text-muted-foreground">
            Printable sheet for all {trees.length} seeded trees. Sized for sticker or metal tag printing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link 
            href="/admin" 
            className={cn(
              buttonVariants({ variant: 'outline' }),
              "border-border gap-1.5 h-11 px-4"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Link>
          <Button onClick={handlePrint} className="bg-primary hover:bg-primary/95 text-white gap-2 h-11 px-5 shadow-md">
            <Printer className="h-4 w-4" />
            Print Tags
          </Button>
        </div>
      </div>

      {/* Grid of tags */}
      <div className="container mx-auto max-w-5xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-items-center print:grid-cols-2 print:gap-4 print:p-0">
          {trees.map((tree) => {
            const treeUrl = `${siteUrl}/tree/${tree.id}`;

            return (
              <div 
                key={tree.id} 
                className="w-[2.5in] h-[3.5in] border-2 border-primary/45 bg-white p-4 flex flex-col justify-between items-center text-black rounded-lg shadow-sm print:shadow-none print:border-black print:rounded-none relative break-inside-avoid page-break-inside-avoid"
              >
                {/* Tag Header */}
                <div className="w-full flex items-center gap-2 border-b border-gray-200 pb-1.5">
                  <div className="relative h-7 w-7 overflow-hidden rounded-full border border-gray-200 bg-white shrink-0">
                    <Image
                      src="/logo.png"
                      alt="PTR Logo"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[9px] font-extrabold tracking-wider text-green-800 uppercase">
                      Palamau Tiger Reserve
                    </span>
                    <span className="text-[7px] text-gray-500 font-medium tracking-widest uppercase">
                      Government of Jharkhand
                    </span>
                  </div>
                </div>

                {/* QR Code Section */}
                <div className="flex-1 flex flex-col justify-center items-center my-3">
                  <QRCodeSVG
                    value={treeUrl}
                    size={135}
                    level="H" // High error correction for outdoor scanning
                    includeMargin={false}
                  />
                  <span className="text-[7px] text-gray-400 mt-1 font-mono tracking-widest uppercase">
                    Scan to view timeline
                  </span>
                </div>

                {/* Tag Footer Details */}
                <div className="w-full border-t border-gray-200 pt-1.5 flex flex-col leading-tight">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="text-[10px] font-bold text-gray-950 truncate max-w-[120px]">
                      {tree.species.split(' (')[0]}
                    </span>
                    <span className="text-[12px] font-black text-green-800 shrink-0 font-mono">
                      #{tree.id}
                    </span>
                  </div>
                  <span className="text-[7px] text-gray-500 font-bold uppercase tracking-wider">
                    Location: Kasturba School, PTR
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
