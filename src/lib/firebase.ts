import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  type Auth, 
  type User 
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY'
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
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
    throw new Error('Firebase Auth chưa được khởi tạo. Vui lòng kiểm tra file cấu hình .env');
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
