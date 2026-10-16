import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
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

let app: App | null = null;
let adminDbInstance: Firestore | null = null;

export function getAdminDb(): Firestore {
  if (!adminDbInstance) {
    const existing = getApps();
    if (existing.length > 0) {
      app = existing[0];
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
          `Vercel Serverless Function thiếu biến môi trường: ${missing.join(', ')}. Hãy kiểm tra Settings ➜ Environment Variables trên Vercel (chọn môi trường Production).`
        );
      }

      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    adminDbInstance = getFirestore(app);
  }

  return adminDbInstance;
}
