import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
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
    const { playerName } = req.body || {};
    const cleanName = typeof playerName === 'string' && playerName.trim()
      ? playerName.trim().slice(0, 20)
      : 'Người chơi Trắng';

    const adminDb = getDb();
    const roomId = crypto.randomBytes(4).toString('hex').slice(0, 7);
    const roomRef = adminDb.collection('rooms').doc(roomId);

    const now = Date.now();
    const newRoomData = {
      roomId,
      createdAt: now,
      updatedAt: now,
      status: 'waiting',
      players: {
        white: {
          uid: user.uid,
          name: cleanName,
          connected: true,
        },
        black: null,
      },
      turn: 'w',
      fen: INITIAL_FEN,
      history: [],
      winner: null,
      resignedBy: null,
      lastMove: null,
      clocks: {
        white: 600,
        black: 600,
        lastMoveTime: now,
        timeLimit: 600,
      },
    };

    await roomRef.set(newRoomData);

    return res.status(200).json({
      success: true,
      roomId,
      message: 'Tạo phòng thành công',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    const isAuthError = message.toLowerCase().includes('xác thực') || message.toLowerCase().includes('authorization');
    return res.status(isAuthError ? 401 : 500).json({
      success: false,
      message,
    });
  }
}
