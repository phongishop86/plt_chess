import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
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

function formatPrivateKey(rawKey: string): string {
  let key = cleanEnv(rawKey);
  
  // Hỗ trợ nếu khóa được mã hóa Base64
  if (!key.startsWith('-----BEGIN') && !key.includes('BEGIN PRIVATE KEY')) {
    try {
      const decoded = Buffer.from(key, 'base64').toString('utf-8');
      if (decoded.includes('BEGIN PRIVATE KEY')) {
        key = decoded;
      }
    } catch {}
  }

  // Khôi phục ký tự xuống dòng thực tế nếu chuỗi chứa ký tự escaped \n
  if (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  }

  return key;
}

let cachedApp: App | null = null;

export function getFirebaseAdmin(): { adminAuth: Auth; adminDb: Firestore } {
  if (!cachedApp) {
    const existing = getApps();
    if (existing.length > 0) {
      cachedApp = existing[0];
    } else {
      const projectId = cleanEnv(process.env.FIREBASE_PROJECT_ID);
      const clientEmail = cleanEnv(process.env.FIREBASE_CLIENT_EMAIL);
      const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
      const privateKey = formatPrivateKey(rawKey);

      if (!projectId || !clientEmail || !privateKey) {
        const missing: string[] = [];
        if (!projectId) missing.push('FIREBASE_PROJECT_ID');
        if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
        if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');

        throw new Error(
          `Vercel Serverless Function thiếu biến môi trường: ${missing.join(', ')}. Vui lòng kiểm tra tab Environment Variables trên Vercel và đảm bảo đã bật môi trường Production.`
        );
      }

      cachedApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
  }

  return {
    adminAuth: getAuth(cachedApp),
    adminDb: getFirestore(cachedApp),
  };
}

// Dùng Proxy để lazy-init an toàn, không làm sập serverless container lúc khởi động
export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    const { adminAuth } = getFirebaseAdmin();
    const val = (adminAuth as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === 'function' ? val.bind(adminAuth) : val;
  },
});

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    const { adminDb } = getFirebaseAdmin();
    const val = (adminDb as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === 'function' ? val.bind(adminDb) : val;
  },
});

export default adminAuth;
