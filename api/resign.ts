import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Transaction } from 'firebase-admin/firestore';
import { adminDb } from './_lib/firebase-admin';
import { authenticateRequest } from './_lib/auth';

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
    return res.status(error instanceof Error && error.message.includes('Xác thực') ? 401 : 400).json({
      success: false,
      message,
    });
  }
}
