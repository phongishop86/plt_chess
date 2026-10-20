import React, { useState } from 'react';
import type { PlayerColor, PlayerInfo } from '../types/chess.ts';
import { Clock, AlertTriangle, Pencil, Check, X, Loader2 } from 'lucide-react';
import { PIECE_UNICODE } from '../lib/chess-material.ts';

interface PlayerCardProps {
  color: PlayerColor;
  player?: PlayerInfo | null;
  isCurrentTurn: boolean;
  isYou: boolean;
  capturedPieces?: string[];
  advantage?: number;
  timeRemaining?: string;
  isLowTime?: boolean;
  isTimeout?: boolean;
  onUpdateName?: (newName: string) => Promise<void>;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  color,
  player,
  isCurrentTurn,
  isYou,
  capturedPieces = [],
  advantage = 0,
  timeRemaining = '10:00',
  isLowTime = false,
  isTimeout = false,
  onUpdateName,
}) => {
  const isWhite = color === 'w';
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEdit = () => {
    setEditValue(player?.name || (isWhite ? 'Người chơi Trắng' : 'Người chơi Đen'));
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editValue.trim().slice(0, 20);
    if (!trimmed || isSaving || !onUpdateName) return;

    try {
      setIsSaving(true);
      await onUpdateName(trimmed);
      setIsEditing(false);
    } catch (err) {
      console.error('Không thể cập nhật tên:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`relative px-4 py-3 rounded-2xl border transition-all duration-300 backdrop-blur-sm ${
        isCurrentTurn
          ? 'bg-gradient-to-r from-amber-500/15 via-slate-900/90 to-amber-500/5 border-amber-500/60 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/50'
          : 'bg-slate-900/70 border-slate-800/80 shadow-md'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Avatar + Name + Captured pieces */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar Icon */}
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-2xl shadow-inner border shrink-0 transition-transform ${
              isCurrentTurn ? 'scale-105' : ''
            } ${
              isWhite
                ? 'bg-gradient-to-br from-slate-50 to-slate-200 text-slate-900 border-slate-300 shadow-slate-900/40'
                : 'bg-gradient-to-br from-slate-900 to-slate-950 text-amber-400 border-slate-700 shadow-black'
            }`}
          >
            {isWhite ? '♔' : '♚'}
          </div>

          <div className="text-left min-w-0">
            {/* Player Name and Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {isEditing ? (
                <form onSubmit={handleSaveEdit} className="flex items-center gap-1">
                  <input
                    type="text"
                    autoFocus
                    maxLength={20}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setIsEditing(false);
                    }}
                    placeholder="Nhập tên..."
                    className="bg-slate-950 border border-amber-500 rounded px-2 py-0.5 text-xs text-white outline-none w-28 sm:w-36 focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={isSaving || !editValue.trim()}
                    className="p-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-black transition-colors disabled:opacity-50"
                    title="Lưu tên"
                  >
                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Hủy"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </form>
              ) : (
                <>
                  <span className="font-bold text-sm text-white truncate max-w-[140px] sm:max-w-[200px]">
                    {player ? player.name : isWhite ? 'Quân Trắng' : 'Đang chờ đối thủ...'}
                  </span>

                  {isYou && (
                    <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                      Bạn
                    </span>
                  )}

                  {isYou && onUpdateName && (
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                      title="Đổi tên của bạn"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </>
              )}

              {/* Advantage Badge (+ điểm) */}
              {advantage > 0 && (
                <span className="text-[11px] font-black px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center shadow-sm">
                  +{advantage}
                </span>
              )}
            </div>

            {/* Captured Pieces Tray */}
            <div className="flex items-center gap-1.5 mt-1 min-h-[20px] flex-wrap">
              {capturedPieces.length > 0 ? (
                <div className="flex items-center gap-0.5 text-base sm:text-lg leading-none select-none">
                  {capturedPieces.map((p, idx) => (
                    <span
                      key={idx}
                      className={`inline-block transition-transform hover:scale-125 ${
                        isWhite ? 'text-slate-300 drop-shadow' : 'text-amber-400/90 drop-shadow'
                      }`}
                      title={`Quân bị bắt: ${p.toUpperCase()}`}
                    >
                      {PIECE_UNICODE[p] || p}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[11px] text-slate-400">
                  {isWhite ? 'Bên Trắng (Đi trước)' : 'Bên Đen (Đi sau)'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Turn Badge & Chess Clock */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Turn Indicator */}
          <div className="hidden sm:block">
            {isCurrentTurn ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[11px] animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Lượt đi
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 font-medium px-2 py-1">
                Chờ lượt
              </div>
            )}
          </div>

          {/* Digital Chess Clock */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-base sm:text-lg border transition-all duration-200 ${
              isTimeout
                ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
                : isLowTime
                ? 'bg-rose-500/15 border-rose-500/60 text-rose-400 animate-bounce'
                : isCurrentTurn
                ? 'bg-slate-950/90 border-amber-500/70 text-amber-300 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/40'
                : 'bg-slate-950/60 border-slate-800 text-slate-400'
            }`}
          >
            {isLowTime || isTimeout ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Clock className={`w-4 h-4 shrink-0 ${isCurrentTurn ? 'text-amber-400 animate-spin' : 'text-slate-500'}`} style={{ animationDuration: '6s' }} />
            )}
            <span className="tracking-wider">
              {isTimeout ? '00:00' : timeRemaining}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
