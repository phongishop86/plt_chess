import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { Chess } from 'chess.js';
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
    const { roomId, move } = req.body || {};

    if (!roomId || !move || !move.from || !move.to) {
      return res.status(400).json({ success: false, message: 'Thiếu dữ liệu nước đi hoặc mã phòng' });
    }

    const adminDb = getDb();
    const roomRef = adminDb.collection('rooms').doc(roomId.trim());

    const result = await adminDb.runTransaction(async (transaction: Transaction) => {
      const doc = await transaction.get(roomRef);
      if (!doc.exists) {
        throw new Error('ROOM_NOT_FOUND');
      }

      const room = doc.data()!;

      if (room.status !== 'in_progress') {
        if (room.status === 'waiting') {
          throw new Error('Ván đấu chưa bắt đầu vì đang chờ người chơi thứ hai.');
        }
        throw new Error(`Ván đấu đã kết thúc với trạng thái: ${room.status}.`);
      }

      const whiteUid = room.players?.white?.uid;
      const blackUid = room.players?.black?.uid;

      let playerColor: 'w' | 'b' | null = null;
      if (user.uid === whiteUid) {
        playerColor = 'w';
      } else if (user.uid === blackUid) {
        playerColor = 'b';
      } else {
        throw new Error('BẠN_LÀ_KHÁN_GIẢ: Chỉ 2 kỳ thủ chính thức mới có quyền thực hiện nước đi.');
      }

      if (room.turn !== playerColor) {
        throw new Error(`Chưa tới lượt của bạn! Hiện tại đang là lượt của bên ${room.turn === 'w' ? 'Trắng' : 'Đen'}.`);
      }

      const chess = new Chess(room.fen);
      let moveResult;
      try {
        moveResult = chess.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion || 'q',
        });
      } catch {
        throw new Error('NƯỚC_ĐI_SAI_LUẬT: Nước đi không hợp lệ theo luật cờ vua quốc tế.');
      }

      if (!moveResult) {
        throw new Error('NƯỚC_ĐI_SAI_LUẬT: Nước đi không hợp lệ theo luật cờ vua quốc tế.');
      }

      let newStatus = 'in_progress';
      let winner: 'w' | 'b' | 'draw' | null = null;

      if (chess.isCheckmate()) {
        newStatus = 'checkmate';
        winner = playerColor;
      } else if (chess.isStalemate()) {
        newStatus = 'stalemate';
        winner = 'draw';
      } else if (chess.isDraw() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
        newStatus = 'draw';
        winner = 'draw';
      }

      const now = Date.now();
      const moveRecord = {
        from: move.from,
        to: move.to,
        promotion: move.promotion,
        san: moveResult.san,
        timestamp: now,
        by: playerColor,
      };

      const history = Array.isArray(room.history) ? [...room.history, moveRecord] : [moveRecord];

      transaction.update(roomRef, {
        fen: chess.fen(),
        turn: chess.turn(),
        history,
        status: newStatus,
        winner,
        lastMove: {
          from: move.from,
          to: move.to,
          san: moveResult.san,
        },
        updatedAt: now,
      });

      return {
        san: moveResult.san,
        fen: chess.fen(),
        isGameOver: chess.isGameOver(),
        status: newStatus,
        winner,
      };
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    const isClientError =
      message.includes('NƯỚC_ĐI_SAI_LUẬT') ||
      message.includes('Chưa tới lượt') ||
      message.includes('BẠN_LÀ_KHÁN_GIẢ') ||
      message.includes('Ván đấu');
    const isAuthError = message.toLowerCase().includes('xác thực') || message.toLowerCase().includes('authorization');

    return res.status(isAuthError ? 401 : isClientError ? 400 : 500).json({
      success: false,
      message,
    });
  }
}
