import { getApps, initializeApp, cert, getApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

function cleanEnv(val: unknown): string {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

// Khởi tạo Firebase Admin SDK Singleton
// Sử dụng các biến môi trường server-side an toàn, không lộ ra client

function initFirebaseAdmin(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = cleanEnv(process.env.FIREBASE_PROJECT_ID);
  const clientEmail = cleanEnv(process.env.FIREBASE_CLIENT_EMAIL);
  let privateKey = cleanEnv(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      '[Firebase Admin] Chưa cấu hình đủ biến môi trường server (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).'
    );
  }

  if (privateKey) {
    // Xử lý các ký tự xuống dòng escaped trong chuỗi private key
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  try {
    return initializeApp({
      credential: cert({
        projectId: projectId || 'dummy-project-id',
        clientEmail: clientEmail || 'dummy-service-account@example.iam.gserviceaccount.com',
        privateKey: privateKey || '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3\n-----END PRIVATE KEY-----\n',
      }),
    });
  } catch (error) {
    console.error('[Firebase Admin] Lỗi khởi tạo:', error);
    return getApps().length > 0 ? getApp() : initializeApp();
  }
}

const adminApp = initFirebaseAdmin();
export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);
export default adminApp;
