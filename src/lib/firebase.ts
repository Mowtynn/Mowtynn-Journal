import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { 
  getAuth,
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  signOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import config from '../../firebase-applet-config.json';

const app = initializeApp(config);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, config.firestoreDatabaseId);

export const auth = getAuth(app);
auth.languageCode = 'tr';

// Ensure persistence is explicitly local
setPersistence(auth, browserLocalPersistence).catch(console.error);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Mobile environment check
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 768 && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
};

// Check if running inside iframe
const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

export const loginWithGoogle = async () => {
  try {
    if (isMobileDevice() && !isInIframe()) {
      await signInWithRedirect(auth, googleProvider);
      return;
    }
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      console.log('User closed Google sign-in popup.');
      throw error;
    }

    console.warn('Google Sign-In issue:', error?.code, error?.message);

    if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/operation-not-supported-in-this-environment') {
      if (!isInIframe()) {
        console.log('Popup blocked, falling back to redirect...');
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      alert("Giriş penceresi (Pop-up) tarayıcın tarafından engellendi.\n\nLütfen tarayıcı ayarlarından 'Açılır Pencereleri Engelle' seçeneğini kapatıp tekrar dene.");
      throw error;
    }

    if (error?.code === 'auth/missing-initial-state' || error?.message?.includes('missing initial state')) {
      alert("Giriş yapılamadı: Tarayıcı gizlilik/çerez kısıtlamaları nedeniyle oturum başlatılamadı.\n\nLütfen tarayıcı ayarlarından çerez izinlerini veya 'Siteler Arası Takibi Engelle' seçeneğini kontrol et.");
      throw error;
    }

    alert("Giriş yapılırken bir sorun oluştu. Lütfen tekrar dene.");
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
  }
};




