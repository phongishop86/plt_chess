import { useState, useEffect } from 'react';
import type { PlayerColor, GameStatus, RoomClocks } from '../types/chess.ts';

interface UseChessClockProps {
  clocks?: RoomClocks;
  turn: PlayerColor;
  status: GameStatus;
  updatedAt: number;
}

export function formatTime(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const minsStr = mins < 10 ? `0${mins}` : `${mins}`;
  const secsStr = secs < 10 ? `0${secs}` : `${secs}`;
  return `${minsStr}:${secsStr}`;
}

export function useChessClock({
  clocks,
  turn,
  status,
  updatedAt,
}: UseChessClockProps) {
  // Thời gian mặc định 10 phút (600 giây)
  const defaultTime = 600;

  const baseWhite = clocks?.white ?? defaultTime;
  const baseBlack = clocks?.black ?? defaultTime;
  const lastMoveTime = clocks?.lastMoveTime || updatedAt || Date.now();

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Chỉ đếm ngược khi ván đấu đang diễn ra
    if (status !== 'in_progress') return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 500);

    return () => clearInterval(interval);
  }, [status, turn]);

  // Tính thời gian đã trôi qua kể từ nước đi gần nhất
  const elapsedSeconds = status === 'in_progress'
    ? Math.max(0, Math.floor((now - lastMoveTime) / 1000))
    : 0;

  const whiteSeconds = turn === 'w' && status === 'in_progress'
    ? Math.max(0, baseWhite - elapsedSeconds)
    : baseWhite;

  const blackSeconds = turn === 'b' && status === 'in_progress'
    ? Math.max(0, baseBlack - elapsedSeconds)
    : baseBlack;

  return {
    whiteSeconds,
    blackSeconds,
    whiteFormatted: formatTime(whiteSeconds),
    blackFormatted: formatTime(blackSeconds),
    isWhiteLowTime: whiteSeconds > 0 && whiteSeconds <= 30,
    isBlackLowTime: blackSeconds > 0 && blackSeconds <= 30,
    isWhiteTimeout: whiteSeconds <= 0,
    isBlackTimeout: blackSeconds <= 0,
  };
}
