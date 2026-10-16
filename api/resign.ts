import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { createRemoteJWKSet, jwtVerify } from 'jose';

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
  if (!key.startsWith('-----BEGIN') && !key.includes('BEGIN PRIVATE KEY')) {
    try {
      const decoded = Buffer.from(key, 'base64').toString('utf-8');
      if (decoded.includes('BEGIN PRIVATE KEY')) key = decoded;
    } catch {}
  }
  if (key.includes('\\n')) key = key.replace(/\\n/g, '\n');
  return key;
}

let app: App | null = null;
let db: Firestore | null = null;

function getDb(): Firestore {
  if (!db) {
    const existing = getApps();
    if (existing.length > 0) {
      app = existing[0];
    } else {
      const projectId = cleanEnv(process.env.FIREBASE_PROJECT_ID);
      const clientEmail = cleanEnv(process.env.FIREBASE_CLIENT_EMAIL);
      const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
      const privateKey = formatPrivateKey(rawKey);

      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
    db = getFirestore(app);
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {}
  }
  return db;
}

async function authenticateRequest(req: VercelRequest): Promise<{ uid: string; email?: string }> {
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

  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  if (!payload.sub) {
    throw new Error('Token không chứa user id hợp lệ');
  }

  return { uid: payload.sub, email: payload.email as string | undefined };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ' });
  }

  try {
    const user = await authenticateRequest(req);
    const { roomId } = req.body || {};

    if (!roomId) {
      return res.status(400).json({ success: false, message: 'Thiếu mã phòng' });
    }

    const adminDb = getDb();
    const roomRef = adminDb.collection('rooms').doc(roomId.trim());

    await adminDb.runTransaction(async (transaction: Transaction) => {
      const doc = await transaction.get(roomRef);
      if (!doc.exists) {
        throw new Error('ROOM_NOT_FOUND');
      }

      const room = doc.data()!;
      if (room.status !== 'in_progress') {
        throw new Error('Ván đấu hiện không trong trạng thái thi đấu');
      }

      const whiteUid = room.players?.white?.uid;
      const blackUid = room.players?.black?.uid;

      let resigningPlayer: 'w' | 'b' | null = null;
      if (user.uid === whiteUid) {
        resigningPlayer = 'w';
      } else if (user.uid === blackUid) {
        resigningPlayer = 'b';
      } else {
        throw new Error('Chỉ người chơi trong phòng mới có thể đầu hàng');
      }

      const winner = resigningPlayer === 'w' ? 'b' : 'w';

      transaction.update(roomRef, {
        status: 'resigned',
        resignedBy: resigningPlayer,
        winner,
        updatedAt: Date.now(),
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Đã ghi nhận đầu hàng thành công',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    const isAuthError = message.toLowerCase().includes('xác thực') || message.toLowerCase().includes('authorization');
    return res.status(isAuthError ? 401 : 400).json({
      success: false,
      message,
    });
  }
}
