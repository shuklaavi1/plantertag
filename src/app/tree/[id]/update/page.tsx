'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase, isMockMode } from '@/lib/supabase';
import { getMockTrees, addMockLog, updateMockTreeStatus, getMockSession, signInMock, updateMockTreeDetails } from '@/lib/mockData';
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
  MapPin,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { addToQueue, getQueue } from '@/lib/offlineQueue';


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
  const [actionLoading, setActionLoading] = useState<string | null>(null); // 'visit' | 'photo' | 'login' | 'edit'
  const [gpsStatus, setGpsStatus] = useState<string | null>(null); // message for GPS capture
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [queueCount, setQueueCount] = useState(0);

  // Login form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Form states
  const [status, setStatus] = useState<string>('Healthy');
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Edit core details form states
  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false);
  const [editPlanterName, setEditPlanterName] = useState('');
  const [editSpecies, setEditSpecies] = useState('');
  const [editPlantedDate, setEditPlantedDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);

  const checkQueue = async () => {
    try {
      const q = await getQueue();
      // Filter count for this tree specifically
      const thisTreeQueue = q.filter(item => item.tree_id === treeId);
      setQueueCount(thisTreeQueue.length);
    } catch (e) {
      console.warn('Queue check error in Update page:', e);
    }
  };

  const fetchTree = async () => {
    if (isNaN(treeId)) {
      setError('Invalid Tree ID');
      setLoading(false);
      return;
    }
    
    if (isMockMode) {
      const allTrees = getMockTrees();
      const data = allTrees.find(t => t.id === treeId) || null;
      if (!data) {
        setError('Tree not found in registry');
      } else {
        setTree(data);
        setStatus(data.status || 'Healthy');
        setEditPlanterName(data.planter_name || '');
        setEditSpecies(data.species || '');
        setEditPlantedDate(data.planted_date || '');
        setEditLocation(data.location || '');
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
        setEditPlanterName(data.planter_name || '');
        setEditSpecies(data.species || '');
        setEditPlantedDate(data.planted_date || '');
        setEditLocation(data.location || '');
      }
    }
  };

  useEffect(() => {
    if (isNaN(treeId)) {
      setError('Invalid Tree ID');
      setLoading(false);
      return;
    }

    if (isMockMode) {
      (async () => {
        const session = getMockSession();
        setUser(session);
        if (session) {
          await fetchTree();
        }
        setLoading(false);
      })();
    } else {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchTree();
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

  useEffect(() => {
    checkQueue();
    window.addEventListener('ptr_sync_queue_changed', checkQueue);
    
    const handleDataSynced = () => {
      fetchTree();
    };
    window.addEventListener('ptr_data_synced', handleDataSynced);

    return () => {
      window.removeEventListener('ptr_sync_queue_changed', checkQueue);
      window.removeEventListener('ptr_data_synced', handleDataSynced);
    };
  }, [treeId]);

  // Handle Inline Login
  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('login');
    setError(null);

    if (isMockMode) {
      signInMock(loginEmail);
      setUser({ email: loginEmail, name: loginEmail.split('@')[0] || 'Forest Guard' });
      setSuccess('Logged in successfully!');
      setTimeout(() => setSuccess(null), 1200);
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
      // Offline check
      if (typeof window !== 'undefined' && !navigator.onLine) {
        await addToQueue({
          tree_id: tree.id,
          type: 'visit',
          status,
          note: note.trim() || undefined,
          staff_name: user.email
        });
        setSuccess('Saved. Will upload when you have signal.');
        setNote('');
        setShowNote(false);
        setTimeout(() => {
          router.push(`/tree/${tree.id}`);
          router.refresh();
        }, 1500);
        return;
      }

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
      console.warn('Log visit error, falling back to offline queue:', err);
      try {
        await addToQueue({
          tree_id: tree.id,
          type: 'visit',
          status,
          note: note.trim() || undefined,
          staff_name: user.email
        });
        setSuccess('Saved. Will upload when you have signal.');
        setNote('');
        setShowNote(false);
        setTimeout(() => {
          router.push(`/tree/${tree.id}`);
          router.refresh();
        }, 1500);
      } catch (queueErr) {
        setError(err.message || 'Failed to submit visit log.');
      }
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

    let coords: { latitude: number | null, longitude: number | null } = { latitude: null, longitude: null };
    try {
      // Step A: Capture GPS coordinates first (non-blocking)
      coords = await getGpsCoordinates();

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

      // Offline check
      if (typeof window !== 'undefined' && !navigator.onLine) {
        await addToQueue({
          tree_id: tree.id,
          type: 'photo',
          status,
          note: note.trim() || undefined,
          photoBlob: blob,
          gpsCoords: { latitude: coords.latitude, longitude: coords.longitude },
          staff_name: user.email
        });
        setSuccess('Saved. Will upload when you have signal.');
        setSelectedFile(null);
        setPreviewUrl(null);
        setNote('');
        setShowNote(false);
        setGpsStatus(null);
        setTimeout(() => {
          router.push(`/tree/${tree.id}`);
          router.refresh();
        }, 1500);
        return;
      }

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
      console.warn('Upload photo error, falling back to offline queue:', err);
      try {
        let fallbackBlob: Blob = selectedFile;
        // If image compressed successfully, use that instead of original file
        const blob = await new Promise<Blob | null>((resolve) => {
          const canvas = document.createElement('canvas');
          canvas.width = 100;
          canvas.height = 100;
          canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.82);
        });
        
        await addToQueue({
          tree_id: tree.id,
          type: 'photo',
          status,
          note: note.trim() || undefined,
          photoBlob: fallbackBlob,
          gpsCoords: { latitude: coords.latitude || null, longitude: coords.longitude || null },
          staff_name: user.email
        });
        setSuccess('Saved. Will upload when you have signal.');
        setSelectedFile(null);
        setPreviewUrl(null);
        setNote('');
        setShowNote(false);
        setGpsStatus(null);
        setTimeout(() => {
          router.push(`/tree/${tree.id}`);
          router.refresh();
        }, 1500);
      } catch (queueErr) {
        setError(err.message || 'Failed to submit growth photo.');
        setGpsStatus(null);
      }
    } finally {
      setActionLoading(null);
    }
  };

  // 3. Edit Core Tree Details
  const handleEditDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tree) return;
    setActionLoading('edit');
    setError(null);
    setSuccess(null);

    let bannerBlob: Blob | null = null;
    let coords: { latitude: number | null, longitude: number | null } = { latitude: null, longitude: null };
    try {
      // Capture device coordinates automatically
      coords = await getGpsCoordinates();
      
      if (selectedBannerFile) {
        // Compress banner image
        const img = new window.Image();
        img.src = URL.createObjectURL(selectedBannerFile);
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load banner image.'));
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
        if (!ctx) throw new Error('Could not get 2D context');
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.82);
        });

        if (!compressed) throw new Error('Banner compression failed');
        bannerBlob = compressed;
      }

      // Offline check
      if (typeof window !== 'undefined' && !navigator.onLine) {
        await addToQueue({
          tree_id: tree.id,
          type: 'edit',
          status: tree.status || 'Healthy',
          planter_name: editPlanterName,
          species: editSpecies,
          planted_date: editPlantedDate,
          location: editLocation,
          photoBlob: bannerBlob || undefined,
          staff_name: user.email,
          gpsCoords: coords.latitude !== null ? coords : undefined
        });
        setSuccess('Saved details. Will upload when you have signal.');
        setSelectedBannerFile(null);
        setBannerPreviewUrl(null);
        setTimeout(() => {
          router.push(`/tree/${tree.id}`);
          router.refresh();
        }, 1500);
        return;
      }

      // Online logic
      let bannerPhotoUrl = '';
      if (bannerBlob) {
        if (isMockMode) {
          bannerPhotoUrl = await blobToBase64(bannerBlob);
        } else {
          const fileExt = 'jpg';
          const fileName = `tree-banner-${tree.id}-${Date.now()}.${fileExt}`;
          const { error: uploadErr } = await supabase.storage
            .from('tree-photos')
            .upload(fileName, bannerBlob, {
              contentType: 'image/jpeg',
              cacheControl: '3600',
              upsert: true
            });
          if (uploadErr) throw uploadErr;

          const { data: { publicUrl } } = supabase.storage
            .from('tree-photos')
            .getPublicUrl(fileName);
          bannerPhotoUrl = publicUrl;
        }
      }

      const updateData: any = {
        planter_name: editPlanterName,
        species: editSpecies,
        planted_date: editPlantedDate,
        location: editLocation
      };
      if (bannerPhotoUrl) {
        updateData.main_photo_url = bannerPhotoUrl;
      }
      if (coords.latitude !== null) {
        updateData.latitude = coords.latitude;
        updateData.longitude = coords.longitude;
      }

      if (isMockMode) {
        updateMockTreeDetails(tree.id, updateData);
      } else {
        const { error: updateErr } = await supabase
          .from('trees')
          .update(updateData)
          .eq('id', tree.id);
        if (updateErr) throw updateErr;
      }

      setSuccess('Tree details updated.');
      setSelectedBannerFile(null);
      setBannerPreviewUrl(null);

      // Redirect after 1.5s
      setTimeout(() => {
        router.push(`/tree/${tree.id}`);
        router.refresh();
      }, 1500);

    } catch (err: any) {
      console.warn('Edit details error, falling back to offline queue:', err);
      try {
        let fallbackBlob: Blob | undefined = selectedBannerFile || undefined;
        await addToQueue({
          tree_id: tree.id,
          type: 'edit',
          status: tree.status || 'Healthy',
          planter_name: editPlanterName,
          species: editSpecies,
          planted_date: editPlantedDate,
          location: editLocation,
          photoBlob: fallbackBlob,
          staff_name: user.email,
          gpsCoords: coords.latitude !== null ? coords : undefined
        });
        setSuccess('Saved details. Will upload when you have signal.');
        setSelectedBannerFile(null);
        setBannerPreviewUrl(null);
        setTimeout(() => {
          router.push(`/tree/${tree.id}`);
          router.refresh();
        }, 1500);
      } catch (queueErr) {
        setError(err.message || 'Failed to update details.');
      }
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

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedBannerFile(file);
      setBannerPreviewUrl(URL.createObjectURL(file));
    }
  };

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  // RENDER LOGIN IF NOT SIGNED IN
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground">Checking authentication status...</p>
      </div>
    );
  }

  // RENDER LOGIN IF NOT SIGNED IN
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
                  alt="Palamau Tiger Reserve Logo"
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
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4 text-center space-y-4 animate-pop-in">
            <div className="h-16 w-16 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Action Completed</h3>
            <p className="text-sm text-muted-foreground font-medium">{success}</p>
          </div>
        </div>
      )}

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

        {/* Sync Queue Warning Badge */}
        {queueCount > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3.5 flex items-center gap-2 text-amber-700 text-xs font-semibold animate-pulse">
            <RefreshCw className="h-4.5 w-4.5 animate-spin text-amber-600 shrink-0" />
            <span>{queueCount} {queueCount === 1 ? 'update' : 'updates'} waiting to sync locally for this tree.</span>
          </div>
        )}

        {/* Success/Error Alerts */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3.5 rounded-xl flex gap-2 items-start animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
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

        {/* Collapsible Action C: Edit Tree Details */}
        <Card className="border-border bg-card shadow-md">
          <button
            type="button"
            onClick={() => setIsEditDetailsOpen(!isEditDetailsOpen)}
            className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-muted/10 transition-colors"
          >
            <div className="text-left">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                Edit Tree Details
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground mt-0.5">
                Correct core planter, species, location or banner photo
              </CardDescription>
            </div>
            <span className="text-muted-foreground text-xs font-bold font-sans">
              {isEditDetailsOpen ? 'Hide' : 'Show'}
            </span>
          </button>

          {isEditDetailsOpen && (
            <form onSubmit={handleEditDetails} className="border-t border-border/60">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="planterName">Planter Name</Label>
                  <Input
                    id="planterName"
                    value={editPlanterName}
                    onChange={(e) => setEditPlanterName(e.target.value)}
                    required
                    disabled={actionLoading !== null}
                    className="h-10 border-border text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="treeSpecies">Tree Species</Label>
                  <Input
                    id="treeSpecies"
                    value={editSpecies}
                    onChange={(e) => setEditSpecies(e.target.value)}
                    required
                    disabled={actionLoading !== null}
                    className="h-10 border-border text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="plantedDate">Date Planted</Label>
                  <Input
                    id="plantedDate"
                    type="date"
                    value={editPlantedDate}
                    onChange={(e) => setEditPlantedDate(e.target.value)}
                    required
                    disabled={actionLoading !== null}
                    className="h-10 border-border text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="treeLocation">Location</Label>
                  <Input
                    id="treeLocation"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    required
                    disabled={actionLoading !== null}
                    className="h-10 border-border text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bannerInput">Replace Banner Photo</Label>
                  {bannerPreviewUrl ? (
                    <div className="relative w-full h-44 rounded-xl overflow-hidden border border-border/80 bg-secondary flex justify-center items-center">
                      <Image
                        src={bannerPreviewUrl}
                        alt="Banner Preview"
                        fill
                        className="object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedBannerFile(null);
                          setBannerPreviewUrl(null);
                        }}
                        className="absolute bottom-2 right-2 bg-rose-600 hover:bg-rose-500 font-semibold text-xs h-8 text-white"
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label 
                      htmlFor="bannerInput"
                      className="flex flex-col items-center justify-center w-full h-32 border border-dashed border-border hover:border-primary/50 rounded-xl cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center text-center px-4">
                        <Camera className="w-6 h-6 text-muted-foreground mb-1" />
                        <p className="text-xs font-semibold text-foreground">
                          Choose New Banner Photo
                        </p>
                      </div>
                      <input 
                        id="bannerInput" 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        onChange={handleBannerFileChange}
                        disabled={actionLoading !== null}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button
                  type="submit"
                  disabled={actionLoading !== null}
                  className="w-full h-11 bg-primary hover:bg-primary/95 text-white gap-2 font-semibold text-sm"
                >
                  {actionLoading === 'edit' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving Details...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
