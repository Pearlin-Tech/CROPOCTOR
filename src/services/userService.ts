import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface UserProfileData {
  language?: string;
  preferredLanguage?: string;
  country?: string;
  email?: string;
  name?: string;
  phone?: string;
  experience?: 'beginner' | 'intermediate' | 'expert';
  createdAt?: string;
  updatedAt?: any;
}

export const userService = {
  /**
   * Retrieves user profile from Firestore: users/{uid}
   */
  getUserProfile: async (uid: string): Promise<{ data: UserProfileData | null; error: string | null }> => {
    try {
      if (!db || !db.app) {
        return { data: null, error: "Firestore not initialized" };
      }
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return { data: snap.data() as UserProfileData, error: null };
      }
      return { data: null, error: null };
    } catch (err: any) {
      console.warn("[userService] Error getting user profile:", err?.message || err);
      return { data: null, error: err?.message || String(err) };
    }
  },

  /**
   * Saves/updates user language preference in Firestore: users/{uid}
   */
  saveUserLanguage: async (uid: string, language: string): Promise<{ success: boolean; error: string | null }> => {
    try {
      if (!db || !db.app) {
        return { success: false, error: "Firestore not initialized" };
      }
      const userRef = doc(db, "users", uid);
      await setDoc(
        userRef,
        {
          language,
          preferredLanguage: language,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return { success: true, error: null };
    } catch (err: any) {
      console.warn("[userService] Error saving user language:", err?.message || err);
      return { success: false, error: err?.message || String(err) };
    }
  },

  /**
   * Saves/updates user country preference in Firestore: users/{uid}
   */
  saveUserCountry: async (uid: string, country: string): Promise<{ success: boolean; error: string | null }> => {
    try {
      if (!db || !db.app) {
        return { success: false, error: "Firestore not initialized" };
      }
      const userRef = doc(db, "users", uid);
      await setDoc(
        userRef,
        {
          country,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return { success: true, error: null };
    } catch (err: any) {
      console.warn("[userService] Error saving user country:", err?.message || err);
      return { success: false, error: err?.message || String(err) };
    }
  },

  /**
   * Saves/updates full user profile in Firestore
   */
  saveUserProfile: async (profile: Partial<UserProfileData> & { id: string }): Promise<{ success: boolean; error: string | null }> => {
    try {
      if (!db || !db.app) {
        return { success: false, error: "Firestore not initialized" };
      }
      const userRef = doc(db, "users", profile.id);
      const { id, ...data } = profile;
      await setDoc(
        userRef,
        {
          ...data,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return { success: true, error: null };
    } catch (err: any) {
      console.warn("[userService] Error saving user profile:", err?.message || err);
      return { success: false, error: err?.message || String(err) };
    }
  },
};
