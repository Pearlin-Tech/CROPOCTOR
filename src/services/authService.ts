import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  reload,
  User 
} from "firebase/auth";
import { auth } from "./firebase";

export const authService = {
  /**
   * Translates Firebase Auth error codes into user-friendly messages
   */
  getErrorMessage: (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support.';
      case 'auth/user-not-found':
        return 'No account found with this email. Please sign up first.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password is too weak. It must be at least 6 characters.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again.';
      case 'auth/too-many-requests':
        return 'Too many failed login attempts. Please try again later.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed before completion.';
      case 'auth/popup-blocked':
        return 'Sign-in popup was blocked by the browser. Please allow popups for this site.';
      case 'auth/invalid-verification-code':
        return 'The verification code you entered is invalid.';
      case 'auth/code-expired':
        return 'The verification code has expired. Please request a new one.';
      case 'auth/invalid-phone-number':
        return 'Please enter a valid phone number including country code.';
      default:
        return 'An unexpected authentication error occurred. Please try again.';
    }
  },

  /**
   * Signs up a new user with email and password
   */
  signUpWithEmail: async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return { user: userCredential.user, error: null };
    } catch (error: any) {
      return { user: null, error: authService.getErrorMessage(error.code) };
    }
  },

  /**
   * Logs in an existing user with email and password
   */
  loginWithEmail: async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { user: userCredential.user, error: null };
    } catch (error: any) {
      return { user: null, error: authService.getErrorMessage(error.code) };
    }
  },

  /**
   * Signs out the current user
   */
  logout: async () => {
    try {
      await firebaseSignOut(auth);
      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error: authService.getErrorMessage(error.code) };
    }
  },

  /**
   * Listens to Firebase authentication state changes
   */
  onAuthStateChange: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  /**
   * Signs in with Google
   */
  signInWithGoogle: async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      return { user: userCredential.user, error: null };
    } catch (error: any) {
      return { user: null, error: authService.getErrorMessage(error.code) };
    }
  },


  /**
   * Signs in with Phone Number
   */
  signInWithPhone: async (phoneNumber: string, appVerifier: any) => {
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      return { confirmationResult, error: null };
    } catch (error: any) {
      return { confirmationResult: null, error: authService.getErrorMessage(error.code) };
    }
  },

  /**
   * Verifies Phone OTP
   */
  verifyPhoneOtp: async (confirmationResult: ConfirmationResult, otp: string) => {
    try {
      const userCredential = await confirmationResult.confirm(otp);
      return { user: userCredential.user, error: null };
    } catch (error: any) {
      return { user: null, error: authService.getErrorMessage(error.code) };
    }
  },

  /**
   * Sends Password Reset Email
   */
  sendPasswordReset: async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error: authService.getErrorMessage(error.code) };
    }
  },

  /**
   * Updates User Profile
   */
  updateUserProfile: async (user: User, profile: { displayName: string }) => {
    try {
      await updateProfile(user, profile);
      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error: authService.getErrorMessage(error.code) };
    }
  },

  /**
   * Sends Verification Email
   */
  sendVerificationEmail: async (user: User) => {
    try {
      await sendEmailVerification(user);
      return { success: true, error: null };
    } catch (error: any) {
      console.error("sendEmailVerification error:", error);
      return { success: false, error: `[${error.code}] ${error.message}` };
    }
  },

  /**
   * Reloads the Firebase user and checks emailVerified status
   */
  reloadAndCheckVerified: async (user: User) => {
    try {
      await reload(user);
      return { verified: user.emailVerified, error: null };
    } catch (error: any) {
      return { verified: false, error: authService.getErrorMessage(error.code) };
    }
  },

  /**
   * Sets up recaptcha for phone auth — always clears old instance first
   */
  setupRecaptcha: (containerId: string) => {
    // Always clear previous verifier to avoid duplicate-app errors
    if ((window as any).recaptchaVerifier) {
      try { (window as any).recaptchaVerifier.clear() } catch {}
      delete (window as any).recaptchaVerifier
    }
    const container = document.getElementById(containerId)
    if (!container) {
      console.warn(`[reCAPTCHA] Container #${containerId} not found in DOM`)
      return null
    }
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => {
        // Expired — will be recreated on next send attempt
        delete (window as any).recaptchaVerifier
      }
    });
    return (window as any).recaptchaVerifier;
  }
};
