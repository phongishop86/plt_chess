import React from 'react';
import type { PlayerColor, PlayerInfo } from '../types/chess.ts';
import { Clock, AlertTriangle } from 'lucide-react';
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
}) => {
  const isWhite = color === 'w';

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
              <span className="font-bold text-sm text-white truncate max-w-[140px] sm:max-w-[200px]">
                {player ? player.name : isWhite ? 'Quân Trắng' : 'Đang chờ đối thủ...'}
              </span>

              {isYou && (
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                  Bạn
                </span>
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
