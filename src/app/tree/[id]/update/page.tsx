'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase, isMockMode } from '@/lib/supabase';
import { getMockTrees, addMockLog, updateMockTreeStatus, getMockSession, signInMock } from '@/lib/mockData';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Camera, 
  Droplet, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  LogIn,
  Info,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DEMO_EMAIL = "demo@ptr.org";
const DEMO_PASSWORD = "demo1234";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function UpdateTreePage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const treeId = resolvedParams.id ? parseInt(resolvedParams.id, 10) : NaN;

  const [tree, setTree] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // 'visit' | 'photo' | 'login'
  const [gpsStatus, setGpsStatus] = useState<string | null>(null); // message for GPS capture
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Login form states
  const [loginEmail, setLoginEmail] = useState(DEMO_EMAIL);
  const [loginPassword, setLoginPassword] = useState(DEMO_PASSWORD);

  // Form states
  const [status, setStatus] = useState<string>('Healthy');
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isNaN(treeId)) {
      setError('Invalid Tree ID');
      setLoading(false);
      return;
    }

    const fetchTree = async () => {
      if (isMockMode) {
        const allTrees = getMockTrees();
        const data = allTrees.find(t => t.id === treeId) || null;
        if (!data) {
          setError('Tree not found in registry');
        } else {
          setTree(data);
          setStatus(data.status || 'Healthy');
        }
      } else {
        const { data, error } = await supabase
          .from('trees')
          .select('*')
          .eq('id', treeId)
          .single();
        
        if (error || !data) {
          setError('Tree not found in registry');
        } else {
          setTree(data);
          setStatus(data.status || 'Healthy');
        }
      }
    };

    if (isMockMode) {
      const session = getMockSession();
      setUser(session);
      if (session) {
        fetchTree();
      }
      setLoading(false);
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchTree();
        }
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchTree();
        }
      });

      return () => subscription.unsubscribe();
    }
  }, [treeId]);

  // Handle Inline Login
  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('login');
    setError(null);

    if (isMockMode) {
      if (loginEmail === DEMO_EMAIL && loginPassword === DEMO_PASSWORD) {
        signInMock();
        setUser({ email: DEMO_EMAIL, name: 'Demo Staff' });
        setSuccess('Logged in successfully!');
        setTimeout(() => setSuccess(null), 1200);
      } else {
        setError('Invalid email or password.');
      }
      setActionLoading(null);
    } else {
      const { data, error: loginErr } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (loginErr) {
        setError(loginErr.message || 'Invalid email or password.');
      } else {
        setUser(data.user);
        setSuccess('Logged in successfully!');
        setTimeout(() => setSuccess(null), 1200);
      }
      setActionLoading(null);
    }
  };

  // Helper function to query device GPS location
  const getGpsCoordinates = (): Promise<{ latitude: number | null, longitude: number | null }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setGpsStatus('Geolocation not supported by this browser.');
        resolve({ latitude: null, longitude: null });
        return;
      }

      setGpsStatus('Capturing GPS location...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsStatus('GPS location verified.');
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (err) => {
          console.warn('GPS capture error:', err.message);
          setGpsStatus('GPS signal unavailable. Proceeding without location.');
          resolve({ latitude: null, longitude: null });
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
    });
  };

  // 1. Log a simple watering/tending visit
  const handleLogVisit = async () => {
    if (!user || !tree) return;
    setActionLoading('visit');
    setError(null);
    setSuccess(null);

    try {
      if (isMockMode) {
        addMockLog({
          tree_id: tree.id,
          type: 'visit',
          note: note.trim() || undefined,
          staff_name: user.email,
        });
        updateMockTreeStatus(tree.id, status);
      } else {
        // a) Insert the watering log
        const { error: logErr } = await supabase
          .from('tree_logs')
          .insert({
            tree_id: tree.id,
            type: 'visit',
            note: note.trim() || null,
            staff_name: user.email,
          });

        if (logErr) throw logErr;

        // b) Update tree survival status
        const { error: statusErr } = await supabase
          .from('trees')
          .update({ status })
          .eq('id', tree.id);

        if (statusErr) throw statusErr;
      }

      setSuccess('Watering & tending visit logged successfully!');
      setNote('');
      setShowNote(false);
      
      // Redirect after 1.5s
      setTimeout(() => {
        router.push(`/tree/${tree.id}`);
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit visit log.');
    } finally {
      setActionLoading(null);
    }
  };

  // 2. Compress and upload a growth photo
  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tree || !selectedFile) return;
    setActionLoading('photo');
    setError(null);
    setSuccess(null);

    try {
      // Step A: Capture GPS coordinates first (non-blocking)
      const coords = await getGpsCoordinates();

      // Step B: Load image to canvas and compress it
      const img = new window.Image();
      img.src = URL.createObjectURL(selectedFile);
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image file.'));
      });

      const canvas = document.createElement('canvas');
      const max_width = 800; 
      const max_height = 600;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > max_width) {
          height *= max_width / width;
          width = max_width;
        }
      } else {
        if (height > max_height) {
          width *= max_height / height;
          height = max_height;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2D context for canvas');
      ctx.drawImage(img, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.82);
      });

      if (!blob) throw new Error('Image compression failed');

      if (isMockMode) {
        // Convert image blob to base64 Data URL so it fits in mock localStorage
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        addMockLog({
          tree_id: tree.id,
          type: 'photo',
          photo_url: dataUrl,
          note: note.trim() || undefined,
          log_latitude: coords.latitude || undefined,
          log_longitude: coords.longitude || undefined,
          staff_name: user.email,
        });
        updateMockTreeStatus(tree.id, status);
      } else {
        // Step C: Upload the compressed JPEG to Supabase Storage bucket 'tree-photos'
        const fileExt = 'jpg';
        const fileName = `tree-${tree.id}-${Date.now()}.${fileExt}`;
        
        setGpsStatus('Uploading growth photo...');
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('tree-photos')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: true
          });

        if (uploadErr) throw uploadErr;

        // Get public photo URL
        const { data: { publicUrl } } = supabase.storage
          .from('tree-photos')
          .getPublicUrl(fileName);

        // Step D: Insert the log with coordinates into database
        const { error: logErr } = await supabase
          .from('tree_logs')
          .insert({
            tree_id: tree.id,
            type: 'photo',
            photo_url: publicUrl,
            note: note.trim() || null,
            log_latitude: coords.latitude,
            log_longitude: coords.longitude,
            staff_name: user.email,
          });

        if (logErr) throw logErr;

        // Step E: Update tree status
        const { error: statusErr } = await supabase
          .from('trees')
          .update({ status })
          .eq('id', tree.id);

        if (statusErr) throw statusErr;
      }

      setSuccess('Growth photo and status updated successfully!');
      setSelectedFile(null);
      setPreviewUrl(null);
      setNote('');
      setShowNote(false);
      setGpsStatus(null);

      // Redirect after 1.5s
      setTimeout(() => {
        router.push(`/tree/${tree.id}`);
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit growth photo.');
      setGpsStatus(null);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

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
        <div className="w-full max-w-sm space-y-4">
          <div className="w-full max-w-sm mb-4">
            <Link href={`/tree/${treeId}`} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Tree Details
            </Link>
          </div>

          <Card className="w-full border-border shadow-lg bg-card">
            <CardHeader className="text-center space-y-1 pb-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-full border border-primary/20 bg-white mx-auto mb-2">
                <Image
                  src="/logo.png"
                  alt="Palamu Tiger Reserve Logo"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <CardTitle className="text-lg font-bold text-primary uppercase">Staff Login Required</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Authenticate to update Tree #{treeId}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleInlineLogin}>
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
                    Staff demo credentials:<br />
                    Email: <code className="bg-background px-1 rounded font-semibold text-primary">{DEMO_EMAIL}</code><br />
                    Password: <code className="bg-background px-1 rounded font-semibold text-primary">{DEMO_PASSWORD}</code>
                  </p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="staff@ptr.org"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    disabled={actionLoading === 'login'}
                    className="h-10 border-border focus-visible:ring-primary text-sm font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    disabled={actionLoading === 'login'}
                    className="h-10 border-border focus-visible:ring-primary text-sm"
                  />
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button
                  type="submit"
                  disabled={actionLoading === 'login'}
                  className="w-full h-10 bg-primary hover:bg-primary/95 text-white gap-2 font-medium text-sm"
                >
                  {actionLoading === 'login' ? (
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
        </div>
      </div>
    );
  }

  // RENDER WORKSPACE STATE IF NOT FOUND OR ERRORED
  if (error && !tree) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 text-center">
        <Card className="w-full max-w-sm border-border p-6 shadow-md bg-card">
          <div className="h-16 w-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Registry Error</h2>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
          <div className="mt-6">
            <Link href="/" className={cn(buttonVariants({ variant: 'default' }), "w-full bg-primary text-white hover:bg-primary/95")}>
              Go to Homepage
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 px-4 py-8">
      <div className="w-full max-w-md mx-auto space-y-4">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link href={`/tree/${tree.id}`} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 font-semibold">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Tree Details
          </Link>
          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground border-border/80 bg-muted px-2 py-0.5">
            Tree #{tree.id}
          </Badge>
        </div>

        {/* Tree Overview Mini-Card */}
        <Card className="border-border bg-card shadow-sm overflow-hidden">
          <div className="flex gap-4 p-4 items-center">
            <div className="relative h-14 w-14 rounded-lg overflow-hidden shrink-0 border border-border bg-secondary">
              <Image
                src={tree.main_photo_url || "/demo/tree_mature.png"}
                alt={tree.species}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none mb-1">
                Registry Profile
              </span>
              <h1 className="text-sm font-extrabold text-foreground truncate leading-tight">
                {tree.species}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                Planter: {tree.planter_name}
              </p>
            </div>
          </div>
        </Card>

        {/* Success/Error Alerts */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3.5 rounded-xl flex gap-2 items-start animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs p-3.5 rounded-xl flex gap-2 items-start animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
            <span className="font-medium">{success}</span>
          </div>
        )}

        {gpsStatus && (
          <div className="bg-blue-500/5 border border-blue-500/10 text-blue-600 text-xs p-3.5 rounded-xl flex gap-2 items-center animate-pulse">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
            <span className="font-semibold uppercase tracking-wider text-[9px]">{gpsStatus}</span>
          </div>
        )}

        {/* Dynamic Tree Survival Status Panel */}
        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Tree Survival Condition
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Review and record the tree's health condition.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="status">Condition Status</Label>
              <Select value={status} onValueChange={(val) => setStatus(val || 'Healthy')}>
                <SelectTrigger className="w-full h-11 border-border focus:ring-primary text-sm font-semibold">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="Healthy" className="text-sm font-medium text-emerald-600 hover:bg-emerald-500/10">💚 Healthy</SelectItem>
                  <SelectItem value="Needs Attention" className="text-sm font-medium text-amber-600 hover:bg-amber-500/10">💛 Needs Attention</SelectItem>
                  <SelectItem value="Dead" className="text-sm font-medium text-rose-600 hover:bg-rose-500/10">❤️ Dead</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Action A: Log Tending / Watering Visit */}
        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Tending / Watering Registry
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Instant log without photo. Marks task as checked in registry.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showNote ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNote(true)}
                className="w-full text-xs font-medium border-border hover:bg-secondary h-9 gap-1"
              >
                <Plus className="h-3.5 w-3.5 text-primary" /> Add a remark (optional)
              </Button>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="visitNote">Optional Remark</Label>
                <Input
                  id="visitNote"
                  placeholder="e.g. soil holds moisture, applied mulch..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={actionLoading !== null}
                  className="h-10 border-border focus-visible:ring-primary text-sm"
                />
              </div>
            )}

            <Button
              onClick={handleLogVisit}
              disabled={actionLoading !== null}
              className="w-full h-11 bg-primary hover:bg-primary/95 text-white gap-2 font-semibold text-sm"
            >
              {actionLoading === 'visit' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Logging Visit...
                </>
              ) : (
                <>
                  <Droplet className="h-4 w-4 fill-current text-white" />
                  Log Tend / Water Visit
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Action B: Upload Growth Photo with GPS Capture */}
        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Growth Photo Log
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Watering log + photo proof. Automatically verifies GPS coordinate matching.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleUploadPhoto}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cameraInput">Tree Growth Snapshot</Label>
                
                {previewUrl ? (
                  <div className="relative w-full h-48 rounded-xl overflow-hidden border border-border/80 bg-secondary flex justify-center items-center group">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute bottom-2 right-2 bg-rose-600 hover:bg-rose-500 font-semibold text-xs h-8 text-white"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full">
                    <label 
                      htmlFor="cameraInput"
                      className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border hover:border-primary/50 rounded-xl cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                        <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-xs font-semibold text-foreground">
                          Tap to Take Photo
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Camera opens instantly on mobile devices
                        </p>
                      </div>
                      <input 
                        id="cameraInput" 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        onChange={handleFileChange}
                        required
                        disabled={actionLoading !== null}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Shared or specific optional note for photo */}
              <div className="space-y-1.5">
                <Label htmlFor="photoNote">Photo Remark (Optional)</Label>
                <Input
                  id="photoNote"
                  placeholder="e.g. leaf growth looks healthy..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={actionLoading !== null}
                  className="h-10 border-border focus-visible:ring-primary text-sm"
                />
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                type="submit"
                disabled={actionLoading !== null || !selectedFile}
                className="w-full h-11 bg-primary hover:bg-primary/95 text-white gap-2 font-semibold text-sm"
              >
                {actionLoading === 'photo' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving Log...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Submit Growth Photo
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
