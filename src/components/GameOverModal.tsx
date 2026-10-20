import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, AlertCircle, RotateCcw, Home } from 'lucide-react';
import type { GameStatus, PlayerColor } from '../types/chess.ts';
import { soundManager } from '../lib/sound.ts';

interface GameOverModalProps {
  status: GameStatus;
  winner?: PlayerColor | 'draw' | null;
  resignedBy?: PlayerColor | null;
  userRole: 'white' | 'black' | 'spectator';
  whiteName?: string;
  blackName?: string;
  onNewGame: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  status,
  winner,
  resignedBy,
  userRole,
  whiteName,
  blackName,
  onNewGame,
}) => {
  const isGameOver = ['checkmate', 'draw', 'resigned', 'stalemate', 'abandoned'].includes(status);

  const isUserWinner = 
    (winner === 'w' && userRole === 'white') ||
    (winner === 'b' && userRole === 'black');

  const isUserLoser = 
    (winner === 'w' && userRole === 'black') ||
    (winner === 'b' && userRole === 'white') ||
    (resignedBy === 'w' && userRole === 'white') ||
    (resignedBy === 'b' && userRole === 'black');

  useEffect(() => {
    if (!isGameOver) return;

    if (isUserWinner) {
      soundManager.playVictory();
      // Confetti bắn pháo hoa ăn mừng
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
    } else if (isUserLoser) {
      soundManager.playDefeat();
    }
  }, [isGameOver, isUserWinner, isUserLoser]);

  if (!isGameOver) return null;

  const wLabel = whiteName ? `Bên Trắng (${whiteName})` : 'Quân Trắng';
  const bLabel = blackName ? `Bên Đen (${blackName})` : 'Quân Đen';

  let title = 'Ván đấu kết thúc';
  let subtitle = '';

  if (status === 'checkmate') {
    title = 'Chiếu Bí!';
    subtitle = winner === 'w' ? `${wLabel} giành chiến thắng áp đảo.` : `${bLabel} giành chiến thắng áp đảo.`;
  } else if (status === 'resigned') {
    title = 'Đối thủ đầu hàng';
    subtitle = resignedBy === 'w' ? `${wLabel} đã xin đầu hàng.` : `${bLabel} đã xin đầu hàng.`;
  } else if (status === 'stalemate') {
    title = 'Hòa Cờ (Pat)';
    subtitle = 'Đối phương không còn nước đi hợp lệ nào mà không bị chiếu.';
  } else if (status === 'draw') {
    title = 'Hòa Cờ!';
    subtitle = 'Trận đấu kết thúc với kết quả hòa.';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl shadow-black/80 relative">
        <div
          className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 shadow-lg ${
            isUserWinner
              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-amber-500/20'
              : winner === 'draw'
              ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400'
              : 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
          }`}
        >
          {isUserWinner || winner !== 'draw' ? (
            <Trophy className="w-8 h-8" />
          ) : (
            <AlertCircle className="w-8 h-8" />
          )}
        </div>

        <h3 className="text-2xl font-black text-white mb-1 tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-slate-300 mb-6">
          {subtitle}
        </p>

        {userRole !== 'spectator' && (
          <div className="mb-6 p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 text-xs font-semibold">
            {isUserWinner && <span className="text-emerald-400">🎉 Xin chúc mừng, bạn đã chiến thắng!</span>}
            {isUserLoser && <span className="text-rose-400">Chúc bạn may mắn hơn ở ván sau!</span>}
            {winner === 'draw' && <span className="text-amber-400">Một trận đấu ngang tài ngang sức!</span>}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <button
            onClick={onNewGame}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20"
          >
            <RotateCcw className="w-4 h-4" />
            Tạo phòng mới
          </button>
          <a
            href="/"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-sm transition-colors border border-slate-700/60"
          >
            <Home className="w-4 h-4" />
            Về trang chủ
          </a>
        </div>
      </div>
    </div>
  );
};
