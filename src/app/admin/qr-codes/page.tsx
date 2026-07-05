'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import JSZip from 'jszip';
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
  ShieldAlert,
  Search,
  Download
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
  location?: string;
}

export default function QrCodesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search/filter states & printing state
  const [qrSearch, setQrSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [zipTotal, setZipTotal] = useState(0);
  const [zipLabel, setZipLabel] = useState('');

  // Download a specific ID range (inclusive) as a ZIP archive
  const downloadRangeAsZip = async (rangeStart: number, rangeEnd: number, label: string) => {
    const rangeTrees = trees.filter((t) => t.id >= rangeStart && t.id <= rangeEnd);
    if (rangeTrees.length === 0) {
      alert(`No trees found in range ${rangeStart}–${rangeEnd}.`);
      return;
    }

    setIsGeneratingZip(true);
    setZipProgress(0);
    setZipTotal(rangeTrees.length);
    setZipLabel(label);

    try {
      const { toJpeg } = await import('html-to-image');
      const zip = new JSZip();

      // Wait for the hidden ZIP DOM container to mount
      await new Promise((resolve) => setTimeout(resolve, 600));

      let successCount = 0;
      const failedTrees: number[] = [];

      for (let i = 0; i < rangeTrees.length; i++) {
        const tree = rangeTrees[i];
        const cardId = `zip-card-${tree.id}`;

        try {
          const node = document.getElementById(cardId);
          if (!node) throw new Error(`Element ${cardId} not found in DOM`);

          const dataUrl = await toJpeg(node, {
            quality: 0.95,
            pixelRatio: 3,
            backgroundColor: '#ffffff',
          });

          const base64Data = dataUrl.split(',')[1];
          zip.file(`tree-${tree.id}.jpg`, base64Data, { base64: true });
          successCount++;
        } catch (err) {
          console.error(`Failed to export tree ${tree.id} to ZIP:`, err);
          failedTrees.push(tree.id);
        }

        setZipProgress(i + 1);
        await new Promise((resolve) => setTimeout(resolve, 30));
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `ptr-tree-tags-${rangeStart}-${rangeEnd}.zip`;
      link.click();

      if (failedTrees.length > 0) {
        alert(`Done. ${successCount} tags saved. Failed IDs: ${failedTrees.join(', ')}`);
      } else {
        alert(`✅ All ${successCount} tags (${label}) downloaded successfully!`);
      }
    } catch (err) {
      console.error('ZIP compilation failed:', err);
      alert('Failed to compile ZIP archive. Please try again.');
    } finally {
      setIsGeneratingZip(false);
      setZipProgress(0);
      setZipTotal(0);
      setZipLabel('');
    }
  };

  // Client-side helper to download single tag as JPEG
  const downloadTagAsJpeg = async (treeId: number, cardId: string) => {
    try {
      const { toJpeg } = await import('html-to-image');
      const node = document.getElementById(cardId);
      if (!node) return;

      const dataUrl = await toJpeg(node, {
        quality: 0.98,
        pixelRatio: 3, // 3x resolution for high-quality standalone sharing
        backgroundColor: '#ffffff',
        filter: (element: any) => {
          // Exclude download buttons from rendering in the image
          return !element.classList?.contains('download-btn-exclude');
        }
      });

      const link = document.createElement('a');
      link.download = `tree-tag-${treeId}.jpeg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download tag image:', err);
    }
  };

  // Memoized filter list of trees
  const filteredTrees = useMemo(() => {
    return trees.filter((tree) => {
      if (!qrSearch.trim()) return true;
      const query = qrSearch.toLowerCase().trim();
      return (
        tree.id.toString() === query ||
        (tree.species || '').toLowerCase().includes(query) ||
        (tree.planter_name || '').toLowerCase().includes(query)
      );
    });
  }, [trees, qrSearch]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [qrSearch]);

  const itemsPerPage = 24;
  const totalPages = Math.ceil(filteredTrees.length / itemsPerPage);

  const displayedTrees = isPrinting
    ? filteredTrees
    : filteredTrees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 800);
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
            Printable sheet for all {filteredTrees.length} seeded trees. Sized for sticker or metal tag printing.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Quick Search/Filter Box */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ID, species, planter..."
              value={qrSearch}
              onChange={(e) => setQrSearch(e.target.value)}
              className="pl-9 h-11 border-border focus-visible:ring-primary text-sm font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link 
              href="/admin" 
              className={cn(
                buttonVariants({ variant: 'outline' }),
                "border-border gap-1.5 h-11 px-4 text-sm font-semibold"
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Link>

            {/* Three ranged ZIP download buttons */}
            <Button
              onClick={() => downloadRangeAsZip(1, 50, 'Trees 1–50')}
              disabled={isGeneratingZip}
              className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 h-11 px-4 text-xs shadow-md font-semibold cursor-pointer disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              ZIP 1–50
            </Button>
            <Button
              onClick={() => downloadRangeAsZip(51, 100, 'Trees 51–100')}
              disabled={isGeneratingZip}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-11 px-4 text-xs shadow-md font-semibold cursor-pointer disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              ZIP 51–100
            </Button>
            <Button
              onClick={() => downloadRangeAsZip(101, 150, 'Trees 101–150')}
              disabled={isGeneratingZip}
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5 h-11 px-4 text-xs shadow-md font-semibold cursor-pointer disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              ZIP 101–150
            </Button>

            <Button onClick={handlePrint} className="bg-primary hover:bg-primary/95 text-white gap-2 h-11 px-5 shadow-md font-semibold cursor-pointer">
              <Printer className="h-4 w-4" />
              Print Tags
            </Button>
          </div>
        </div>
      </div>

      {/* Grid of tags */}
      <div className="container mx-auto max-w-5xl">
        {filteredTrees.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-2xl bg-card">
            <ShieldAlert className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-semibold text-muted-foreground">No tags match the filter criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-items-center print:grid-cols-2 print:gap-4 print:p-0">
            {displayedTrees.map((tree) => {
              const treeUrl = `${siteUrl}/tree/${tree.id}`;

              return (
                <div 
                  id={`tree-card-${tree.id}`}
                  key={tree.id} 
                  className="w-[2.5in] h-[3.5in] border-2 border-primary/45 bg-white px-3 pt-2 pb-3 flex flex-col justify-start items-center text-black rounded-lg shadow-sm print:shadow-none print:border-black print:rounded-none relative break-inside-avoid page-break-inside-avoid"
                >
                  {/* Download Button (Screen Only, Excluded from JPEG and Print) */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadTagAsJpeg(tree.id, `tree-card-${tree.id}`);
                    }}
                    className="absolute top-1.5 left-1.5 h-6 w-6 p-0 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 print:hidden download-btn-exclude cursor-pointer z-10 transition-colors"
                    title="Download JPEG"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>

                  {/* 1mm top gap for hole punch clearance */}
                  <div className="h-[1mm] w-full shrink-0" />

                  {/* Tag Header (Text Left, Logo Right) */}
                  <div className="w-full flex items-center justify-between border-b border-gray-200 pb-1.5 shrink-0">
                    <div className="flex flex-col leading-tight text-left">
                      <span className="text-[9px] font-extrabold tracking-wider text-green-800 uppercase">
                        Palamau Tiger Reserve
                      </span>
                      <span className="text-[7px] text-gray-500 font-medium tracking-widest uppercase">
                        Government of Jharkhand
                      </span>
                    </div>
                    <img
                      src="/logo.png"
                      alt="PTR Logo"
                      width="200"
                      height="200"
                      className="h-8 w-8 rounded-full border border-gray-200 object-cover shrink-0"
                      style={{ imageRendering: 'high-quality', msInterpolationMode: 'bicubic' } as any}
                    />
                  </div>

                  {/* QR Code Section - fills remaining space, QR maximized */}
                  <div className="w-full flex flex-col items-center justify-center mt-2 mb-1">
                    <QRCodeSVG
                      value={treeUrl}
                      size={165}
                      level="H"
                      includeMargin={false}
                    />
                    <span className="text-[7px] text-gray-400 mt-1 font-mono tracking-widest uppercase">
                      Scan to view timeline
                    </span>
                  </div>

                  {/* Spacer to push footer down */}
                  <div className="flex-1" />

                  {/* Tag Footer */}
                  <div className="w-full border-t border-gray-200 pt-1.5 flex justify-center items-center">
                    <span className="text-xl font-extrabold text-green-800 tracking-wider font-sans uppercase">
                      Tree #{tree.id}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination controls for screen */}
        {!isPrinting && totalPages > 1 && (
          <div className="flex items-center justify-between border border-border bg-card px-4 py-3 rounded-xl shadow-sm mt-8 print:hidden">
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
                  <span className="font-semibold text-foreground">{filteredTrees.length}</span> tags
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

      {/* Hidden ZIP Generation Container (off-screen, only mounts during ZIP generation) */}
      {isGeneratingZip && (() => {
        // Determine which range is being generated from zipLabel
        const zipRangeTrees = trees.filter((t) => {
          if (zipLabel === 'Trees 1–50') return t.id >= 1 && t.id <= 50;
          if (zipLabel === 'Trees 51–100') return t.id >= 51 && t.id <= 100;
          if (zipLabel === 'Trees 101–150') return t.id >= 101 && t.id <= 150;
          return false;
        });
        return (
          <div id="zip-generation-container" className="absolute left-[-9999px] top-[-9999px] flex flex-col gap-4 bg-white p-4">
            {zipRangeTrees.map((tree) => {
              const treeUrl = `${siteUrl}/tree/${tree.id}`;
              return (
                <div
                  id={`zip-card-${tree.id}`}
                  key={tree.id}
                  className="w-[2.5in] h-[3.5in] border-2 border-primary/45 bg-white px-3 pt-2 pb-3 flex flex-col justify-start items-center text-black relative"
                >
                  <div className="h-[1mm] w-full shrink-0" />
                  <div className="w-full flex items-center justify-between border-b border-gray-200 pb-1.5 shrink-0">
                    <div className="flex flex-col leading-tight text-left">
                      <span className="text-[9px] font-extrabold tracking-wider text-green-800 uppercase">
                        Palamau Tiger Reserve
                      </span>
                      <span className="text-[7px] text-gray-500 font-medium tracking-widest uppercase">
                        Government of Jharkhand
                      </span>
                    </div>
                    <img
                      src="/logo.png"
                      alt="PTR Logo"
                      width="200"
                      height="200"
                      className="h-8 w-8 rounded-full border border-gray-200 object-cover shrink-0"
                      style={{ imageRendering: 'high-quality', msInterpolationMode: 'bicubic' } as any}
                    />
                  </div>
                  <div className="w-full flex flex-col items-center justify-center mt-2 mb-1">
                    <QRCodeSVG
                      value={treeUrl}
                      size={165}
                      level="H"
                      includeMargin={false}
                    />
                    <span className="text-[7px] text-gray-400 mt-1 font-mono tracking-widest uppercase">
                      Scan to view timeline
                    </span>
                  </div>
                  <div className="flex-1" />
                  <div className="w-full border-t border-gray-200 pt-1.5 flex justify-center items-center">
                    <span className="text-xl font-extrabold text-green-800 tracking-wider font-sans uppercase">
                      Tree #{tree.id}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Print preparation overlay */}
      {isPrinting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm print:hidden animate-pop-in">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <h2 className="text-lg font-bold text-foreground">Preparing Printable Tags...</h2>
          <p className="text-sm text-muted-foreground">Generating QR codes for {filteredTrees.length} trees</p>
        </div>
      )}

      {/* ZIP progress overlay */}
      {isGeneratingZip && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm print:hidden">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <h2 className="text-lg font-bold text-foreground">Generating ZIP — {zipLabel}</h2>
          <p className="text-sm text-muted-foreground">
            Processing {zipProgress} of {zipTotal} tags...
          </p>
          <div className="w-64 bg-secondary h-2 rounded-full mt-4 overflow-hidden border border-border">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: zipTotal > 0 ? `${(zipProgress / zipTotal) * 100}%` : '0%' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
