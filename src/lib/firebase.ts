import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  type Auth, 
  type User 
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

function cleanEnv(val: unknown): string {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

const firebaseConfig = {
  apiKey: cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID),
};

export const missingKeys = Object.entries(firebaseConfig)
  .filter(([_, v]) => !v)
  .map(([k]) => `VITE_FIREBASE_${k.replace(/([A-Z])/g, '_$1').toUpperCase()}`);

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY'
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    console.error('[Firebase Init Error]:', err);
  }
} else {
  console.warn(
    '[Phong Chess] Chưa cấu hình thông số Firebase trong .env. Vui lòng thiết lập VITE_FIREBASE_*.'
  );
}

export { auth, db };

/**
 * Đảm bảo người chơi đã được đăng nhập ẩn danh (Anonymous Auth)
 * Không yêu cầu nhập email, mật khẩu hay tài khoản thông thường.
 */
export async function ensureAnonymousUser(): Promise<User> {
  if (!auth) {
    throw new Error(
      'Firebase Auth chưa được khởi tạo. Các biến môi trường VITE_FIREBASE_* chưa được nạp vào bản build Vercel. Vui lòng kiểm tra tab Environment Variables trên Vercel.'
    );
  }

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth!,
      async (user) => {
        unsubscribe();
        if (user) {
          resolve(user);
        } else {
          try {
            const credential = await signInAnonymously(auth!);
            resolve(credential.user);
          } catch (error) {
            console.error('Lỗi đăng nhập ẩn danh Firebase:', error);
            reject(error);
          }
        }
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
  });
}

/**
 * Lấy Firebase ID Token để gửi kèm header Authorization tới Vercel API
 */
export async function getIdToken(): Promise<string> {
  const user = await ensureAnonymousUser();
  return user.getIdToken();
}
