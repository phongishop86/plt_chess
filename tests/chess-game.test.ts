import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import type { RoomDocument, GameStatus, PlayerColor } from '../src/types/chess.ts';

// Giả lập logic kiểm tra phòng & giao dịch máy chủ
class MockGameServer {
  public rooms: Map<string, RoomDocument> = new Map();

  createRoom(roomId: string, whiteUid: string): RoomDocument {
    const room: RoomDocument = {
      roomId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'waiting',
      players: {
        white: { uid: whiteUid, name: 'Người chơi Trắng', connected: true },
        black: null,
      },
      turn: 'w',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      history: [],
      winner: null,
      lastMove: null,
    };
    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(roomId: string, uid: string): { success: boolean; role: 'white' | 'black' | 'spectator'; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');

    // Nếu là người chơi Trắng vào lại
    if (room.players.white.uid === uid) {
      return { success: true, role: 'white' };
    }

    // Nếu đã là người chơi Đen vào lại
    if (room.players.black && room.players.black.uid === uid) {
      return { success: true, role: 'black' };
    }

    // Nếu đã có 2 người chơi (ghế Đen đã có UID khác) -> Người thứ 3 không thể chiếm ghế!
    if (room.players.black && room.players.black.uid !== uid) {
      return {
        success: true,
        role: 'spectator',
        message: 'Phòng đã đủ 2 người chơi. Chỉ có thể theo dõi.',
      };
    }

    // Ghế Đen còn trống -> Gán ghế Đen
    room.players.black = { uid, name: 'Người chơi Đen', connected: true };
    room.status = 'in_progress';
    room.updatedAt = Date.now();

    return { success: true, role: 'black' };
  }

  makeMove(
    roomId: string,
    uid: string,
    move: { from: string; to: string; promotion?: string }
  ): { success: boolean; fen: string; status: GameStatus; winner?: PlayerColor | 'draw' | null } {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');

    if (room.status !== 'in_progress') {
      throw new Error(`Ván đấu không trong trạng thái thi đấu (status: ${room.status})`);
    }

    // 1. Kiểm tra quyền người chơi
    let playerColor: PlayerColor | null = null;
    if (room.players.white.uid === uid) playerColor = 'w';
    else if (room.players.black?.uid === uid) playerColor = 'b';
    else throw new Error('BẠN_LÀ_KHÁN_GIẢ: Khán giả không được đi quân');

    // 2. Kiểm tra đúng lượt
    if (room.turn !== playerColor) {
      throw new Error(`SAI_LƯỢT: Hiện tại là lượt của bên ${room.turn === 'w' ? 'Trắng' : 'Đen'}`);
    }

    // 3. Kiểm tra tính hợp lệ bằng chess.js
    const chess = new Chess(room.fen);
    let result;
    try {
      result = chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q',
      });
    } catch {
      throw new Error('NƯỚC_ĐI_SAI_LUẬT: Nước đi không hợp lệ theo luật cờ vua');
    }

    if (!result) {
      throw new Error('NƯỚC_ĐI_SAI_LUẬT: Nước đi không hợp lệ theo luật cờ vua');
    }

    // 4. Kiểm tra kết thúc ván
    let newStatus: GameStatus = 'in_progress';
    let winner: PlayerColor | 'draw' | null = null;

    if (chess.isCheckmate()) {
      newStatus = 'checkmate';
      winner = playerColor;
    } else if (chess.isStalemate()) {
      newStatus = 'stalemate';
      winner = 'draw';
    } else if (chess.isDraw()) {
      newStatus = 'draw';
      winner = 'draw';
    }

    room.fen = chess.fen();
    room.turn = chess.turn();
    room.status = newStatus;
    room.winner = winner;
    room.history.push({
      from: move.from,
      to: move.to,
      san: result.san,
      timestamp: Date.now(),
      by: playerColor,
    });
    room.lastMove = { from: move.from, to: move.to, san: result.san };
    room.updatedAt = Date.now();

    return { success: true, fen: room.fen, status: newStatus, winner };
  }

  resign(roomId: string, uid: string) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');

    let resigningColor: PlayerColor | null = null;
    if (room.players.white.uid === uid) resigningColor = 'w';
    else if (room.players.black?.uid === uid) resigningColor = 'b';
    else throw new Error('Khán giả không thể đầu hàng');

    room.status = 'resigned';
    room.resignedBy = resigningColor;
    room.winner = resigningColor === 'w' ? 'b' : 'w';
    return { success: true };
  }
}

