import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';
import type { AppNotification } from '@/types';
import type { INotificationService } from './index';

export class FirebaseNotificationService implements INotificationService {
  private getNotificationsRef() {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to access notifications.');
    }
    return collection(db, 'users', user.uid, 'notifications');
  }

  async getNotifications(): Promise<AppNotification[]> {
    try {
      const ref = this.getNotificationsRef();
      const q = query(ref, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Map Firestore Timestamp to ISO string for the UI
          timestamp: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        } as AppNotification;
      });
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      return [];
    }
  }

  subscribeToUserNotifications(
    callback: (notifications: AppNotification[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const user = auth.currentUser;
    if (!user) {
      console.warn("Attempted to subscribe to notifications without being authenticated.");
      callback([]);
      return () => {}; // empty unsubscribe
    }

    const ref = collection(db, 'users', user.uid, 'notifications');
    const q = query(ref, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          // Map Firestore Timestamp to ISO string. During local writes, serverTimestamp() might temporarily be null.
          timestamp: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        } as AppNotification;
      });
      callback(notifications);
    }, (error) => {
      console.error("Notification listener error:", error);
      if (onError) onError(error);
    });

    return unsubscribe;
  }

  async markRead(id: string): Promise<void> {
    try {
      const ref = this.getNotificationsRef();
      const notifDoc = doc(ref, id);
      await updateDoc(notifDoc, { read: true });
    } catch (error) {
      console.error(`Failed to mark notification ${id} as read:`, error);
    }
  }

  async markAllRead(): Promise<void> {
    try {
      const ref = this.getNotificationsRef();
      const snapshot = await getDocs(ref);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach(docSnap => {
        if (!docSnap.data().read) {
          batch.update(docSnap.ref, { read: true });
        }
      });
      await batch.commit();
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }

  async createNotification(notification: Omit<AppNotification, 'id' | 'timestamp'>): Promise<void> {
    try {
      const ref = this.getNotificationsRef();
      const newDoc = doc(ref);
      await setDoc(newDoc, {
        ...notification,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to create notification:", error);
    }
  }

  async deleteNotification(id: string): Promise<void> {
    try {
      const ref = this.getNotificationsRef();
      const notifDoc = doc(ref, id);
      await deleteDoc(notifDoc);
    } catch (error) {
      console.error(`Failed to delete notification ${id}:`, error);
    }
  }

  async deleteAllNotifications(): Promise<void> {
     try {
      const ref = this.getNotificationsRef();
      const snapshot = await getDocs(ref);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (error) {
      console.error("Failed to delete all notifications:", error);
    }
  }
}
