import React, { useEffect, useRef } from 'react';
import type { MoveRecord } from '../types/chess.ts';
import { History } from 'lucide-react';

interface MoveHistoryProps {
  history: MoveRecord[];
  lastMove?: { from: string; to: string; san: string } | null;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({ history }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  // Nhóm các nước đi theo cặp: [ [1, whiteMove, blackMove], [2, whiteMove, blackMove] ]
  const pairs: { moveNum: number; white?: MoveRecord; black?: MoveRecord }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push({
      moveNum: Math.floor(i / 2) + 1,
      white: history[i],
      black: history[i + 1],
    });
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col h-full min-h-[220px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-2">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <History className="w-4 h-4 text-amber-400" />
          <span>Lịch sử nước đi</span>
        </div>
        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-mono">
          {history.length} nước
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-1 text-xs font-mono pr-1 max-h-[300px]"
      >
        {pairs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 italic py-8">
            Chưa có nước đi nào
          </div>
        ) : (
          pairs.map((pair) => (
            <div
              key={pair.moveNum}
              className="grid grid-cols-12 py-1 px-2 rounded hover:bg-slate-800/40 transition-colors items-center"
            >
              <div className="col-span-2 text-slate-500 font-semibold">
                {pair.moveNum}.
              </div>
              <div className="col-span-5 text-slate-200 font-bold">
                {pair.white?.san || ''}
              </div>
              <div className="col-span-5 text-slate-400">
                {pair.black?.san || ''}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