describe('Bộ kiểm thử Phong Chess Online (Rules, Security, Concurrency)', () => {
  const server = new MockGameServer();
  const P1_WHITE = 'user_player_1_white_abc';
  const P2_BLACK = 'user_player_2_black_xyz';
  const P3_SPECTATOR = 'user_player_3_spectator_123';
  const ROOM_ID = 'test-room-888';

  it('1. Tạo phòng thành công: Người tạo nhận quân Trắng, trạng thái waiting', () => {
    const room = server.createRoom(ROOM_ID, P1_WHITE);
    expect(room.roomId).toBe(ROOM_ID);
    expect(room.players.white.uid).toBe(P1_WHITE);
    expect(room.players.black).toBeNull();
    expect(room.status).toBe('waiting');
    expect(room.turn).toBe('w');
  });

  it('2. Người thứ hai tham gia: Tự động nhận quân Đen, trạng thái chuyển sang in_progress', () => {
    const joinRes = server.joinRoom(ROOM_ID, P2_BLACK);
    expect(joinRes.role).toBe('black');

    const room = server.rooms.get(ROOM_ID)!;
    expect(room.players.black?.uid).toBe(P2_BLACK);
    expect(room.status).toBe('in_progress');
  });

  it('3. Người thứ ba vào: Phòng đã đủ 2 ghế, chỉ nhận vai trò Khán giả (Spectator)', () => {
    const joinRes = server.joinRoom(ROOM_ID, P3_SPECTATOR);
    expect(joinRes.role).toBe('spectator');
    expect(joinRes.message).toContain('đủ 2 người chơi');

    // Ghế Đen vẫn không bị thay đổi
    const room = server.rooms.get(ROOM_ID)!;
    expect(room.players.white.uid).toBe(P1_WHITE);
    expect(room.players.black?.uid).toBe(P2_BLACK);
  });

  it('4. Khán giả không được phép gửi nước đi', () => {
    expect(() => {
      server.makeMove(ROOM_ID, P3_SPECTATOR, { from: 'e2', to: 'e4' });
    }).toThrowError('BẠN_LÀ_KHÁN_GIẢ');
  });

  it('5. Quân Đen cố tình đi trước khi tới lượt: Bị từ chối lỗi SAI_LƯỢT', () => {
    expect(() => {
      server.makeMove(ROOM_ID, P2_BLACK, { from: 'e7', to: 'e5' });
    }).toThrowError('SAI_LƯỢT');
  });

  it('6. Quân Trắng thực hiện nước đi hợp lệ đầu tiên (e2 -> e4): Thành công và chuyển lượt sang Đen', () => {
    const res = server.makeMove(ROOM_ID, P1_WHITE, { from: 'e2', to: 'e4' });
    expect(res.success).toBe(true);

    const room = server.rooms.get(ROOM_ID)!;
    expect(room.turn).toBe('b');
    expect(room.history.length).toBe(1);
    expect(room.history[0].san).toBe('e4');
  });

  it('7. Quân Trắng cố tình đi 2 nước liên tiếp: Bị từ chối lỗi SAI_LƯỢT', () => {
    expect(() => {
      server.makeMove(ROOM_ID, P1_WHITE, { from: 'd2', to: 'd4' });
    }).toThrowError('SAI_LƯỢT');
  });

  it('8. Quân Đen gửi nước đi trái luật (VD: Tốt đi lùi hoặc đi chéo không ăn quân): Bị từ chối lỗi NƯỚC_ĐI_SAI_LUẬT', () => {
    expect(() => {
      // Tốt Đen ở e7 đi sang e8 hoặc đi sang h3 là trái luật
      server.makeMove(ROOM_ID, P2_BLACK, { from: 'e7', to: 'h3' });
    }).toThrowError('NƯỚC_ĐI_SAI_LUẬT');
  });

  it('9. Quân Đen đi hợp lệ (e7 -> e5): Thành công', () => {
    const res = server.makeMove(ROOM_ID, P2_BLACK, { from: 'e7', to: 'e5' });
    expect(res.success).toBe(true);

    const room = server.rooms.get(ROOM_ID)!;
    expect(room.turn).toBe('w');
    expect(room.history.length).toBe(2);
    expect(room.history[1].san).toBe('e5');
  });

  it('10. Kịch bản chiếu bí (Scholar\'s Mate): Game kết thúc và Trắng thắng', () => {
    // Trắng: Qh5
    server.makeMove(ROOM_ID, P1_WHITE, { from: 'd1', to: 'h5' });
    // Đen: Nc6
    server.makeMove(ROOM_ID, P2_BLACK, { from: 'b8', to: 'c6' });
    // Trắng: Bc4
    server.makeMove(ROOM_ID, P1_WHITE, { from: 'f1', to: 'c4' });
    // Đen: Nf6
    server.makeMove(ROOM_ID, P2_BLACK, { from: 'g8', to: 'f6' });
    // Trắng: Qxf7# (Chiếu bí!)
    const mateRes = server.makeMove(ROOM_ID, P1_WHITE, { from: 'h5', to: 'f7' });

    expect(mateRes.status).toBe('checkmate');
    expect(mateRes.winner).toBe('w');

    const room = server.rooms.get(ROOM_ID)!;
    expect(room.status).toBe('checkmate');
    expect(room.winner).toBe('w');
  });

  it('11. Sau khi đã Chiếu bí: Cố tình gửi thêm nước đi sẽ bị chặn', () => {
    expect(() => {
      server.makeMove(ROOM_ID, P2_BLACK, { from: 'e8', to: 'f7' });
    }).toThrowError('không trong trạng thái thi đấu');
  });

  it('12. Khôi phục trạng thái ván đấu sau khi tải lại trang (State recovery)', () => {
    // Khi một trong hai người chơi refresh trang, họ gọi lại joinRoom và đọc FEN từ Firestore
    const reconnectedWhite = server.joinRoom(ROOM_ID, P1_WHITE);
    expect(reconnectedWhite.role).toBe('white');

    const reconnectedBlack = server.joinRoom(ROOM_ID, P2_BLACK);
    expect(reconnectedBlack.role).toBe('black');

    // FEN và lịch sử nước đi vẫn còn nguyên vẹn 100%
    const currentRoom = server.rooms.get(ROOM_ID)!;
    expect(currentRoom.history.length).toBe(7);
    expect(currentRoom.status).toBe('checkmate');
  });

  it('13. Kịch bản Đầu hàng (Resign) trong ván đấu mới', () => {
    const resignRoomId = 'room-resign-test';
    server.createRoom(resignRoomId, P1_WHITE);
    server.joinRoom(resignRoomId, P2_BLACK);

    // Bên Đen đầu hàng
    const res = server.resign(resignRoomId, P2_BLACK);
    expect(res.success).toBe(true);

    const room = server.rooms.get(resignRoomId)!;
    expect(room.status).toBe('resigned');
    expect(room.resignedBy).toBe('b');
    expect(room.winner).toBe('w'); // Bên Trắng thắng vì Đen đầu hàng
  });
});
