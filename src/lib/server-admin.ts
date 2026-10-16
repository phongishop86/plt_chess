import type { VercelRequest } from '@vercel/node';
import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
}

const FIREBASE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const jwks = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));

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

/**
 * Xác thực Firebase ID Token an toàn tuyệt đối bằng chuẩn Google JWKS
 * Sử dụng thư viện jose chuẩn ESM/Serverless
 */
export async function authenticateRequest(req: VercelRequest): Promise<AuthenticatedUser> {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || typeof authHeader !== 'string') {
    throw new Error('Thiếu header Authorization xác thực');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    throw new Error('Định dạng token không đúng (Yêu cầu: Bearer <ID_TOKEN>)');
  }

  const idToken = parts[1];
  const projectId = cleanEnv(process.env.FIREBASE_PROJECT_ID);

  if (!projectId) {
    throw new Error('Máy chủ chưa nhận được biến môi trường FIREBASE_PROJECT_ID');
  }

  try {
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    if (!payload.sub) {
      throw new Error('Token không chứa user id hợp lệ');
    }

    return {
      uid: payload.sub,
      email: payload.email as string | undefined,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Token không hợp lệ hoặc đã hết hạn';
    console.error('[Auth Middleware] Lỗi verifyIdToken:', message);
    throw new Error('Xác thực thất bại: ' + message);
  }
}
