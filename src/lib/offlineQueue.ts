import { supabase, isMockMode } from './supabase';
import { addMockLog, updateMockTreeStatus, getMockTrees } from './mockData';

export interface QueueItem {
  id: string;
  tree_id: number;
  type: 'visit' | 'photo' | 'edit';
  status: string;
  note?: string;
  photoBlob?: Blob;
  gpsCoords?: { latitude: number | null, longitude: number | null };
  staff_name: string;
  timestamp: string;

  // Edit details fields
  planter_name?: string;
  species?: string;
  planted_date?: string;
  location?: string;
}

const DB_NAME = 'ptr-offline-db';
const STORE_NAME = 'queue';
const DB_VERSION = 1;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is not available on server-side'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function addToQueue(item: Omit<QueueItem, 'id' | 'timestamp'>): Promise<string> {
  const db = await openDB();
  const id = `queue-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const timestamp = new Date().toISOString();
  const fullItem: QueueItem = { ...item, id, timestamp };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(fullItem);

    request.onsuccess = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ptr_sync_queue_changed'));
      }
      resolve(id);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getQueue(): Promise<QueueItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('getQueue error:', e);
    return [];
  }
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ptr_sync_queue_changed'));
      }
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function syncOfflineQueue() {
  if (typeof window === 'undefined' || !navigator.onLine) return;
  
  const queue = await getQueue();
  if (queue.length === 0) return;

  console.log(`[Offline Sync] Starting sync for ${queue.length} items...`);

  for (const item of queue) {
    try {
      if (item.type === 'visit') {
        if (isMockMode) {
          addMockLog({
            tree_id: item.tree_id,
            type: 'visit',
            note: item.note,
            staff_name: item.staff_name
          });
          updateMockTreeStatus(item.tree_id, item.status);
        } else {
          // Insert watering log
          const { error: logErr } = await supabase
            .from('tree_logs')
            .insert({
              tree_id: item.tree_id,
              type: 'visit',
              note: item.note || null,
              staff_name: item.staff_name,
              created_at: item.timestamp
            });
          if (logErr) throw logErr;

          // Update status
          const { error: statusErr } = await supabase
            .from('trees')
            .update({ status: item.status })
            .eq('id', item.tree_id);
          if (statusErr) throw statusErr;
        }
      } else if (item.type === 'photo') {
        let photoUrl = '';
        if (item.photoBlob) {
          if (isMockMode) {
            photoUrl = await blobToBase64(item.photoBlob);
          } else {
            const fileExt = 'jpg';
            const fileName = `tree-${item.tree_id}-${Date.now()}.${fileExt}`;
            const { error: uploadErr } = await supabase.storage
              .from('tree-photos')
              .upload(fileName, item.photoBlob, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: true
              });
            if (uploadErr) throw uploadErr;

            const { data: { publicUrl } } = supabase.storage
              .from('tree-photos')
              .getPublicUrl(fileName);
            photoUrl = publicUrl;
          }
        }

        if (isMockMode) {
          addMockLog({
            tree_id: item.tree_id,
            type: 'photo',
            photo_url: photoUrl,
            note: item.note,
            log_latitude: item.gpsCoords?.latitude || undefined,
            log_longitude: item.gpsCoords?.longitude || undefined,
            staff_name: item.staff_name
          });
          updateMockTreeStatus(item.tree_id, item.status);
        } else {
          const { error: logErr } = await supabase
            .from('tree_logs')
            .insert({
              tree_id: item.tree_id,
              type: 'photo',
              photo_url: photoUrl || null,
              note: item.note || null,
              log_latitude: item.gpsCoords?.latitude || null,
              log_longitude: item.gpsCoords?.longitude || null,
              staff_name: item.staff_name,
              created_at: item.timestamp
            });
          if (logErr) throw logErr;

          const { error: statusErr } = await supabase
            .from('trees')
            .update({ status: item.status })
            .eq('id', item.tree_id);
          if (statusErr) throw statusErr;
        }
      } else if (item.type === 'edit') {
        let bannerPhotoUrl = '';
        if (item.photoBlob) {
          if (isMockMode) {
            bannerPhotoUrl = await blobToBase64(item.photoBlob);
          } else {
            const fileExt = 'jpg';
            const fileName = `tree-banner-${item.tree_id}-${Date.now()}.${fileExt}`;
            const { error: uploadErr } = await supabase.storage
              .from('tree-photos')
              .upload(fileName, item.photoBlob, {
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
          planter_name: item.planter_name,
          species: item.species,
          planted_date: item.planted_date,
          location: item.location
        };
        if (bannerPhotoUrl) {
          updateData.main_photo_url = bannerPhotoUrl;
        }

        if (isMockMode) {
          const storedTrees = getMockTrees();
          const target = storedTrees.find(t => t.id === item.tree_id);
          const updatedTree = {
            ...target,
            ...updateData
          };
          const newTrees = storedTrees.map(t => t.id === item.tree_id ? updatedTree : t);
          localStorage.setItem('ptr_mock_trees', JSON.stringify(newTrees));
        } else {
          const { error: updateErr } = await supabase
            .from('trees')
            .update(updateData)
            .eq('id', item.tree_id);
          if (updateErr) throw updateErr;
        }
      }

      await removeFromQueue(item.id);
      console.log(`[Offline Sync] Successfully synced item ${item.id}`);
    } catch (err) {
      console.error(`[Offline Sync] Failed to sync item ${item.id}:`, err);
      break;
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ptr_sync_queue_changed'));
    window.dispatchEvent(new Event('ptr_data_synced'));
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
