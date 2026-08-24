import { 
  collection, 
  doc, 
  getDocs, 
  onSnapshot,
  query, 
  addDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db, auth, firebaseConfig } from './firebase';
import type { Farm } from '@/types';
import type { IFarmService } from './index';

// The model structure requested for Stage 1 in Firestore
export interface FirestoreFarm {
  name: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  area: {
    value: number;
    unit: 'acres' | 'hectares';
  };
  crop?: string;
  stage?: string;
  healthPercentage?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class FirebaseFarmService implements IFarmService {
  private getFarmsRef() {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to access farms.');
    }
    return collection(db, 'users', user.uid, 'farms');
  }

  // Maps a Firestore document to our app's Farm type
  private mapToAppFarm(id: string, data: Partial<FirestoreFarm>): Farm {
    return {
      id,
      farmerId: auth.currentUser?.uid || '',
      name: data.name || 'Unnamed Farm',
      location: {
        lat: data.location?.latitude || 0,
        lng: data.location?.longitude || 0,
        address: data.location?.address || '',
        displayName: data.location?.address || data.name || 'Unknown Location',
        country: ''
      },
      area: data.area?.value || 0,
      areaUnit: data.area?.unit || 'acres',
      primaryCrop: data.crop || 'Unknown Crop',
      soilType: 'Unknown', // Not in stage 1 model, providing fallback
      cropStage: data.stage || 'Unknown Stage',
      healthScore: data.healthPercentage || 0,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      // Mock images since image upload is not in stage 1
      imageUrl: `https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80` 
    };
  }

  async getFarms(farmerId: string): Promise<Farm[]> {
    try {
      const ref = this.getFarmsRef();
      const snapshot = await getDocs(ref);
      
      return snapshot.docs.map(doc => {
        return this.mapToAppFarm(doc.id, doc.data() as FirestoreFarm);
      });
    } catch (error: any) {
      console.error("Failed to fetch farms:", error.code, error.message);
      throw error;
    }
  }

  async getFarm(farmId: string): Promise<Farm | null> {
    try {
      const farms = await this.getFarms(auth.currentUser?.uid || '');
      return farms.find(f => f.id === farmId) || null;
    } catch (error) {
      console.error(`Failed to fetch farm ${farmId}:`, error);
      return null;
    }
  }

