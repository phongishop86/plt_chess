import React, { useState } from 'react';
import { Copy, Check, Flag, RotateCcw, AlertTriangle } from 'lucide-react';
import type { GameStatus } from '../types/chess.ts';

interface GameControlsProps {
  roomId: string;
  status: GameStatus;
  isPlayer: boolean;
  onFlipBoard: () => void;
  onResign: () => Promise<void>;
  disabled?: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  roomId,
  status,
  isPlayer,
  onFlipBoard,
  onResign,
  disabled = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [isResigning, setIsResigning] = useState(false);

  const inviteUrl = `${window.location.origin}/game/${roomId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback nếu clipboard API bị hạn chế
      prompt('Sao chép liên kết mời đối thủ:', inviteUrl);
    }
  };

  const handleConfirmResign = async () => {
    try {
      setIsResigning(true);
      await onResign();
    } finally {
      setIsResigning(false);
      setShowResignConfirm(false);
    }
  };

  const isGameOver = ['checkmate', 'draw', 'resigned', 'stalemate', 'abandoned'].includes(status);

  return (
    <>
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
        {/* Copy Invite Link */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 text-left">
            Liên kết mời đối thủ
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 w-full truncate focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Đã chép
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Sao chép
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={onFlipBoard}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700/50"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            Đổi góc nhìn
          </button>

          {isPlayer && !isGameOver ? (
            <button
              onClick={() => setShowResignConfirm(true)}
              disabled={disabled || isResigning}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-semibold transition-colors border border-rose-500/30 disabled:opacity-50"
            >
              <Flag className="w-3.5 h-3.5" />
              Đầu hàng
            </button>
          ) : (
            <a
              href="/"
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition-colors border border-emerald-500/30"
            >
              Ván mới
            </a>
          )}
        </div>
      </div>

      {/* Modal xác nhận đầu hàng */}
      {showResignConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-left">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h4 className="text-lg font-bold text-white mb-1">
              Bạn có chắc muốn đầu hàng?
            </h4>
            <p className="text-xs text-slate-400 mb-5">
              Hành động này sẽ xử thua cho bạn ngay lập tức và kết thúc ván đấu.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowResignConfirm(false)}
                disabled={isResigning}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmResign}
                disabled={isResigning}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-600/30"
              >
                {isResigning ? 'Đang xử lý...' : 'Xác nhận đầu hàng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
