import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { getAdminDb } from './_lib/firebase-admin';
import { authenticateRequest } from './_lib/auth';

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ' });
  }

  try {
    // 1. Xác thực ID token của người tạo phòng
    const user = await authenticateRequest(req);

    // 2. Lấy đối tượng Firestore chuẩn
    const adminDb = getAdminDb();

    // 3. Sinh mã phòng ngẫu nhiên gồm 7 ký tự dễ nhớ
    const roomId = crypto.randomBytes(4).toString('hex').slice(0, 7);

    const roomRef = adminDb.collection('rooms').doc(roomId);

    const now = Date.now();
    const newRoomData = {
      roomId,
      createdAt: now,
      updatedAt: now,
      status: 'waiting', // Đang chờ đối thủ tham gia
      players: {
        white: {
          uid: user.uid,
          name: 'Người chơi Trắng',
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
    };

    await roomRef.set(newRoomData);

    return res.status(200).json({
      success: true,
      roomId,
      message: 'Tạo phòng thành công',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return res.status(error instanceof Error && error.message.includes('Xác thực') ? 401 : 500).json({
      success: false,
      message,
    });
  }
}
