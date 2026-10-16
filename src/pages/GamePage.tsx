import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, ensureAnonymousUser } from '../lib/firebase.ts';
import { joinRoom, makeMove, resignGame, createRoom } from '../lib/api.ts';
import type { RoomDocument } from '../types/chess.ts';
import { ChessBoardView } from '../components/ChessBoardView.tsx';
import { PlayerCard } from '../components/PlayerCard.tsx';
import { MoveHistory } from '../components/MoveHistory.tsx';
import { GameControls } from '../components/GameControls.tsx';
import { GameOverModal } from '../components/GameOverModal.tsx';
import { SpectatorBanner } from '../components/SpectatorBanner.tsx';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

export const GamePage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [hasAttemptedJoin, setHasAttemptedJoin] = useState(false);

  // 1. Xác thực ẩn danh và lấy UID của người chơi hiện tại
  useEffect(() => {
    let isMounted = true;
    ensureAnonymousUser()
      .then((user) => {
        if (isMounted) {
          setCurrentUid(user.uid);
        }
      })
      .catch((err: unknown) => {
        console.error('Không thể xác thực ẩn danh:', err);
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Lỗi xác thực Firebase';
          setError('Không thể kết nối Firebase: ' + msg);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Lắng nghe cập nhật phòng thời gian thực qua Firestore onSnapshot
  useEffect(() => {
    if (!roomId || !db) {
      if (!db) {
        setError('Firebase Firestore chưa được kết nối. Vui lòng kiểm tra .env.');
        setLoading(false);
      }
      return;
    }

    const roomRef = doc(db, 'rooms', roomId);
    const unsubscribe = onSnapshot(
      roomRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as RoomDocument;
          setRoom(data);
          setError(null);
        } else {
          setError('Không tìm thấy phòng đấu này hoặc phòng đã bị xóa.');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Lỗi onSnapshot Firestore:', err);
        setError('Không thể đồng bộ dữ liệu phòng: ' + err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  // 3. Tự động nhận diện vai trò của người chơi (Trắng, Đen, hay Khán giả)
  const userRole = useMemo<'white' | 'black' | 'spectator'>(() => {
    if (!room || !currentUid) return 'spectator';
    if (room.players.white.uid === currentUid) return 'white';
    if (room.players.black && room.players.black.uid === currentUid) return 'black';
    return 'spectator';
  }, [room, currentUid]);

  // Cập nhật góc nhìn bàn cờ theo vai trò (Bên Đen nhìn từ phía Đen, Bên Trắng nhìn từ phía Trắng)
  useEffect(() => {
    if (userRole === 'black') {
      setOrientation('black');
    } else if (userRole === 'white') {
      setOrientation('white');
    }
  }, [userRole]);

  // 4. Nếu người dùng vào phòng mà ghế Đen còn trống, tự động gửi API nhận ghế Đen
  useEffect(() => {
    if (!room || !currentUid || !roomId || hasAttemptedJoin) return;

    const isWhite = room.players.white.uid === currentUid;
    const isBlack = room.players.black?.uid === currentUid;

    // Nếu không phải là Trắng và ghế Đen đang trống -> Tham gia nhận ghế Đen
    if (!isWhite && !isBlack && !room.players.black && room.status === 'waiting') {
      setHasAttemptedJoin(true);
      joinRoom(roomId).catch((err: unknown) => {
        console.warn('Không thể tự động tham gia ghế Đen:', err);
      });
    }
  }, [room, currentUid, roomId, hasAttemptedJoin]);

  // Thực hiện nước đi qua Vercel API
  const handleMakeMove = useCallback(
    async (move: { from: string; to: string; promotion?: string }): Promise<boolean> => {
      if (!roomId) return false;
      try {
        const res = await makeMove(roomId, move);
        return res.success;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Nước đi không hợp lệ';
        alert(`Không thể đi quân: ${msg}`);
        return false;
      }
    },
    [roomId]
  );

  // Đầu hàng qua Vercel API
  const handleResign = useCallback(async () => {
    if (!roomId) return;
    try {
      await resignGame(roomId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi đầu hàng';
      alert(`Lỗi: ${msg}`);
    }
  }, [roomId]);

  const handleFlipBoard = () => {
    setOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
  };

  const handleNewGame = async () => {
    try {
      const res = await createRoom();
      if (res.success && res.roomId) {
        navigate(`/game/${res.roomId}`);
      }
    } catch (err) {
      console.error('Lỗi tạo phòng mới:', err);
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-400">Đang đồng bộ phòng đấu...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Đã xảy ra sự cố</h3>
          <p className="text-xs text-slate-400 mb-6">{error || 'Không có dữ liệu phòng.'}</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại trang chủ
          </a>
        </div>
      </div>
    );
  }

  const isPlayer = userRole === 'white' || userRole === 'black';
  const isPlayerTurn = 
    (room.turn === 'w' && userRole === 'white') ||
    (room.turn === 'b' && userRole === 'black');
  const canPlay = isPlayer && isPlayerTurn && room.status === 'in_progress';

  // Xác định vị trí người chơi trên và dưới theo góc nhìn
  const topPlayerColor = orientation === 'white' ? 'b' : 'w';
  const bottomPlayerColor = orientation === 'white' ? 'w' : 'b';

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
      {/* Spectator banner nếu người chơi thứ 3 vào xem */}
      {userRole === 'spectator' && (
        <div className="mb-4">
          <SpectatorBanner />
        </div>
      )}

      {/* Thông báo nếu đang chờ người chơi thứ 2 */}
      {room.status === 'waiting' && userRole === 'white' && (
        <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3 animate-pulse">
          <span>⏳ Đang chờ đối thủ tham gia... Hãy sao chép liên kết phòng và gửi cho bạn bè để bắt đầu!</span>
        </div>
      )}

      {/* Main Game Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cột Trái: Bàn Cờ (7 cột trên lg) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Đối thủ phía trên */}
          <PlayerCard
            color={topPlayerColor}
            player={topPlayerColor === 'w' ? room.players.white : room.players.black}
            isCurrentTurn={room.turn === topPlayerColor && room.status === 'in_progress'}
            isYou={(topPlayerColor === 'w' && userRole === 'white') || (topPlayerColor === 'b' && userRole === 'black')}
          />

          {/* Bàn cờ trung tâm */}
          <ChessBoardView
            fen={room.fen}
            turn={room.turn}
            orientation={orientation}
            isPlayerTurn={isPlayerTurn}
            canPlay={canPlay}
            lastMove={room.lastMove}
            onMove={handleMakeMove}
          />

          {/* Người chơi phía dưới */}
          <PlayerCard
            color={bottomPlayerColor}
            player={bottomPlayerColor === 'w' ? room.players.white : room.players.black}
            isCurrentTurn={room.turn === bottomPlayerColor && room.status === 'in_progress'}
            isYou={(bottomPlayerColor === 'w' && userRole === 'white') || (bottomPlayerColor === 'b' && userRole === 'black')}
          />
        </div>

        {/* Cột Phải: Bảng điều khiển & Lịch sử nước đi (5 cột trên lg) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <GameControls
            roomId={room.roomId}
            status={room.status}
            isPlayer={isPlayer}
            onFlipBoard={handleFlipBoard}
            onResign={handleResign}
            disabled={!canPlay && room.status !== 'waiting'}
          />

          <MoveHistory history={room.history || []} lastMove={room.lastMove} />
        </div>
      </div>

      {/* Modal kết thúc ván đấu */}
      <GameOverModal
        status={room.status}
        winner={room.winner}
        resignedBy={room.resignedBy}
        userRole={userRole}
        onNewGame={handleNewGame}
      />
    </div>
  );
};
