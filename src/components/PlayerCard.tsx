import React from 'react';
import type { PlayerColor, PlayerInfo } from '../types/chess.ts';
import { CheckCircle2, Clock } from 'lucide-react';

interface PlayerCardProps {
  color: PlayerColor;
  player?: PlayerInfo | null;
  isCurrentTurn: boolean;
  isYou: boolean;
  capturedPieces?: string[];
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  color,
  player,
  isCurrentTurn,
  isYou,
}) => {
  const isWhite = color === 'w';

  return (
    <div
      className={`relative p-3.5 rounded-xl border transition-all duration-300 ${
        isCurrentTurn
          ? 'bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-amber-500/50 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/40'
          : 'bg-slate-900/60 border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Avatar + Color Badge + Name */}
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg shadow-md border ${
              isWhite
                ? 'bg-slate-100 text-slate-900 border-slate-300'
                : 'bg-slate-950 text-amber-400 border-slate-700'
            }`}
          >
            {isWhite ? '♔' : '♚'}
          </div>

          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-white">
                {player ? player.name : isWhite ? 'Quân Trắng' : 'Đang chờ đối thủ...'}
              </span>
              {isYou && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Bạn
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>{isWhite ? 'Bên Trắng (Đi trước)' : 'Bên Đen (Đi sau)'}</span>
              {player && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  Sẵn sàng
                </span>
              )}
              {!player && !isWhite && (
                <span className="flex items-center gap-1 text-[11px] text-amber-400/80 animate-pulse">
                  <Clock className="w-3 h-3" />
                  Chờ người vào
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Turn indicator badge */}
        <div>
          {isCurrentTurn ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>
              Đang đi
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-medium px-2 py-1">
              Chờ lượt
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
