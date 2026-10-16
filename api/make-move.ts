import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Transaction } from 'firebase-admin/firestore';
import { Chess } from 'chess.js';
import { getAdminDb } from './_lib/firebase-admin';
import { authenticateRequest } from './_lib/auth';

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

    const adminDb = getAdminDb();
    const roomRef = adminDb.collection('rooms').doc(roomId.trim());

    // Sử dụng Firestore Transaction để xác thực và cập nhật nguyên tử (tránh race-condition khi 2 bên gửi liên tiếp)
    const result = await adminDb.runTransaction(async (transaction: Transaction) => {
      const doc = await transaction.get(roomRef);
      if (!doc.exists) {
        throw new Error('ROOM_NOT_FOUND');
      }

      const room = doc.data()!;

      // 1. Kiểm tra trạng thái ván đấu
      if (room.status !== 'in_progress') {
        if (room.status === 'waiting') {
          throw new Error('Ván đấu chưa bắt đầu vì đang chờ người chơi thứ hai.');
        }
        throw new Error(`Ván đấu đã kết thúc với trạng thái: ${room.status}.`);
      }

      // 2. Xác định vai trò của người chơi (Bên Trắng hay Bên Đen)
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

      // 3. Kiểm tra đúng lượt đi
      if (room.turn !== playerColor) {
        throw new Error(`Chưa tới lượt của bạn! Hiện tại đang là lượt của bên ${room.turn === 'w' ? 'Trắng' : 'Đen'}.`);
      }

      // 4. Kiểm tra tính hợp lệ của nước đi bằng chess.js trên server
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

      // 5. Xác định trạng thái kết thúc ván (Chiếu bí, Hòa cờ, ...)
      let newStatus = 'in_progress';
      let winner: 'w' | 'b' | 'draw' | null = null;

      if (chess.isCheckmate()) {
        newStatus = 'checkmate';
        winner = playerColor; // Người vừa thực hiện nước đi chiếu bí là người chiến thắng
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

      // 6. Cập nhật dữ liệu vào Firestore trong Transaction
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

    return res.status(isClientError ? 400 : 500).json({
      success: false,
      message,
    });
  }
}
