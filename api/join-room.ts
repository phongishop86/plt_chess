import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Transaction } from 'firebase-admin/firestore';
import { getAdminDb } from './_lib/firebase-admin';
import { authenticateRequest } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ' });
  }

  try {
    const user = await authenticateRequest(req);
    const { roomId } = req.body || {};

    if (!roomId || typeof roomId !== 'string') {
      return res.status(400).json({ success: false, message: 'Thiếu mã phòng (roomId)' });
    }

    const adminDb = getAdminDb();
    const roomRef = adminDb.collection('rooms').doc(roomId.trim());

    // Dùng Firestore Transaction để đảm bảo xử lý đồng thời an toàn:
    // Chỉ đúng 1 người có thể nhận ghế quân Đen nếu có nhiều người cùng vào link.
    const result = await adminDb.runTransaction(async (transaction: Transaction) => {
      const doc = await transaction.get(roomRef);
      if (!doc.exists) {
        throw new Error('ROOM_NOT_FOUND');
      }

      const data = doc.data()!;
      const whiteUid = data.players?.white?.uid;
      const blackUid = data.players?.black?.uid;

      // 1. Nếu là người chơi Trắng vào lại
      if (whiteUid === user.uid) {
        return { role: 'white', message: 'Bạn là người chơi Trắng' };
      }

      // 2. Nếu đã là người chơi Đen vào lại
      if (blackUid === user.uid) {
        return { role: 'black', message: 'Bạn là người chơi Đen' };
      }

      // 3. Nếu ghế Đen đã có người khác chiếm (quy định: chỉ tối đa 2 ghế chơi)
      if (blackUid && blackUid !== user.uid) {
        return {
          role: 'spectator',
          message: 'Phòng đã đủ 2 người chơi. Bạn tham gia với tư cách Khán giả.',
        };
      }

      // 4. Ghế Đen còn trống -> Gán người này làm quân Đen và bắt đầu trận đấu
      transaction.update(roomRef, {
        'players.black': {
          uid: user.uid,
          name: 'Người chơi Đen',
          connected: true,
        },
        status: 'in_progress',
        updatedAt: Date.now(),
      });

      return { role: 'black', message: 'Tham gia ghế Quân Đen thành công' };
    });

    return res.status(200).json({
      success: true,
      role: result.role,
      message: result.message,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'ROOM_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Phòng không tồn tại' });
    }
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return res.status(500).json({ success: false, message });
  }
}
