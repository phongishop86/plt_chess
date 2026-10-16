import { getApps, initializeApp, cert, getApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

function cleanEnv(val: unknown): string {
  if (typeof val !== 'string') return '';
  let trimmed = val.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function formatPrivateKey(key: string): string {
  let cleaned = cleanEnv(key);
  if (cleaned.includes('\\n')) {
    cleaned = cleaned.replace(/\\n/g, '\n');
  }
  return cleaned;
}

// Khởi tạo Firebase Admin SDK Singleton
function initFirebaseAdmin(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = cleanEnv(process.env.FIREBASE_PROJECT_ID);
  const clientEmail = cleanEnv(process.env.FIREBASE_CLIENT_EMAIL);
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
  const privateKey = formatPrivateKey(rawKey);

  if (!projectId || !clientEmail || !privateKey) {
    const missing: string[] = [];
    if (!projectId) missing.push('FIREBASE_PROJECT_ID');
    if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
    if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
    
    console.error(`[Firebase Admin Error] Thiếu các biến: ${missing.join(', ')}`);
    throw new Error(
      `Máy chủ Vercel chưa nhận được các biến: ${missing.join(', ')}. Vui lòng vào Vercel ➜ Settings ➜ Environment Variables và bật môi trường Production.`
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

let adminApp: App;
try {
  adminApp = initFirebaseAdmin();
} catch (e) {
  // Nếu khởi tạo tĩnh thất bại khi nạp module, tạo app rỗng để tránh crash import
  console.error('[Firebase Admin Startup Error]:', e);
  adminApp = getApps().length > 0 ? getApp() : initializeApp({ projectId: 'dummy' });
}

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);
export default adminApp;