  async saveFarm(farm: Partial<Farm>): Promise<Farm> {
    const user = auth.currentUser;

    // ── Exact diagnostic logs as requested ──────────────────────────────────
    console.log("[saveFarm] auth.currentUser.uid =", auth.currentUser?.uid);
    console.log("[saveFarm] authenticated =", !!auth.currentUser);
    console.log("[saveFarm] Firestore project =", firebaseConfig.projectId);
    console.log("[saveFarm] writing to path = users/" + auth.currentUser?.uid + "/farms");

    if (!user) throw new Error('User is not authenticated');

    const farmsRef = collection(db, 'users', user.uid, 'farms');

    const firestoreFarm: FirestoreFarm = {
      name: farm.name || 'New Farm',
      location: {
        latitude: farm.location?.lat || 0,
        longitude: farm.location?.lng || 0,
        address: farm.location?.address || ''
      },
      area: {
        value: farm.area || 0,
        unit: farm.areaUnit || 'acres'
      },
      crop: farm.primaryCrop || '',
      stage: farm.cropStage || '',
      healthPercentage: farm.healthScore || 100,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    try {
      const docRef = await addDoc(farmsRef, firestoreFarm);
      console.log("[saveFarm] SUCCESS document ID =", docRef.id);
      return this.mapToAppFarm(docRef.id, firestoreFarm);
    } catch (error: any) {
      console.error("[saveFarm] Firestore error code =", error?.code);
      console.error("[saveFarm] Firestore error message =", error?.message);
      console.error("[saveFarm] authenticated UID =", auth.currentUser?.uid);
      throw error;
    }
  }

  async deleteFarm(farmId: string): Promise<void> {
    console.log('🗑️ [deleteFarm] CALLED with farmId:', farmId);
    const user = auth.currentUser;
    console.log('🗑️ [deleteFarm] auth.currentUser?.uid:', user?.uid);
    if (!user) throw new Error('Must be logged in to delete a farm');

    const farmRef = doc(db, 'users', user.uid, 'farms', farmId);
    try {
      await deleteDoc(farmRef);
      console.log('🗑️ [deleteFarm] SUCCESS! Deleted:', `users/${user.uid}/farms/${farmId}`);
    } catch (err: any) {
      console.error('🗑️ [deleteFarm] ERROR code:', err.code);
      console.error('🗑️ [deleteFarm] ERROR message:', err.message);
      throw err;
    }
  }

  // ─── DIAGNOSTIC: Direct getDocs read (called from FarmContext) ────────────
  async diagnosticDirectRead(userId: string): Promise<void> {
    console.log('🔬 [DIAGNOSTIC] Starting direct getDocs read...');
    console.log('🔬 [DIAGNOSTIC] userId:', userId);
    const app = db.app;
    console.log('🔬 [DIAGNOSTIC] Firebase app name:', app.name);
    console.log('🔬 [DIAGNOSTIC] Firebase projectId:', (app.options as any).projectId);
    const path = `users/${userId}/farms`;
    console.log('🔬 [DIAGNOSTIC] Reading path:', path);
    try {
      const ref = collection(db, 'users', userId, 'farms');
      const snapshot = await getDocs(ref);
      console.log('🔬 [DIAGNOSTIC] getDocs SUCCESS. docs.size:', snapshot.size);
      snapshot.docs.forEach(d => {
        console.log('🔬 [DIAGNOSTIC] doc.id:', d.id, 'data:', d.data());
      });
    } catch (err: any) {
      console.error('🔬 [DIAGNOSTIC] getDocs FAILED');
      console.error('🔬 [DIAGNOSTIC] error.code:', err.code);
      console.error('🔬 [DIAGNOSTIC] error.message:', err.message);
    }
  }

  // ─── Real-time subscription ───────────────────────────────────────────────
  subscribeToUserFarms(
    userId: string,
    callback: (farms: Farm[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    console.log('📡 [subscribeToUserFarms] CALLED with userId:', userId);
    console.log('📡 [subscribeToUserFarms] auth.currentUser?.uid at call time:', auth.currentUser?.uid);
    console.log('📡 [subscribeToUserFarms] auth.currentUser?.email:', auth.currentUser?.email);

    if (!userId) {
      console.warn('📡 [subscribeToUserFarms] userId is EMPTY — returning empty. Check auth state!');
      callback([]);
      return () => {};
    }

    const app = db.app;
    console.log('📡 [subscribeToUserFarms] Firebase app name:', app.name);
    console.log('📡 [subscribeToUserFarms] Firebase projectId:', (app.options as any).projectId);

    const path = `users/${userId}/farms`;
    console.log('📡 [subscribeToUserFarms] onSnapshot path:', path);

    const ref = collection(db, 'users', userId, 'farms');
    const q = query(ref);

    // Run a parallel direct getDocs for diagnostics
    this.diagnosticDirectRead(userId);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('📡 [subscribeToUserFarms] onSnapshot CALLBACK FIRED. docs.size:', snapshot.size);
      const farms = snapshot.docs.map(docSnap => {
        console.log('📡 [subscribeToUserFarms] doc.id:', docSnap.id);
        return this.mapToAppFarm(docSnap.id, docSnap.data() as FirestoreFarm);
      });
      console.log('📡 [subscribeToUserFarms] Calling UI callback with', farms.length, 'farms');
      callback(farms);
    }, (error: any) => {
      console.error('📡 [subscribeToUserFarms] onSnapshot ERROR CALLBACK FIRED');
      console.error('📡 [subscribeToUserFarms] error.code:', error.code);
      console.error('📡 [subscribeToUserFarms] error.message:', error.message);
      if (onError) onError(error);
    });

    return unsubscribe;
  }
}
